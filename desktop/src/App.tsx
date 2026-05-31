import { useEffect, useRef, useState } from "react";

type Device = "android" | "ios";
type Screen = "welcome" | "running" | "done";

interface PhaseState {
  num: number;
  label: string;
  progress: number;
}

const PHASES = [
  "Descargando AndroidQF",
  "Conectando con el dispositivo",
  "Recolectando datos",
];

export function App() {
  const [screen, setScreen] = useState<Screen>("welcome");
  const [device, setDevice] = useState<Device | null>(null);
  const [phase, setPhase] = useState<PhaseState>({ num: 0, label: "", progress: 0 });
  const [logs, setLogs] = useState<string[]>([]);
  const [zipPath, setZipPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
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
    setPhase({ num: 1, label: "Iniciando…", progress: 0 });

    const result = await window.mvt.start(d);
    if (result.ok && result.zipPath) {
      setZipPath(result.zipPath);
      setScreen("done");
    } else {
      setError(result.error ?? "Error desconocido");
    }
  };

  if (screen === "welcome") {
    return (
      <div className="app">
        <div className="header">
          <h1>MVT Insight</h1>
          <p>Recolecta los datos forenses de tu móvil con un solo clic.</p>
        </div>
        <div className="choice-grid">
          <button className="choice" onClick={() => start("android")}>
            <div className="icon">📱</div>
            <div className="title">Android</div>
            <div className="sub">Samsung, Xiaomi, Pixel…</div>
          </button>
          <button className="choice" onClick={() => start("ios")} disabled>
            <div className="icon">📲</div>
            <div className="title">iPhone</div>
            <div className="sub">Próximamente (solo macOS)</div>
          </button>
        </div>
        <div className="card" style={{ marginTop: 24 }}>
          <strong>Antes de empezar:</strong>
          <ul style={{ margin: "8px 0 0", paddingLeft: 18, color: "var(--muted)", fontSize: 13 }}>
            <li>Activa la <b>Depuración USB</b> en tu Android.</li>
            <li>Conecta el móvil con un cable USB (mejor el original).</li>
            <li>Mantén la pantalla del móvil <b>desbloqueada</b> durante todo el proceso.</li>
          </ul>
        </div>
      </div>
    );
  }

  if (screen === "running") {
    return (
      <div className="app">
        <div className="header">
          <h1>Analizando {device === "android" ? "Android" : "iPhone"}…</h1>
          <p>No cierres esta ventana. Tarda entre 5 y 15 minutos.</p>
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
          <summary>Ver detalles técnicos</summary>
          <div className="log" ref={logRef}>
            {logs.length === 0 ? "Esperando salida del proceso…" : logs.join("")}
          </div>
        </details>

        {error && (
          <div className="card" style={{ borderColor: "var(--danger)", color: "var(--danger)" }}>
            <strong>Algo salió mal:</strong>
            <div style={{ marginTop: 6, fontSize: 13 }}>{error}</div>
            <div className="row">
              <button className="btn btn-secondary" onClick={() => setScreen("welcome")}>
                Volver al inicio
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
      <div className="header">
        <h1>✓ Análisis completado</h1>
        <p>Los datos se han guardado en tu carpeta de Descargas.</p>
      </div>
      <div className="card">
        <div style={{ fontSize: 13, color: "var(--muted)" }}>Archivo generado:</div>
        <div style={{
          fontFamily: "SF Mono, Menlo, monospace",
          fontSize: 12,
          marginTop: 6,
          wordBreak: "break-all",
        }}>
          {zipPath}
        </div>
        <div className="row">
          <button className="btn" onClick={() => window.mvt.openExternal("https://mvt-insight.lovable.app/upload")}>
            Subir al informe →
          </button>
          <button className="btn btn-secondary" onClick={() => zipPath && window.mvt.openFolder(zipPath)}>
            Abrir carpeta
          </button>
          <button className="btn btn-secondary" onClick={() => setScreen("welcome")}>
            Nuevo análisis
          </button>
        </div>
      </div>
    </div>
  );
}
