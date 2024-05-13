const { app, BrowserWindow } = require('electron');
const { powerSaveBlocker } = require('electron');
const { ipcMain } = require('electron');

let mainWindow;
let appBlockerId, displayBlockerId;
let bWindowVisibility;
let bShowConsole = !true;

// Append switches to command line before the app is ready.
// Change the autoplay policy in Chromium, removing restrictions on autoplaying audio.
// Prevent the Electron app's background tabs or windows from being throttled.
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');

function createWindow() {
  // Create the browser window.
  bWindowVisibility = true;
  mainWindow = new BrowserWindow({
    width: 640,
    height: 480,
    titleBarStyle: 'hidden',
    webPreferences: {
      nodeIntegration: true, /* If you rely on Node.js modules in p5 */
      contextIsolation: false, /* To allow more straightforward access between p5 and Node */
      backgroundThrottling: false,
      pageVisibility: true, 
      enableRemoteModule: true, /* Enables the remote module if you need to use it */
      sandbox: false /* Disables the Chrome sandbox for the renderer processes */
    }
  });

  // Load the p5.js HTML file
  mainWindow.loadFile('index.html');

  // Additional window settings
  mainWindow.setAlwaysOnTop(true);
  mainWindow.setVisibleOnAllWorkspaces(true);
  mainWindow.webContents.setBackgroundThrottling(false);
  mainWindow.setPosition(0,0);
  mainWindow.setContentSize(640,480);
  if (bShowConsole){
    // Note: showing the console also produces a harmless error: 
    // "Request Autofill.enable failed, source: devtools://devtools/" etc.
    mainWindow.setContentSize(1280,480);
    mainWindow.webContents.openDevTools();
  }

  // Start power-save blockers
  appBlockerId = powerSaveBlocker.start('prevent-app-suspension');
  displayBlockerId = powerSaveBlocker.start('prevent-display-sleep');
  mainWindow.on('closed', () => {
    mainWindow = null;
    powerSaveBlocker.stop(appBlockerId);
    powerSaveBlocker.stop(displayBlockerId);
  });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Respond to IPC messages
ipcMain.on('toggle-window', (event) => {
  bWindowVisibility = !bWindowVisibility;
  if (!bWindowVisibility){
    mainWindow.setContentSize(1,1); 
  } else {
    mainWindow.setContentSize(640,480); 
  }
});