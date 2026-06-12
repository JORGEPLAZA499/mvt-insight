// Helpers para el flujo iOS: descarga de binarios (libimobiledevice + mvt-ios),
// detección/pairing del iPhone, creación del backup cifrado y ejecución de mvt-ios.
//
// Los binarios se publican como assets de una GitHub Release del propio repo
// (tag "ios-tools-v1"), generados por el workflow `.github/workflows/build-ios-tools.yml`.
// La app los descarga la primera vez que el usuario pulsa "iPhone" y los cachea
// en ~/Downloads/mvt-insight/ios-tools/.

const fs = require("fs");
const os = require("os");
const path = require("path");
const https = require("https");
const { spawn } = require("child_process");
const { pipeline } = require("stream/promises");

const IOS_TOOLS_REPO = "JORGEPLAZA499/mvt-insight";
const IOS_TOOLS_TAG = "ios-tools-v1";
const MIN_ARCHIVE_BYTES = 1 * 1024 * 1024; // 1 MB mínimo para considerar válido

function exeName(name) {
  return process.platform === "win32" ? `${name}.exe` : name;
}

function iosToolsDir(workDir) {
  const dir = path.join(workDir, "ios-tools");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function iosBinPath(workDir, name) {
  return path.join(iosToolsDir(workDir), "bin", exeName(name));
}

function archiveAssetName() {
  const p = process.platform;
  const a = process.arch;
  if (p === "darwin") return a === "arm64" ? "ios-tools-darwin-arm64.tar.gz" : "ios-tools-darwin-x64.tar.gz";
  if (p === "linux") return "ios-tools-linux-x64.tar.gz";
  if (p === "win32") return "ios-tools-win-x64.zip";
  throw new Error(`Plataforma no soportada para iOS: ${p}`);
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

async function downloadFile(url, dest, onProgress) {
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
  await pipeline(res, fs.createWriteStream(dest));
  const sz = fs.statSync(dest).size;
  if (sz < MIN_ARCHIVE_BYTES) {
    try { fs.unlinkSync(dest); } catch {}
    throw new Error(`Descarga inválida (${sz} bytes).`);
  }
}

function runCmd(cmd, args, opts = {}, onData) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { windowsHide: true, ...opts });
    let stdout = "";
    let stderr = "";
    p.stdout?.on("data", (d) => {
      const s = d.toString();
      stdout += s;
      onData?.(s);
    });
    p.stderr?.on("data", (d) => {
      const s = d.toString();
      stderr += s;
      onData?.(s);
    });
    p.on("error", reject);
    p.on("close", (code) => resolve({ code, stdout, stderr }));
  });
}

async function extractArchive(archivePath, destDir) {
  if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
  if (archivePath.endsWith(".zip")) {
    if (process.platform === "win32") {
      const r = await runCmd("powershell.exe", [
        "-NoProfile", "-NonInteractive", "-Command",
        `Expand-Archive -Path '${archivePath.replace(/'/g, "''")}' -DestinationPath '${destDir.replace(/'/g, "''")}' -Force`,
      ]);
      if (r.code !== 0) throw new Error(`Expand-Archive falló (${r.code}): ${r.stderr.trim()}`);
    } else {
      const r = await runCmd("unzip", ["-o", archivePath, "-d", destDir]);
      if (r.code !== 0) throw new Error(`unzip falló (${r.code}): ${r.stderr.trim()}`);
    }
  } else {
    // tar.gz / tgz — disponible en Windows 10+, macOS y Linux
    const r = await runCmd("tar", ["-xzf", archivePath, "-C", destDir]);
    if (r.code !== 0) throw new Error(`tar falló (${r.code}): ${r.stderr.trim()}`);
  }
}

async function ensureIosTools(workDir, { onProgress, log } = {}) {
  const dir = iosToolsDir(workDir);
  const requiredBins = ["idevice_id", "idevicepair", "idevicebackup2", "mvt-ios"];
  const allPresent = requiredBins.every((b) => fs.existsSync(iosBinPath(workDir, b)));
  if (allPresent) {
    log?.("✅ Herramientas iOS ya instaladas.");
    return;
  }

  log?.("🔎 Buscando última versión de las herramientas iOS…");
  let rel;
  try {
    rel = await fetchJson(`https://api.github.com/repos/${IOS_TOOLS_REPO}/releases/tags/${IOS_TOOLS_TAG}`);
  } catch (e) {
    throw new Error(
      `No se pudo obtener la release de herramientas iOS (${IOS_TOOLS_TAG}). ` +
      `Es posible que aún no esté publicada. Detalle: ${e.message}`
    );
  }
  const assetName = archiveAssetName();
  const asset = (rel.assets || []).find((a) => a.name === assetName);
  if (!asset) {
    throw new Error(
      `No se encontró el asset ${assetName} en la release ${IOS_TOOLS_TAG}. ` +
      `Espera a que el workflow build-ios-tools termine de publicar los binarios.`
    );
  }

  const archivePath = path.join(dir, assetName);
  log?.(`⬇️ Descargando ${assetName} (${(asset.size / 1024 / 1024).toFixed(1)} MB)…`);
  await downloadFile(asset.browser_download_url, archivePath, onProgress);

  log?.("📦 Extrayendo herramientas…");
  await extractArchive(archivePath, dir);
  try { fs.unlinkSync(archivePath); } catch {}

  // chmod +x en macOS/Linux
  if (process.platform !== "win32") {
    const binDir = path.join(dir, "bin");
    if (fs.existsSync(binDir)) {
      for (const f of fs.readdirSync(binDir)) {
        try { fs.chmodSync(path.join(binDir, f), 0o755); } catch {}
      }
    }
  }

  // Verifica que los binarios requeridos están donde esperamos.
  const missing = requiredBins.filter((b) => !fs.existsSync(iosBinPath(workDir, b)));
  if (missing.length) {
    throw new Error(`Faltan binarios tras extraer: ${missing.join(", ")}`);
  }
  log?.("✅ Herramientas iOS instaladas.");
}

function toolEnv(workDir) {
  const binDir = path.join(iosToolsDir(workDir), "bin");
  const libDir = path.join(iosToolsDir(workDir), "lib");
  const env = { ...process.env };
  // En macOS/Linux ayudamos al loader dinámico a encontrar las libs bundleadas.
  if (process.platform === "darwin") {
    env.DYLD_FALLBACK_LIBRARY_PATH = libDir + (env.DYLD_FALLBACK_LIBRARY_PATH ? ":" + env.DYLD_FALLBACK_LIBRARY_PATH : "");
  } else if (process.platform === "linux") {
    env.LD_LIBRARY_PATH = libDir + (env.LD_LIBRARY_PATH ? ":" + env.LD_LIBRARY_PATH : "");
  }
  env.PATH = binDir + path.delimiter + (env.PATH || "");
  return env;
}

async function listIosDevices(workDir, log) {
  const bin = iosBinPath(workDir, "idevice_id");
  const r = await runCmd(bin, ["-l"], { env: toolEnv(workDir) });
  if (r.code !== 0) {
    log?.(`idevice_id stderr: ${r.stderr.trim()}`);
    return [];
  }
  return r.stdout
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

async function pairDevice(workDir, udid, log) {
  const bin = iosBinPath(workDir, "idevicepair");
  // Primero comprobamos si ya está pareado (silencioso).
  const validate = await runCmd(bin, ["-u", udid, "validate"], { env: toolEnv(workDir) });
  if (validate.code === 0) return { paired: true, trustRequired: false };

  const pair = await runCmd(bin, ["-u", udid, "pair"], { env: toolEnv(workDir) });
  const out = (pair.stdout + pair.stderr).toLowerCase();
  if (pair.code === 0 && out.includes("success")) return { paired: true, trustRequired: false };
  if (out.includes("trust") || out.includes("user denied") || out.includes("pair: error")) {
    return { paired: false, trustRequired: true };
  }
  log?.(`idevicepair: ${(pair.stdout + pair.stderr).trim()}`);
  return { paired: false, trustRequired: true };
}

async function enableEncryption(workDir, udid, password, log) {
  const bin = iosBinPath(workDir, "idevicebackup2");
  // Si ya está activado, idevicebackup2 devuelve un error específico que ignoramos.
  const r = await runCmd(bin, ["-u", udid, "encryption", "on", password], { env: toolEnv(workDir) });
  const out = (r.stdout + r.stderr).toLowerCase();
  if (r.code === 0) return { ok: true, alreadyEnabled: false };
  if (out.includes("already") || out.includes("password protected") || out.includes("backup encryption is already enabled")) {
    return { ok: true, alreadyEnabled: true };
  }
  log?.(`idevicebackup2 encryption: ${(r.stdout + r.stderr).trim()}`);
  return { ok: false, error: r.stderr.trim() || r.stdout.trim() };
}

function createBackup(workDir, udid, destDir, onData) {
  if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
  const bin = iosBinPath(workDir, "idevicebackup2");
  return new Promise((resolve, reject) => {
    const args = ["-u", udid, "backup", "--full", destDir];
    const child = spawn(bin, args, { env: toolEnv(workDir), windowsHide: true });
    let stderr = "";
    child.stdout?.on("data", (d) => onData?.(d.toString()));
    child.stderr?.on("data", (d) => { stderr += d.toString(); onData?.(d.toString()); });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve({ ok: true, child });
      else reject(new Error(`idevicebackup2 falló (código ${code}): ${stderr.trim()}`));
    });
  });
}

function killMvtIosTree(pid) {
  try {
    if (process.platform === "win32") {
      // Mata el árbol del proceso concreto y luego barre cualquier mvt-ios.exe
      // huérfano que el bootstrapper de PyInstaller haya dejado vivo.
      try {
        require("child_process").spawnSync("taskkill", ["/F", "/T", "/PID", String(pid)], { windowsHide: true });
      } catch {}
      try {
        require("child_process").spawnSync("taskkill", ["/F", "/IM", "mvt-ios.exe", "/T"], { windowsHide: true });
      } catch {}
    } else {
      try { process.kill(pid, "SIGKILL"); } catch {}
    }
  } catch {}
}

function runMvtIos(workDir, backupDir, resultsDir, password, onData) {
  if (!fs.existsSync(resultsDir)) fs.mkdirSync(resultsDir, { recursive: true });
  const bin = iosBinPath(workDir, "mvt-ios");

  // mvt-ios check-backup NO acepta --backup-password. Hay que descifrar
  // primero con `decrypt-backup -d <dest> -p <pwd> <backup>` y luego
  // analizar la carpeta descifrada con `check-backup -o <results> <decrypted>`.
  const decryptedDir = path.join(workDir, "ios-backup-decrypted");
  try {
    if (fs.existsSync(decryptedDir)) {
      fs.rmSync(decryptedDir, { recursive: true, force: true });
    }
  } catch {}
  fs.mkdirSync(decryptedDir, { recursive: true });

  // Timeouts duros (en minutos), configurables vía env por si un backup es enorme.
  const DECRYPT_TIMEOUT_MS = Math.max(1, parseInt(process.env.MVT_DECRYPT_TIMEOUT_MIN || "30", 10)) * 60_000;
  const CHECK_TIMEOUT_MS = Math.max(1, parseInt(process.env.MVT_CHECK_TIMEOUT_MIN || "45", 10)) * 60_000;
  const STALL_HEARTBEAT_MS = 60_000; // comprueba cada 60s
  const STALL_THRESHOLD_MS = 10 * 60_000; // 10 min sin salida → heartbeat visible

  const runStep = (args, timeoutMs) =>
    new Promise((resolve, reject) => {
      const child = spawn(bin, args, { env: toolEnv(workDir), windowsHide: true });
      let stderr = "";
      let stdout = "";
      let timedOut = false;
      let lastOutputAt = Date.now();

      const bumpActivity = () => { lastOutputAt = Date.now(); };

      child.stdout?.on("data", (d) => {
        const s = d.toString();
        stdout += s;
        bumpActivity();
        onData?.(s);
      });
      child.stderr?.on("data", (d) => {
        const s = d.toString();
        stderr += s;
        bumpActivity();
        onData?.(s);
      });

      const killTimer = timeoutMs
        ? setTimeout(() => {
            timedOut = true;
            onData?.(`\n[timeout] mvt-ios ${args[0]} excedió ${Math.round(timeoutMs / 60000)} min. Matando procesos…\n`);
            killMvtIosTree(child.pid);
          }, timeoutMs)
        : null;

      const heartbeat = setInterval(() => {
        const idle = Date.now() - lastOutputAt;
        if (idle >= STALL_THRESHOLD_MS) {
          onData?.(`[heartbeat] sin salida de mvt-ios desde hace ${Math.round(idle / 60000)} min\n`);
          lastOutputAt = Date.now(); // evita spam: re-arma el contador
        }
      }, STALL_HEARTBEAT_MS);

      child.on("error", (err) => {
        if (killTimer) clearTimeout(killTimer);
        clearInterval(heartbeat);
        reject(err);
      });
      child.on("close", (code) => {
        if (killTimer) clearTimeout(killTimer);
        clearInterval(heartbeat);
        resolve({ code: timedOut ? -1 : code, stdout, stderr, timedOut });
      });
    });

  return (async () => {
    onData?.("→ Descifrando backup del iPhone…\n");
    const dec = await runStep(["decrypt-backup", "-d", decryptedDir, "-p", password, backupDir], DECRYPT_TIMEOUT_MS);
    if (dec.timedOut) {
      throw new Error(
        "mvt-ios decrypt-backup se quedó colgado (timeout). Suele ser un problema del binario de mvt-ios en Windows que deja procesos zombie. Cierra la app, comprueba que no quede ningún mvt-ios.exe en el Administrador de tareas y vuelve a intentarlo."
      );
    }
    if (dec.code !== 0) {
      const combined = (dec.stdout + dec.stderr).toLowerCase();
      if (
        combined.includes("invalid password") ||
        combined.includes("failed to decrypt") ||
        combined.includes("wrong password") ||
        combined.includes("incorrect password")
      ) {
        throw new Error("Contraseña del backup incorrecta. Vuelve al inicio y prueba de nuevo.");
      }
      throw new Error(`mvt-ios decrypt-backup falló (código ${dec.code}): ${(dec.stderr || dec.stdout).trim()}`);
    }

    onData?.("→ Analizando backup descifrado con MVT-iOS…\n");
    const chk = await runStep(["check-backup", "-o", resultsDir, decryptedDir], CHECK_TIMEOUT_MS);
    if (chk.timedOut) {
      throw new Error(
        "mvt-ios check-backup se quedó colgado (timeout). Hay procesos mvt-ios.exe que no terminan; es un problema conocido del binario en Windows. Cierra la app, mata cualquier mvt-ios.exe restante en el Administrador de tareas y vuelve a intentarlo."
      );
    }
    if (chk.code !== 0) {
      throw new Error(`mvt-ios check-backup falló (código ${chk.code}): ${(chk.stderr || chk.stdout).trim()}`);
    }

    // Limpieza best-effort del backup descifrado (puede contener datos sensibles).
    try {
      fs.rmSync(decryptedDir, { recursive: true, force: true });
    } catch {}



    return { ok: true };
  })();
}


/**
 * Comprueba si Windows tiene instalados los drivers de Apple Mobile Device.
 * `libimobiledevice` (idevice_id/idevicepair/idevicebackup2) los necesita
 * para hablar con el iPhone por USB. Se instalan con iTunes o con la app
 * gratuita "Apple Devices" de la Microsoft Store. No podemos redistribuir
 * los drivers nosotros, así que detectamos su ausencia y guiamos al usuario.
 *
 * Returns: { installed: boolean }
 */
async function checkAppleDriversWindows() {
  if (process.platform !== "win32") return { installed: true };

  // 1) Servicio "Apple Mobile Device Service" (iTunes clásico).
  try {
    const r = await runCmd("sc", ["query", "Apple Mobile Device Service"]);
    const out = (r.stdout + r.stderr).toLowerCase();
    if (r.code === 0 && /state\s*:\s*\d+\s+(running|stopped|start_pending)/.test(out)) {
      return { installed: true };
    }
  } catch {}

  // 2) Clave de registro instalada por Apple Mobile Device Support.
  try {
    const r = await runCmd("reg", [
      "query",
      "HKLM\\SOFTWARE\\Apple Inc.\\Apple Mobile Device Support",
    ]);
    if (r.code === 0) return { installed: true };
  } catch {}

  // 3) WOW64 (instalaciones 32-bit en Windows 64-bit).
  try {
    const r = await runCmd("reg", [
      "query",
      "HKLM\\SOFTWARE\\WOW6432Node\\Apple Inc.\\Apple Mobile Device Support",
    ]);
    if (r.code === 0) return { installed: true };
  } catch {}

  // 4) App "Apple Devices" (Microsoft Store) — registra un paquete AppX.
  try {
    const r = await runCmd("powershell.exe", [
      "-NoProfile", "-NonInteractive", "-Command",
      "Get-AppxPackage -Name 'AppleInc.AppleDevices' | Select-Object -ExpandProperty Name",
    ]);
    if (r.code === 0 && /AppleDevices/i.test(r.stdout)) {
      return { installed: true };
    }
  } catch {}

  return { installed: false };
}



module.exports = {
  ensureIosTools,
  listIosDevices,
  pairDevice,
  enableEncryption,
  createBackup,
  runMvtIos,
  iosBinPath,
  iosToolsDir,
  checkAppleDriversWindows,
};

