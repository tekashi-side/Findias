# Project Overview

This document outlines the goals, scope, and planned features of the Mabinogi
mod manager. It is intended as reference context for both users and the AI
assisting in building this application. For details on the game's folder
structure and `.it` file naming rules, see [`game-structure.md`](./game-structure.md).

## Goal

Create a **mod manager** for the game Mabinogi that gives users an easy-to-use
**graphical user interface (GUI)** to **install**, **update**, and **delete**
mods for the game.

## Source of Truth for Mods

The mods themselves are stored and maintained in a GitHub repository called
**Uiscias**: <https://github.com/Root50199/Uiscias>.

- The mod manager treats this repository as the **source of truth** for which
  mods exist and what the latest versions are.
- Each GitHub **release** of Uiscias contains the prepacked `.it` files that are
  ready to drop into the game's `package` folder.
- The mod manager checks the **latest release** to determine what mods can
  currently be installed or updated.

> Note: All client modifications are against Nexon's Terms of Service and are
> used at the user's own risk. This tooling targets Mabinogi (North America).

## How It Fits Together

The mod manager mediates between two sources:

1. **Local game install** — specifically the `appdata\package` folder, which
   holds the installed mod `.it` files and reflects what is currently installed
   and at what version.
2. **Remote Uiscias release** — the latest GitHub release, which defines the
   available mods and their latest versions.

By comparing the two, the manager can tell, for each mod, whether it is **not
installed**, **up to date**, or **out of date** (update available).

## MVP Feature List

1. **Local settings storage** — persist the mod manager's settings locally
   (e.g. the chosen game install location and any user preferences).
2. **Choose install location** — prompt the user to select their Mabinogi
   install location (the root game folder, i.e. `appdata`) so the manager knows
   where to operate.
3. **Scan installed mods** — scan the `package` folder in the root game folder
   for all mod files that match the expected naming convention
   (`uiscias<ModFileName>_<number>.it`). This list acts as the local source of
   truth for which mods are currently installed and at what version.
4. **Check latest Uiscias release** — read the files in the latest Uiscias
   GitHub release to know which mods can currently be installed or updated.
5. **Install / update / delete via GUI** — allow the user to:
   - **Install** a mod by downloading its `.it` file from the latest release.
   - **Update** a mod by downloading the latest file and deleting the old
     version (a replace operation — see the "only the latest version" rule in
     [`game-structure.md`](./game-structure.md)).
   - **Delete** any installed Uiscias mod from the `package` folder.

## Stretch Feature List

1. **Rich mod details** — let the user select a mod in the GUI to view
   screenshots, GIFs, and/or videos along with descriptions and details
   explaining exactly what the mod does. (Uiscias stores example media, e.g. in
   its `ExampleImages` folder.)
2. **Client-version awareness** — detect when the Mabinogi client has been
   updated, cross-reference the client's version against the version expected by
   Uiscias, and if they don't match, suggest **temporarily disabling** all
   installed mods to prevent issues.
   - Disabling will likely be implemented by **moving** installed mod files into
     a sub-folder within `package` so the game does not load them on launch
     (the game loads every `.it` file directly in `package`).

## Out of Scope (for now)

- Creating or editing mod content itself (packing/repacking raw files). Mod
  authoring is handled upstream in the Uiscias repository and its tooling.
- Managing non-Uiscias mods. The manager focuses on mods identified by the
  `uiscias` prefix; other `.it` files in `package` are left untouched.
