import { describe, expect, it } from 'vitest';
import {
  buildIcaclsArgLine,
  buildPowershellRunAsCommand,
  classifyElevation,
  USER_CANCELLED_EXIT_CODE,
} from './elevation';

const ICACLS_PATH = 'C:\\Windows\\System32\\icacls.exe';

describe('buildIcaclsArgLine', () => {
  it('double-quotes a path containing spaces and grants Modify with inheritance', () => {
    expect(buildIcaclsArgLine('C:\\Program Files\\Game\\package', '*S-1-5-21-1-2-3-1001')).toBe(
      '"C:\\Program Files\\Game\\package" /grant *S-1-5-21-1-2-3-1001:(OI)(CI)M /T',
    );
  });

  it('leaves a space-free path unquoted', () => {
    expect(buildIcaclsArgLine('C:\\Game\\package', 'alice')).toBe(
      'C:\\Game\\package /grant alice:(OI)(CI)M /T',
    );
  });
});

describe('buildPowershellRunAsCommand', () => {
  it('runs the absolute icacls path elevated and propagates its exit code', () => {
    const command = buildPowershellRunAsCommand(
      ICACLS_PATH,
      '"C:\\Program Files\\Game\\package" /grant *S-1-5-21-1-2-3-1001:(OI)(CI)M /T',
    );
    expect(command).toBe(
      "try { $p = Start-Process -FilePath 'C:\\Windows\\System32\\icacls.exe' -ArgumentList " +
        '\'"C:\\Program Files\\Game\\package" /grant *S-1-5-21-1-2-3-1001:(OI)(CI)M /T\' ' +
        `-Verb RunAs -PassThru -Wait; exit $p.ExitCode } catch { exit ${USER_CANCELLED_EXIT_CODE} }`,
    );
  });

  it('maps a declined elevation (Start-Process throws) to the cancel sentinel', () => {
    const command = buildPowershellRunAsCommand(
      ICACLS_PATH,
      'C:\\Game\\package /grant alice:(OI)(CI)M /T',
    );
    expect(command).toContain(`catch { exit ${USER_CANCELLED_EXIT_CODE} }`);
  });

  it('keeps the double-quoted path intact inside the single-quoted literal', () => {
    const command = buildPowershellRunAsCommand(
      ICACLS_PATH,
      '"C:\\Program Files (x86)\\Game\\package" /grant alice:(OI)(CI)M /T',
    );
    expect(command).toContain('\'"C:\\Program Files (x86)\\Game\\package" /grant');
  });

  it('escapes single quotes by doubling them', () => {
    const command = buildPowershellRunAsCommand(
      ICACLS_PATH,
      "C:\\it's\\package /grant alice:(OI)(CI)M /T",
    );
    expect(command).toContain("'C:\\it''s\\package /grant alice:(OI)(CI)M /T'");
  });
});

describe('classifyElevation', () => {
  it('reports granted whenever the folder is writable, regardless of exit code', () => {
    expect(classifyElevation({ isWritable: true, exitCode: 0 })).toBe('granted');
    expect(classifyElevation({ isWritable: true, exitCode: USER_CANCELLED_EXIT_CODE })).toBe(
      'granted',
    );
  });

  it('reports cancelled when the user declined (cancel sentinel, no spawn error)', () => {
    expect(classifyElevation({ isWritable: false, exitCode: USER_CANCELLED_EXIT_CODE })).toBe(
      'cancelled',
    );
  });

  it('reports failed for a spawn error even at the cancel sentinel', () => {
    expect(
      classifyElevation({
        isWritable: false,
        exitCode: USER_CANCELLED_EXIT_CODE,
        spawnError: new Error('spawn failed'),
      }),
    ).toBe('failed');
  });

  it('reports failed for a non-zero icacls exit', () => {
    expect(classifyElevation({ isWritable: false, exitCode: 87 })).toBe('failed');
  });

  it('reports failed when the grant returned 0 but the folder is still unwritable', () => {
    expect(classifyElevation({ isWritable: false, exitCode: 0 })).toBe('failed');
  });

  it('reports failed when PowerShell never launched (null exit code)', () => {
    expect(classifyElevation({ isWritable: false, exitCode: null })).toBe('failed');
  });
});
