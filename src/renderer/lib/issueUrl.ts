/**
 * Builds prefilled GitHub issue-form URLs for the feedback view. The renderer
 * hands these to `window.findias.openExternal`, which opens them in the user's
 * browser where they submit as themselves — no token or API call from the app.
 *
 * Each type maps to a repo + issue-form template (`.github/ISSUE_TEMPLATE/*.yml`)
 * and the template field `id`s that receive the prefilled values. Prefill only
 * resolves once those templates exist on each repo's default branch.
 */

/** The kind of feedback the user is submitting; selects the repo + template. */
export type FeedbackType = 'app-feedback' | 'bug-report' | 'feature-request' | 'mod-request';

type FeedbackTarget = {
  owner: string;
  repo: string;
  /** Issue-form template file name under `.github/ISSUE_TEMPLATE/`. */
  template: string;
  /** Template field `id` that receives the free-text body/summary. */
  bodyFieldId: string;
  /** Template field `id` that receives the auto-generated diagnostics block. */
  diagnosticsFieldId?: string;
};

/** Repo + template routing for each feedback type. */
export const FEEDBACK_TARGETS: Record<FeedbackType, FeedbackTarget> = {
  'app-feedback': {
    owner: 'tekashi-side',
    repo: 'Findias',
    template: 'app_feedback.yml',
    bodyFieldId: 'summary',
  },
  'bug-report': {
    owner: 'tekashi-side',
    repo: 'Findias',
    template: 'bug_report.yml',
    bodyFieldId: 'what-happened',
    diagnosticsFieldId: 'diagnostics',
  },
  'feature-request': {
    owner: 'tekashi-side',
    repo: 'Findias',
    template: 'feature_request.yml',
    bodyFieldId: 'feature',
  },
  'mod-request': {
    owner: 'Root50199',
    repo: 'Uiscias',
    template: 'mod_request.yml',
    bodyFieldId: 'mod-idea',
  },
};

/** The human-facing repo name an issue of this type is filed under. */
export const getRepoName = (type: FeedbackType): string => FEEDBACK_TARGETS[type].repo;

/** The repo's GitHub Issues page for a feedback type (where the issue lands). */
export const getIssuesPageUrl = (type: FeedbackType): string => {
  const target = FEEDBACK_TARGETS[type];
  return `https://github.com/${target.owner}/${target.repo}/issues`;
};

/**
 * Character caps for the user-editable fields. These keep the built URL well
 * under {@link MAX_URL_LENGTH} even after percent-encoding inflates the text,
 * and reinforce that the in-app form is a lightweight starter (the full issue
 * is finished on GitHub). The URL-length guard in {@link buildIssueUrl} remains
 * the hard backstop.
 */
export const FIELD_LIMITS = {
  title: 150,
  body: 4000,
  diagnostics: 3000,
} as const;

/** Values the user (and app) supply for a new issue. */
export type IssueUrlInput = {
  title: string;
  body: string;
  /** Only used by types with a `diagnosticsFieldId` (bug reports). */
  diagnostics?: string;
};

/**
 * GitHub silently drops issue-form prefills whose URL is too long. Keep the
 * whole URL comfortably under the practical query limit; the diagnostics block
 * is trimmed first (see {@link formatDiagnostics}) since it's the only
 * app-generated, potentially large field.
 */
const MAX_URL_LENGTH = 8000;

/** Build the prefilled `issues/new` URL for a feedback type. */
export const buildIssueUrl = (type: FeedbackType, input: IssueUrlInput): string => {
  const target = FEEDBACK_TARGETS[type];
  const base = `https://github.com/${target.owner}/${target.repo}/issues/new`;

  const build = (diagnostics: string | undefined): string => {
    const params = new URLSearchParams();
    params.set('template', target.template);
    const title = input.title.trim();
    if (title) params.set('title', title);
    const body = input.body.trim();
    if (body) params.set(target.bodyFieldId, body);
    if (target.diagnosticsFieldId && diagnostics?.trim()) {
      params.set(target.diagnosticsFieldId, diagnostics.trim());
    }
    return `${base}?${params.toString()}`;
  };

  const full = build(input.diagnostics);
  // If diagnostics pushed us over the limit, drop them rather than emit a URL
  // GitHub will reject; the user can still describe the issue by hand.
  if (full.length > MAX_URL_LENGTH && input.diagnostics) return build(undefined);
  return full;
};

/** A single installed mod summarized for the diagnostics block. */
export type DiagnosticsMod = {
  name: string;
  version: number | null;
};

/** Inputs for the auto-generated diagnostics block on a bug report. */
export type DiagnosticsInput = {
  appVersion: string;
  platform: string;
  osVersion: string;
  gameVersion?: string | null;
  installedMods?: DiagnosticsMod[];
};

/** Cap the listed mods so a large install can't blow past the URL limit. */
const MAX_LISTED_MODS = 40;

/** Map a Node platform id to a friendlier OS label. */
const formatPlatform = (platform: string): string => {
  if (platform === 'win32') return 'Windows';
  if (platform === 'darwin') return 'macOS';
  if (platform === 'linux') return 'Linux';
  return platform;
};

/**
 * Format the diagnostic context included in a bug report as a compact Markdown
 * list. This exact string is both shown to the user as a preview and prefilled
 * into the issue form, so what they see is what gets submitted.
 */
export const formatDiagnostics = (input: DiagnosticsInput): string => {
  const lines: string[] = [
    `- Findias: v${input.appVersion}`,
    `- OS: ${formatPlatform(input.platform)} ${input.osVersion}`,
  ];
  if (input.gameVersion) lines.push(`- Game version: ${input.gameVersion}`);

  const mods = input.installedMods ?? [];
  if (mods.length === 0) {
    lines.push('- Installed mods: none');
  } else {
    const shown = mods
      .slice(0, MAX_LISTED_MODS)
      .map((mod) => (mod.version != null ? `${mod.name} (v${mod.version})` : mod.name));
    const hiddenCount = mods.length - shown.length;
    const suffix = hiddenCount > 0 ? `, +${hiddenCount} more` : '';
    lines.push(`- Installed mods (${mods.length}): ${shown.join(', ')}${suffix}`);
  }

  return lines.join('\n');
};
