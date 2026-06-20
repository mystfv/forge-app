const { app, BrowserWindow, Menu, nativeTheme, dialog } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');
const urlModule = require('url');

nativeTheme.themeSource = 'dark';

const isDev = !app.isPackaged;
const DEV_URL = 'http://localhost:8081';
const WEB_DIR = path.join(__dirname, 'web');
const BASE_PORT = 45678;

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

function requestHandler(req, res) {
  const parsed = urlModule.parse(req.url);
  let filePath = path.join(WEB_DIR, parsed.pathname);

  try {
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) filePath = path.join(WEB_DIR, 'index.html');
  } catch (e) {
    filePath = path.join(WEB_DIR, 'index.html');
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}

function startServer() {
  return new Promise((resolve, reject) => {
    const tryPort = (port) => {
      if (port > BASE_PORT + 20) { reject(new Error('No available port')); return; }
      const server = http.createServer(requestHandler);
      server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') tryPort(port + 1);
        else reject(err);
      });
      server.listen(port, '127.0.0.1', () => resolve({ server, port }));
    };
    tryPort(BASE_PORT);
  });
}

const WIN_OPTIONS = {
  width: 430,
  height: 900,
  minWidth: 360,
  minHeight: 720,
  maxWidth: 520,
  webPreferences: {
    nodeIntegration: false,
    contextIsolation: true,
  },
  backgroundColor: '#0a0a0a',
  title: 'FORGE — Discipline OS',
  resizable: true,
  maximizable: false,   // prevents fullscreen stretching across desktop
  center: true,
  autoHideMenuBar: true,
};

async function createWindow() {
  const win = new BrowserWindow(WIN_OPTIONS);
  Menu.setApplicationMenu(null);

  if (isDev) {
    win.webContents.openDevTools({ mode: 'detach' });
    win.loadURL(DEV_URL);
    win.webContents.on('did-fail-load', () => {
      win.webContents.executeJavaScript(`
        document.body.style.cssText='margin:0;background:#0a0a0a;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;';
        document.body.innerHTML='<div style="text-align:center;padding:40px"><div style="font-size:48px;margin-bottom:16px">🔥</div><h2 style="color:#FF6B2C;margin:0 0 12px">FORGE Dev Mode</h2><p style="color:#888;margin:0 0 20px">Expo dev server not running.</p><p style="background:#1a1a1a;padding:12px 20px;border-radius:8px;font-family:monospace;color:#FF6B2C">cd forge<br>npx expo start --web</p></div>';
      `);
    });
    return;
  }

  // Production: spin up local HTTP server then load
  let port;
  try {
    ({ port } = await startServer());
  } catch (err) {
    dialog.showErrorBox('FORGE — Startup Error', `Could not start local server: ${err.message}`);
    app.quit();
    return;
  }

  win.loadURL(`http://127.0.0.1:${port}`);

  // If the page still fails to load, show a diagnostic overlay
  win.webContents.on('did-fail-load', (event, code, desc) => {
    win.webContents.executeJavaScript(`
      document.body.style.cssText='margin:0;background:#0a0a0a;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;';
      document.body.innerHTML='<div style="text-align:center;padding:40px"><div style="font-size:48px">🔥</div><h2 style="color:#FF6B2C">Failed to load FORGE</h2><p style="color:#888">Error ${code}: ${desc}</p><p style="color:#555;font-size:12px">Try restarting the app</p></div>';
    `).catch(() => {});
  });

  // Auto-update: check GitHub releases silently on every launch
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

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
