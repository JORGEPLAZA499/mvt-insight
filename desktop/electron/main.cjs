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

/* ---------- IPC handlers ---------- */

let currentChild = null;
let cancelled = false;

ipcMain.handle("mvt:cancel", async () => {
  cancelled = true;
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

ipcMain.handle("mvt:start", async (event, { device }) => {
  const send = (channel, payload) => event.sender.send(channel, payload);
  cancelled = false;


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
      const child = pty.spawn(binPath, [], {
        name: "xterm-color",
        cwd: dir,
        cols: 120,
        rows: 30,
        env: process.env,
      });
      currentChild = child;


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

      const stripAnsi = (s) => s.replace(/\x1b\[[0-9;?]*[ -\/]*[@-~]/g, "");
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

      child.onData((data) => {
        const text = data.toString();
        buffer += text;
        if (buffer.length > 16000) buffer = buffer.slice(-16000);

        send("mvt:log", text);

        const clean = stripAnsi(text);

        // Heurística de progreso por sección detectada
        if (/backup/i.test(clean)) send("mvt:phase", { phase: 3, label: "Backup", progress: 0.2 });
        if (/Downloading APKs/i.test(clean)) send("mvt:phase", { phase: 3, label: "Descargando APKs", progress: 0.5 });
        if (/Collecting information on installed apps/i.test(clean))
          send("mvt:phase", { phase: 3, label: "Analizando apps", progress: 0.8 });

        // Esperamos 300 ms sin nuevos datos antes de responder, para no
        // contestar a un prompt que aún se está renderizando.
        if (stableTimer) clearTimeout(stableTimer);
        stableTimer = setTimeout(tryAnswerPrompt, 300);
      });

      const exitCode = await new Promise((resolve) => {
        child.onExit(({ exitCode: code }) => resolve(code ?? 0));
      });
      if (exitCode !== 0) throw new Error(`AndroidQF terminó con código ${exitCode}`);

      // 4. Buscar el ZIP generado o, si no existe, comprimir la carpeta de
      //    acquisition que AndroidQF deja en disco.
      let zipPath;
      const zipFiles = fs.readdirSync(dir).filter((f) => f.endsWith(".zip"));
      const newestZip = zipFiles
        .map((f) => ({ f, t: fs.statSync(path.join(dir, f)).mtimeMs }))
        .sort((a, b) => b.t - a.t)[0];

      if (newestZip) {
        zipPath = path.join(dir, newestZip.f);
      } else {
        // Fallback: AndroidQF guardó los datos como carpeta (nombre tipo
        // YYYYMMDDHHMMSS-XXXXXXXX). La comprimimos nosotros.
        const subdirs = fs
          .readdirSync(dir, { withFileTypes: true })
          .filter((d) => d.isDirectory() && /^\d{14}-/.test(d.name))
          .map((d) => ({ name: d.name, t: fs.statSync(path.join(dir, d.name)).mtimeMs }))
          .sort((a, b) => b.t - a.t);

        if (!subdirs.length) {
          throw new Error("No se encontró ni ZIP ni carpeta de resultados");
        }

        const folder = path.join(dir, subdirs[0].name);
        zipPath = path.join(dir, `${subdirs[0].name}.zip`);
        send("mvt:log", `📦 Comprimiendo resultados en ${zipPath}`);
        await zipFolder(folder, zipPath);
      }

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
