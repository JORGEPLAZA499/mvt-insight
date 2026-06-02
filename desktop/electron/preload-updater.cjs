// Preload del modal de actualización: bridge mínimo con el proceso principal.
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("updater", {
  onState: (cb) => {
    ipcRenderer.on("updater:state", (_e, state) => cb(state));
  },
  startUpdate: () => ipcRenderer.send("updater:start"),
  retry: () => ipcRenderer.send("updater:retry"),
  skip: () => ipcRenderer.send("updater:skip"),
});
