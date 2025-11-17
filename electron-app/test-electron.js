console.log('Testing electron import...');
const electron = require('electron');
console.log('typeof electron:', typeof electron);
console.log('electron constructor:', electron.constructor.name);
console.log('Is array?:', Array.isArray(electron));
console.log('Is string?:', typeof electron === 'string');
console.log('electron value:', electron);
console.log('electron.app:', electron.app);
console.log('electron.ipcMain:', electron.ipcMain);
