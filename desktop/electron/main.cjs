// Proceso principal de Electron.
// Arranca la ventana principal de inmediato (incluso sin internet).
// La comprobación de actualizaciones se hace en background y avisa al usuario
// con un diálogo no bloqueante si encuentra una nueva versión.
const { app, BrowserWindow, ipcMain, shell, dialog, safeStorage } = require("electron");
const path = require("path");
const fs = require("fs");
const os = require("os");
const https = require("https");
const { spawn } = require("child_process");
const { pipeline } = require("stream/promises");
const { autoUpdater } = require("electron-updater");
const iosTools = require("./ios-tools.cjs");

const isDev = !app.isPackaged;

process.on("uncaughtException", (err) => {
  if (err && /Object has been destroyed/i.test(err.message || "")) {
    console.warn("[main] ignored post-destroy IPC:", err.message);
    return;
  }
  console.error("[main] uncaughtException:", err);
});
process.on("unhandledRejection", (reason) => {
  console.error("[main] unhandledRejection:", reason);
});

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
    fullscreen: true,
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
    cancelled = true;
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

function sendUpdaterStatus(payload) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("updater:status", payload);
  }
}

autoUpdater.on("checking-for-update", () => {
  sendUpdaterStatus({ state: "checking" });
});

autoUpdater.on("update-available", (info) => {
  sendUpdaterStatus({ state: "available", version: info.version });
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

autoUpdater.on("update-not-available", (info) => {
  sendUpdaterStatus({ state: "up-to-date", version: info?.version });
});

autoUpdater.on("download-progress", (p) => {
  sendUpdaterStatus({ state: "downloading", percent: p.percent || 0 });
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.setProgressBar(Math.max(0, Math.min(1, (p.percent || 0) / 100)));
  }
});

autoUpdater.on("update-downloaded", (info) => {
  sendUpdaterStatus({ state: "downloaded", version: info?.version });
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
  sendUpdaterStatus({ state: "error", error: err?.message || String(err) });
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

app.on("before-quit", () => {
  try { iosTools.killAllMvtIosProcesses(); } catch {}
});

app.on("window-all-closed", () => {
  try { iosTools.killAllMvtIosProcesses(); } catch {}
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

/* ---------- Heartbeat de actividad real ----------
 * androidqf / mvt-ios pueden pasar minutos sin imprimir nada mientras adb
 * descarga gigas de fotos. Para no mentir al usuario, vigilamos el disco:
 * cada 5 s sumamos bytes de archivos nuevos/modificados desde el arranque
 * del proceso. Si crece → está vivo.
 *
 * Limitamos el recorrido para que sea barato incluso con miles de archivos:
 * cortocircuitamos en cuanto el total crece respecto a la medición anterior.
 */
function startActivityWatcher(rootDir, startMs, send) {
  let lastBytes = 0;
  let lastChangeAt = Date.now();
  const SKIP_NAMES = new Set([
    "androidqf", "androidqf.exe",
    "node_modules", ".git",
    "ios-tools",
  ]);
  const MAX_ENTRIES = 8000;

  const measure = () => {
    let total = 0;
    let scanned = 0;
    let earlyExit = false;
    const walk = (dir, depth) => {
      if (earlyExit || depth > 8) return;
      let entries;
      try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
      catch { return; }
      for (const e of entries) {
        if (earlyExit) return;
        if (SKIP_NAMES.has(e.name)) continue;
        if (++scanned > MAX_ENTRIES) { earlyExit = true; return; }
        const full = path.join(dir, e.name);
        if (e.isDirectory()) {
          walk(full, depth + 1);
          continue;
        }
        let st;
        try { st = fs.statSync(full); } catch { continue; }
        if (st.mtimeMs < startMs - 5000) continue;
        total += st.size;
        // Cortocircuito: si ya superamos la marca anterior, sabemos que crece.
        if (total > lastBytes) { earlyExit = true; return; }
      }
    };
    walk(rootDir, 0);
    return total;
  };

  const tick = () => {
    try {
      const current = measure();
      if (current > lastBytes) {
        lastChangeAt = Date.now();
        lastBytes = current;
      }
      send("mvt:activity", { bytes: lastBytes, lastChangeAt, alive: true });
    } catch (e) {
      console.warn("[activity] tick error", e?.message);
    }
  };

  // Primer tick rápido para inicializar la cifra base.
  tick();
  const id = setInterval(tick, 5000);
  return () => { try { clearInterval(id); } catch {} };
}

let currentActivityStop = null;
function stopActivityWatcher() {
  if (currentActivityStop) {
    try { currentActivityStop(); } catch {}
    currentActivityStop = null;
  }
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

// Comprime una carpeta en un .zip usando herramientas nativas del SO.
// - Windows: PowerShell Compress-Archive (siempre disponible).
// - macOS/Linux: el comando `zip` (preinstalado en macOS; en linux suele estarlo).
function zipFolder(srcDir, destZip) {
  return new Promise((resolve, reject) => {
    let cmd, args, opts = { windowsHide: true };
    if (process.platform === "win32") {
      cmd = "powershell.exe";
      args = [
        "-NoProfile",
        "-NonInteractive",
        "-Command",
        `Compress-Archive -Path '${srcDir.replace(/'/g, "''")}\\*' -DestinationPath '${destZip.replace(/'/g, "''")}' -Force`,
      ];
    } else {
      cmd = "zip";
      args = ["-r", destZip, "."];
      opts.cwd = srcDir;
    }
    const p = spawn(cmd, args, opts);
    let stderr = "";
    p.stderr?.on("data", (d) => { stderr += d.toString(); });
    p.on("error", reject);
    p.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Compresión falló (código ${code}): ${stderr.trim()}`));
    });
  });
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

/* ---------- ADB helpers ---------- */

// Busca un binario `adb` utilizable: PATH, ANDROID_HOME, o un `adb` colocado
// junto al binario de AndroidQF (algunos paquetes lo extraen ahí).
function resolveAdbPath(workDir) {
  const name = process.platform === "win32" ? "adb.exe" : "adb";
  const candidates = [
    workDir ? path.join(workDir, name) : null,
    process.env.ANDROID_HOME ? path.join(process.env.ANDROID_HOME, "platform-tools", name) : null,
    process.env.ANDROID_SDK_ROOT ? path.join(process.env.ANDROID_SDK_ROOT, "platform-tools", name) : null,
    name, // PATH
  ].filter(Boolean);
  for (const c of candidates) {
    try {
      if (c === name) {
        // Sondea PATH con --version (rápido). Si no existe, spawn lanza ENOENT.
        const r = require("child_process").spawnSync(c, ["version"], { windowsHide: true });
        if (!r.error && r.status === 0) return c;
      } else if (fs.existsSync(c)) {
        return c;
      }
    } catch {}
  }
  return null;
}

// Devuelve el "mejor" estado entre los dispositivos listados por `adb devices`.
// Prioridad: device > unauthorized > offline > "none".
async function adbDeviceState(adbBin) {
  return new Promise((resolve) => {
    const p = spawn(adbBin, ["devices"], { windowsHide: true });
    let out = "";
    p.stdout?.on("data", (d) => { out += d.toString(); });
    p.on("error", () => resolve("none"));
    p.on("close", () => {
      const states = out
        .split(/\r?\n/)
        .slice(1)
        .map((l) => l.trim())
        .filter(Boolean)
        .map((l) => l.split(/\s+/)[1] || "");
      if (states.includes("device")) return resolve("device");
      if (states.includes("unauthorized")) return resolve("unauthorized");
      if (states.includes("offline")) return resolve("offline");
      return resolve("none");
    });
  });
}

/* ---------- IPC handlers ---------- */


let currentChild = null;
let cancelled = false;

ipcMain.handle("mvt:cancel", async () => {
  cancelled = true;
  stopActivityWatcher();
  if (currentChild) {
    try { currentChild.kill(); } catch {}
  }
  if (process.platform === "win32") {
    await new Promise((resolve) => {
      const k = spawn("taskkill", ["/F", "/IM", "androidqf.exe", "/T"], { windowsHide: true });
      k.on("close", () => resolve());
      k.on("error", () => resolve());
    });
  }
  return { ok: true };
});

ipcMain.handle("mvt:start", async (event, { device, password } = {}) => {
  const send = (channel, payload) => {
    try {
      if (event.sender && !event.sender.isDestroyed()) {
        event.sender.send(channel, payload);
      }
    } catch {
      // sender destruido entre el check y el send: ignorar
    }
  };
  cancelled = false;


  try {
    const dir = workDir();
    send("mvt:log", `📂 Carpeta de trabajo: ${dir}`);

    if (device === "android") {
      // 1. Descargar AndroidQF
      send("mvt:phase", { phase: 1, statusKey: "phaseStatus.resolvingVersion", label: "Descargando AndroidQF", progress: 0 });
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
          send("mvt:phase", { phase: 1, statusKey: "phaseStatus.downloadingBinary", label: "Descargando AndroidQF", progress: p })
        );
        if (platform !== "win32") fs.chmodSync(binPath, 0o755);
        // Tras descargar, Windows Defender suele bloquear el .exe unos segundos.
        // Esperamos un poco para reducir EBUSY al hacer spawn.
        if (platform === "win32") {
          send("mvt:log", "⏳ Esperando a que Windows libere el ejecutable…");
          await new Promise((r) => setTimeout(r, 3000));
        }
      }
      send("mvt:phase", { phase: 1, statusKey: "phaseStatus.binaryReady", label: "AndroidQF listo", progress: 1 });

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


      // 2. Esperar a que el usuario conecte y autorice el móvil.
      //    Sondeamos `adb devices` si está disponible para reflejar la realidad
      //    en la UI; si no lo está, mantenemos la fase 2 activa hasta que
      //    AndroidQF empiece a hablar con el dispositivo de verdad.
      send("mvt:phase", { phase: 2, statusKey: "phaseStatus.waitingDevice", label: "Esperando que conectes el móvil", progress: 0 });
      send("mvt:log", "🔌 Conecta el móvil por USB y acepta «Permitir depuración USB» en la pantalla.");

      const adbBin = resolveAdbPath(dir);
      if (adbBin) {
        const WAIT_DEVICE_TIMEOUT_MS = 120_000;
        const POLL_MS = 1500;
        const tStart = Date.now();
        let lastState = "";
        while (true) {
          if (cancelled) return { ok: false, error: "cancelled" };
          const state = await adbDeviceState(adbBin);
          if (state !== lastState) {
            lastState = state;
            if (state === "device") {
              send("mvt:phase", { phase: 2, statusKey: "phaseStatus.deviceDetected", label: "Dispositivo conectado", progress: 1 });
              send("mvt:log", "✅ Dispositivo detectado y autorizado.");
            } else if (state === "unauthorized") {
              send("mvt:phase", { phase: 2, statusKey: "phaseStatus.waitingUsbAuth", label: "Esperando autorización USB", progress: 0.5 });
              send("mvt:log", "⏳ Dispositivo detectado. Acepta «Permitir depuración USB» en la pantalla del móvil.");
            } else if (state === "offline") {
              send("mvt:phase", { phase: 2, statusKey: "phaseStatus.deviceOffline", label: "Dispositivo conectado pero sin responder", progress: 0.3 });
            } else {
              send("mvt:phase", { phase: 2, statusKey: "phaseStatus.waitingDevice", label: "Esperando que conectes el móvil", progress: 0 });
            }
          }
          if (state === "device") break;
          if (Date.now() - tStart > WAIT_DEVICE_TIMEOUT_MS) {
            throw new Error(
              "Dispositivo no detectado. Conecta el móvil por USB con la depuración activada y vuelve a intentarlo."
            );
          }
          await new Promise((r) => setTimeout(r, POLL_MS));
        }
      } else {
        send("mvt:log", "ℹ️ `adb` no disponible para sondear el dispositivo; AndroidQF lo gestionará internamente.");
      }

      // 3. Ejecutar AndroidQF. La fase 3 sólo se anunciará cuando detectemos
      //    salida real de recolección (heurística más abajo); mientras tanto
      //    seguimos en fase 2 con un sub-status veraz.


      // Cargamos node-pty bajo demanda: si falla, damos un mensaje claro
      // (típicamente falta el Visual C++ Redistributable en Windows).
      let pty;
      try {
        pty = require("node-pty");
      } catch (e) {
        throw new Error(
          "No se pudo iniciar el terminal interno (node-pty). " +
          (process.platform === "win32"
            ? "Instala el Visual C++ Redistributable 2015-2022 (x64) desde Microsoft y vuelve a abrir la app."
            : `Detalle: ${e.message}`)
        );
      }

      // AndroidQF usa una librería interactiva (survey) que requiere un TTY
      // real y se controla con teclas de flecha. Lanzamos el binario dentro
      // de un pseudo-terminal y enviamos escapes ANSI para responder.
      const startMs = Date.now();
      const child = pty.spawn(binPath, [], {
        name: "xterm-color",
        cwd: dir,
        cols: 120,
        rows: 30,
        env: process.env,
      });
      currentChild = child;
      currentActivityStop = startActivityWatcher(dir, startMs, send);


      // Auto-responder a los prompts interactivos de AndroidQF (librería survey).
      // Teclas ANSI: ↓ = "\x1b[B", ↑ = "\x1b[A", Enter = "\r".
      const DOWN = "\x1b[B";
      const ENTER = "\r";

      // Respuestas por label de prompt (case-insensitive, match parcial).
      // Para Yes/No, el cursor empieza en "Yes" → ENTER acepta Yes.
      const PROMPT_ANSWERS = [
        { label: /modules/i,  keys: ENTER,               note: "Modules: default (todos)" },
        { label: /backup/i,   keys: DOWN + DOWN + ENTER, note: "Backup: No backup" },
        { label: /download/i, keys: DOWN + ENTER,        note: "Download: Only non-system" },
        { label: /remove/i,   keys: ENTER,               note: "Remove: Yes (reducir tamaño)" },
        { label: /acquire/i,  keys: ENTER,               note: "Acquire: default" },
        { label: /collect/i,  keys: ENTER,               note: "Collect: default" },
      ];
      const DEFAULT_ANSWER = { keys: ENTER, note: "default (Enter)" };

      const stripAnsi = (s) =>
        s
          .replace(/\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g, "") // OSC
          .replace(/\x1b\[[0-9;?]*[ -\/]*[@-~]/g, "")         // CSI
          .replace(/\x1b[=>()*+\-.\/]./g, "")                  // charset/single-shift
          .replace(/\r(?!\n)/g, "\n")                           // CR solo -> LF
          .replace(/[\x00-\x08\x0B-\x1F\x7F]/g, "");           // otros controles
      const answeredPrompts = new Set();
      let buffer = "";
      let stableTimer = null;

      const tryAnswerPrompt = () => {
        const clean = stripAnsi(buffer);
        const lines = clean.split(/\r?\n/);
        // Recorremos de abajo arriba (últimas 20 líneas) buscando un prompt activo.
        for (let i = lines.length - 1; i >= 0 && i >= lines.length - 20; i--) {
          const m = lines[i].match(/\?\s+([A-Za-z][A-Za-z ]*?)\s*:/);
          if (!m) continue;
          const label = m[1].trim();
          // Hash del prompt = label + ~5 líneas siguientes (las opciones).
          // Así un re-pintado del MISMO prompt no se responde dos veces.
          const optionsBlob = lines.slice(i, i + 6).join("|").replace(/\s+/g, " ").trim();
          const hash = `${label}::${optionsBlob}`;
          if (answeredPrompts.has(hash)) return;

          const rule = PROMPT_ANSWERS.find((r) => r.label.test(label)) || DEFAULT_ANSWER;
          answeredPrompts.add(hash);
          send("mvt:log", `\r\n[auto] Prompt detectado "${label}" → ${rule.note}\r\n`);
          try { child.write(rule.keys); } catch (e) {
            console.warn("[androidqf pty.write]", e.message);
          }
          return;
        }
        if (/Press\s+.*Enter.*to finish/i.test(clean) && !answeredPrompts.has("__finish__")) {
          answeredPrompts.add("__finish__");
          try { child.write(ENTER); } catch {}
        }
      };

      // Mientras AndroidQF está en su survey interactivo (modules/backup/…),
      // seguimos en fase 2 con un sub-status veraz. Sólo subimos a fase 3
      // cuando vemos un marcador real de recolección.
      let inSurvey = false;
      let collectionStarted = false;

      child.onData((data) => {
        const text = data.toString();
        buffer += text;
        if (buffer.length > 16000) buffer = buffer.slice(-16000);

        send("mvt:log", stripAnsi(text));

        const clean = stripAnsi(text);

        // Detectar inicio de survey (prompt "? Modules:") → fase 2, sub-status "configuring".
        if (!collectionStarted && /\?\s+(Modules|Backup|Download|Remove|Acquire|Collect)/i.test(clean)) {
          if (!inSurvey) {
            inSurvey = true;
            send("mvt:phase", { phase: 2, statusKey: "phaseStatus.configuring", label: "Configurando análisis", progress: 0.7 });
          }
        }

        // Heurística de progreso por sección detectada → marca inicio real de fase 3.
        const markCollect = (statusKey, label, progress) => {
          collectionStarted = true;
          send("mvt:phase", { phase: 3, statusKey, label, progress });
        };
        if (/backup/i.test(clean)) markCollect("phaseStatus.backup", "Backup", 0.2);
        if (/Downloading APKs/i.test(clean)) markCollect("phaseStatus.downloadingApks", "Descargando APKs", 0.4);
        if (/Collecting information on installed apps/i.test(clean))
          markCollect("phaseStatus.analyzingApps", "Analizando apps", 0.6);
        if (/(getprop|processes|services|dumpsys|SMS|settings|logcat)/i.test(clean))
          markCollect("phaseStatus.collectingSystemInfo", "Recolectando información del sistema", 0.8);

        // Esperamos 300 ms sin nuevos datos antes de responder, para no
        // contestar a un prompt que aún se está renderizando.
        if (stableTimer) clearTimeout(stableTimer);
        stableTimer = setTimeout(tryAnswerPrompt, 300);
      });


      const exitCode = await new Promise((resolve) => {
        child.onExit(({ exitCode: code }) => resolve(code ?? 0));
      });
      currentChild = null;
      if (cancelled) {
        return { ok: false, error: "cancelled" };
      }
      if (exitCode !== 0) throw new Error(`AndroidQF terminó con código ${exitCode}`);


      // 4. Localizar el resultado de AndroidQF de forma robusta:
      //    cualquier archivo .zip o carpeta nueva (mtime posterior al inicio
      //    del proceso, con 5 s de margen) cuenta como output, sin depender
      //    de un patrón concreto de nombre.
      const threshold = startMs - 5000;
      const entries = fs.readdirSync(dir, { withFileTypes: true }).map((d) => {
        const full = path.join(dir, d.name);
        let mtime = 0;
        try { mtime = fs.statSync(full).mtimeMs; } catch {}
        return { name: d.name, full, isDir: d.isDirectory(), mtime };
      });
      const fresh = entries.filter((e) => e.mtime >= threshold);

      let zipPath;
      const freshZip = fresh
        .filter((e) => !e.isDir && e.name.toLowerCase().endsWith(".zip"))
        .sort((a, b) => b.mtime - a.mtime)[0];
      const freshDir = fresh
        .filter((e) => e.isDir)
        .sort((a, b) => b.mtime - a.mtime)[0];

      if (freshZip) {
        zipPath = freshZip.full;
        send("mvt:log", `📦 ZIP detectado: ${freshZip.name}`);
      } else if (freshDir) {
        zipPath = path.join(dir, `${freshDir.name}.zip`);
        send("mvt:log", `📦 Comprimiendo carpeta de resultados "${freshDir.name}" → ${path.basename(zipPath)}`);
        send("mvt:phase", { phase: 3, statusKey: "phaseStatus.compressing", label: "Comprimiendo resultados", progress: 0.95 });
        await zipFolder(freshDir.full, zipPath);
      } else {
        const listing = entries.map((e) => (e.isDir ? `${e.name}/` : e.name)).join(", ") || "(vacío)";
        throw new Error(
          `No se encontró ni ZIP ni carpeta de resultados en ${dir}. Contenido actual: ${listing}`
        );
      }

      send("mvt:phase", { phase: 3, statusKey: "phaseStatus.done", label: "Listo", progress: 1 });
      return { ok: true, zipPath };
    }

    if (device === "ios") {
      if (!password || typeof password !== "string" || password.length < 4) {
        throw new Error("Se requiere una contraseña de backup (mínimo 4 caracteres).");
      }
      const dir = workDir();

      // 1. Descargar/instalar herramientas iOS (libimobiledevice + mvt-ios)
      send("mvt:phase", { phase: 1, statusKey: "phaseStatus.resolvingVersion", label: "Buscando herramientas iOS", progress: 0 });
      await iosTools.ensureIosTools(dir, {
        log: (m) => send("mvt:log", m),
        onProgress: (p) => send("mvt:phase", { phase: 1, statusKey: "phaseStatus.downloadingBinary", label: "Descargando herramientas iOS", progress: p }),
      });
      send("mvt:phase", { phase: 1, statusKey: "phaseStatus.binaryReady", label: "Herramientas iOS listas", progress: 1 });

      // 1.5 Comprobar que Windows tenga los drivers de Apple Mobile Device.
      // Sin ellos, idevice_id devuelve lista vacía aunque el iPhone esté conectado.
      if (process.platform === "win32") {
        send("mvt:log", "🔎 Comprobando drivers de Apple Mobile Device…");
        const drv = await iosTools.checkAppleDriversWindows();
        if (!drv.installed) {
          send("mvt:log", "❌ Faltan los drivers de Apple Mobile Device en Windows.");
          const err = new Error("IOS_DRIVERS_MISSING");
          err.code = "IOS_DRIVERS_MISSING";
          throw err;
        }
        send("mvt:log", "✅ Drivers de Apple Mobile Device detectados.");
      }

      // 2. Esperar a que el iPhone esté conectado y pareado.
      send("mvt:phase", { phase: 2, statusKey: "phaseStatus.waitingDevice", label: "Esperando que conectes el iPhone", progress: 0 });
      send("mvt:log", "🔌 Conecta el iPhone por USB y desbloquéalo.");

      const WAIT_DEVICE_TIMEOUT_MS = 120_000;
      const POLL_MS = 1500;
      const tStart = Date.now();
      let udid = null;
      let pairedAnnounced = false;
      let hintShown = false;
      while (true) {
        if (cancelled) return { ok: false, error: "cancelled" };
        const devices = await iosTools.listIosDevices(dir, (m) => send("mvt:log", m));
        if (devices.length > 0) {
          udid = devices[0];
          send("mvt:log", `📱 iPhone detectado (UDID: ${udid.slice(0, 8)}…).`);

          send("mvt:phase", { phase: 2, statusKey: "phaseStatus.iosPairing", label: "Comprobando confianza", progress: 0.3 });
          const pairRes = await iosTools.pairDevice(dir, udid, (m) => send("mvt:log", m));
          if (pairRes.paired) {
            if (!pairedAnnounced) {
              pairedAnnounced = true;
              send("mvt:log", "✅ iPhone pareado.");
            }
            break;
          }
          if (pairRes.trustRequired) {
            send("mvt:phase", { phase: 2, statusKey: "phaseStatus.iosTrust", label: "Acepta «Confiar» en el iPhone", progress: 0.5 });
          }
        } else if (!hintShown && Date.now() - tStart > 15_000) {
          hintShown = true;
          send("mvt:log", "ℹ️ Aún no se ve el iPhone. Comprueba: cable USB de DATOS (no solo de carga), iPhone desbloqueado y, si aparece, pulsa «Confiar» en el iPhone.");
        }
        if (Date.now() - tStart > WAIT_DEVICE_TIMEOUT_MS) {
          throw new Error(
            "No se detectó el iPhone. Conéctalo por USB, desbloquéalo y, si aparece el aviso, pulsa «Confiar» en la pantalla del iPhone."
          );
        }
        await new Promise((r) => setTimeout(r, POLL_MS));
      }


      // 3. Activar cifrado del backup (si no lo estaba ya) con la contraseña del usuario.
      send("mvt:phase", { phase: 2, statusKey: "phaseStatus.iosEnablingEncryption", label: "Configurando cifrado del backup", progress: 0.7 });
      const enc = await iosTools.enableEncryption(dir, udid, password, (m) => send("mvt:log", m));
      if (!enc.ok) {
        throw new Error(
          "No se pudo activar el cifrado del backup. Si ya tenías un backup cifrado con otra contraseña en iTunes/Finder, " +
          "abre Ajustes > General > Restablecer > Restablecer historial de localización y privacidad en el iPhone, o usa la misma contraseña anterior."
        );
      }
      if (enc.alreadyEnabled) {
        send("mvt:log", "ℹ️ El cifrado ya estaba activado; usaré la contraseña que has indicado para descifrar.");
      } else {
        send("mvt:log", "🔒 Cifrado del backup activado.");
      }

      // 4. Crear backup
      const backupDir = path.join(dir, `ios-backup-${Date.now()}`);
      send("mvt:phase", { phase: 2, statusKey: "phaseStatus.iosBackup", label: "Creando backup del iPhone", progress: 0.8 });
      send("mvt:log", `💾 Backup en ${backupDir}`);
      const backupStart = Date.now();
      let lastBackupPhase = 0;
      await iosTools.createBackup(dir, udid, backupDir, (data) => {
        const text = String(data);
        send("mvt:log", text);
        // Heurística simple de progreso por mensajes conocidos
        if (/Started\s+\"Backup\"/i.test(text) && lastBackupPhase < 0.2) {
          lastBackupPhase = 0.2;
          send("mvt:phase", { phase: 2, statusKey: "phaseStatus.iosBackup", label: "Creando backup del iPhone", progress: 0.85 });
        }
        const m = text.match(/(\d{1,3})%/);
        if (m) {
          const pct = Math.min(100, parseInt(m[1], 10)) / 100;
          send("mvt:phase", { phase: 2, statusKey: "phaseStatus.iosBackup", label: "Creando backup del iPhone", progress: 0.8 + pct * 0.2 });
        }
      }).catch((e) => { throw e; });
      send("mvt:log", `✅ Backup completado en ${(Date.now() - backupStart) / 1000}s.`);

      // 5. Ejecutar mvt-ios sobre el backup
      const resultsDir = path.join(dir, `ios-results-${Date.now()}`);
      send("mvt:phase", { phase: 3, statusKey: "phaseStatus.iosAnalyzing", label: "Analizando backup con MVT", progress: 0.1 });
      await iosTools.runMvtIos(dir, backupDir, resultsDir, password, (data) => {
        const text = String(data);
        send("mvt:log", text);
        if (/Running module/i.test(text)) {
          send("mvt:phase", { phase: 3, statusKey: "phaseStatus.iosAnalyzing", label: "Analizando backup con MVT", progress: 0.5 });
        }
      });

      // 6. Comprimir resultados para mantener la misma UX que Android
      const zipPath = path.join(dir, `ios-results-${Date.now()}.zip`);
      send("mvt:phase", { phase: 3, statusKey: "phaseStatus.compressing", label: "Comprimiendo resultados", progress: 0.9 });
      await zipFolder(resultsDir, zipPath);
      send("mvt:phase", { phase: 3, statusKey: "phaseStatus.done", label: "Listo", progress: 1 });

      // Limpieza: borramos el backup (es enorme) pero conservamos los resultados.
      try { fs.rmSync(backupDir, { recursive: true, force: true }); } catch {}

      return { ok: true, zipPath };
    }

    throw new Error(`Dispositivo no soportado: ${device}`);
  } catch (err) {
    if (cancelled) return { ok: false, error: "cancelled" };
    send("mvt:log", `❌ ${err.message}`);
    return { ok: false, error: err.message };
  } finally {
    currentChild = null;
  }

});

ipcMain.handle("mvt:openFolder", async (_e, p) => {
  shell.showItemInFolder(p);
});

ipcMain.handle("mvt:openExternal", async (_e, url) => {
  shell.openExternal(url);
});

ipcMain.handle("app:getVersion", () => app.getVersion());

ipcMain.handle("updater:check", async () => {
  const currentVersion = app.getVersion();
  if (isDev) {
    return { currentVersion, updateAvailable: false, error: "dev-mode" };
  }
  try {
    const result = await autoUpdater.checkForUpdates();
    const latestVersion = result?.updateInfo?.version;
    const updateAvailable = !!latestVersion && latestVersion !== currentVersion;
    return { currentVersion, latestVersion, updateAvailable };
  } catch (err) {
    return { currentVersion, updateAvailable: false, error: err?.message || String(err) };
  }
});

ipcMain.handle("updater:download", async () => {
  try {
    await autoUpdater.downloadUpdate();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err?.message || String(err) };
  }
});

ipcMain.handle("updater:quitAndInstall", async () => {
  autoUpdater.quitAndInstall(false, true);
  return { ok: true };
});

/* ---------- Auth (token cifrado en safeStorage) ---------- */

function tokenFilePath() {
  return path.join(app.getPath("userData"), "desktop-token.enc");
}

ipcMain.handle("auth:get", async () => {
  try {
    const p = tokenFilePath();
    if (!fs.existsSync(p)) return { token: null };
    const buf = fs.readFileSync(p);
    if (safeStorage.isEncryptionAvailable()) {
      return { token: safeStorage.decryptString(buf) };
    }
    return { token: buf.toString("utf8") };
  } catch (err) {
    return { token: null, error: err?.message || String(err) };
  }
});

ipcMain.handle("auth:save", async (_e, token) => {
  try {
    if (typeof token !== "string" || !token.startsWith("dt_")) {
      return { ok: false, error: "invalid-token" };
    }
    const p = tokenFilePath();
    const data = safeStorage.isEncryptionAvailable()
      ? safeStorage.encryptString(token)
      : Buffer.from(token, "utf8");
    fs.writeFileSync(p, data, { mode: 0o600 });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err?.message || String(err) };
  }
});

ipcMain.handle("auth:clear", async () => {
  try {
    const p = tokenFilePath();
    if (fs.existsSync(p)) fs.unlinkSync(p);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err?.message || String(err) };
  }
});

ipcMain.handle("mvt:readZip", async (_e, zipPath) => {
  try {
    if (typeof zipPath !== "string" || !zipPath) {
      return { ok: false, error: "invalid-path" };
    }
    const buf = fs.readFileSync(zipPath);
    // Devolvemos el buffer como Uint8Array (Electron lo serializa por IPC).
    return { ok: true, data: buf, size: buf.length };
  } catch (err) {
    return { ok: false, error: err?.message || String(err) };
  }
});

// Streaming parser para ZIPs grandes.
//
// `mvt:readZip` carga el ZIP entero en RAM y eso se rompe con ZIPs de varios GB
// (V8 corta el buffer en torno a 2 GiB y el renderer parece colgado). Aquí
// abrimos el ZIP con yauzl en modo lazy desde disco y solo extraemos a memoria
// las entradas que el parser MVT necesita (.json y .txt). Fotos, vídeos y
// backups grandes ni se descomprimen.
ipcMain.handle("mvt:parseZipEntries", async (_e, zipPath) => {
  try {
    if (typeof zipPath !== "string" || !zipPath) {
      return { ok: false, error: "invalid-path" };
    }
    if (!fs.existsSync(zipPath)) {
      return { ok: false, error: "not-found" };
    }
    const stat = fs.statSync(zipPath);
    const yauzl = require("yauzl");
    // Tope blando por entrada para no agotar memoria si un .json es enorme.
    const MAX_ENTRY_BYTES = 64 * 1024 * 1024; // 64 MB
    const entries = await new Promise((resolve, reject) => {
      yauzl.open(zipPath, { lazyEntries: true, autoClose: true }, (err, zip) => {
        if (err) return reject(err);
        const out = [];
        zip.on("error", reject);
        zip.on("end", () => resolve(out));
        zip.on("entry", (entry) => {
          const name = entry.fileName;
          const lower = name.toLowerCase();
          // Saltamos directorios y todo lo que no sea texto/JSON.
          if (/\/$/.test(name) || (!lower.endsWith(".json") && !lower.endsWith(".txt"))) {
            return zip.readEntry();
          }
          // Saltamos entradas patológicamente grandes (probablemente no son artefactos MVT).
          if (entry.uncompressedSize > MAX_ENTRY_BYTES) {
            return zip.readEntry();
          }
          zip.openReadStream(entry, (rsErr, rs) => {
            if (rsErr) return zip.readEntry();
            const chunks = [];
            let total = 0;
            let aborted = false;
            rs.on("data", (c) => {
              total += c.length;
              if (total > MAX_ENTRY_BYTES) {
                aborted = true;
                rs.destroy();
                return;
              }
              chunks.push(c);
            });
            rs.on("error", () => zip.readEntry());
            rs.on("end", () => {
              if (!aborted) {
                try {
                  out.push({ name, text: Buffer.concat(chunks).toString("utf8") });
                } catch {}
              }
              zip.readEntry();
            });
          });
        });
        zip.readEntry();
      });
    });
    return { ok: true, entries, fileSize: stat.size };
  } catch (err) {
    return { ok: false, error: err?.message || String(err) };
  }
});
