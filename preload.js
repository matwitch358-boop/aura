const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('aura', {
  getSettings: () => ipcRenderer.invoke('settings:get'),
  setSettings: (p) => ipcRenderer.send('settings:set', p),
  ignoreMouse: (v) => ipcRenderer.send('mouse:ignore', v),
  onExpand: (cb) => ipcRenderer.on('expand', cb)
});
