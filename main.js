const { app, BrowserWindow, Menu, nativeTheme } = require('electron');
const path = require('path');

nativeTheme.themeSource = 'dark';

function createWindow() {
  const win = new BrowserWindow({
    width: 430,
    height: 900,
    minWidth: 360,
    minHeight: 720,
    maxWidth: 520,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
    },
    backgroundColor: '#0a0a0a',
    title: 'FORGE — Discipline OS',
    resizable: true,
    center: true,
    autoHideMenuBar: true,
  });

  Menu.setApplicationMenu(null);
  win.loadFile(path.join(__dirname, 'web', 'index.html'));
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
