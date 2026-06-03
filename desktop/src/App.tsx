import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { LanguageSelector } from "./components/LanguageSelector";
import logoUrl from "./assets/logo.png";

type Device = "android" | "ios";
type Screen = "welcome" | "running" | "done";

interface PhaseState {
  num: number;
  label: string;
  progress: number;
}

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

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs]);

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

  const Logo = ({ size = 96 }: { size?: number }) => (
    <img
      src={logoUrl}
      alt="Spyware Forensic Analyzer"
      className={size >= 72 ? "brand-logo" : "brand-logo-sm"}
      style={{ width: size, height: size, objectFit: "contain", background: "transparent" }}
    />
  );

  const TopBar = (
    <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
      <LanguageSelector />
    </div>
  );

  const TopBarWithLogo = (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
      <img
        src={logoUrl}
        alt="Spyware Forensic Analyzer"
        style={{ height: 40, objectFit: "contain", background: "transparent" }}
      />
      <LanguageSelector />
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
      </div>
    );
  }

  // screen === "done"
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
        <div className="row">
          <button className="btn" onClick={() => window.mvt?.openExternal("https://spyware.rpjsoftware.com/upload")}>
            {tr("done.upload", "Subir al informe →")}
          </button>
          <button className="btn btn-secondary" onClick={() => zipPath && window.mvt?.openFolder(zipPath)}>
            {tr("done.openFolder", "Abrir carpeta")}
          </button>
          <button className="btn btn-secondary" onClick={() => setScreen("welcome")}>
            {tr("done.new", "Nuevo análisis")}
          </button>
        </div>
      </div>
    </div>
  );
}
