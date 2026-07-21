import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { shell } from 'electron';
import type { GameLauncher, StartGameResult } from '../shared/api';

/** Mabinogi's Steam AppID, used to build the `steam://rungameid` launch URI. */
export const STEAM_APP_ID = '212200';

/** Mabinogi's Nexon game ID, used to build the `nxl://launch` launch URI. */
export const NEXON_GAME_ID = '10200';

/**
 * The protocol scheme (without a game id) each launcher registers. Opening this
 * alone launches only the launcher, letting the user start the game themselves.
 */
const LAUNCHER_SCHEME: Record<GameLauncher, string> = {
  steam: 'steam://rungameid',
  nexon: 'nxl://launch',
};

/** The game id appended to the scheme to launch Mabinogi directly. */
const LAUNCHER_GAME_ID: Record<GameLauncher, string> = {
  steam: STEAM_APP_ID,
  nexon: NEXON_GAME_ID,
};

/**
 * Build the launch URI. When starting automatically we append the game id to
 * launch Mabinogi directly (`steam://rungameid/212200`, `nxl://launch/10200`);
 * otherwise we hand off the bare scheme (`steam://rungameid`, `nxl://launch`) so
 * only the launcher opens. Both forms are composed from module constants (never
 * caller input), keeping this a safe, deliberate use of `shell.openExternal`.
 */
const buildLaunchUri = (launcher: GameLauncher, shouldStartGameAutomatically: boolean): string =>
  shouldStartGameAutomatically
    ? `${LAUNCHER_SCHEME[launcher]}/${LAUNCHER_GAME_ID[launcher]}`
    : LAUNCHER_SCHEME[launcher];

/**
 * Infer the launcher from the chosen game folder path. A Steam install always
 * lives under a `steamapps` folder (e.g.
 * `...\steamapps\common\Mabinogi\appdata`), even on a custom library drive;
 * anything else is treated as a Nexon Launcher install. Derived fresh from the
 * path each time, so the choice can never drift from the selected folder.
 */
export const detectLauncher = (gameRootPath: string): GameLauncher => {
  const segments = gameRootPath.split(/[\\/]+/).map((segment) => segment.toLowerCase());
  return segments.includes('steamapps') ? 'steam' : 'nexon';
};

/** Default Nexon Launcher install dir, resolved via env (never hard-coded drive). */
const resolveNexonLauncherDir = (): string => {
  const base =
    process.env['ProgramFiles(x86)'] ?? process.env.ProgramFiles ?? 'C:\\Program Files (x86)';
  return join(base, 'Nexon', 'Nexon Launcher');
};

/**
 * Where the Nexon updater should drop its logs: the launcher's own folder when
 * present (matches a normal Nexon self-launch), otherwise the throwaway temp dir.
 * Never the Findias install dir.
 */
export const resolveNexonLogCwd = (): string => {
  const nexonDir = resolveNexonLauncherDir();
  return existsSync(nexonDir) ? nexonDir : tmpdir();
};

/**
 * Launch Mabinogi through the inferred launcher's protocol URI. When
 * `shouldStartGameAutomatically` is true the game boots directly; otherwise only
 * the launcher opens. `shell.openExternal` rejects when no handler is registered
 * (the launcher isn't installed / the protocol is broken), which maps to
 * `launch-failed`. On success the caller (IPC layer) quits Findias.
 */
export const startGame = async (
  gameRootPath: string | null,
  shouldStartGameAutomatically: boolean,
): Promise<StartGameResult> => {
  if (!gameRootPath) return { isOk: false, reason: 'no-game-folder' };
  const launcher = detectLauncher(gameRootPath);

  // Nexon only: relocate cwd so the updater's stray logs don't land in Findias'
  // install dir. Steam launches are untouched.
  const previousCwd = launcher === 'nexon' ? process.cwd() : null;
  if (launcher === 'nexon') {
    try {
      process.chdir(resolveNexonLogCwd());
    } catch {
      // If the redirect fails, fall through and launch from the current cwd.
    }
  }

  try {
    await shell.openExternal(buildLaunchUri(launcher, shouldStartGameAutomatically));
    return { isOk: true, launcher };
  } catch {
    return { isOk: false, reason: 'launch-failed', launcher };
  } finally {
    if (previousCwd) {
      try {
        process.chdir(previousCwd);
      } catch {
        // Best-effort restore; ignore.
      }
    }
  }
};
