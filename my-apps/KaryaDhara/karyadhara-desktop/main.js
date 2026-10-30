const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

// The folder the app itself lives in (the exe's folder when packaged portable,
// the AppImage's folder on Linux, or the project folder when run via run.bat/npm start).
// A small config file here remembers which folder the user picked for their data.
function appBaseDir() {
  return (
    process.env.PORTABLE_EXECUTABLE_DIR ||
    (process.env.APPIMAGE ? path.dirname(process.env.APPIMAGE) : __dirname)
  );
}
const CONFIG_FILE = path.join(appBaseDir(), 'karyadhara-config.json');
const LEGACY_CONFIG_FILE = path.join(appBaseDir(), 'dailydeck-config.json'); // from before the rename to Karyadhara

function readJSON(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { return fallback; }
}
function writeJSON(file, obj) {
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 2));
  fs.renameSync(tmp, file); // atomic write, avoids corrupt data
}
function isWritable(dir) {
  try { fs.mkdirSync(dir, { recursive: true }); fs.accessSync(dir, fs.constants.W_OK); return true; } catch (e) { return false; }
}

let DIR, DATA_FILE, HISTORY_FILE, WIN_FILE, BACKUP_DIR;
function setDataDir(dir) {
  DIR = dir;
  DATA_FILE = path.join(DIR, 'karyadhara-data.json');       // today's working list only
  HISTORY_FILE = path.join(DIR, 'karyadhara-history.json'); // date-wise cache, kept separate from today's file
  WIN_FILE = path.join(DIR, 'window-state.json');
  BACKUP_DIR = path.join(DIR, 'Backups');
  migrateLegacyFiles();
}

// Users coming from DailyDeck: copy their existing data/history files to the new names
// (copied, not moved, so the old files remain as a safety net).
function migrateLegacyFiles() {
  for (const [oldName, newName] of [['dailydeck-data.json', 'karyadhara-data.json'], ['dailydeck-history.json', 'karyadhara-history.json']]) {
    const from = path.join(DIR, oldName), to = path.join(DIR, newName);
    try { if (fs.existsSync(from) && !fs.existsSync(to)) fs.copyFileSync(from, to); } catch (e) { /* non-fatal */ }
  }
}

// On first run (no config yet), ask the user where to keep their data and history.
// If they cancel, fall back to a KaryadharaData folder next to the app.
function resolveDataDir() {
  const cfg = readJSON(CONFIG_FILE, null) || readJSON(LEGACY_CONFIG_FILE, null);
  if (cfg && cfg.dataDir && isWritable(cfg.dataDir)) return cfg.dataDir;

  const fallback = path.join(appBaseDir(), 'KaryadharaData');
  let chosen = fallback;
  try {
    const result = dialog.showOpenDialogSync({
      title: 'Choose a folder for Karyadhara to store your to-do data and history',
      defaultPath: appBaseDir(),
      properties: ['openDirectory', 'createDirectory'],
      buttonLabel: 'Use this folder'
    });
    if (result && result[0]) chosen = result[0];
  } catch (e) { /* dialog unavailable this early on some platforms; fall back silently */ }

  if (!isWritable(chosen)) chosen = fallback;
  isWritable(chosen);
  writeJSON(CONFIG_FILE, { dataDir: chosen });
  return chosen;
}

let win;
function createWindow() {
  const st = readJSON(WIN_FILE, { width: 380, height: 560, alwaysOnTop: false });
  win = new BrowserWindow({
    width: st.width, height: st.height, x: st.x, y: st.y,
    minWidth: 280, minHeight: 300,
    frame: false,
    transparent: false,
    backgroundColor: '#0d0e1c',
    title: 'Karyadhara',
    icon: path.join(__dirname, 'build', 'icon.png'),
    alwaysOnTop: !!st.alwaysOnTop,
    skipTaskbar: false,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false }
  });
  win.setMenuBarVisibility(false);
  win.loadFile('index.html');
  const saveState = () => {
    if (win.isDestroyed()) return;
    const b = win.getBounds();
    writeJSON(WIN_FILE, { ...b, alwaysOnTop: win.isAlwaysOnTop() });
  };
  win.on('close', saveState);
  win.on('moved', saveState);
  win.on('resized', saveState);
}

function registerIpc() {
  // Today's topics and the date-wise history live in two separate files,
  // so the history cache can be backed up or moved independently of the live list.
  ipcMain.handle('data:load', () => {
    const today = readJSON(DATA_FILE, null);
    const history = readJSON(HISTORY_FILE, {});
    if (!today) return null;
    return { date: today.date, topics: today.topics, history };
  });
  ipcMain.handle('data:save', (_e, data) => {
    writeJSON(DATA_FILE, { date: data.date, topics: data.topics });
    writeJSON(HISTORY_FILE, data.history || {});
    return true;
  });

  // Manual, on-demand backup: collates the full date-wise history (plus today's
  // current state) into one single file named with the save date-time.
  ipcMain.handle('history:backup', async () => {
    const today = readJSON(DATA_FILE, { date: null, topics: [] });
    const history = readJSON(HISTORY_FILE, {});
    if (today.date) history[today.date] = today.topics; // include today even before midnight rollover

    try { fs.mkdirSync(BACKUP_DIR, { recursive: true }); } catch (e) {}
    const defaultPath = path.join(BACKUP_DIR, timestampName());

    const result = await dialog.showSaveDialog(win, {
      title: 'Backup Karyadhara history',
      defaultPath,
      filters: [{ name: 'JSON', extensions: ['json'] }]
    });
    if (result.canceled || !result.filePath) return { ok: false };

    const collated = { exportedAt: new Date().toISOString(), dayCount: Object.keys(history).length, history };
    writeJSON(result.filePath, collated);
    return { ok: true, path: result.filePath };
  });

  // Let the user change where data/history are stored at any time, moving existing files there.
  ipcMain.handle('config:changeDataDir', async () => {
    const result = await dialog.showOpenDialog(win, {
      title: 'Choose a new folder for Karyadhara data and history',
      defaultPath: DIR,
      properties: ['openDirectory', 'createDirectory'],
      buttonLabel: 'Move data here'
    });
    if (result.canceled || !result.filePaths[0]) return { ok: false };
    const newDir = result.filePaths[0];
    if (!isWritable(newDir)) return { ok: false, error: 'That folder is not writable.' };
    if (path.resolve(newDir) === path.resolve(DIR)) return { ok: false, error: 'Already using that folder.' };

    for (const f of [DATA_FILE, HISTORY_FILE, WIN_FILE]) {
      if (fs.existsSync(f)) fs.copyFileSync(f, path.join(newDir, path.basename(f)));
    }
    writeJSON(CONFIG_FILE, { dataDir: newDir });
    setDataDir(newDir);
    return { ok: true, path: newDir };
  });

  ipcMain.handle('win:getPin', () => win.isAlwaysOnTop());
  ipcMain.handle('win:togglePin', () => {
    const v = !win.isAlwaysOnTop();
    win.setAlwaysOnTop(v, 'floating');
    const b = win.getBounds();
    writeJSON(WIN_FILE, { ...b, alwaysOnTop: v });
    return v;
  });
  ipcMain.handle('win:minimize', () => win.minimize());
  ipcMain.handle('win:close', () => win.close());
  ipcMain.handle('win:dataPath', () => ({ dataDir: DIR, dataFile: DATA_FILE, historyFile: HISTORY_FILE }));
}

function pad(n) { return String(n).padStart(2, '0'); }
function timestampName() {
  const d = new Date();
  return `Karyadhara-History-${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}.json`;
}

const lock = app.requestSingleInstanceLock();
if (!lock) app.quit();
else {
  app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
  app.whenReady().then(() => {
    setDataDir(resolveDataDir());
    registerIpc();
    createWindow();
  });
  app.on('window-all-closed', () => app.quit());
}
