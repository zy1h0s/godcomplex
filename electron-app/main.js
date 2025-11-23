const { app, BrowserWindow, globalShortcut } = require('electron');
const path = require('path');
const Store = require('electron-store');
const { exec } = require('child_process');

const store = new Store();

let loginWindow = null;
let textOverlayWindow = null;
let codeOverlayWindow = null;
let imageOverlayWindow = null;
let settingsWindow = null;

// Function to make window stealth (invisible to screen capture)
function makeWindowStealth(window, callback) {
  if (process.platform === 'win32') {
    // setContentProtection blocks screen capture on some platforms
    window.setContentProtection(true);

    // Apply stealth IMMEDIATELY (no delay) - applies to ALL electron processes
    const psScript = path.join(__dirname, 'set-stealth.ps1');
    exec(`powershell.exe -ExecutionPolicy Bypass -File "${psScript}"`, (error, stdout) => {
      if (!error) {
        console.log('✅ Stealth mode applied');
        console.log(stdout);
      } else {
        console.error('❌ Stealth error:', error);
      }
      if (callback) callback();
    });

    // Also re-apply stealth every 3 seconds to ALL processes
    setInterval(() => {
      exec(`powershell.exe -ExecutionPolicy Bypass -File "${psScript}"`, () => {});
    }, 3000);
  } else {
    if (callback) callback();
  }
}

// Default settings - Small windows positioned side by side
const defaultSettings = {
  textWindow: {
    width: 350,
    height: 300,
    x: 50,
    y: 100,
    bgOpacity: 0.3,
    textOpacity: 1.0,
    fontSize: 16,
    fontFamily: 'Arial',
    textColor: '#ffffff',
    bgColor: '#000000'
  },
  codeWindow: {
    width: 350,
    height: 300,
    x: 420,
    y: 100,
    bgOpacity: 0.95,
    fontSize: 14
  },
  imageWindow: {
    width: 350,
    height: 300,
    x: 790,
    y: 100,
    bgOpacity: 0.3
  },
  clickThrough: false,
  hotkey: 'CommandOrControl+Shift+T'
};

// Get settings with defaults
function getSettings() {
  return {
    ...defaultSettings,
    ...store.get('settings', {})
  };
}

// Create login window (STEALTH MODE)
function createLoginWindow() {
  loginWindow = new BrowserWindow({
    width: 400,
    height: 550,
    resizable: false,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    show: false,  // Don't show until stealth is applied
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    autoHideMenuBar: true,
    backgroundColor: '#00000000',
    title: 'Bluetooth Device Manager'
  });

  loginWindow.loadFile('login.html');

  // Aggressive taskbar hiding
  loginWindow.setSkipTaskbar(true);

  // Make invisible to screen capture, THEN show window
  makeWindowStealth(loginWindow, () => {
    setTimeout(() => {
      if (loginWindow) loginWindow.show();
    }, 200);
  });

  loginWindow.on('closed', () => {
    loginWindow = null;
  });
}

// Create text overlay window
function createTextOverlay(session) {
  const settings = getSettings();
  const textSettings = settings.textWindow;

  textOverlayWindow = new BrowserWindow({
    width: textSettings.width,
    height: textSettings.height,
    x: textSettings.x,
    y: textSettings.y,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    show: false,  // Don't show until stealth is applied
    resizable: true,
    hasShadow: false,
    focusable: true,
    title: '',  // NO TITLE - invisible to Chrome's window picker!
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      backgroundThrottling: false
    }
  });

  // STEALTH MODE - Invisible to taskbar and screen recording
  textOverlayWindow.setSkipTaskbar(true);
  textOverlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  textOverlayWindow.setAlwaysOnTop(true, 'screen-saver', 1);
  textOverlayWindow.setIgnoreMouseEvents(settings.clickThrough);

  textOverlayWindow.loadFile('text-overlay.html');

  // Make invisible to screen capture, THEN show window
  makeWindowStealth(textOverlayWindow, () => {
    setTimeout(() => {
      if (textOverlayWindow) textOverlayWindow.show();
    }, 200);
  });

  // Send initial settings
  textOverlayWindow.webContents.on('did-finish-load', () => {
    textOverlayWindow.webContents.send('init-overlay', {
      session,
      settings: textSettings
    });
  });

  // Save position and size on move/resize
  textOverlayWindow.on('move', () => {
    const bounds = textOverlayWindow.getBounds();
    const currentSettings = getSettings();
    currentSettings.textWindow.x = bounds.x;
    currentSettings.textWindow.y = bounds.y;
    store.set('settings', currentSettings);
  });

  textOverlayWindow.on('resize', () => {
    // Don't save size if window is minimized
    if (minimizedStates.text) return;

    const bounds = textOverlayWindow.getBounds();
    const currentSettings = getSettings();
    currentSettings.textWindow.width = bounds.width;
    currentSettings.textWindow.height = bounds.height;
    store.set('settings', currentSettings);

    // Update original size for restore
    originalSizes.text.width = bounds.width;
    originalSizes.text.height = bounds.height;
  });

  textOverlayWindow.on('closed', () => {
    textOverlayWindow = null;
  });
}

// Create image overlay window
function createImageOverlay(session) {
  const settings = getSettings();
  const imageSettings = settings.imageWindow;

  imageOverlayWindow = new BrowserWindow({
    width: imageSettings.width,
    height: imageSettings.height,
    x: imageSettings.x,
    y: imageSettings.y,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    show: false,  // Don't show until stealth is applied
    resizable: true,
    hasShadow: false,
    focusable: true,
    title: '',  // NO TITLE - invisible to Chrome's window picker!
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      backgroundThrottling: false
    }
  });

  // STEALTH MODE - Invisible to taskbar and screen recording
  imageOverlayWindow.setSkipTaskbar(true);
  imageOverlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  imageOverlayWindow.setAlwaysOnTop(true, 'screen-saver', 1);
  imageOverlayWindow.setIgnoreMouseEvents(settings.clickThrough);

  imageOverlayWindow.loadFile('image-overlay.html');

  // Make invisible to screen capture, THEN show window
  makeWindowStealth(imageOverlayWindow, () => {
    setTimeout(() => {
      if (imageOverlayWindow) imageOverlayWindow.show();
    }, 200);
  });

  // Send initial settings
  imageOverlayWindow.webContents.on('did-finish-load', () => {
    imageOverlayWindow.webContents.send('init-overlay', {
      session,
      settings: imageSettings
    });
  });

  // Save position and size on move/resize
  imageOverlayWindow.on('move', () => {
    const bounds = imageOverlayWindow.getBounds();
    const currentSettings = getSettings();
    currentSettings.imageWindow.x = bounds.x;
    currentSettings.imageWindow.y = bounds.y;
    store.set('settings', currentSettings);
  });

  imageOverlayWindow.on('resize', () => {
    // Don't save size if window is minimized
    if (minimizedStates.image) return;

    const bounds = imageOverlayWindow.getBounds();
    const currentSettings = getSettings();
    currentSettings.imageWindow.width = bounds.width;
    currentSettings.imageWindow.height = bounds.height;
    store.set('settings', currentSettings);

    // Update original size for restore
    originalSizes.image.width = bounds.width;
    originalSizes.image.height = bounds.height;
  });

  imageOverlayWindow.on('closed', () => {
    imageOverlayWindow = null;
  });
}

// Create code overlay window
function createCodeOverlay(session) {
  const settings = getSettings();
  const codeSettings = settings.codeWindow;

  codeOverlayWindow = new BrowserWindow({
    width: codeSettings.width,
    height: codeSettings.height,
    x: codeSettings.x,
    y: codeSettings.y,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    show: false,  // Don't show until stealth is applied
    resizable: true,
    movable: true,
    backgroundColor: '#00000000',
    hasShadow: false,
    title: '',  // NO TITLE - invisible to Chrome's window picker!
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  // STEALTH MODE - Invisible to taskbar and screen recording
  codeOverlayWindow.setSkipTaskbar(true);
  codeOverlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  codeOverlayWindow.setAlwaysOnTop(true, 'screen-saver', 1);
  codeOverlayWindow.setIgnoreMouseEvents(settings.clickThrough);

  codeOverlayWindow.loadFile('code-overlay.html');

  // Make invisible to screen capture, THEN show window
  makeWindowStealth(codeOverlayWindow, () => {
    setTimeout(() => {
      if (codeOverlayWindow) codeOverlayWindow.show();
    }, 200);
  });

  // Send initial settings
  codeOverlayWindow.webContents.on('did-finish-load', () => {
    codeOverlayWindow.webContents.send('init-overlay', {
      session,
      settings: codeSettings
    });
  });

  // Save position and size on move/resize
  codeOverlayWindow.on('move', () => {
    const bounds = codeOverlayWindow.getBounds();
    const currentSettings = getSettings();
    currentSettings.codeWindow.x = bounds.x;
    currentSettings.codeWindow.y = bounds.y;
    store.set('settings', currentSettings);
  });

  codeOverlayWindow.on('resize', () => {
    // Don't save size if window is minimized
    if (minimizedStates.code) return;

    const bounds = codeOverlayWindow.getBounds();
    const currentSettings = getSettings();
    currentSettings.codeWindow.width = bounds.width;
    currentSettings.codeWindow.height = bounds.height;
    store.set('settings', currentSettings);

    // Update original size for restore
    originalSizes.code.width = bounds.width;
    originalSizes.code.height = bounds.height;
  });

  codeOverlayWindow.on('closed', () => {
    codeOverlayWindow = null;
  });
}

// Create settings window (STEALTH MODE)
function createSettingsWindow(windowType = 'text') {
  if (settingsWindow) {
    settingsWindow.focus();
    // Update window type even if already open
    settingsWindow.webContents.send('set-window-type', windowType);
    return;
  }

  settingsWindow = new BrowserWindow({
    width: 450,
    height: 650,
    resizable: false,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    show: false,  // Don't show until stealth is applied
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    autoHideMenuBar: true,
    backgroundColor: '#00000000',
    title: 'Bluetooth Settings'
  });

  settingsWindow.loadFile('settings.html');

  // Send window type after settings page loads
  settingsWindow.webContents.on('did-finish-load', () => {
    settingsWindow.webContents.send('set-window-type', windowType);
  });

  // Aggressive taskbar hiding
  settingsWindow.setSkipTaskbar(true);

  // Make invisible to screen capture, THEN show window
  makeWindowStealth(settingsWindow, () => {
    setTimeout(() => {
      if (settingsWindow) settingsWindow.show();
    }, 200);
  });

  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });
}

// Register global shortcuts
function registerShortcuts() {
  const settings = getSettings();

  // Toggle click-through (FIXED - proper toggle with window focus)
  globalShortcut.register(settings.hotkey, () => {
    const currentSettings = getSettings();
    currentSettings.clickThrough = !currentSettings.clickThrough;
    store.set('settings', currentSettings);

    console.log('Click-through toggled:', currentSettings.clickThrough);

    // Apply to all windows with proper handling
    if (textOverlayWindow && !textOverlayWindow.isDestroyed()) {
      textOverlayWindow.setIgnoreMouseEvents(currentSettings.clickThrough);
      if (!currentSettings.clickThrough) {
        // Re-enable interaction when disabling click-through
        textOverlayWindow.setFocusable(true);
      }
    }
    if (codeOverlayWindow && !codeOverlayWindow.isDestroyed()) {
      codeOverlayWindow.setIgnoreMouseEvents(currentSettings.clickThrough);
      if (!currentSettings.clickThrough) {
        codeOverlayWindow.setFocusable(true);
      }
    }
    if (imageOverlayWindow && !imageOverlayWindow.isDestroyed()) {
      imageOverlayWindow.setIgnoreMouseEvents(currentSettings.clickThrough);
      if (!currentSettings.clickThrough) {
        imageOverlayWindow.setFocusable(true);
      }
    }

    // Notify all windows
    if (textOverlayWindow && !textOverlayWindow.isDestroyed()) {
      textOverlayWindow.webContents.send('click-through-changed', currentSettings.clickThrough);
    }
    if (codeOverlayWindow && !codeOverlayWindow.isDestroyed()) {
      codeOverlayWindow.webContents.send('click-through-changed', currentSettings.clickThrough);
    }
    if (imageOverlayWindow && !imageOverlayWindow.isDestroyed()) {
      imageOverlayWindow.webContents.send('click-through-changed', currentSettings.clickThrough);
    }
  });

  // Open settings with Ctrl+Shift+S
  globalShortcut.register('CommandOrControl+Shift+S', () => {
    createSettingsWindow();
  });
}

// Setup IPC Handlers
function setupIPCHandlers() {
  const { ipcMain: ipc } = require('electron');

  ipc.on('login-success', (event, { user, token, session }) => {
    // Store auth
    store.set('user', user);
    store.set('token', token);
    store.set('currentSession', session);

    // Close login window
    if (loginWindow) {
      loginWindow.close();
    }

    // Create overlay windows
    createTextOverlay(session);
    createCodeOverlay(session);
    createImageOverlay(session);
  });

  ipc.on('open-settings', (event, windowType) => {
    createSettingsWindow(windowType || 'text');
  });

  ipc.on('update-settings', (event, newSettings) => {
    const currentSettings = getSettings();
    const updatedSettings = { ...currentSettings, ...newSettings };
    store.set('settings', updatedSettings);

    // Apply to text overlay
    if (textOverlayWindow && newSettings.textWindow) {
      textOverlayWindow.webContents.send('settings-updated', newSettings.textWindow);
    }

    // Apply to code overlay
    if (codeOverlayWindow && newSettings.codeWindow) {
      codeOverlayWindow.webContents.send('settings-updated', newSettings.codeWindow);
    }

    // Apply to image overlay
    if (imageOverlayWindow && newSettings.imageWindow) {
      imageOverlayWindow.webContents.send('settings-updated', newSettings.imageWindow);
    }
  });

  ipc.on('get-settings', (event) => {
    event.returnValue = getSettings();
  });

  ipc.on('logout', () => {
    store.delete('user');
    store.delete('token');
    store.delete('currentSession');

    if (textOverlayWindow) textOverlayWindow.close();
    if (codeOverlayWindow) codeOverlayWindow.close();
    if (imageOverlayWindow) imageOverlayWindow.close();
    if (settingsWindow) settingsWindow.close();

    createLoginWindow();
  });

  ipc.on('toggle-minimize', (event, windowType) => {
    let window, stateKey;

    switch(windowType) {
      case 'text':
        window = textOverlayWindow;
        stateKey = 'text';
        break;
      case 'code':
        window = codeOverlayWindow;
        stateKey = 'code';
        break;
      case 'image':
        window = imageOverlayWindow;
        stateKey = 'image';
        break;
    }

    if (!window) return;

    const isMinimized = minimizedStates[stateKey];

    if (isMinimized) {
      // Restore
      const w = originalSizes[stateKey].width;
      const h = originalSizes[stateKey].height;
      window.setContentSize(w, h, true);
      minimizedStates[stateKey] = false;
      setTimeout(() => {
        window.webContents.send('minimized-state', false);
      }, 100);
    } else {
      // Save current size
      const bounds = window.getContentBounds();
      originalSizes[stateKey].width = bounds.width;
      originalSizes[stateKey].height = bounds.height;

      // Minimize to tiny bar
      window.setContentSize(200, 30, true);
      minimizedStates[stateKey] = true;
      setTimeout(() => {
        window.webContents.send('minimized-state', true);
      }, 100);
    }
  });
}

// Minimize/Restore handlers
const minimizedStates = {
  text: false,
  code: false,
  image: false
};

const originalSizes = {
  text: { width: 350, height: 300 },
  code: { width: 350, height: 300 },
  image: { width: 350, height: 300 }
};


// App lifecycle
app.whenReady().then(() => {
  // Setup IPC handlers first
  setupIPCHandlers();

  // Always show login window (no auto-login for security)
  createLoginWindow();

  registerShortcuts();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createLoginWindow();
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});
