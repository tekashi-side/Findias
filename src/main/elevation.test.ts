import { describe, expect, it } from 'vitest';
import { buildIcaclsArgLine, buildPowershellRunAsCommand } from './elevation';

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
  it('wraps the arg line in a single-quoted literal and propagates the icacls exit code', () => {
    const command = buildPowershellRunAsCommand(
      '"C:\\Program Files\\Game\\package" /grant *S-1-5-21-1-2-3-1001:(OI)(CI)M /T',
    );
    expect(command).toBe(
      "$p = Start-Process -FilePath 'icacls' -ArgumentList " +
        '\'"C:\\Program Files\\Game\\package" /grant *S-1-5-21-1-2-3-1001:(OI)(CI)M /T\' ' +
        '-Verb RunAs -PassThru -Wait; exit $p.ExitCode',
    );
  });

  it('keeps the double-quoted path intact inside the single-quoted literal', () => {
    const command = buildPowershellRunAsCommand(
      '"C:\\Program Files (x86)\\Game\\package" /grant alice:(OI)(CI)M /T',
    );
    expect(command).toContain('\'"C:\\Program Files (x86)\\Game\\package" /grant');
  });

  it('escapes single quotes by doubling them', () => {
    const command = buildPowershellRunAsCommand("C:\\it's\\package /grant alice:(OI)(CI)M /T");
    expect(command).toContain("'C:\\it''s\\package /grant alice:(OI)(CI)M /T'");
  });
});
