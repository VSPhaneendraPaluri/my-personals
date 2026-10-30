const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  load: () => ipcRenderer.invoke('data:load'),
  save: (d) => ipcRenderer.invoke('data:save', d),
  getPin: () => ipcRenderer.invoke('win:getPin'),
  togglePin: () => ipcRenderer.invoke('win:togglePin'),
  minimize: () => ipcRenderer.invoke('win:minimize'),
  close: () => ipcRenderer.invoke('win:close'),
  dataPath: () => ipcRenderer.invoke('win:dataPath'),
  backupHistory: () => ipcRenderer.invoke('history:backup'),
  changeDataDir: () => ipcRenderer.invoke('config:changeDataDir')
});
