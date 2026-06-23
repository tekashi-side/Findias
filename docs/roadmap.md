# Findias Roadmap

This is the build sequence for Findias. It turns the design in
[`architecture.md`](./architecture.md) and the scope in
[`project-overview.md`](./project-overview.md) into ordered, shippable slices.

Each phase is a **vertical slice**: it touches main/preload/renderer as needed
and leaves the app in a runnable, demonstrable state. Phases are ordered by
dependency — later phases build on earlier ones.

> Status legend: ✅ done · 🔜 next · ⬜ planned

## Phase 0 — Scaffold & walking skeleton ✅

Validate the whole toolchain end to end before building features.

- electron-vite (`react-ts`) with TypeScript across main/preload/renderer.
- React + MUI + TanStack Query in the renderer; Vitest for tests.
- electron-builder + electron-updater installed and configured.
- Centered, non-fullscreen window with strict security defaults
  (`contextIsolation`, `sandbox`, no `nodeIntegration`).
- One typed IPC round-trip (`getAppInfo`) proving main ↔ preload ↔ renderer.
- Shared `modFilename` parser + unit tests as the first real module.
- `.node-version` pinned to `24.17.0`.

**Done when:** `npm run dev`, `npm run build`, `npm test`, and `npm run typecheck`
all succeed. ✅

## Phase 1 — Setup gate (choose game folder) ✅

The app cannot operate without a valid game folder, so this gates everything.

- `SettingsStore` — load/save JSON settings in `app.getPath('userData')`.
- `GameLocation` — validate a chosen folder (must contain `package`), resolve
  `package` and `package/disabled` paths.
- IPC: `getSettings`, `chooseGameFolder` (native `dialog.showOpenDialog`).
- Renderer: a **setup gate** screen shown when no valid path is stored; persists
  the choice and transitions into the (empty) main view.

**Done when:** first launch prompts for the folder, validates it, persists it,
and subsequent launches skip the prompt. Invalid folders are rejected with a
clear message. Unit tests cover `GameLocation` validation.

## Phase 2 — Read both sources ✅

Stand up the two swappable providers behind their interfaces.

- `InstalledModsProvider` (contract: `src/main/providers/installed.ts`) →
  `PackageFolderProvider` (`src/main/providers/packageFolder.ts`): scans
  `package` + `package/disabled`, parses via the shared grammar, returns
  `InstalledMod[]`; ignores official/third-party/stray files. ✅
- `ModCatalogProvider` (contract: `src/main/providers/catalog.ts`) →
  `GitHubReleaseCatalogProvider` (`src/main/providers/githubReleaseCatalog.ts`):
  `GET /releases`, picks newest non-draft, zod-validates the payload, parses `.it`
  assets into `CatalogEntry[]`; maps offline/403/HTTP/parse failures to a typed
  `CatalogError`. ✅
- Both depend only on normalized types so they can later be swapped for
  manifest/source-tree or `installedMods.json` strategies. ✅

**Done when:** on launch the app fetches the catalog and scans the folder, with
unit tests for both providers (mock fetch + a temp fixture folder). ✅

> The temporary launch probe was removed in Phase 3 and replaced by the resolver
> + `refresh` IPC that feeds the renderer.

## Phase 3 — Resolve & render the mod list ✅

- `ModResolver` (`src/main/modResolver.ts`): merges catalog + installed by
  `modId` into rows with status (not installed / up to date / update available /
  disabled / orphan) and the valid actions per row. Pure and unit-tested. ✅
- DTOs (`src/shared/modList.ts`): `ModListState` / `ModRow` / `ModStatus` /
  `ModAction` cross the IPC boundary. ✅
- IPC: `refresh` scans the folder, fetches the catalog, and resolves; a catalog
  failure degrades softly (installed mods still returned as orphans, surfaced via
  `catalog.available`). ✅
- Renderer: scrollable MUI list — name, status chip, release + installed
  version, action buttons (rendered but disabled until Phase 4); loading / error
  (with retry) / catalog-unavailable banner / empty ("no compatible mods")
  states. ✅

**Done when:** the list renders real data from a live release against a real
`package` folder, with correct per-row status. Resolver has thorough unit tests. ✅

> Action buttons are intentionally **disabled** in Phase 3 — they reflect each
> row's valid actions but are wired to mutations in Phase 4.

## Phase 4 — Install / update / delete ✅

The core mutations, all written to operate via the providers + `ModStore`.

- `Downloader` (`src/main/downloader.ts`): streams `fetchBytes()` to a dotted
  temp file with cumulative progress, atomically renames into place, and removes
  the temp file on failure/cancel. ✅
- `ModStore` (`src/main/modStore.ts`): `PackageModStore.removeManaged(modId,
  except?)` deletes managed files from the package root + disabled, optionally
  keeping one (replace). ✅
- `ModInstaller` (`src/main/modInstaller.ts`): **install/update** with
  write-new-then-delete-old replace semantics; **delete** is `removeManaged`. ✅
- IPC: `installOrUpdate` (one catalog fetch reused for lookup + post-resolve) and
  `deleteMod` return fresh `ModListState`; `onDownloadProgress` streams progress
  events. Row buttons (install/update/delete) are wired in the UI with a
  per-row progress bar. ✅

**Done when:** a user can install, update (old version removed), and delete a mod
end to end, with progress shown and no half-written files on failure. ✅

> Enable/disable buttons remain disabled until Phase 5.

## Phase 5 — Disable / enable ⬜

- Move files between `package` and the lazily-created, never-deleted
  `package/disabled` folder.
- IPC `setDisabled`; UI enable/disable controls; resolver reflects disabled state.

**Done when:** mods can be toggled disabled/enabled without deletion, and the
game-relevant root of `package` reflects the change.

## Phase 6 — App self-update & release pipeline ⬜

- `Updater`: electron-updater (GitHub provider → `tekashi-side/Findias`); check
  on launch, surface `update-available` / `update-downloaded` over IPC; UI
  "restart to install" prompt.
- electron-builder NSIS target; document the publish flow (and the unsigned
  SmartScreen caveat).

**Done when:** publishing a new GitHub release causes a running app to detect,
download, and offer to install the update; a Windows installer is produced.

## Cross-cutting (ongoing)

- **Tests:** pure modules (parser, providers, resolver) carry unit tests as they
  land; Vitest runs in CI-friendly form.
- **Error UX:** every IPC failure path surfaces a clear, recoverable UI state.
- **Security:** maintain the strict process boundary; the renderer never touches
  fs/network directly.

## Stretch (post-MVP)

- Rich mod details (screenshots/GIFs/descriptions from Uiscias media).
- Client-version awareness → suggest temporarily disabling mods after a patch.
- Possible source-of-truth swaps (release `manifest.json`, or a local
  `installedMods.json` with richer metadata) — already accommodated by the
  provider interfaces.
