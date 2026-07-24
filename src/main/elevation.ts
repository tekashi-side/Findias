import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { userInfo } from 'node:os';
import type { GamePaths } from '../shared/api';
import { checkPackageWritable } from './permissions';

/**
 * One-time elevation to make a protected `package` folder writable. Rather than
 * run the whole (unelevated) app as administrator — which would demand a UAC
 * prompt every launch and break drag-and-drop / self-update — we shell out to a
 * single elevated `icacls` call that grants the current user Modify on the
 * folder. After that one prompt, all normal Findias file operations work
 * unelevated. See docs: the app deliberately stays per-user and unelevated.
 */

const LOG_PREFIX = '[elevation]';

/** Quote a Windows command-line token, wrapping it in double quotes if it has whitespace. */
const toWindowsArg = (value: string): string => (/\s/.test(value) ? `"${value}"` : value);

/**
 * Build the `icacls` command line that grants `principal` Modify (`M`) on
 * `packageDir`, with `(OI)(CI)` so future files/subfolders (`disabled`,
 * `archived`) inherit it and `/T` so the grant also applies to the existing
 * tree. `principal` is either an account name or an `icacls` SID literal
 * (`*S-1-5-…`). Returns a single, correctly double-quoted string (rather than an
 * argv array) because `Start-Process -ArgumentList` does not reliably quote
 * array elements that contain spaces — a path under `C:\Program Files` would be
 * split and rejected by icacls with exit code 87. Pure and unit-testable.
 */
export const buildIcaclsArgLine = (packageDir: string, principal: string): string =>
  [toWindowsArg(packageDir), '/grant', `${principal}:(OI)(CI)M`, '/T'].join(' ');

/** Quote a single string for use inside a PowerShell single-quoted literal. */
const toPowershellLiteral = (value: string): string => `'${value.replace(/'/g, "''")}'`;

/**
 * Build the PowerShell `-Command` that runs `icacls` elevated via a single UAC
 * prompt (`Start-Process -Verb RunAs`) and waits for it to finish. `-PassThru`
 * plus `exit $p.ExitCode` propagates icacls's own exit code out through
 * PowerShell (a plain `-Wait` would always report success, hiding an icacls
 * failure). The whole icacls command line is passed as one single-quoted
 * PowerShell literal so its internal double quotes reach icacls intact.
 */
export const buildPowershellRunAsCommand = (icaclsArgLine: string): string =>
  `$p = Start-Process -FilePath 'icacls' -ArgumentList ${toPowershellLiteral(icaclsArgLine)} -Verb RunAs -PassThru -Wait; exit $p.ExitCode`;

/** Captured result of a spawned command. */
interface CommandResult {
  code: number | null;
  stdout: string;
  stderr: string;
  error?: Error;
}

/** Outcome of an elevation attempt, with diagnostics for logging/telemetry. */
export interface ElevationOutcome {
  /** Whether the package folder is writable afterward — the source of truth. */
  isWritable: boolean;
  /** icacls exit code propagated through PowerShell, or null if it couldn't launch. */
  exitCode: number | null;
  /** Captured stdout of the elevation command. */
  stdout: string;
  /** Captured stderr of the elevation command (e.g. a cancelled UAC prompt). */
  stderr: string;
  /** Set when PowerShell itself failed to launch. */
  spawnError?: Error;
  /** The icacls grantee used (a `*SID` literal or an account name). */
  principal: string;
}

/** Run a command, capturing stdout/stderr/exit code and never rejecting. */
const run = (command: string, args: readonly string[]): Promise<CommandResult> =>
  new Promise((resolve) => {
    const child = spawn(command, [...args], { windowsHide: true });
    let stdout = '';
    let stderr = '';
    child.stdout?.on('data', (chunk) => {
      stdout += String(chunk);
    });
    child.stderr?.on('data', (chunk) => {
      stderr += String(chunk);
    });
    child.on('close', (code) => resolve({ code, stdout, stderr }));
    child.on('error', (error) => resolve({ code: null, stdout, stderr, error }));
  });

/**
 * Absolute path to a `System32` executable. Spawning by bare name is unsafe when
 * Findias is launched from a shell (e.g. Git Bash) whose PATH shadows Windows
 * tools — `whoami` there resolves to Unix coreutils, which rejects `/user`.
 */
const resolveSystem32Exe = (exe: string): string => {
  const root = process.env.SystemRoot ?? process.env.windir;
  return root ? join(root, 'System32', exe) : exe;
};

/** Absolute path to the Windows PowerShell executable. */
const resolvePowershellPath = (): string =>
  join(resolveSystem32Exe('WindowsPowerShell'), 'v1.0', 'powershell.exe');

/**
 * Resolve the icacls grantee for the current user. Prefers the user's SID (as an
 * `*S-1-5-…` literal, which `icacls` maps unambiguously) via the real Windows
 * `whoami.exe`, falling back to the bare account name if that lookup fails.
 */
const resolveGranteePrincipal = async (): Promise<string> => {
  const result = await run(resolveSystem32Exe('whoami.exe'), ['/user', '/fo', 'csv', '/nh']);
  const sid = result.stdout.match(/S-1-[0-9-]+/)?.[0];
  if (sid) return `*${sid}`;
  console.warn(`${LOG_PREFIX} could not resolve SID from whoami; falling back to username`, {
    exitCode: result.code,
    stderr: result.stderr.trim(),
    spawnError: result.error?.message,
  });
  return userInfo().username;
};

/**
 * Grant the current user write access to the game's `package` folder via a single
 * elevated `icacls` call, then re-probe. The returned {@link ElevationOutcome}'s
 * `isWritable` is the source of truth (`false` when the user declined the UAC
 * prompt or the grant didn't take), so the caller never has to trust the child's
 * exit code; the other fields are diagnostics. Logs each step (command, exit
 * code, output) so a failure is diagnosable from the dev/main console.
 */
export const grantPackageWriteAccess = async (paths: GamePaths): Promise<ElevationOutcome> => {
  const principal = await resolveGranteePrincipal();
  const icaclsArgLine = buildIcaclsArgLine(paths.packageDir, principal);
  const command = buildPowershellRunAsCommand(icaclsArgLine);
  const powershell = resolvePowershellPath();

  console.info(`${LOG_PREFIX} granting write access`, {
    packageDir: paths.packageDir,
    principal,
    powershell,
    command,
  });

  const result = await run(powershell, ['-NoProfile', '-Command', command]);
  if (result.error) {
    console.error(`${LOG_PREFIX} failed to launch PowerShell`, result.error);
  }
  console.info(`${LOG_PREFIX} icacls finished`, {
    exitCode: result.code,
    stdout: result.stdout.trim(),
    stderr: result.stderr.trim(),
  });

  const isWritable = await checkPackageWritable(paths);
  console.info(`${LOG_PREFIX} writable after grant: ${isWritable}`);
  return {
    isWritable,
    exitCode: result.code,
    stdout: result.stdout.trim(),
    stderr: result.stderr.trim(),
    spawnError: result.error,
    principal,
  };
};
