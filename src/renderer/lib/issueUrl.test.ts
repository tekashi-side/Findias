import { describe, expect, it } from 'vitest';
import { buildIssueUrl, formatDiagnostics, type DiagnosticsMod } from './issueUrl';

/** Parse a built URL into its base and decoded query params for assertions. */
const parse = (url: string) => {
  const parsed = new URL(url);
  return {
    base: `${parsed.origin}${parsed.pathname}`,
    params: parsed.searchParams,
  };
};

describe('buildIssueUrl', () => {
  it('routes app feedback to the Findias repo with its template + field', () => {
    const { base, params } = parse(
      buildIssueUrl('app-feedback', { title: 'Nice app', body: 'Love it' }),
    );
    expect(base).toBe('https://github.com/tekashi-side/Findias/issues/new');
    expect(params.get('template')).toBe('app_feedback.yml');
    expect(params.get('title')).toBe('Nice app');
    expect(params.get('summary')).toBe('Love it');
  });

  it('routes feature requests to the Findias repo with its template + field', () => {
    const { base, params } = parse(
      buildIssueUrl('feature-request', { title: 'Dark mode', body: 'Please add dark mode' }),
    );
    expect(base).toBe('https://github.com/tekashi-side/Findias/issues/new');
    expect(params.get('template')).toBe('feature_request.yml');
    expect(params.get('feature')).toBe('Please add dark mode');
    expect(params.has('diagnostics')).toBe(false);
  });

  it('routes mod requests to the Uiscias repo with its template + field', () => {
    const { base, params } = parse(
      buildIssueUrl('mod-request', { title: 'New map', body: 'A minimap mod' }),
    );
    expect(base).toBe('https://github.com/Root50199/Uiscias/issues/new');
    expect(params.get('template')).toBe('mod_request.yml');
    expect(params.get('mod-idea')).toBe('A minimap mod');
  });

  it('includes the diagnostics field only for bug reports', () => {
    const bug = parse(
      buildIssueUrl('bug-report', {
        title: 'Crash',
        body: 'It crashed',
        diagnostics: '- Findias: v1.2.3',
      }),
    );
    expect(bug.params.get('template')).toBe('bug_report.yml');
    expect(bug.params.get('what-happened')).toBe('It crashed');
    expect(bug.params.get('diagnostics')).toBe('- Findias: v1.2.3');

    const feedback = parse(
      buildIssueUrl('app-feedback', { title: 'Hi', body: 'x', diagnostics: 'ignored' }),
    );
    expect(feedback.params.has('diagnostics')).toBe(false);
  });

  it('trims whitespace and omits empty title/body params', () => {
    const { params } = parse(buildIssueUrl('app-feedback', { title: '   ', body: '  hi  ' }));
    expect(params.has('title')).toBe(false);
    expect(params.get('summary')).toBe('hi');
  });

  it('drops diagnostics when the URL would exceed the length cap', () => {
    const hugeDiagnostics = 'x'.repeat(9000);
    const { params } = parse(
      buildIssueUrl('bug-report', {
        title: 'Crash',
        body: 'It crashed',
        diagnostics: hugeDiagnostics,
      }),
    );
    expect(params.has('diagnostics')).toBe(false);
    expect(params.get('what-happened')).toBe('It crashed');
  });
});

describe('formatDiagnostics', () => {
  it('formats app, OS, game version, and installed mods', () => {
    const mods: DiagnosticsMod[] = [
      { name: 'Bri Hp Bars', version: 3 },
      { name: 'Bri Map', version: 2 },
    ];
    const text = formatDiagnostics({
      appVersion: '1.2.3',
      platform: 'win32',
      osVersion: '10.0.26200',
      gameVersion: '1.2.4',
      installedMods: mods,
    });
    expect(text).toContain('- Findias: v1.2.3');
    expect(text).toContain('- OS: Windows 10.0.26200');
    expect(text).toContain('- Game version: 1.2.4');
    expect(text).toContain('- Installed mods (2): Bri Hp Bars (v3), Bri Map (v2)');
  });

  it('reports no installed mods and omits an unknown game version', () => {
    const text = formatDiagnostics({
      appVersion: '1.0.0',
      platform: 'linux',
      osVersion: '6.1.0',
      gameVersion: null,
      installedMods: [],
    });
    expect(text).toContain('- OS: Linux 6.1.0');
    expect(text).not.toContain('Game version');
    expect(text).toContain('- Installed mods: none');
  });

  it('caps the listed mods and appends an overflow count', () => {
    const mods: DiagnosticsMod[] = Array.from({ length: 45 }, (_, index) => ({
      name: `Mod${index}`,
      version: index,
    }));
    const text = formatDiagnostics({
      appVersion: '1.0.0',
      platform: 'darwin',
      osVersion: '23.0.0',
      installedMods: mods,
    });
    expect(text).toContain('- Installed mods (45):');
    expect(text).toContain('+5 more');
    expect(text).toContain('- OS: macOS 23.0.0');
  });
});
