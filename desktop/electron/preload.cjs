// Puente seguro entre el proceso de Electron (Node) y la UI de React.
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("mvt", {
  start: (device) => ipcRenderer.invoke("mvt:start", { device }),
  cancel: () => ipcRenderer.invoke("mvt:cancel"),
  onLog: (cb) => {
    const listener = (_e, msg) => cb(msg);
    ipcRenderer.on("mvt:log", listener);
    return () => ipcRenderer.removeListener("mvt:log", listener);
  },
  onPhase: (cb) => {
    const listener = (_e, payload) => cb(payload);
    ipcRenderer.on("mvt:phase", listener);
    return () => ipcRenderer.removeListener("mvt:phase", listener);
  },
  openFolder: (p) => ipcRenderer.invoke("mvt:openFolder", p),
  openExternal: (url) => ipcRenderer.invoke("mvt:openExternal", url),
  getVersion: () => ipcRenderer.invoke("app:getVersion"),
  checkForUpdates: () => ipcRenderer.invoke("updater:check"),
  downloadUpdate: () => ipcRenderer.invoke("updater:download"),
  quitAndInstall: () => ipcRenderer.invoke("updater:quitAndInstall"),
  onUpdaterStatus: (cb) => {
    const listener = (_e, payload) => cb(payload);
    ipcRenderer.on("updater:status", listener);
    return () => ipcRenderer.removeListener("updater:status", listener);
  },
});
