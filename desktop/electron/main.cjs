// Proceso principal de Electron.
// Arranca la ventana principal de inmediato (incluso sin internet).
// La comprobación de actualizaciones se hace en background y avisa al usuario
// con un diálogo no bloqueante si encuentra una nueva versión.
const { app, BrowserWindow, ipcMain, shell, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const os = require("os");
const https = require("https");
const { spawn } = require("child_process");
const { pipeline } = require("stream/promises");
const { autoUpdater } = require("electron-updater");

const isDev = !app.isPackaged;

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
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

/* ---------- Ventana principal ---------- */

let mainWindow = null;
let updatePromptShown = false;

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
    win.show();
    win.focus();
  });

  win.webContents.on("did-fail-load", (_e, code, desc, url) => {
    console.error("[main] did-fail-load:", code, desc, url);
    try {
      dialog.showErrorBox(
        "Error al cargar la app",
        `No se pudo cargar la interfaz (${code}): ${desc}\n\nURL: ${url}`,
      );
    } catch {}
  });

  win.webContents.on("render-process-gone", (_e, details) => {
    console.error("[main] render-process-gone:", details);
  });

  win.on("closed", () => {
    if (mainWindow === win) mainWindow = null;
  });

  const indexPath = path.join(__dirname, "..", "dist", "index.html");
  win.loadFile(indexPath).catch((err) => {
    console.error("[main] loadFile failed:", err);
    try {
      dialog.showErrorBox("Error al cargar la app", String(err?.message || err));
    } catch {}
  });

  if (isDev) win.webContents.openDevTools({ mode: "detach" });
}

/* ---------- Actualización en background (no bloqueante) ---------- */

function scheduleBackgroundUpdateCheck() {
  // 30s después de arrancar, comprobamos updates. Si no hay internet, el
  // error se ignora silenciosamente y la app sigue funcionando.
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch((err) => {
      console.warn("[updater] check failed (ignored):", err?.message || err);
    });
  }, 30_000);
}

autoUpdater.on("update-available", (info) => {
  if (updatePromptShown || !mainWindow || mainWindow.isDestroyed()) return;
  updatePromptShown = true;
  dialog
    .showMessageBox(mainWindow, {
      type: "info",
      buttons: ["Instalar ahora", "Más tarde"],
      defaultId: 0,
      cancelId: 1,
      title: "Actualización disponible",
      message: `Hay una nueva versión disponible (${info.version}).`,
      detail: "Puedes instalarla ahora o seguir trabajando y hacerlo más tarde.",
    })
    .then(({ response }) => {
      if (response === 0) {
        autoUpdater.downloadUpdate().catch((err) => {
          console.error("[updater] downloadUpdate failed:", err);
          dialog.showErrorBox(
            "Error al descargar la actualización",
            err?.message || String(err),
          );
        });
      }
    })
    .catch(() => {});
});

autoUpdater.on("update-not-available", () => {
  // Silencio: no hay nada que avisar al usuario.
});

autoUpdater.on("download-progress", (p) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.setProgressBar(Math.max(0, Math.min(1, (p.percent || 0) / 100)));
  }
});

autoUpdater.on("update-downloaded", () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.setProgressBar(-1);
  }
  if (!mainWindow || mainWindow.isDestroyed()) {
    autoUpdater.quitAndInstall(false, true);
    return;
  }
  dialog
    .showMessageBox(mainWindow, {
      type: "info",
      buttons: ["Reiniciar e instalar", "Al cerrar la app"],
      defaultId: 0,
      cancelId: 1,
      title: "Actualización lista",
      message: "La actualización se ha descargado.",
      detail: "Puedes reiniciar la app ahora para instalarla, o se instalará automáticamente al cerrarla.",
    })
    .then(({ response }) => {
      if (response === 0) autoUpdater.quitAndInstall(false, true);
    })
    .catch(() => {});
});

autoUpdater.on("error", (err) => {
  // No bloqueamos al usuario por un fallo de update.
  console.warn("[updater] error (ignored):", err?.message || err);
});

/* ---------- Arranque ---------- */

app.whenReady().then(() => {
  createMainWindow();
  if (!isDev) scheduleBackgroundUpdateCheck();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

/* ---------- Helpers AndroidQF ---------- */

// Tamaño mínimo razonable para un binario válido (~5 MB). Cualquier cosa por
// debajo es casi seguro un HTML de error de GitHub, no el ejecutable real.
const MIN_BINARY_BYTES = 5 * 1024 * 1024;

function workDir() {
  const dir = path.join(os.homedir(), "Downloads", "mvt-insight");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function httpsGet(url, headers = {}, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    const visit = (u, left) => {
      const req = https.get(u, { headers: { "User-Agent": "MvtInsight-Desktop", ...headers } }, (res) => {
        if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
          if (left <= 0) return reject(new Error(`Demasiados redirects para ${url}`));
          res.resume();
          return visit(res.headers.location, left - 1);
        }
        resolve(res);
      });
      req.on("error", reject);
    };
    visit(url, maxRedirects);
  });
}

async function fetchJson(url) {
  const res = await httpsGet(url, { Accept: "application/vnd.github+json" });
  if (res.statusCode !== 200) throw new Error(`HTTP ${res.statusCode} en ${url}`);
  const chunks = [];
  for await (const c of res) chunks.push(c);
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

async function resolveAndroidqfUrl() {
  const rel = await fetchJson("https://api.github.com/repos/mvt-project/androidqf/releases/latest");
  const assets = rel.assets || [];
  const platform = process.platform;
  const match = assets.find((a) => {
    const n = a.name.toLowerCase();
    if (platform === "win32") return /windows.*amd64.*\.exe$/.test(n);
    if (platform === "linux") return /linux.*amd64/.test(n) && !/arm/.test(n);
    if (platform === "darwin") return /(macos|darwin)/.test(n);
    return false;
  });
  if (!match) throw new Error(`No se encontró asset de AndroidQF para ${platform} en ${rel.tag_name}`);
  return match.browser_download_url;
}

async function download(url, dest, onProgress) {
  const res = await httpsGet(url);
  if (res.statusCode !== 200) {
    res.resume();
    throw new Error(`HTTP ${res.statusCode} al descargar ${url}`);
  }
  const total = parseInt(res.headers["content-length"] || "0", 10);
  let downloaded = 0;
  res.on("data", (chunk) => {
    downloaded += chunk.length;
    if (total) onProgress?.(downloaded / total);
  });
  const file = fs.createWriteStream(dest);
  await pipeline(res, file);
  // Valida tamaño mínimo: si la "descarga" fue un HTML de error, bórralo.
  const stat = fs.statSync(dest);
  if (stat.size < MIN_BINARY_BYTES) {
    try { fs.unlinkSync(dest); } catch {}
    throw new Error(`Descarga inválida (${stat.size} bytes). Reintenta o revisa tu conexión.`);
  }
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
      if (!["win32", "linux", "darwin"].includes(platform)) {
        throw new Error(`Plataforma no soportada: ${platform}`);
      }
      const binName = platform === "win32" ? "androidqf.exe" : "androidqf";
      const binPath = path.join(dir, binName);

      // Si hay un binario cacheado pero está corrupto (demasiado pequeño,
      // típicamente un HTML de error guardado en un intento previo), bórralo.
      if (fs.existsSync(binPath)) {
        try {
          const sz = fs.statSync(binPath).size;
          if (sz < MIN_BINARY_BYTES) {
            send("mvt:log", `⚠️ Binario cacheado inválido (${sz} bytes). Re-descargando…`);
            fs.unlinkSync(binPath);
          }
        } catch {}
      }

      if (!fs.existsSync(binPath)) {
        send("mvt:log", "🔎 Resolviendo última versión de AndroidQF…");
        const url = await resolveAndroidqfUrl();
        send("mvt:log", `⬇️ Descargando ${url}`);
        await download(url, binPath, (p) =>
          send("mvt:phase", { phase: 1, label: "Descargando AndroidQF", progress: p })
        );
        if (platform !== "win32") fs.chmodSync(binPath, 0o755);
        // Tras descargar, Windows Defender suele bloquear el .exe unos segundos.
        // Esperamos un poco para reducir EBUSY al hacer spawn.
        if (platform === "win32") {
          send("mvt:log", "⏳ Esperando a que Windows libere el ejecutable…");
          await new Promise((r) => setTimeout(r, 3000));
        }
      }
      send("mvt:phase", { phase: 1, label: "AndroidQF listo", progress: 1 });

      // En Windows, si quedó un androidqf.exe colgado de un intento previo,
      // lo cerramos para evitar EBUSY al volver a ejecutarlo.
      if (platform === "win32") {
        await new Promise((resolve) => {
          const k = spawn("taskkill", ["/F", "/IM", "androidqf.exe", "/T"], { windowsHide: true });
          k.on("close", () => resolve());
          k.on("error", () => resolve());
        });
      }

      // Comprueba que el archivo se pueda abrir (no esté bloqueado por antivirus).
      const waitUntilReadable = async (file, attempts = 10, delayMs = 1000) => {
        for (let i = 0; i < attempts; i++) {
          try {
            const fd = fs.openSync(file, "r");
            fs.closeSync(fd);
            return true;
          } catch (e) {
            send("mvt:log", `⏳ Binario aún bloqueado (${e.code || e.message}). Reintentando…`);
            await new Promise((r) => setTimeout(r, delayMs));
          }
        }
        return false;
      };
      const readable = await waitUntilReadable(binPath);
      if (!readable) {
        throw new Error(
          "Windows tiene el archivo androidqf.exe bloqueado (probablemente Windows Defender). " +
          "Espera unos segundos y vuelve a intentarlo, o añade la carpeta " +
          "C:\\Users\\<tu-usuario>\\Downloads\\mvt-insight a las exclusiones del antivirus."
        );
      }


      // 2. Conectar y autorizar
      send("mvt:phase", { phase: 2, label: "Esperando autorización USB", progress: 0 });
      send("mvt:log", "🔌 Conecta el móvil y acepta «Permitir depuración USB» en la pantalla.");

      // 3. Ejecutar AndroidQF respondiendo automáticamente a sus prompts
      send("mvt:phase", { phase: 3, label: "Recolectando datos del dispositivo", progress: 0 });

      // Reintenta spawn ante EBUSY (antivirus aún escaneando el .exe).
      const spawnWithRetry = async () => {
        let lastErr;
        for (let i = 0; i < 5; i++) {
          try {
            const c = spawn(binPath, [], { cwd: dir, windowsHide: true });
            await new Promise((resolve, reject) => {
              const onErr = (e) => { c.removeListener("spawn", onSpawn); reject(e); };
              const onSpawn = () => { c.removeListener("error", onErr); resolve(); };
              c.once("error", onErr);
              c.once("spawn", onSpawn);
            });
            return c;
          } catch (e) {
            lastErr = e;
            if (e.code !== "EBUSY" && e.code !== "UNKNOWN" && e.code !== "EPERM") throw e;
            send("mvt:log", `⏳ spawn ${e.code}, reintentando en 2s…`);
            await new Promise((r) => setTimeout(r, 2000));
          }
        }
        throw lastErr;
      };
      const child = await spawnWithRetry();
      let buffer = "";

      // Respuestas predefinidas (Everything / All / No / No)
      const answers = ["1\n", "1\n", "n\n", "n\n"];
      let answerIdx = 0;

      // Evita que un EPIPE inesperado tumbe el proceso de Electron.
      child.on("error", (e) => send("mvt:log", `[err] spawn: ${e.message}`));
      child.stdin.on("error", (e) => console.warn("[androidqf stdin]", e.message));

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
          try {
            child.stdin.write(answers[answerIdx++]);
          } catch (e) {
            console.warn("[androidqf stdin.write]", e.message);
          }
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
