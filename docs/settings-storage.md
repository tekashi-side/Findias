# Settings Storage

Where Findias persists user settings, and why it lives outside the project.

## Location

Findias writes a single JSON file, `findias-settings.json`, to Electron's
per-user **`userData`** directory (`app.getPath('userData')`). On Windows this
resolves to `%APPDATA%\<app name>\`.

The app name comes from `package.json`'s `"name"` field (`findias`) during
development, and from the `build.productName` field (`Findias`) in a packaged
build. **On Windows those would collide:** the filesystem is case-insensitive, so
`%APPDATA%\findias` and `%APPDATA%\Findias` are the _same_ folder. To keep dev
runs from sharing settings and caches with the installed app, the main process
overrides `userData` to a distinct `findias-dev` folder in development only:

```ts
// src/main/index.ts — runs before anything reads userData
if (!app.isPackaged) {
  app.setPath('userData', join(app.getPath('appData'), 'findias-dev'));
}
```

The result is two genuinely separate folders:

| Context      | Command / build | Folder                                                 |
| ------------ | --------------- | ------------------------------------------------------ |
| Development  | `npm run dev`   | `%APPDATA%\findias-dev\` (dev-only `setPath` override) |
| Packaged app | installed build | `%APPDATA%\Findias\` (from `build.productName`)        |

Example (development, on this machine):

```
C:\Users\<user>\AppData\Roaming\findias-dev\findias-settings.json
```

Example contents:

```json
{
  "gameRootPath": "D:\\Nexon\\Library\\mabinogi\\appdata",
  "shouldIncludePrereleases": false
}
```

> `shouldIncludePrereleases` defaults to `false`. Opting in is a **dev-only feature
> flag** (`prereleases`, see [`src/main/featureFlags.ts`](../src/main/featureFlags.ts)):
> in a packaged build the flag is off, so the toggle is hidden and the effective
> value is forced to `false` no matter what this file contains.

> Because dev and packaged builds now use different folders, they keep
> **independent** settings. Choosing a game folder in `npm run dev` will not
> carry over to the installed app, and vice versa. This is intentional.

Each `userData` folder also contains Chromium-managed directories Electron
creates automatically (`Cache`, `Code Cache`, `blob_storage`, etc.) — those are
not ours and can be ignored. `setPath('userData', ...)` relocates those caches
too, so the dev profile is fully self-contained.

## Why it lives here (not in the repo)

- It is **per-user, per-machine** state, not source — it must not be committed.
- It survives app rebuilds, reinstalls, and updates.
- `app.getPath('userData')` is the OS-appropriate, standard location across
  platforms, so we never hardcode a path.

The write logic is in [`src/main/settingsStore.ts`](../src/main/settingsStore.ts):

```ts
const settingsPath = (): string => join(app.getPath('userData'), SETTINGS_FILE);
```

If the file is missing or corrupt, `loadSettings()` returns defaults, so a
bad/edited file can never crash startup.

## Finding or opening it

- Log the directory from the main process: `console.log(app.getPath('userData'))`.
- Or open it in the file explorer at runtime:
  `shell.openPath(app.getPath('userData'))` (handy for a future
  "Open settings folder" affordance in the UI).
