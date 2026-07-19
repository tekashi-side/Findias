/**
 * Format a UTC ISO-8601 instant as a short date in the user's locale/timezone
 * (e.g. "Jul 16, 2026"). Returns '' for missing or unparseable input so callers
 * can omit the date entirely.
 */
const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });
export const formatDate = (iso: string): string => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '' : dateFormatter.format(date);
};

/** Format a byte count as a short human-readable string (e.g. "1.1 MB"). */
export const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[unitIndex]}`;
};
