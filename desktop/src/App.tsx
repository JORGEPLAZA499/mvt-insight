import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { LanguageSelector } from "./components/LanguageSelector";
import logoUrl from "./assets/logo.png";
import { parseMvtFiles } from "./lib/mvt-parser";

type Device = "android" | "ios";
type Screen = "welcome" | "running" | "done" | "link";

const WEB_BASE_URL = "https://spyware.rpjsoftware.com";

interface PhaseState {
  num: number;
  label: string;
  progress: number;
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

export function App() {
  const { t } = useTranslation();
  const tr = (key: string, fallback: string) => {
    const value = t(key, { defaultValue: fallback });
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
  const logRef = useRef<HTMLDivElement>(null);
  const [showLogs, setShowLogs] = useState(false);

  // Auth/account
  const [account, setAccount] = useState<Account | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [linkCode, setLinkCode] = useState("");
  const [linkBusy, setLinkBusy] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  // Upload state for the "done" screen
  const [upload, setUpload] = useState<UploadState>({ state: "idle" });

  const PHASES = [
    tr("phases.download", "Descargando AndroidQF"),
    tr("phases.connect", "Conectando con el dispositivo"),
    tr("phases.collect", "Recolectando datos"),
  ];

  useEffect(() => {
    if (!window.mvt) return;
    const offLog = window.mvt.onLog((msg) => {
      setLogs((prev) => [...prev.slice(-200), msg]);
    });
    const offPhase = window.mvt.onPhase(({ phase: num, label, progress }) => {
      setPhase({ num, label, progress });
    });
    return () => { offLog(); offPhase(); };
  }, []);

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


  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs, showLogs]);

  useEffect(() => {
    if (!showLogs) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setShowLogs(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showLogs]);

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

  const start = async (d: Device) => {
    setDevice(d);
    setScreen("running");
    setLogs([]);
    setError(null);
    setUpload({ state: "idle" });
    setPhase({ num: 1, label: tr("running.starting", "Iniciando…"), progress: 0 });

    if (!window.mvt) {
      setError(tr("error.browserOnly", "Esta función solo está disponible en la app de escritorio."));
      return;
    }
    const result = await window.mvt.start(d);
    if (result.ok && result.zipPath) {
      setZipPath(result.zipPath);
      setScreen("done");
    } else {
      setError(result.error ?? tr("error.unknown", "Error desconocido"));
    }
  };

  // Subida automática al servidor cuando entramos en "done" con cuenta vinculada
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

      const zip = await window.mvt!.readZip(path);
      if (!zip.ok || !zip.data) throw new Error(zip.error || "READ_FAILED");

      const bytes = zip.data instanceof Uint8Array ? zip.data : new Uint8Array(zip.data);
      const fileName = path.split(/[\\/]/).pop() || "android-qf.zip";
      const file = new File([bytes], fileName, { type: "application/zip" });
      const result = await parseMvtFiles([file], fileName);

      const r = await fetch(`${WEB_BASE_URL}/api/public/desktop/submit-analysis`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          device: dev,
          fileName,
          fileSize: bytes.length,
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
    try { await window.mvt?.cancel(); } catch {}
    setScreen("welcome");
    setError(null);
    setPhase({ num: 0, label: "", progress: 0 });
    setLogs([]);
  };

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
          <button className="choice" onClick={() => start("ios")} disabled>
            <div className="icon">📲</div>
            <div className="title">{tr("welcome.ios.title", "iPhone")}</div>
            <div className="sub">{tr("welcome.ios.sub", "Próximamente (solo macOS)")}</div>
          </button>
        </div>

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
          <p>{tr("running.subtitle", "No cierres esta ventana. Tarda entre 5 y 15 minutos.")}</p>
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
                    <div className="phase-sub">
                      {phase.label || tr("running.working", "Analizando")}
                      <span className="dot-pulse">
                        <span /><span /><span />
                      </span>
                    </div>
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


        <details style={{ marginTop: 16 }}>
          <summary>{tr("details.toggle", "Ver detalles técnicos")}</summary>
          <div className="log" ref={logRef}>
            {logs.length === 0 ? tr("details.waiting", "Esperando salida del proceso…") : logs.join("")}
          </div>
        </details>

        {error && (
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
        <h1>{tr("done.title", "✓ Análisis completado")}</h1>
        <p>{tr("done.subtitle", "Los datos se han guardado en tu carpeta de Descargas.")}</p>
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

        {/* Estado de subida automática */}
        {account && (
          <div style={{ marginTop: 16, padding: 12, borderRadius: 8, background: "var(--bg-soft, #1a1a22)", border: "1px solid var(--border, #333)" }}>
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
                <div style={{ color: "var(--muted)" }}>
                  {tr("upload.creditsLeft", "Créditos restantes:")} {upload.remainingCredits}
                </div>
              </div>
            )}
            {upload.state === "error" && (
              <div style={{ fontSize: 13 }}>
                <div style={{ color: "var(--danger)", fontWeight: 600, marginBottom: 4 }}>
                  {tr("upload.error", "No se pudo subir:")} {upload.error}
                </div>
                <div className="row" style={{ marginTop: 8 }}>
                  {upload.code === "INSUFFICIENT_CREDITS" ? (
                    <button className="btn" onClick={() => window.mvt?.openExternal(`${WEB_BASE_URL}/dashboard`)}>
                      {tr("upload.buyCredits", "Recargar créditos")}
                    </button>
                  ) : (
                    <button className="btn" onClick={() => zipPath && autoUpload(zipPath, device ?? "android")}>
                      {tr("upload.retry", "Reintentar")}
                    </button>
                  )}
                </div>
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
