import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { LanguageSelector } from "./components/LanguageSelector";

type Device = "android" | "ios";
type Screen = "welcome" | "running" | "done";

interface PhaseState {
  num: number;
  label: string;
  progress: number;
}

export function App() {
  const { t } = useTranslation();
  const [screen, setScreen] = useState<Screen>("welcome");
  const [device, setDevice] = useState<Device | null>(null);
  const [phase, setPhase] = useState<PhaseState>({ num: 0, label: "", progress: 0 });
  const [logs, setLogs] = useState<string[]>([]);
  const [zipPath, setZipPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  const PHASES = [
    t("phases.download", "Descargando AndroidQF"),
    t("phases.connect", "Conectando con el dispositivo"),
    t("phases.collect", "Recolectando datos"),
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
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs]);

  const start = async (d: Device) => {
    setDevice(d);
    setScreen("running");
    setLogs([]);
    setError(null);
    setPhase({ num: 1, label: t("running.starting"), progress: 0 });

    if (!window.mvt) {
      setError(t("error.browserOnly"));
      return;
    }
    const result = await window.mvt.start(d);
    if (result.ok && result.zipPath) {
      setZipPath(result.zipPath);
      setScreen("done");
    } else {
      setError(result.error ?? t("error.unknown"));
    }
  };

  const TopBar = (
    <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
      <LanguageSelector />
    </div>
  );

  if (screen === "welcome") {
    return (
      <div className="app">
        {TopBar}
        <div className="header">
          <h1>{t("app.title")}</h1>
          <p>{t("app.subtitle")}</p>
        </div>
        <div className="choice-grid">
          <button className="choice" onClick={() => start("android")}>
            <div className="icon">📱</div>
            <div className="title">{t("welcome.android.title", "Android")}</div>
            <div className="sub">{t("welcome.android.sub", "Samsung, Xiaomi, Pixel…")}</div>
          </button>
          <button className="choice" onClick={() => start("ios")} disabled>
            <div className="icon">📲</div>
            <div className="title">{t("welcome.ios.title", "iPhone")}</div>
            <div className="sub">{t("welcome.ios.sub", "Próximamente (solo macOS)")}</div>
          </button>
        </div>
        <div className="card" style={{ marginTop: 24 }}>
          <strong>{t("welcome.before.title", "Antes de empezar:")}</strong>
          <ul style={{ margin: "8px 0 0", paddingLeft: 18, color: "var(--muted)", fontSize: 13 }}>
            <li>{t("welcome.before.usb", "Activa la Depuración USB en tu Android.")}</li>
            <li>{t("welcome.before.cable", "Conecta el móvil con un cable USB (mejor el original).")}</li>
            <li>{t("welcome.before.unlocked", "Mantén la pantalla del móvil desbloqueada durante todo el proceso.")}</li>
          </ul>
        </div>
      </div>
    );
  }

  if (screen === "running") {
    return (
      <div className="app">
        {TopBar}
        <div className="header">
          <h1>{device === "android" ? t("running.title.android") : t("running.title.ios")}</h1>
          <p>{t("running.subtitle")}</p>
        </div>

        <div className="card">
          {PHASES.map((label, i) => {
            const num = i + 1;
            const active = phase.num === num;
            const done = phase.num > num || (active && phase.progress >= 1);
            return (
              <div key={num} className={`phase ${active ? "active" : ""} ${done ? "done" : ""}`}>
                <div className="phase-num">{done ? "✓" : num}</div>
                <div className="phase-body">
                  <div className="phase-label">{label}</div>
                  {active && (
                    <>
                      <div className="phase-sub">{phase.label}</div>
                      <div className="progress">
                        <div
                          className="progress-bar"
                          style={{ width: `${Math.round(phase.progress * 100)}%` }}
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <details style={{ marginTop: 16 }}>
          <summary>{t("details.toggle")}</summary>
          <div className="log" ref={logRef}>
            {logs.length === 0 ? t("details.waiting") : logs.join("")}
          </div>
        </details>

        {error && (
          <div className="card" style={{ borderColor: "var(--danger)", color: "var(--danger)" }}>
            <strong>{t("error.title")}</strong>
            <div style={{ marginTop: 6, fontSize: 13 }}>{error}</div>
            <div className="row">
              <button className="btn btn-secondary" onClick={() => setScreen("welcome")}>
                {t("error.back")}
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
      {TopBar}
      <div className="header">
        <h1>{t("done.title")}</h1>
        <p>{t("done.subtitle")}</p>
      </div>
      <div className="card">
        <div style={{ fontSize: 13, color: "var(--muted)" }}>{t("done.filename")}</div>
        <div style={{
          fontFamily: "SF Mono, Menlo, monospace",
          fontSize: 12,
          marginTop: 6,
          wordBreak: "break-all",
        }}>
          {zipPath}
        </div>
        <div className="row">
          <button className="btn" onClick={() => window.mvt?.openExternal("https://mvt-insight.lovable.app/upload")}>
            {t("done.upload")}
          </button>
          <button className="btn btn-secondary" onClick={() => zipPath && window.mvt?.openFolder(zipPath)}>
            {t("done.openFolder")}
          </button>
          <button className="btn btn-secondary" onClick={() => setScreen("welcome")}>
            {t("done.new")}
          </button>
        </div>
      </div>
    </div>
  );
}
