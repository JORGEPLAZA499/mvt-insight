// Proceso principal de Electron — gatea el arranque con auto-actualización obligatoria,
// luego crea la ventana principal y ejecuta AndroidQF/MVT por debajo.
const { app, BrowserWindow, ipcMain, shell, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const os = require("os");
const https = require("https");
const { spawn } = require("child_process");
const { pipeline } = require("stream/promises");
const { autoUpdater } = require("electron-updater");

const isDev = !app.isPackaged;

// Logging del updater (útil para soporte). En dev, redirige a consola.
autoUpdater.logger = {
  info: (m) => console.log("[updater]", m),
  warn: (m) => console.warn("[updater]", m),
  error: (m) => console.error("[updater]", m),
  debug: (m) => console.log("[updater:debug]", m),
};
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

/* ---------- Instancia única ---------- */
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    const win = mainWindow || updaterWindow;
    if (win && !win.isDestroyed()) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });
}

/* ---------- Ventana principal ---------- */

let mainWindow = null;
let isTransitioning = false;

function createMainWindow() {
  const iconPath = path.join(__dirname, "..", "build", "icon.png");
  const opts = {
    width: 980,
    height: 720,
    minWidth: 760,
    minHeight: 560,
    backgroundColor: "#0b0b12",
    show: false,
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  };
  if (fs.existsSync(iconPath)) opts.icon = iconPath;

  const win = new BrowserWindow(opts);
  mainWindow = win;

  win.once("ready-to-show", () => {
    isTransitioning = false;
    win.show();
    win.focus();
  });

  win.webContents.on("did-fail-load", (_e, code, desc, url) => {
    console.error("[main] did-fail-load:", code, desc, url);
    isTransitioning = false;
    try {
      dialog.showErrorBox(
        "Error al cargar la app",
        `No se pudo cargar la interfaz (${code}): ${desc}\n\nURL: ${url}`
      );
    } catch {}
  });

  win.webContents.on("render-process-gone", (_e, details) => {
    console.error("[main] render-process-gone:", details);
    isTransitioning = false;
  });

  win.on("closed", () => {
    if (mainWindow === win) mainWindow = null;
  });

  const indexPath = path.join(__dirname, "..", "dist", "index.html");
  win.loadFile(indexPath).catch((err) => {
    console.error("[main] loadFile failed:", err);
    isTransitioning = false;
    try {
      dialog.showErrorBox("Error al cargar la app", String(err?.message || err));
    } catch {}
  });

  if (isDev) win.webContents.openDevTools({ mode: "detach" });
}


/* ---------- Modal de actualización (bloqueante) ---------- */

let updaterWindow = null;
let updateMandatory = false; // true cuando ya sabemos que hay update disponible
let updaterAllowClose = false;

function createUpdaterWindow() {
  updaterWindow = new BrowserWindow({
    width: 440,
    height: 240,
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    closable: false,
    frame: false,
    alwaysOnTop: true,
    backgroundColor: "#0b0b12",
    webPreferences: {
      preload: path.join(__dirname, "preload-updater.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  updaterWindow.loadFile(path.join(__dirname, "updater.html"));

  // Bloquea cualquier intento de cerrar mientras la actualización sea obligatoria.
  updaterWindow.on("close", (e) => {
    if (!updaterAllowClose && updateMandatory) {
      e.preventDefault();
    }
  });

  return updaterWindow;
}

function sendUpdaterState(state) {
  if (updaterWindow && !updaterWindow.isDestroyed()) {
    updaterWindow.webContents.send("updater:state", state);
  }
}

function closeUpdaterWindow() {
  updaterAllowClose = true;
  if (updaterWindow && !updaterWindow.isDestroyed()) {
    updaterWindow.destroy();
  }
  updaterWindow = null;
}

/* ---------- Flujo de actualización ---------- */

function checkForUpdates() {
  // Espera a que el HTML cargue antes de enviar el primer estado.
  updaterWindow.webContents.once("did-finish-load", () => {
    sendUpdaterState({
      title: "Buscando actualizaciones…",
      message: "Comprobando si hay una nueva versión disponible.",
      showSpinner: true,
    });

    autoUpdater.checkForUpdates().catch((err) => {
      // Capturado también por el evento "error", pero por si acaso.
      console.error("[updater] checkForUpdates rejected:", err);
    });
  });
}

autoUpdater.on("update-available", (info) => {
  updateMandatory = true;
  sendUpdaterState({
    title: "Actualización disponible",
    message: "Para continuar usando MVT Insight debes instalar la última versión.",
    version: `Versión ${info.version}`,
    showSpinner: false,
    primaryLabel: "Actualizar ahora",
    primaryAction: "startUpdate",
  });
});

autoUpdater.on("update-not-available", () => {
  isTransitioning = true;
  closeUpdaterWindow();
  setImmediate(() => createMainWindow());
});


autoUpdater.on("download-progress", (p) => {
  sendUpdaterState({
    title: "Descargando actualización…",
    message: `${Math.round(p.percent)}% — ${formatBytes(p.transferred)} de ${formatBytes(p.total)}`,
    showSpinner: false,
    progress: p.percent,
  });
});

autoUpdater.on("update-downloaded", () => {
  sendUpdaterState({
    title: "Instalando…",
    message: "La app se reiniciará automáticamente en unos segundos.",
    showSpinner: true,
  });
  // Pequeño delay para que se lea el mensaje, luego instala y reinicia.
  setTimeout(() => {
    updaterAllowClose = true;
    autoUpdater.quitAndInstall(true, true);
  }, 1200);
});

autoUpdater.on("error", (err) => {
  console.error("[updater] error:", err);
  // Error de red o servidor: NO bloqueamos al usuario, pero le avisamos.
  updateMandatory = false;
  sendUpdaterState({
    title: "No se pudo comprobar actualizaciones",
    message: "Revisa tu conexión a internet. Puedes reintentar o continuar.",
    showSpinner: false,
    primaryLabel: "Reintentar",
    primaryAction: "retry",
    showSecondary: true,
  });
});

ipcMain.on("updater:start", () => {
  sendUpdaterState({
    title: "Descargando actualización…",
    message: "Preparando la descarga.",
    showSpinner: true,
    progress: 0,
  });
  autoUpdater.downloadUpdate().catch((err) => {
    console.error("[updater] downloadUpdate failed:", err);
    sendUpdaterState({
      title: "Error al descargar",
      message: err.message || "No se pudo descargar la actualización.",
      showSpinner: false,
      primaryLabel: "Reintentar",
      primaryAction: "startUpdate",
    });
  });
});

ipcMain.on("updater:retry", () => {
  sendUpdaterState({
    title: "Buscando actualizaciones…",
    message: "Reintentando…",
    showSpinner: true,
  });
  autoUpdater.checkForUpdates().catch(() => {});
});

ipcMain.on("updater:skip", () => {
  // Solo permitido cuando NO hay update confirmado (escenario offline).
  if (updateMandatory) return;
  isTransitioning = true;
  closeUpdaterWindow();
  setImmediate(() => createMainWindow());
});

function formatBytes(b) {
  if (!b) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(b) / Math.log(k));
  return (b / Math.pow(k, i)).toFixed(1) + " " + sizes[i];
}

/* ---------- Arranque ---------- */

app.whenReady().then(() => {
  if (isDev) {
    // En desarrollo no hay metadatos publicados; saltamos el updater.
    createMainWindow();
  } else {
    createUpdaterWindow();
    checkForUpdates();
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on("window-all-closed", () => {
  if (isTransitioning) return;
  if (process.platform !== "darwin") app.quit();
});

/* ---------- Helpers AndroidQF ---------- */

const ANDROIDQF_RELEASES = {
  win32: "https://github.com/mvt-project/androidqf/releases/latest/download/androidqf_windows_amd64.exe",
  linux: "https://github.com/mvt-project/androidqf/releases/latest/download/androidqf_linux_amd64",
  darwin: "https://github.com/mvt-project/androidqf/releases/latest/download/androidqf_darwin_amd64",
};

function workDir() {
  const dir = path.join(os.homedir(), "Downloads", "mvt-insight");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

async function download(url, dest, onProgress) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const get = (u) =>
      https.get(u, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          return get(res.headers.location);
        }
        if (res.statusCode !== 200) {
          return reject(new Error(`HTTP ${res.statusCode}`));
        }
        const total = parseInt(res.headers["content-length"] || "0", 10);
        let downloaded = 0;
        res.on("data", (chunk) => {
          downloaded += chunk.length;
          if (total) onProgress?.(downloaded / total);
        });
        pipeline(res, file).then(resolve).catch(reject);
      });
    get(url).on("error", reject);
  });
}

/* ---------- IPC handlers ---------- */

ipcMain.handle("mvt:start", async (event, { device }) => {
  const send = (channel, payload) => event.sender.send(channel, payload);

  try {
    const dir = workDir();
    send("mvt:log", `📂 Carpeta de trabajo: ${dir}`);

    if (device === "android") {
      // 1. Descargar AndroidQF
      send("mvt:phase", { phase: 1, label: "Descargando AndroidQF", progress: 0 });
      const platform = process.platform;
      const url = ANDROIDQF_RELEASES[platform];
      if (!url) throw new Error(`Plataforma no soportada: ${platform}`);
      const binName = platform === "win32" ? "androidqf.exe" : "androidqf";
      const binPath = path.join(dir, binName);

      if (!fs.existsSync(binPath)) {
        await download(url, binPath, (p) =>
          send("mvt:phase", { phase: 1, label: "Descargando AndroidQF", progress: p })
        );
        if (platform !== "win32") fs.chmodSync(binPath, 0o755);
      }
      send("mvt:phase", { phase: 1, label: "AndroidQF listo", progress: 1 });

      // 2. Conectar y autorizar
      send("mvt:phase", { phase: 2, label: "Esperando autorización USB", progress: 0 });
      send("mvt:log", "🔌 Conecta el móvil y acepta «Permitir depuración USB» en la pantalla.");

      // 3. Ejecutar AndroidQF respondiendo automáticamente a sus prompts
      send("mvt:phase", { phase: 3, label: "Recolectando datos del dispositivo", progress: 0 });

      const child = spawn(binPath, [], { cwd: dir });
      let buffer = "";

      // Respuestas predefinidas (Everything / All / No / No)
      const answers = ["1\n", "1\n", "n\n", "n\n"];
      let answerIdx = 0;

      child.stdout.on("data", (data) => {
        const text = data.toString();
        buffer += text;
        send("mvt:log", text);

        // Heurística de progreso por sección detectada
        if (/backup/i.test(text)) send("mvt:phase", { phase: 3, label: "Backup", progress: 0.2 });
        if (/Downloading APKs/i.test(text)) send("mvt:phase", { phase: 3, label: "Descargando APKs", progress: 0.5 });
        if (/Collecting information on installed apps/i.test(text))
          send("mvt:phase", { phase: 3, label: "Analizando apps", progress: 0.8 });

        // Detectar prompts y enviar la respuesta correspondiente
        if (/\?\s*$/.test(text) && answerIdx < answers.length) {
          child.stdin.write(answers[answerIdx++]);
        }
      });

      child.stderr.on("data", (data) => send("mvt:log", `[err] ${data.toString()}`));

      const exitCode = await new Promise((res) => child.on("close", res));
      if (exitCode !== 0) throw new Error(`AndroidQF terminó con código ${exitCode}`);

      // 4. Buscar el ZIP generado y devolverlo
      const files = fs.readdirSync(dir).filter((f) => f.endsWith(".zip"));
      const newest = files
        .map((f) => ({ f, t: fs.statSync(path.join(dir, f)).mtimeMs }))
        .sort((a, b) => b.t - a.t)[0];
      if (!newest) throw new Error("No se encontró el ZIP de resultados");

      const zipPath = path.join(dir, newest.f);
      send("mvt:phase", { phase: 3, label: "Listo", progress: 1 });
      return { ok: true, zipPath };
    }

    // iOS solo en macOS — pendiente Fase 2
    throw new Error("El flujo iOS estará disponible en la próxima versión.");
  } catch (err) {
    send("mvt:log", `❌ ${err.message}`);
    return { ok: false, error: err.message };
  }
});

ipcMain.handle("mvt:openFolder", async (_e, p) => {
  shell.showItemInFolder(p);
});

ipcMain.handle("mvt:openExternal", async (_e, url) => {
  shell.openExternal(url);
});
