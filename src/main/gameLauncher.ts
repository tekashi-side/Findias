import { shell } from 'electron';
import type { GameLauncher, StartGameResult } from '../shared/api';

/** Mabinogi's Steam AppID, used to build the `steam://rungameid` launch URI. */
export const STEAM_APP_ID = '212200';

/** Mabinogi's Nexon game ID, used to build the `nxl://launch` launch URI. */
export const NEXON_GAME_ID = '10200';

/**
 * The protocol URI that launches Mabinogi for each launcher. The OS routes these
 * to the registered handler regardless of where the launcher is installed, so no
 * install path is ever needed. Hard-coded (never parameterized by caller input)
 * so this stays a safe, deliberate use of `shell.openExternal`.
 */
const LAUNCHER_URI: Record<GameLauncher, string> = {
  steam: `steam://rungameid/${STEAM_APP_ID}`,
  nexon: `nxl://launch/${NEXON_GAME_ID}`,
};

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

/**
 * Launch Mabinogi through the inferred launcher's protocol URI.
 * `shell.openExternal` rejects when no handler is registered (the launcher isn't
 * installed / the protocol is broken), which maps to `launch-failed`. On success
 * the caller (IPC layer) quits Findias.
 */
export const startGame = async (gameRootPath: string | null): Promise<StartGameResult> => {
  if (!gameRootPath) return { isOk: false, reason: 'no-game-folder' };
  const launcher = detectLauncher(gameRootPath);
  try {
    await shell.openExternal(LAUNCHER_URI[launcher]);
    return { isOk: true, launcher };
  } catch {
    return { isOk: false, reason: 'launch-failed', launcher };
  }
};
