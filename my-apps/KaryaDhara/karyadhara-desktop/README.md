# Karyadhara (desktop)

*कार्यधारा — a steady stream of work.* A small, frameless daily to-do widget for the desktop.

## Features
- Topics and sub-topics; tick to strike through
- Auto-organize: open topics move up, and open sub-topics move up within each topic
- Live progress bar for today in the header
- 📌 pin button keeps the window always on top (remembered between runs)
- Window position and size are remembered
- At midnight (or on next launch) the day is saved to history; unfinished items carry over to the new day
- 🕘 history viewer: pick any past date to see what was done
- 💾 manual backup: collates the full date-wise history into one file, named with the save date-time (e.g. `Karyadhara-History-2026-10-30_063412.json`), saved wherever you choose (defaults to a `Backups` subfolder)
- 🧹 clear all of today's topics in one go (with confirmation); per-item delete (🗑) remains for single topics/sub-topics
- 📁 **you choose where data is stored.** On first launch, Karyadhara asks you to pick a folder for `karyadhara-data.json` (today's list) and `karyadhara-history.json` (date-wise history) — defaulting to a `KaryadharaData` folder next to the app if you skip the picker. The 📁 button lets you move everything to a different folder later at any time. This choice is remembered in `karyadhara-config.json` next to the app.
- Fully offline; nothing is written to Windows `AppData`/the OS user-data folder unless you explicitly pick it as your storage location

## Run from source
    npm install
    npm start

## Build portable executables (needs Node.js 18+)
    npm run build:win      # -> dist/Karyadhara-portable.exe (single file, no installer)
    npm run build:linux    # -> dist/*.AppImage (run on Linux)
    npm run build:mac      # -> dist/*.dmg (must be run on a Mac)

Build each platform on its own OS (or in CI) for best results.

## Upgrading from DailyDeck

Nothing to do. On first launch Karyadhara finds your old `dailydeck-config.json`, and copies `dailydeck-data.json` /
`dailydeck-history.json` to the new `karyadhara-*` names in the same folder. The old files are left untouched as a safety net —
delete them whenever you like.

## App icon

`build/icon.png` (512×512) is used for the window, the Linux AppImage and (converted by electron-builder) the Windows `.exe`.
Replace it with your own artwork if you prefer — keep it square and at least 256×256.
