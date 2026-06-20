const { app, BrowserWindow, Menu, nativeTheme, protocol, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

nativeTheme.themeSource = 'dark';

const isDev = !app.isPackaged;
const DEV_URL = 'http://localhost:8081';
const WEB_DIR = path.join(__dirname, 'web');

const MIME = {
  '.html':  'text/html; charset=utf-8',
  '.js':    'application/javascript',
  '.css':   'text/css',
  '.json':  'application/json',
  '.png':   'image/png',
  '.jpg':   'image/jpeg',
  '.gif':   'image/gif',
  '.svg':   'image/svg+xml',
  '.ico':   'image/x-icon',
  '.woff':  'font/woff',
  '.woff2': 'font/woff2',
  '.ttf':   'font/ttf',
};

// Must happen before app.ready() — registers forge:// as a secure, standard scheme
protocol.registerSchemesAsPrivileged([
  { scheme: 'forge', privileges: { secure: true, standard: true, supportFetchAPI: true, corsEnabled: true } }
]);

app.whenReady().then(() => {
  // Serve the bundled web build via forge:// — no TCP server, no port conflicts
  protocol.handle('forge', (request) => {
    const url = new URL(request.url);
    let filePath = path.join(WEB_DIR, url.pathname);

    try {
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) filePath = path.join(WEB_DIR, 'index.html');
    } catch {
      // path doesn't exist → SPA fallback
      filePath = path.join(WEB_DIR, 'index.html');
    }

    if (!fs.existsSync(filePath)) filePath = path.join(WEB_DIR, 'index.html');

    const data = fs.readFileSync(filePath);
    const ext = path.extname(filePath).toLowerCase();
    return new Response(data, { headers: { 'content-type': MIME[ext] || 'application/octet-stream' } });
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

function createWindow() {
  const win = new BrowserWindow({
    width: 430,
    height: 900,
    minWidth: 360,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    backgroundColor: '#0a0a0a',
    title: 'FORGE — Discipline OS',
    resizable: true,    // can resize freely
    maximizable: true,  // fullscreen works
    center: true,
    autoHideMenuBar: true,
  });

  Menu.setApplicationMenu(null);

  if (isDev) {
    win.webContents.openDevTools({ mode: 'detach' });
    win.loadURL(DEV_URL);
    win.webContents.on('did-fail-load', () => {
      win.webContents.executeJavaScript(`
        document.body.style.cssText='margin:0;background:#0a0a0a;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;';
        document.body.innerHTML='<div style="text-align:center;padding:40px"><div style="font-size:48px;margin-bottom:16px">🔥</div><h2 style="color:#FF6B2C;margin:0 0 12px">FORGE Dev Mode</h2><p style="color:#888;margin:0 0 20px">Expo dev server not running.</p><p style="background:#1a1a1a;padding:12px 20px;border-radius:8px;font-family:monospace;color:#FF6B2C">cd forge<br>npx expo start --web</p></div>';
      `).catch(() => {});
    });
    return;
  }

  // Production: load app via forge:// custom protocol (no port, no TCP server)
  win.loadURL('forge://localhost/');

  // Auto-update: detect new GitHub releases and prompt user to restart
  try {
    const { autoUpdater } = require('electron-updater');
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.on('update-downloaded', (info) => {
      dialog.showMessageBox(win, {
        type: 'info',
        title: 'FORGE Update Ready',
        message: `Version ${info.version} downloaded.`,
        detail: 'Restart FORGE to apply the update.',
        buttons: ['Restart Now', 'Later'],
        defaultId: 0,
      }).then(({ response }) => {
        if (response === 0) autoUpdater.quitAndInstall();
      });
    });
    autoUpdater.on('error', () => {});
    autoUpdater.checkForUpdates();
  } catch (e) {}
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
