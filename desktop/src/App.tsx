import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { LanguageSelector } from "./components/LanguageSelector";
import logoUrl from "./assets/logo.png";
import { parseMvtEntries, parseMvtFiles } from "./lib/mvt-parser";
import { humanizeRunError } from "./lib/error-humanizer";

type Device = "android" | "ios";
type Screen = "welcome" | "running" | "done" | "link" | "iosSetup";

const WEB_BASE_URL = "https://spyware.rpjsoftware.com";
const ANALYSIS_COST = 98;

interface PhaseState {
  num: number;
  label: string;
  statusKey?: string;
  progress: number;
  data?: Record<string, unknown>;
}

interface Account {
  email: string | null;
  label: string;
  credits: number;
  userCode: string | null;
}

type UploadState =
  | { state: "idle" }
  | { state: "uploading" }
  | { state: "done"; analysisId: string; remainingCredits: number }
  | { state: "error"; error: string; code?: string };

function formatElapsed(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

export function App() {
  const { t } = useTranslation();
  const tr = (key: string, fallback: string, options?: Record<string, unknown>) => {
    const value = t(key, { defaultValue: fallback, ...(options || {}) });
    return value === key ? fallback : value;
  };
  const [screen, setScreen] = useState<Screen>("welcome");
  const [device, setDevice] = useState<Device | null>(null);
  const [phase, setPhase] = useState<PhaseState>({ num: 0, label: "", progress: 0 });
  const [logs, setLogs] = useState<string[]>([]);
  const [zipPath, setZipPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [appVersion, setAppVersion] = useState<string>("");
  const [updateState, setUpdateState] = useState<{
    state: "idle" | "checking" | "up-to-date" | "available" | "downloading" | "downloaded" | "error";
    version?: string;
    percent?: number;
    error?: string;
  }>({ state: "idle" });
  const cancelledRef = useRef(false);

  // Auth/account
  const [account, setAccount] = useState<Account | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [linkCode, setLinkCode] = useState("");
  const [linkBusy, setLinkBusy] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  // Upload state for the "done" screen
  const [upload, setUpload] = useState<UploadState>({ state: "idle" });
  // Contraseña del backup iOS (cifrado obligatorio para obtener SMS, llamadas, etc.)
  const [iosPassword, setIosPassword] = useState("");
  const [iosPasswordConfirm, setIosPasswordConfirm] = useState("");
  const [iosPasswordError, setIosPasswordError] = useState<string | null>(null);
  // Guardamos la última contraseña usada para poder reintentar tras instalar drivers.
  const lastIosPasswordRef = useRef<string | null>(null);
  const [showItunesFallback, setShowItunesFallback] = useState(false);
  const [creditsWarning, setCreditsWarning] = useState<{ required: number; available: number } | null>(null);


  const PHASES = device === "ios"
    ? [
        tr("phases.ios.tools", "Preparando herramientas iOS"),
        tr("phases.ios.connect", "Conectando con el iPhone"),
        tr("phases.ios.analyze", "Analizando backup"),
      ]
    : [
        tr("phases.download", "Descargando AndroidQF"),
        tr("phases.connect", "Conectando con el dispositivo"),
        tr("phases.collect", "Recolectando datos"),
      ];


  useEffect(() => {
    if (!window.mvt) return;
    const offLog = window.mvt.onLog((msg) => {
      setLogs((prev) => [...prev.slice(-200), msg]);
      setLastLogAt(Date.now());
    });
    const offPhase = window.mvt.onPhase((payload: any) => {
      const { phase: num, label, statusKey, progress, data } = payload || {};
      setPhase((prev) => {
        if (prev.num !== num) {
          setPhaseStartedAt(Date.now());
          setLastLogAt(Date.now());
          setActivity(null);
        }
        return { num, label, statusKey, progress, data };
      });
    });
    const onAct = (window.mvt as any).onActivity as
      | ((cb: (p: { bytes: number; lastChangeAt: number; alive: boolean }) => void) => () => void)
      | undefined;
    const offActivity = onAct ? onAct((p) => setActivity({ bytes: p.bytes, lastChangeAt: p.lastChangeAt })) : () => {};
    const onModFailed = (window.mvt as any).onModuleFailed as
      | ((cb: (p: { module: string; detail: string }) => void) => () => void)
      | undefined;
    const offModFailed = onModFailed
      ? onModFailed((p) => setFailedModules((prev) => (prev.some((x) => x.module === p.module) ? prev : [...prev, p])))
      : () => {};
    return () => { offLog(); offPhase(); offActivity(); offModFailed(); };
  }, []);



  // Cronómetro de fase: re-renderiza cada segundo mientras estamos analizando,
  // para que el usuario vea que el proceso sigue vivo aunque mvt-ios tarde.
  const [phaseStartedAt, setPhaseStartedAt] = useState<number | null>(null);
  const [lastLogAt, setLastLogAt] = useState<number | null>(null);
  const [activity, setActivity] = useState<{ bytes: number; lastChangeAt: number } | null>(null);
  const [failedModules, setFailedModules] = useState<Array<{ module: string; detail: string }>>([]);
  const [nowTick, setNowTick] = useState(0);


  useEffect(() => {
    if (screen !== "running" || !phaseStartedAt) return;
    const id = setInterval(() => setNowTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [screen, phaseStartedAt]);

  useEffect(() => {
    if (!window.mvt) return;
    window.mvt.getVersion().then(setAppVersion).catch(() => {});
    const off = window.mvt.onUpdaterStatus((s) => {
      setUpdateState((prev) => ({ ...prev, ...s } as typeof prev));
    });
    return () => off();
  }, []);

  // Cargar token persistido y resolver cuenta vía whoami
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!window.mvt?.auth) { setAuthChecked(true); return; }
        const { token } = await window.mvt.auth.get();
        if (!token) { if (!cancelled) setScreen("link"); setAuthChecked(true); return; }
        const r = await fetch(`${WEB_BASE_URL}/api/public/desktop/whoami`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (cancelled) return;
        if (r.ok) {
          const data = await r.json();
          if (data?.ok) {
            setAccount({ email: data.email, label: data.label, credits: data.credits, userCode: data.userCode ?? null });
          } else {
            await window.mvt.auth.clear();
            setScreen("link");
          }
        } else if (r.status === 401) {
          await window.mvt.auth.clear();
          setScreen("link");
        }
      } catch {
        // sin conexión: dejamos sin cuenta y seguimos
      } finally {
        if (!cancelled) setAuthChecked(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);



  const checkUpdates = async () => {
    if (!window.mvt) return;
    setUpdateState({ state: "checking" });
    const r = await window.mvt.checkForUpdates();
    if (r.error) {
      setUpdateState({ state: "error", error: r.error });
    } else if (r.updateAvailable) {
      setUpdateState({ state: "available", version: r.latestVersion });
    } else {
      setUpdateState({ state: "up-to-date", version: r.currentVersion });
    }
  };

  const installUpdate = async () => {
    if (!window.mvt) return;
    setUpdateState({ state: "downloading", percent: 0 });
    const r = await window.mvt.downloadUpdate();
    if (!r.ok) setUpdateState({ state: "error", error: r.error });
  };

  const restartAndInstall = async () => {
    await window.mvt?.quitAndInstall();
  };

  const refreshCredits = async (): Promise<number | null> => {
    try {
      if (!window.mvt?.auth) return null;
      const { token } = await window.mvt.auth.get();
      if (!token) return null;
      const r = await fetch(`${WEB_BASE_URL}/api/public/desktop/whoami`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) return null;
      const data = await r.json();
      if (!data?.ok) return null;
      setAccount({ email: data.email, label: data.label, credits: data.credits, userCode: data.userCode ?? null });
      return data.credits as number;
    } catch {
      return null;
    }
  };

  const start = async (d: Device, options: { password?: string } = {}) => {
    // Comprobar créditos ANTES de iniciar el análisis (si hay cuenta vinculada).
    if (account) {
      const fresh = await refreshCredits();
      const available = fresh ?? account.credits;
      if (available < ANALYSIS_COST) {
        setCreditsWarning({ required: ANALYSIS_COST, available });
        return;
      }
    }

    setDevice(d);
    setScreen("running");
    setLogs([]);
    setError(null);
    setUpload({ state: "idle" });
    setActivity(null);
    setFailedModules([]);
    setPhase({ num: 1, label: tr("running.starting", "Iniciando…"), progress: 0 });
    cancelledRef.current = false;


    if (!window.mvt) {
      setError(tr("error.browserOnly", "Esta función solo está disponible en la app de escritorio."));
      return;
    }
    const result = await window.mvt.start(d, options);
    if (cancelledRef.current) return;
    if (result.ok && result.zipPath) {
      setZipPath(result.zipPath);
      setScreen("done");
    } else {
      setError(result.error ?? tr("error.unknown", "Error desconocido"));
    }
  };

  const handleIosStart = () => {
    setIosPasswordError(null);
    if (iosPassword.length < 4) {
      setIosPasswordError(tr("ios.passwordTooShort", "La contraseña debe tener al menos 4 caracteres."));
      return;
    }
    if (iosPassword !== iosPasswordConfirm) {
      setIosPasswordError(tr("ios.passwordMismatch", "Las contraseñas no coinciden."));
      return;
    }
    const pwd = iosPassword;
    lastIosPasswordRef.current = pwd;
    setIosPassword("");
    setIosPasswordConfirm("");
    void start("ios", { password: pwd });
  };

  const retryIosAfterDrivers = () => {
    const pwd = lastIosPasswordRef.current;
    if (!pwd) {
      setScreen("welcome");
      return;
    }
    void start("ios", { password: pwd });
  };


  // Subida automática al servidor cuando entramos en "done" con cuenta vinculada.
  // El usuario también puede subirlo manualmente desde el botón "Subir datos al informe".
  useEffect(() => {
    if (screen !== "done" || !zipPath || !account) return;
    if (upload.state !== "idle") return;
    void autoUpload(zipPath, device ?? "android");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, zipPath, account]);

  const autoUpload = async (path: string, dev: Device) => {
    setUpload({ state: "uploading" });
    try {
      const { token } = (await window.mvt!.auth.get()) ?? { token: null };
      if (!token) throw new Error("NO_TOKEN");

      const fileName = path.split(/[\\/]/).pop() || "android-qf.zip";
      let fileSize = 0;
      let result: unknown;

      // Preferimos el parseo en streaming (main process) para no cargar el ZIP
      // entero en RAM. Permite analizar móviles con miles de fotos/vídeos sin
      // colgar el renderer. Si el IPC no existe (build antigua), caemos al
      // método clásico.
      if (typeof window.mvt!.parseZipEntries === "function") {
        const r = await window.mvt!.parseZipEntries(path);
        if (!r.ok || !r.entries) throw new Error(r.error || "PARSE_FAILED");
        fileSize = r.fileSize ?? 0;
        result = parseMvtEntries(r.entries, fileName);
      } else {
        const zip = await window.mvt!.readZip(path);
        if (!zip.ok || !zip.data) throw new Error(zip.error || "READ_FAILED");
        const bytes = zip.data instanceof Uint8Array ? zip.data : new Uint8Array(zip.data);
        fileSize = bytes.length;
        const file = new File([bytes], fileName, { type: "application/zip" });
        result = await parseMvtFiles([file], fileName);
      }

      const r = await fetch(`${WEB_BASE_URL}/api/public/desktop/submit-analysis`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          device: dev,
          fileName,
          fileSize,
          result,
        }),
      });
      const data = await r.json().catch(() => ({}));
      if (r.status === 401) {
        await window.mvt!.auth.clear();
        setAccount(null);
        setUpload({ state: "error", error: tr("upload.errors.unauth", "Sesión caducada. Vincula la app de nuevo."), code: "UNAUTHORIZED" });
        return;
      }
      if (!r.ok || !data?.ok) {
        setUpload({
          state: "error",
          error: data?.error === "INSUFFICIENT_CREDITS"
            ? tr("upload.errors.credits", "No te quedan créditos.")
            : tr("upload.errors.generic", "No se pudo subir el informe."),
          code: data?.error,
        });
        return;
      }
      setUpload({
        state: "done",
        analysisId: data.analysisId,
        remainingCredits: data.remainingCredits ?? 0,
      });
      setAccount((a) => a ? { ...a, credits: data.remainingCredits ?? a.credits } : a);
    } catch (e: any) {
      setUpload({ state: "error", error: e?.message || tr("upload.errors.generic", "No se pudo subir el informe.") });
    }
  };

  const handleLink = async () => {
    setLinkError(null);
    const code = linkCode.trim().toUpperCase();
    if (!/^[A-Z0-9]{3}-[A-Z0-9]{3}-[A-Z0-9]{3}$/.test(code)) {
      setLinkError(tr("link.errors.format", "El código debe tener el formato XXX-XXX-XXX."));
      return;
    }
    setLinkBusy(true);
    try {
      const r = await fetch(`${WEB_BASE_URL}/api/public/desktop/pair`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok || !data?.ok) {
        setLinkError(
          data?.error === "USER_CODE_NOT_FOUND" || data?.error === "INVALID_CODE"
            ? tr("link.errors.invalid", "Código de usuario no válido.")
            : tr("link.errors.generic", "No se pudo vincular."),
        );
        return;
      }
      await window.mvt!.auth.save(data.token);
      setAccount({ email: data.email, label: data.label, credits: 0, userCode: data.userCode ?? null });
      // Refrescar créditos
      try {
        const me = await fetch(`${WEB_BASE_URL}/api/public/desktop/whoami`, {
          headers: { Authorization: `Bearer ${data.token}` },
        });
        const meData = await me.json().catch(() => ({}));
        if (meData?.ok) {
          setAccount({ email: meData.email, label: meData.label, credits: meData.credits, userCode: meData.userCode ?? null });
        }
      } catch {}
      setLinkCode("");
      setScreen("welcome");
    } catch (e: any) {
      setLinkError(e?.message || tr("link.errors.generic", "No se pudo vincular."));
    } finally {
      setLinkBusy(false);
    }
  };

  const formatUserCode = (raw: string) => {
    const clean = raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 9);
    const parts = [clean.slice(0, 3), clean.slice(3, 6), clean.slice(6, 9)].filter(Boolean);
    return parts.join("-");
  };

  const handleSignOut = async () => {
    if (!confirm(tr("account.signOutConfirm", "¿Desvincular esta app de tu cuenta?"))) return;
    await window.mvt?.auth?.clear();
    setAccount(null);
  };

  const Logo = ({ size = 96 }: { size?: number }) => (
    <img
      src={logoUrl}
      alt="Spyware Forensic Analyzer"
      className={size >= 72 ? "brand-logo" : "brand-logo-sm"}
      style={{ width: size, height: size, objectFit: "contain", background: "transparent" }}
    />
  );

  const VersionCorner = appVersion ? (
    <div style={{
      position: "fixed",
      bottom: 8,
      right: 12,
      fontSize: 11,
      color: "var(--muted)",
      fontFamily: "SF Mono, Menlo, monospace",
      opacity: 0.7,
      pointerEvents: "none",
      zIndex: 9999,
    }}>
      v{appVersion}
    </div>
  ) : null;

  const AccountBadge = account ? (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--muted)" }}>
      <span>{account.userCode ?? account.label}</span>
      <span style={{ color: "var(--primary, #6ea8ff)" }}>· {account.credits} {tr("account.credits", "créditos")}</span>
      <button
        className="btn btn-secondary"
        style={{ padding: "2px 8px", fontSize: 11 }}
        onClick={handleSignOut}
      >
        {tr("account.signOut", "Desvincular")}
      </button>
    </span>
  ) : authChecked ? (
    <button
      className="btn btn-secondary"
      style={{ padding: "2px 8px", fontSize: 11 }}
      onClick={() => setScreen("link")}
    >
      {tr("account.link", "Vincular cuenta")}
    </button>
  ) : null;

  const TopBar = (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 8, flexWrap: "wrap" }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>{AccountBadge}</div>
      <LanguageSelector />
    </div>
  );

  const TopBarWithLogo = (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 8, flexWrap: "wrap" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <img
          src={logoUrl}
          alt="Spyware Forensic Analyzer"
          style={{ height: 80, objectFit: "contain", background: "transparent" }}
        />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {AccountBadge}
        <LanguageSelector />
      </div>
    </div>
  );

  const handleCancel = async () => {
    const msg = tr("running.cancelConfirm", "¿Cancelar el análisis en curso?");
    if (!window.confirm(msg)) return;
    cancelledRef.current = true;
    try { await window.mvt?.cancel(); } catch {}
    setScreen("welcome");
    setError(null);
    setPhase({ num: 0, label: "", progress: 0 });
    setLogs([]);
  };


  // Actualización obligatoria: si hay versión nueva disponible, bloqueamos
  // toda la app hasta que se descargue y el usuario pulse "Reiniciar e instalar".
  const updateBlocking =
    updateState.state === "available" ||
    updateState.state === "downloading" ||
    updateState.state === "downloaded";

  if (updateBlocking) {
    const isReady = updateState.state === "downloaded";
    const percent = Math.max(0, Math.min(100, Math.round(updateState.percent ?? 0)));
    return (
      <div className="app" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "80vh", gap: 18 }}>
        <Logo size={140} />
        <div className="card" style={{ maxWidth: 460, width: "100%", textAlign: "center" }}>
          <h2 style={{ marginTop: 0 }}>
            {isReady
              ? tr("update.gate.title.ready", "Actualización lista para instalar")
              : tr("update.gate.title.required", "Actualización obligatoria")}
          </h2>
          <p style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.5 }}>
            {isReady
              ? tr("update.gate.body.ready", "Pulsa el botón para reiniciar e instalar la nueva versión. La app no puede usarse hasta entonces.")
              : tr("update.gate.body.downloading", "Estamos descargando la última versión de la app. No cierres esta ventana.")}
          </p>
          {updateState.version ? (
            <p style={{ color: "var(--muted)", fontSize: 12, margin: "4px 0 12px" }}>
              {tr("update.gate.versionLabel", "Nueva versión: {{version}}", { version: updateState.version })}
            </p>
          ) : null}
          {!isReady ? (
            <div style={{ margin: "12px 0" }}>
              <div style={{ height: 8, background: "var(--border, #2a2f3a)", borderRadius: 4, overflow: "hidden" }}>
                <div
                  style={{
                    width: `${percent}%`,
                    height: "100%",
                    background: "var(--primary, #6ea8ff)",
                    transition: "width 0.3s ease",
                  }}
                />
              </div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>
                {updateState.state === "downloading"
                  ? tr("update.gate.progress", "{{percent}}% descargado", { percent })
                  : tr("update.gate.preparing", "Preparando descarga…")}
              </div>
            </div>
          ) : (
            <button
              className="btn btn-primary"
              style={{ marginTop: 8 }}
              onClick={restartAndInstall}
            >
              {tr("update.gate.installNow", "Reiniciar e instalar ahora")}
            </button>
          )}
        </div>
        <LanguageSelector />
        {VersionCorner}
      </div>
    );
  }

  if (!authChecked) {
    return (
      <div className="app" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <Logo size={140} />
        {VersionCorner}
      </div>
    );
  }


  if (screen === "link") {
    return (
      <div className="app">
        {TopBar}

        <div className="header">
          <Logo size={140} />
          <h1>{tr("link.title", "Vincular cuenta")}</h1>
          <p>{tr("link.subtitle", "Vincula esta app con tu cuenta web para subir los análisis automáticamente.")}</p>
        </div>
        <div className="card">
          <ol style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: "var(--muted)", lineHeight: 1.7 }}>
            <li>
              {tr("link.step1", "Abre")}{" "}
              <a
                href="#"
                onClick={(e) => { e.preventDefault(); window.mvt?.openExternal(`${WEB_BASE_URL}/settings/desktop`); }}
                style={{ color: "var(--primary, #6ea8ff)" }}
              >
                {WEB_BASE_URL.replace("https://", "")}/settings/desktop
              </a>{" "}
              {tr("link.step1b", "(inicia sesión si hace falta).")}
            </li>
            <li>{tr("link.step2", "Copia tu código de usuario.")}</li>
            <li>{tr("link.step3", "Pégalo aquí (formato XXX-XXX-XXX):")}</li>
          </ol>
          <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>
            <input
              type="text"
              value={linkCode}
              onChange={(e) => setLinkCode(formatUserCode(e.target.value))}
              placeholder="ABC-123-XYZ"
              maxLength={11}
              autoFocus
              style={{
                fontFamily: "SF Mono, Menlo, monospace",
                fontSize: 24,
                letterSpacing: "0.2em",
                textAlign: "center",
                padding: "12px 16px",
                borderRadius: 8,
                border: "1px solid var(--border, #333)",
                background: "var(--bg-soft, #1a1a22)",
                color: "var(--fg, #fff)",
              }}
            />
            {linkError && (
              <div style={{ color: "var(--danger)", fontSize: 13 }}>{linkError}</div>
            )}
            <div className="row">
              <button className="btn" onClick={handleLink} disabled={linkBusy || linkCode.length !== 11}>
                {linkBusy ? tr("link.linking", "Vinculando…") : tr("link.action", "Vincular")}
              </button>
              {account && (
                <button className="btn btn-secondary" onClick={() => setScreen("welcome")}>
                  {tr("link.cancel", "Cancelar")}
                </button>
              )}

              <button
                className="btn btn-secondary"
                onClick={() => window.mvt?.openExternal(`${WEB_BASE_URL}/settings/desktop`)}
              >
                {tr("link.openPage", "Abrir página")}
              </button>
            </div>
          </div>
        </div>
        {VersionCorner}
      </div>
    );
  }

  if (screen === "iosSetup") {
    return (
      <div className="app">
        {TopBar}
        <div className="header">
          <Logo size={140} />
          <h1>{tr("ios.title", "Analizar iPhone")}</h1>
          <p>{tr("ios.subtitle", "Define una contraseña para cifrar el backup. Es obligatoria para poder analizar SMS, llamadas, Salud y Llavero.")}</p>
        </div>
        <div className="card">
          <ol style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: "var(--muted)", lineHeight: 1.7 }}>
            <li>{tr("ios.step1", "Conecta el iPhone al ordenador con un cable USB.")}</li>
            <li>{tr("ios.step2", "Desbloquea el iPhone y, si aparece, pulsa «Confiar» en la pantalla del teléfono.")}</li>
            <li>{tr("ios.step3", "Elige una contraseña para el backup cifrado. Guárdala: si el iPhone ya tenía un backup cifrado, debe ser la misma de iTunes/Finder.")}</li>
          </ol>
          <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>
            <input
              type="password"
              value={iosPassword}
              onChange={(e) => setIosPassword(e.target.value)}
              placeholder={tr("ios.passwordPlaceholder", "Contraseña del backup")}
              autoFocus
              style={{
                fontFamily: "SF Mono, Menlo, monospace",
                fontSize: 16,
                padding: "10px 14px",
                borderRadius: 8,
                border: "1px solid var(--border, #333)",
                background: "var(--bg-soft, #1a1a22)",
                color: "var(--fg, #fff)",
              }}
            />
            <input
              type="password"
              value={iosPasswordConfirm}
              onChange={(e) => setIosPasswordConfirm(e.target.value)}
              placeholder={tr("ios.passwordConfirmPlaceholder", "Repite la contraseña")}
              style={{
                fontFamily: "SF Mono, Menlo, monospace",
                fontSize: 16,
                padding: "10px 14px",
                borderRadius: 8,
                border: "1px solid var(--border, #333)",
                background: "var(--bg-soft, #1a1a22)",
                color: "var(--fg, #fff)",
              }}
            />
            {iosPasswordError && (
              <div style={{ color: "var(--danger)", fontSize: 13 }}>{iosPasswordError}</div>
            )}
            <div className="row">
              <button className="btn" onClick={handleIosStart} disabled={!iosPassword || !iosPasswordConfirm}>
                {tr("ios.startAnalysis", "Iniciar análisis")}
              </button>
              <button className="btn btn-secondary" onClick={() => setScreen("welcome")}>
                {tr("ios.cancel", "Cancelar")}
              </button>
            </div>
          </div>
        </div>
        {VersionCorner}
      </div>
    );
  }

  if (screen === "welcome") {
    return (
      <div className="app">
        {TopBar}
        <div className="header">
          <Logo size={210} />
          <h1>{tr("app.title", "MVT Insight Desktop")}</h1>
          <p>{tr("app.subtitle", "Análisis forense de indicios de spyware")}</p>
        </div>
        <div className="choice-grid">
          <button className="choice" onClick={() => start("android")}>
            <div className="icon">📱</div>
            <div className="title">{tr("welcome.android.title", "Android")}</div>
            <div className="sub">{tr("welcome.android.sub", "Sistema operativo Android")}</div>
          </button>
          <button
            className="choice"
            onClick={async () => {
              if (account) {
                const fresh = await refreshCredits();
                const available = fresh ?? account.credits;
                if (available < ANALYSIS_COST) {
                  setCreditsWarning({ required: ANALYSIS_COST, available });
                  return;
                }
              }
              setIosPassword("");
              setIosPasswordConfirm("");
              setIosPasswordError(null);
              setScreen("iosSetup");
            }}
          >
            <div className="icon">📲</div>
            <div className="title">{tr("welcome.ios.title", "iPhone")}</div>
            <div className="sub">{tr("welcome.ios.sub", "Sistema operativo iOS")}</div>
          </button>
        </div>

        {creditsWarning && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1000,
              padding: 16,
            }}
            onClick={() => setCreditsWarning(null)}
          >
            <div
              className="card"
              style={{ maxWidth: 480, width: "100%", borderColor: "var(--danger)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <strong style={{ color: "var(--danger)" }}>
                {tr("credits.insufficientTitle", "Créditos insuficientes")}
              </strong>
              <div style={{ marginTop: 8, fontSize: 13, color: "var(--muted)", lineHeight: 1.6 }}>
                {tr(
                  "credits.insufficientBody",
                  "Necesitas {{required}} créditos y solo tienes {{available}}. Recarga créditos en tu panel antes de iniciar el análisis.",
                )
                  .replace("{{required}}", String(creditsWarning.required))
                  .replace("{{available}}", String(creditsWarning.available))}
              </div>
              <div className="row" style={{ marginTop: 16 }}>
                <button
                  className="btn"
                  onClick={() => {
                    window.mvt?.openExternal(`${WEB_BASE_URL}/dashboard`);
                    setCreditsWarning(null);
                  }}
                >
                  {tr("credits.openDashboard", "Abrir panel")}
                </button>
                <button className="btn btn-secondary" onClick={() => setCreditsWarning(null)}>
                  {tr("credits.cancel", "Cancelar")}
                </button>
              </div>
            </div>
          </div>
        )}



        <div style={{ marginTop: 24, textAlign: "center", fontSize: 13, color: "var(--muted)" }}>
          {updateState.state === "idle" && (
            <button className="btn btn-secondary" onClick={checkUpdates}>
              {tr("update.check", "Buscar actualizaciones")}
            </button>
          )}
          {updateState.state === "checking" && <span>{tr("update.checking", "Comprobando…")}</span>}
          {updateState.state === "up-to-date" && (
            <span>✓ {tr("update.upToDate", "Ya tienes la última versión")} (v{updateState.version || appVersion})</span>
          )}
          {updateState.state === "available" && (
            <span>
              {tr("update.available", "Nueva versión disponible:")} <strong>v{updateState.version}</strong>{" "}
              <button className="btn" style={{ marginLeft: 8 }} onClick={installUpdate}>
                {tr("update.install", "Instalar")}
              </button>
            </span>
          )}
          {updateState.state === "downloading" && (
            <span>{tr("update.downloading", "Descargando…")} {Math.round(updateState.percent ?? 0)}%</span>
          )}
          {updateState.state === "downloaded" && (
            <span>
              ✓ {tr("update.readyToInstall", "Actualización lista para instalar")}{" "}
              <button className="btn" style={{ marginLeft: 8 }} onClick={restartAndInstall}>
                {tr("update.restart", "Reiniciar e instalar")}
              </button>
            </span>
          )}
          {updateState.state === "error" && (
            <span style={{ color: "var(--danger)" }}>
              {tr("update.error", "Error al comprobar actualizaciones:")} {updateState.error}
            </span>
          )}
        </div>
        {VersionCorner}
      </div>
    );
  }

  if (screen === "running") {
    return (
      <div className="app">
        {TopBarWithLogo}
        <div className="header">
          <h1>{device === "android" ? tr("running.title.android", "Analizando Android…") : tr("running.title.ios", "Analizando iPhone…")}</h1>
          <p>{device === "android" ? tr("running.subtitle.android", "No cierres esta ventana. Tarda entre 5 y 15 minutos.") : tr("running.subtitle.ios", "No cierres esta ventana. Puede tardar entre 15 y 40 minutos según el tamaño del backup.")}</p>
        </div>

        <div className="card">
          {PHASES.map((label, i) => {
            const num = i + 1;
            const active = phase.num === num;
            const done = phase.num > num;
            return (
              <div key={num} className={`phase ${active ? "active" : ""} ${done ? "done" : ""}`}>
                <div className="phase-num">
                  {done ? "✓" : active ? <span className="phase-spinner" /> : num}
                </div>
                <div className="phase-body">
                  <div className="phase-label">{label}</div>
                  {active && (
                    <>
                      <div className="phase-sub">
                        {phase.statusKey
                          ? tr(phase.statusKey, phase.label || tr("running.working", "Analizando"), phase.data)
                          : (phase.label || tr("running.working", "Analizando"))}
                        <span className="dot-pulse">
                          <span /><span /><span />
                        </span>
                      </div>
                      {phaseStartedAt && (
                        <div style={{ marginTop: 6, fontSize: 12, color: "var(--muted)", fontVariantNumeric: "tabular-nums" }}>
                          ⏱ {formatElapsed(Date.now() - phaseStartedAt)}
                          {(() => {
                            const recent = logs
                              .map((l) => l.replace(/\x1b\[[0-9;]*m/g, "").trim())
                              .filter((l) => l && !/^[\s.·•]+$/.test(l))
                              .slice(-3);
                            if (!recent.length) return null;
                            return (
                              <div style={{ marginTop: 6, padding: "6px 8px", background: "rgba(255,255,255,0.04)", borderRadius: 6, fontFamily: "SF Mono, Menlo, monospace", fontSize: 11, lineHeight: 1.5, color: "var(--muted)", maxHeight: 64, overflow: "hidden", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                                {recent.map((line, idx) => (
                                  <div key={idx} style={{ opacity: idx === recent.length - 1 ? 1 : 0.6 }}>{line.length > 140 ? line.slice(0, 140) + "…" : line}</div>
                                ))}
                              </div>
                            );
                          })()}
                          <span aria-hidden style={{ display: "none" }}>{nowTick}</span>
                          {failedModules.length > 0 && (
                            <div style={{ marginTop: 8, padding: "8px 10px", background: "rgba(255, 200, 0, 0.08)", border: "1px solid rgba(255, 200, 0, 0.35)", borderRadius: 6, fontSize: 12, color: "#e6c200" }}>
                              <div style={{ fontWeight: 600 }}>
                                {tr("running.moduleFailed.title", "Algunos módulos no están disponibles en este dispositivo")}
                              </div>
                              <div style={{ marginTop: 4, opacity: 0.9 }}>
                                {tr(
                                  "running.moduleFailed.description",
                                  `El módulo ${failedModules.map((m) => m.module).join(", ")} no se pudo ejecutar. Suele ocurrir en MIUI, EMUI o One UI por restricciones del fabricante. El análisis continúa con normalidad.`,
                                  { modules: failedModules.map((m) => m.module).join(", ") }
                                )}
                              </div>
                            </div>
                          )}
                          {(() => {

                            if (!lastLogAt) return null;
                            // Algunas fases trabajan en bloque sin emitir logs ni
                            // tocar archivos visibles para el watcher (compresión
                            // del ZIP, parsing del ZIP en el main process, subida
                            // del informe, etc.). Durante esas fases NO mostramos
                            // el aviso de "sin actividad", porque sería mentira:
                            // el sistema sí está trabajando.
                            const blockingStatuses = new Set([
                              "phaseStatus.compressing",
                              "phaseStatus.done",
                              "phaseStatus.downloadingBinary",
                              "phaseStatus.iosEnablingEncryption",
                            ]);
                            if (phase.statusKey && blockingStatuses.has(phase.statusKey)) return null;
                            if (upload.state === "uploading") return null;
                            const lastActivityAt = Math.max(lastLogAt, activity?.lastChangeAt ?? 0);
                            const sinceActivityMs = Date.now() - lastActivityAt;
                            const sinceLogMin = Math.floor((Date.now() - lastLogAt) / 60000);
                            const sinceActivityMin = Math.floor(sinceActivityMs / 60000);
                            const fmtMB = (b: number) => {
                              if (b < 1024 * 1024) return `${Math.max(1, Math.round(b / 1024))} KB`;
                              if (b < 1024 * 1024 * 1024) return `${(b / (1024 * 1024)).toFixed(1)} MB`;
                              return `${(b / (1024 * 1024 * 1024)).toFixed(2)} GB`;
                            };
                            const fmtAgo = (ms: number) => {
                              const s = Math.max(0, Math.floor(ms / 1000));
                              if (s < 60) return `${s}s`;
                              return `${Math.floor(s / 60)} min`;
                            };

                            // Caso 1: el disco SÍ se está moviendo aunque androidqf no imprima.
                            // Mostramos info azul tranquilizadora desde el primer minuto sin logs.
                            if (activity && activity.bytes > 0 && sinceActivityMs < 90_000 && sinceLogMin >= 1) {
                              return (
                                <div style={{ marginTop: 8, padding: "6px 8px", background: "rgba(80, 160, 255, 0.08)", border: "1px solid rgba(80, 160, 255, 0.35)", borderRadius: 6, fontSize: 12, color: "#9ec5ff" }}>
                                  {tr(
                                    "running.activity.collecting",
                                    `Recolectando archivos del dispositivo… ${fmtMB(activity.bytes)} transferidos (último cambio hace ${fmtAgo(sinceActivityMs)}).`,
                                    { size: fmtMB(activity.bytes), ago: fmtAgo(sinceActivityMs) }
                                  )}
                                </div>
                              );
                            }

                            const threshold = device === "ios" ? 5 : 8;
                            if (sinceActivityMin < threshold) return null;

                            // Caso 2: >15 min sin nada (ni logs ni disco) → casi seguro colgado.
                            if (sinceActivityMin >= 15) {
                              return (
                                <div style={{ marginTop: 8, padding: "6px 8px", background: "rgba(255, 80, 80, 0.10)", border: "1px solid rgba(255, 80, 80, 0.45)", borderRadius: 6, fontSize: 12, color: "#ff9b9b" }}>
                                  <div>{tr("running.activity.frozen", `⚠ Llevamos ${sinceActivityMin} min sin detectar cambios. Puede que el proceso siga trabajando en segundo plano (operaciones largas como compresión o backup) o que esté bloqueado.`, { min: sinceActivityMin })}</div>
                                  <div style={{ marginTop: 4, opacity: 0.85 }}>
                                    {tr("running.activity.frozenHint", "Espera unos minutos más. Solo si NO ves el indicador de actividad de tu disco duro moverse, pulsa Cancelar y reintenta.")}
                                  </div>
                                </div>
                              );
                            }

                            // Caso 3: entre threshold y 15 min sin actividad → ámbar.
                            const msgKey = device === "ios" ? "running.idleWarning.ios" : "running.idleWarning.android";
                            const fallback = device === "ios"
                              ? `⚠ Sin actividad de mvt-ios desde hace ${sinceActivityMin} min.`
                              : `⚠ Sin actividad de androidqf desde hace ${sinceActivityMin} min.`;
                            return (
                              <div style={{ marginTop: 8, padding: "6px 8px", background: "rgba(255, 200, 0, 0.08)", border: "1px solid rgba(255, 200, 0, 0.35)", borderRadius: 6, fontSize: 12, color: "#e6c200" }}>
                                <div>{tr(msgKey, fallback, { min: sinceActivityMin })}</div>
                                <div style={{ marginTop: 4, opacity: 0.85 }}>
                                  {tr("running.idleWarning.hint", "Esto suele ser normal mientras se recolectan apps o se crea el backup. Si supera 15 min, pulsa Cancelar y reintenta.")}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </>

                  )}
                </div>
              </div>
            );
          })}
          <div className="scanline" aria-hidden="true" />
          <div className="row" style={{ marginTop: 16, justifyContent: "flex-end" }}>
            <button className="btn btn-secondary" onClick={handleCancel}>
              {tr("running.cancel", "Cancelar")}
            </button>
          </div>
        </div>



        {error === "IOS_DRIVERS_MISSING" ? (
          <div className="card" style={{ borderColor: "var(--primary, #6ea8ff)" }}>
            <strong>{tr("iosDrivers.title", "Faltan los drivers de Apple en este Windows")}</strong>
            <div style={{ marginTop: 8, fontSize: 13, color: "var(--muted)" }}>
              {tr(
                "iosDrivers.body",
                "Para que el ordenador reconozca el iPhone necesitamos los drivers de Apple Mobile Device. No podemos incluirlos en nuestra app por la licencia de Apple. La forma más rápida es instalar la app gratuita «Apple Devices» desde la Microsoft Store."
              )}
            </div>
            <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
              <button
                className="btn"
                style={{ justifyContent: "center" }}
                onClick={() => window.mvt?.openExternal("ms-windows-store://pdp/?productid=9NP83LWLPZ9K")}
              >
                {tr("iosDrivers.installStore", "Instalar «Apple Devices» (Microsoft Store)")}
              </button>

              {!showItunesFallback ? (
                <button
                  className="btn btn-secondary"
                  style={{ fontSize: 12, padding: "6px 10px" }}
                  onClick={() => setShowItunesFallback(true)}
                >
                  {tr("iosDrivers.fallbackHint", "¿No puedes usar la Microsoft Store?")}
                </button>
              ) : (
                <>
                  <div style={{ fontSize: 12, color: "var(--muted)", textAlign: "center" }}>
                    {tr("iosDrivers.fallbackBody", "Si la Microsoft Store no está disponible en tu equipo, puedes usar el instalador oficial de iTunes como alternativa.")}
                  </div>
                  <button
                    className="btn btn-secondary"
                    style={{ justifyContent: "center" }}
                    onClick={() => window.mvt?.openExternal("https://www.apple.com/itunes/download/win64")}
                  >
                    {tr("iosDrivers.installItunes", "Descargar iTunes (apple.com)")}
                  </button>
                </>
              )}

              <div className="row" style={{ flexWrap: "wrap", gap: 8, marginTop: 4 }}>
                <button className="btn btn-secondary" onClick={retryIosAfterDrivers}>
                  {tr("iosDrivers.retry", "Ya lo he instalado — reintentar")}
                </button>
                <button className="btn btn-secondary" onClick={() => setScreen("welcome")}>
                  {tr("error.back", "Volver al inicio")}
                </button>
              </div>
            </div>
          </div>
        ) : error && (
          <div className="card" style={{ borderColor: "var(--danger)", color: "var(--danger)" }}>
            <strong>{tr("error.title", "Algo salió mal:")}</strong>
            <div style={{ marginTop: 6, fontSize: 13 }}>{error}</div>
            <div className="row">
              <button className="btn btn-secondary" onClick={() => setScreen("welcome")}>
                {tr("error.back", "Volver al inicio")}
              </button>
            </div>
          </div>
        )}

        {VersionCorner}
      </div>
    );
  }

  // screen === "done"
  const reportUrl = upload.state === "done" ? `${WEB_BASE_URL}/analysis/${upload.analysisId}` : null;

  return (
    <div className="app">
      {TopBarWithLogo}
      <div className="header">
        {(() => {
          // Cabecera coherente con el estado real de la subida.
          if (!account) {
            return (
              <>
                <h1>{tr("done.titleLocal", "✓ Análisis completado")}</h1>
                <p>{tr("done.subtitleLocal", "Copia local guardada en Descargas. Vincula tu cuenta para subir el informe al panel.")}</p>
              </>
            );
          }
          if (upload.state === "uploading") {
            return (
              <>
                <h1>{tr("done.titleUploading", "✓ Análisis completado")}</h1>
                <p>{tr("done.subtitleUploading", "Subiendo informe a tu panel…")}</p>
              </>
            );
          }
          if (upload.state === "done") {
            return (
              <>
                <h1>{tr("done.titleUploaded", "✓ Análisis completado")}</h1>
                <p>{tr("done.subtitleUploaded", "Informe subido al panel. También se guardó una copia local en Descargas.")}</p>
              </>
            );
          }
          if (upload.state === "error") {
            return (
              <>
                <h1 style={{ color: "var(--warning, #f1b14b)" }}>
                  {tr("done.titleFailed", "⚠ Análisis completado, pero no se pudo subir el informe")}
                </h1>
                <p>{tr("done.subtitleFailed", "El archivo se ha guardado en Descargas. Puedes reintentar la subida más abajo.")}</p>
              </>
            );
          }
          return (
            <>
              <h1>{tr("done.title", "✓ Análisis completado")}</h1>
              <p>{tr("done.subtitle", "Los datos se han guardado en tu carpeta de Descargas.")}</p>
            </>
          );
        })()}
      </div>
      <div className="card">
        <div style={{ fontSize: 13, color: "var(--muted)" }}>{tr("done.filename", "Archivo generado:")}</div>
        <div style={{
          fontFamily: "SF Mono, Menlo, monospace",
          fontSize: 12,
          marginTop: 6,
          wordBreak: "break-all",
        }}>
          {zipPath}
        </div>

        {/* Estado de subida (manual) */}
        {account && (
          <div style={{ marginTop: 16, padding: 12, borderRadius: 8, background: "var(--bg-soft, #1a1a22)", border: "1px solid var(--border, #333)" }}>
            {upload.state === "idle" && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <span style={{ fontSize: 13, color: "var(--muted)" }}>
                  {tr("done.uploadHint", "Sube el informe a tu cuenta para verlo en el panel web.")}
                </span>
                <button className="btn" onClick={() => zipPath && autoUpload(zipPath, device ?? "android")}>
                  {tr("upload.uploadButton", "Subir datos al informe")}
                </button>
              </div>
            )}
            {upload.state === "uploading" && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
                <span className="phase-spinner" />
                <span>{tr("upload.uploading", "Subiendo informe a tu cuenta…")}</span>
              </div>
            )}
            {upload.state === "done" && (
              <div style={{ fontSize: 13 }}>
                <div style={{ color: "var(--primary, #6ea8ff)", fontWeight: 600, marginBottom: 4 }}>
                  ✓ {tr("upload.done", "Informe subido")}
                </div>
                <div style={{ color: "var(--muted)", marginBottom: 4 }}>
                  {tr("upload.openingReport", "El informe ya está disponible en tu panel de control.")}
                </div>
                <div style={{ color: "var(--muted)" }}>
                  {tr("upload.creditsLeft", "Créditos restantes:")} {upload.remainingCredits}
                </div>
              </div>
            )}
            {upload.state === "error" && (
              <div style={{ fontSize: 13 }}>
                {upload.code === "INSUFFICIENT_CREDITS" ? (
                  <div style={{ color: "var(--danger)" }}>
                    {tr("upload.noCreditsMessage", "No te quedan créditos. Accede a tu panel de control en la web y recarga créditos para poder subir el informe.")}
                  </div>
                ) : (
                  <>
                    <div style={{ color: "var(--danger)", fontWeight: 600, marginBottom: 4 }}>
                      {tr("upload.error", "No se pudo subir:")} {upload.error}
                    </div>
                    <div className="row" style={{ marginTop: 8 }}>
                      <button className="btn" onClick={() => zipPath && autoUpload(zipPath, device ?? "android")}>
                        {tr("upload.retry", "Reintentar")}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        <div className="row" style={{ marginTop: 16 }}>
          {reportUrl ? (
            <button className="btn" onClick={() => window.mvt?.openExternal(reportUrl)}>
              {tr("done.viewReport", "Ver informe →")}
            </button>
          ) : !account ? (
            <button className="btn" onClick={() => window.mvt?.openExternal(`${WEB_BASE_URL}/upload`)}>
              {tr("done.upload", "Subir al informe →")}
            </button>
          ) : null}
          <button className="btn btn-secondary" onClick={() => zipPath && window.mvt?.openFolder(zipPath)}>
            {tr("done.openFolder", "Abrir carpeta")}
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => {
              setScreen("welcome");
              setUpload({ state: "idle" });
              setZipPath(null);
            }}
          >
            {tr("done.new", "Nuevo análisis")}
          </button>
        </div>


        {!account && (
          <div style={{ marginTop: 12, fontSize: 12, color: "var(--muted)" }}>
            💡{" "}
            <a
              href="#"
              onClick={(e) => { e.preventDefault(); setScreen("link"); }}
              style={{ color: "var(--primary, #6ea8ff)" }}
            >
              {tr("done.linkHint", "Vincula tu cuenta para subir el informe automáticamente la próxima vez.")}
            </a>
          </div>
        )}
        {VersionCorner}
      </div>
    </div>
  );
}
