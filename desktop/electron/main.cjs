// Proceso principal de Electron — crea la ventana y ejecuta AndroidQF/MVT por debajo.
const { app, BrowserWindow, ipcMain, shell, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const os = require("os");
const https = require("https");
const { spawn } = require("child_process");
const { pipeline } = require("stream/promises");

const isDev = !app.isPackaged;

function createWindow() {
  const win = new BrowserWindow({
    width: 980,
    height: 720,
    minWidth: 760,
    minHeight: 560,
    backgroundColor: "#0b0b12",
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  win.loadFile(path.join(__dirname, "..", "dist", "index.html"));

  if (isDev) win.webContents.openDevTools({ mode: "detach" });
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

/* ---------- Helpers ---------- */

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
