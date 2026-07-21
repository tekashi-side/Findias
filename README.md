<div align="center">

# Findias

**A simple mod manager for Mabinogi.**

Browse, install, update, and remove mods for the game through a friendly
desktop app — no file copying, no batch scripts, no guesswork.

</div>

---

## What is Findias?

Mabinogi mods are small files (`.it` files) that you drop into the game's
`package` folder to change how the game looks or behaves — think revamped HP
bars, cleaner UI, and similar tweaks. Doing this by hand means hunting down the
right files, keeping them up to date, and making sure you don't accidentally
install two versions of the same thing.

**Findias does all of that for you.** It's a small Windows app that shows you a
list of available mods, tells you which ones you have installed and whether
they're out of date, and lets you install, update, disable, or remove any of
them with a single click. It can even launch the game for you when you're done.

Under the hood, Findias reads its list of mods from a public catalog (see
[How Findias works with Uiscias](#how-findias-works-with-uiscias) below) and
downloads the files straight to your game folder. There's no account to create,
no server to connect to, and nothing running in the background.

> [!WARNING]
> Any client modification is against Nexon's Terms of Service and is used
> **at your own risk**. Findias targets Mabinogi (North America).

---

## Installing Findias

1. Go to the [**Releases** page](https://github.com/tekashi-side/Findias/releases/latest).
2. Download the latest `Findias-Setup-x.y.z.exe` installer.
3. Run it. Findias installs for the current user and launches automatically.

The first time you open Findias it will ask you to point it at your Mabinogi
install — specifically the game's `appdata` folder (for example
`...\Nexon\Library\mabinogi\appdata` or, on Steam,
`...\steamapps\common\Mabinogi\appdata`). After that, you're ready to browse and
install mods.

> **Windows SmartScreen:** because the installer isn't code-signed yet, Windows
> may show a "Windows protected your PC" warning. Click **More info → Run
> anyway** to continue.

### Updates

Findias updates itself. When a new version is published it downloads in the
background and offers a "restart to install" prompt — you never have to
re-download the installer manually.

---

## What you can do with it

- **See every available mod** with its name, tags, size, download count, and
  version.
- **Know your status at a glance** — each mod shows as _Not installed_,
  _Up to date_, or _Update available_.
- **Install / Update / Delete** any mod in one click. Updating always replaces
  the old version so you never end up with conflicting duplicates.
- **Disable / Enable** a mod without deleting it (handy after a game patch).
- **Pick between variants** of a mod (e.g. two styles of the same HP bar) —
  choosing one automatically swaps out the other.
- **Avoid conflicts** — if two enabled mods would edit the same game files,
  Findias blocks the clash and tells you which mod is responsible.
- **Launch the game** directly from Findias via Steam or the Nexon Launcher.
- **Choose light / dark / system** appearance in Settings.

---

## Building from source

Most people should just use the installer above. This section is for developers
who want to build Findias themselves.

### Requirements

- **Windows** (the app ships a Windows installer; development also assumes
  Windows).
- **Node.js `24.x`** (the repo pins `24.17.0` via `.node-version`; if you use
  [fnm](https://github.com/Schniz/fnm) it picks this up automatically).
- **npm `11.x`** (ships with the Node version above).
- **git**.

### Setup

```bash
git clone https://github.com/tekashi-side/Findias.git
cd Findias
npm install
```

### Common commands

| Command             | What it does                                              |
| ------------------- | --------------------------------------------------------- |
| `npm run dev`       | Start the app in development with hot reload.             |
| `npm test`          | Run the test suite (Vitest).                              |
| `npm run typecheck` | Type-check the main, preload, and renderer code.          |
| `npm run build`     | Build the production bundle (no installer).               |
| `npm run build:win` | Build **and** package the Windows installer into `dist/`. |

After `npm run build:win`, the installer (`Findias-Setup-x.y.z.exe`) lands in the
`dist/` folder — the same artifact that ships on the Releases page.

> **Tech stack:** Electron + TypeScript, React with Tailwind CSS v4 and
> shadcn/ui, TanStack Query, and zod, built with electron-vite and packaged by
> electron-builder. See [`docs/architecture.md`](./docs/architecture.md) for the
> full technical design.

---

## How Findias works with Uiscias

Findias itself contains **no mods**. Instead it reads them from a companion
project called **[Uiscias](https://github.com/Root50199/Uiscias)**, which is the
source of truth for which mods exist and what their latest versions are.

```
   Root50199/Uiscias (GitHub Releases)          tekashi-side/Findias (this app)
   ├─ manifestCatalog.json  ── the catalog ──►   reads the catalog to know what
   └─ Uiscias<Name>_<n>.it  ── the mods ─────►   mods exist, then downloads the
                                                  chosen ones into appdata\package
```

Here's the flow:

1. **The catalog.** Each Uiscias release publishes a `manifestCatalog.json` file
   that describes every mod — its name, tags, version, size, which game files it
   touches, and any variants. Findias fetches this from the **latest** Uiscias
   release to build the list you see.
2. **The mod files.** The same release also hosts the actual `.it` mod files.
   When you click _Install_, Findias downloads the file straight from GitHub's
   download servers into your game's `package` folder.
3. **Comparing the two.** Findias also scans your `package` folder to see what's
   already installed and at what version. By comparing your folder against the
   catalog, it can tell you whether each mod is missing, current, or out of date.
4. **Keeping things clean.** Mods Findias manages are named
   `Uiscias<Name>_<version>.it`. Findias guarantees only **one** version of each
   mod is ever present, replaces old versions on update, and leaves any files it
   doesn't recognize (like the game's own files) completely untouched.

Because everything is hosted on GitHub and computed on your machine, there's no
Findias server, no database, and no hosting cost — the app just reads from
GitHub and writes to your disk.

Two important separations:

- **App updates vs. mod updates.** Findias updates _itself_ automatically, but
  installing or updating _mods_ is always something you choose to do.
- **Findias installs mods; Uiscias creates them.** Building and packing mod
  content happens upstream in the Uiscias project — Findias never edits mod
  contents, only manages the files.

---

## Privacy

Findias collects **no usage analytics**. The only thing it sends out is
**anonymous crash reports** (via Sentry) so bugs can be fixed — and that can be
turned off in Settings. Your settings (like your game folder) are stored in a
single local file on your machine.

---

## License

MIT © tekashi-side
