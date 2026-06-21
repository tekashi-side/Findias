# Mabinogi Game Structure

This document summarizes how the Mabinogi game's folder structure works, with a
focus on the directories and files relevant to modding. It is intended as
reference context for both users and the AI assisting in building Findias.

## Root Game Folder (`appdata`)

The game's install location can vary, but the root game folder is **always**
named `appdata`.

```
<install path>\Nexon\Library\mabinogi\appdata
```

Example:

```
D:\Nexon\Library\mabinogi\appdata
```

Everything relevant to modding lives inside this `appdata` folder.

## Key Locations

### `appdata\data` — The mod source folder

- **Not shipped** with the public release of the game.
- Created manually by users who intend to mod the client.
- Holds the raw/unpackaged mod files that a user wants to add to the game.
- Serves as the input for the packaging process (see `UOTiaraPack.bat` below).

```
appdata\data
```

### `appdata\package` — The loaded content folder

- **Ships** with the public release of the game.
- Updated with new `data_XXXXX.it` files on each patch, where `XXXXX` is a
  number that is usually incremented sequentially with each update.
- On launch, the game loads **all** `.it` files **directly in this folder**
  into memory. Files in subfolders of `package` are **not** loaded.
- Any extra `.it` files dropped here (e.g. `eapple_01.it`) are **also**
  loaded. This is the mechanism that allows users to add their own mods.

```
appdata\package
```

#### How the client loads `.it` files (critical)

The game client is **not** smart enough to pick a "latest" version among mod
files. On launch it simply loads **every** `.it` file in the root of `package`
into memory. If multiple files represent different versions of the same mod, it
will load **all** of them, which causes conflicts and bugs.

Because only files in the root of `package` are loaded, moving a mod file into
a subfolder (e.g. `package\disabled\`) prevents the game from loading it without
deleting it.

#### `.it` file naming format

Files in `package` must follow this exact naming convention:

```
<name>_<number>.it
```

Rules:

- `<name>` must be a **single name part** — no extra underscores.
- `<name>` must **start with a letter after `d`** (e.g. `e`, `f`, `g`, ... `z`).
  Names starting with `a`–`d` are not allowed, so that mod files never collide
  with the game's official `data_XXXXX.it` files.
- `<number>` is **1 to 5 digits** (`0` to `99999`).

Examples:

- Valid: `eapple_01.it`, `zoom_711.it`, `uppercut_0.it`
- Invalid: `apple_01.it` (starts with `a`), `dapple_01.it` (starts with `d`),
  `e_chick_01.it` (extra underscore in the name part).

Notes:

- The game ships its own files using the `data_XXXXX.it` pattern.
- Findias uses its own naming convention on top of these rules — see
  [`project-overview.md`](./project-overview.md#findias-conventions).

### `appdata\UOTiaraPack.bat` — The packaging tool

- A `.bat` script located directly in `appdata`.
- Scans all files within the `appdata\data` folder.
- Packages them into a single `.it` file.
- Places the resulting `.it` file into the `appdata\package` folder so the game
  will load it on launch.

```
appdata\UOTiaraPack.bat
```

## Manual Modding Flow Summary

1. A user creates the `appdata\data` folder (if it doesn't already exist) and
   places their raw mod files inside it.
2. Running `appdata\UOTiaraPack.bat` packages the contents of `data` into a
   single `.it` file.
3. That `.it` file is written to `appdata\package` using the
   `<name>_<number>.it` naming format.
4. On the next game launch, the game loads every `.it` file in `package`,
   including the new mod file.

## Reference Layout

```
appdata\
├── data\              # User-created; raw mod files (not shipped)
├── package\           # Shipped; .it files in this folder root are loaded on launch
│   ├── data_XXXXX.it  # Official game content (sequential patch numbers)
│   └── eapple_01.it   # Example user mod file
└── UOTiaraPack.bat    # Packages data\ into a single .it in package\
```
