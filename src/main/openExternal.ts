import { shell } from 'electron';

/**
 * Open an http(s) URL in the user's default browser. Restricted to web
 * protocols: content like mod READMEs is untrusted, and `shell.openExternal`
 * would otherwise invoke arbitrary protocol handlers (`file:`, custom schemes,
 * etc.). Malformed or non-web URLs are ignored.
 *
 * This is the single chokepoint to `shell.openExternal`, shared by the renderer
 * bridge (explicit link clicks) and the window's new-window / navigation guards.
 */
export const openExternalUrl = (url: string): void => {
  try {
    const { protocol } = new URL(url);
    if (protocol === 'http:' || protocol === 'https:') {
      void shell.openExternal(url);
    }
  } catch {
    // Ignore URLs that don't parse.
  }
};
