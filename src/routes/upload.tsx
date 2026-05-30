import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CopyCommand } from "@/components/copy-command";
import {
  UploadCloud,
  FileArchive,
  ShieldCheck,
  X,
  AlertTriangle,
  ArrowLeft,
  Smartphone,
  Apple,
  Monitor,
  HelpCircle,
  CheckCircle2,
  Download,
  Terminal,
} from "lucide-react";

import { upsertAnalysis, Analysis } from "@/lib/mock-store";
import { parseMvtFiles } from "@/lib/mvt-parser";
import { UsbConnect } from "@/components/usb-connect";

export const Route = createFileRoute("/upload")({
  head: () => ({ meta: [{ title: "Nuevo análisis — Spyware Forensic Analyzer" }] }),
  component: Upload,
});

const MAX_SIZE = 500 * 1024 * 1024;
const SCRIPT_BASE_URL = "https://mvt-insight.lovable.app";
const TOTAL_STEPS = 4;

type Device = "android" | "ios";
type OS = "mac" | "linux" | "windows";

function detectOS(): OS {
  if (typeof navigator === "undefined") return "mac";
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("mac")) return "mac";
  if (ua.includes("win")) return "windows";
  return "linux";
}

function Upload() {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [device, setDevice] = useState<Device | null>(null);
  const [os, setOs] = useState<OS>("mac");

  useEffect(() => {
    setOs(detectOS());
  }, []);

  const next = () => setStep((s) => (Math.min(TOTAL_STEPS, s + 1) as 1 | 2 | 3 | 4));
  const back = () => setStep((s) => (Math.max(1, s - 1) as 1 | 2 | 3 | 4));

  return (
    <AppShell>
      <div className="p-6 md:p-10 max-w-2xl mx-auto">
        <header className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={back}
              disabled={step === 1}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground disabled:opacity-0 disabled:cursor-default transition-opacity"
            >
              <ArrowLeft className="h-4 w-4" /> Atrás
            </button>
            <span className="text-xs text-muted-foreground">
              Paso {step} de {TOTAL_STEPS}
            </span>
          </div>
          <Progress value={(step / TOTAL_STEPS) * 100} className="h-1" />
        </header>

        {step === 1 && (
          <StepDevice
            value={device}
            onSelect={(d) => {
              setDevice(d);
              next();
            }}
          />
        )}
        {step === 2 && (
          <StepOS
            value={os}
            onSelect={(o) => {
              setOs(o);
              next();
            }}
          />
        )}
        {step === 3 && device && (
          <StepRun device={device} os={os} onDone={next} onChangeOS={back} />
        )}
        {step === 4 && <StepUpload />}
      </div>
    </AppShell>
  );
}

/* -------------------------- Paso 1 -------------------------- */
function StepDevice({
  value,
  onSelect,
}: {
  value: Device | null;
  onSelect: (d: Device) => void;
}) {
  return (
    <section>
      <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
        ¿Qué dispositivo quieres analizar?
      </h1>
      <p className="text-sm text-muted-foreground mt-1">
        Elige el sistema operativo del móvil.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <ChoiceCard
          active={value === "android"}
          onClick={() => onSelect("android")}
          icon={<Smartphone className="h-7 w-7" />}
          title="Android"
          subtitle="Samsung, Xiaomi, Pixel…"
        />
        <ChoiceCard
          active={value === "ios"}
          onClick={() => onSelect("ios")}
          icon={<Apple className="h-7 w-7" />}
          title="iPhone"
          subtitle="iOS 14 o superior"
        />
      </div>
    </section>
  );
}

/* -------------------------- Paso 2 -------------------------- */
function StepOS({ value, onSelect }: { value: OS; onSelect: (o: OS) => void }) {
  const options: { id: OS; title: string; icon: React.ReactNode }[] = [
    { id: "mac", title: "Mac", icon: <Apple className="h-7 w-7" /> },
    { id: "windows", title: "Windows", icon: <Monitor className="h-7 w-7" /> },
    { id: "linux", title: "Linux", icon: <Monitor className="h-7 w-7" /> },
  ];
  return (
    <section>
      <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
        ¿Desde qué computador lo harás?
      </h1>
      <p className="text-sm text-muted-foreground mt-1">
        Necesitas un computador con cable USB para conectar el móvil.
      </p>

      <div className="mt-6 grid grid-cols-3 gap-3">
        {options.map((o) => (
          <ChoiceCard
            key={o.id}
            active={value === o.id}
            onClick={() => onSelect(o.id)}
            icon={o.icon}
            title={o.title}
          />
        ))}
      </div>
    </section>
  );
}

/* -------------------------- Paso 3 -------------------------- */
function StepRun({
  device,
  os,
  onDone,
  onChangeOS,
}: {
  device: Device;
  os: OS;
  onDone: () => void;
  onChangeOS: () => void;
}) {
  const [showHelp, setShowHelp] = useState(false);
  const [showAlt, setShowAlt] = useState(false);
  const [subStep, setSubStep] = useState<number>(1);
  const [downloaded, setDownloaded] = useState(false);

  const blocked = device === "ios" && os === "windows";

  const analyzerFile =
    device === "ios"
      ? "analizar-ios.sh"
      : os === "windows"
        ? "analizar-android.ps1"
        : "analizar-android.sh";

  const scriptUrl = `${SCRIPT_BASE_URL}/api/public/scripts/${analyzerFile}`;

  const command =
    os === "windows"
      ? `irm ${scriptUrl} | iex`
      : `curl -fsSL ${scriptUrl} | bash`;

  const terminalHelp: Record<OS, string> = {
    mac: "Pulsa Cmd (⌘) + Espacio, escribe «terminal» y pulsa Enter.",
    linux: "Pulsa Ctrl + Alt + T, o busca «Terminal» en el menú.",
    windows:
      "Pulsa la tecla Windows, escribe «powershell» y abre «Windows PowerShell».",
  };

  const prep =
    device === "android"
      ? "Antes de continuar: en el móvil activa la Depuración USB y conéctalo por cable."
      : "Antes de continuar: crea un backup cifrado del iPhone con Finder/iTunes y recuerda la contraseña.";

  /* ---------- Generación del lanzador (cliente) ---------- */
  const launcher = useMemo(() => {
    if (os === "windows") {
      const content =
        `@echo off\r\n` +
        `title Analisis forense - Spyware Insight\r\n` +
        `echo ============================================\r\n` +
        `echo  Iniciando analisis forense...\r\n` +
        `echo ============================================\r\n` +
        `echo.\r\n` +
        `powershell -NoProfile -ExecutionPolicy Bypass -Command "irm ${scriptUrl} | iex"\r\n` +
        `echo.\r\n` +
        `pause\r\n`;
      return {
        content,
        filename: device === "ios" ? "analizar-iphone.bat" : "analizar-android.bat",
        mime: "application/bat",
      };
    }
    // mac & linux
    const content =
      `#!/bin/bash\n` +
      `echo "============================================"\n` +
      `echo " Iniciando análisis forense…"\n` +
      `echo "============================================"\n` +
      `echo ""\n` +
      `curl -fsSL ${scriptUrl} | bash\n` +
      `echo ""\n` +
      `echo "Listo. Pulsa Enter para cerrar esta ventana."\n` +
      `read\n`;
    const ext = os === "mac" ? "command" : "sh";
    return {
      content,
      filename: `${device === "ios" ? "analizar-iphone" : "analizar-android"}.${ext}`,
      mime: "application/x-sh",
    };
  }, [os, device, scriptUrl]);

  const downloadLauncher = () => {
    const blob = new Blob([launcher.content], { type: launcher.mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = launcher.filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setDownloaded(true);
  };

  if (blocked) {
    return (
      <section>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
          iPhone necesita un Mac
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          Para analizar un iPhone necesitas hacer el backup desde un Mac (o
          desde Windows con iTunes y procesarlo luego en Mac/Linux). Cambia el
          computador para continuar.
        </p>
        <Button className="mt-6" onClick={onChangeOS}>
          ← Elegir otro computador
        </Button>
      </section>
    );
  }

  const launcherPrimary = os === "windows" || os === "mac";

  const launcherBlock = launcherPrimary ? (
    <div className="rounded-xl border border-primary/40 bg-gradient-to-br from-primary/10 to-transparent p-5 shadow-glow">
      <div className="flex items-start gap-4">
        <div className="h-12 w-12 rounded-lg bg-gradient-primary grid place-items-center shadow-glow shrink-0">
          <Download className="h-6 w-6 text-primary-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold">{launcher.filename}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {os === "windows"
              ? "Descarga el archivo, haz doble clic y la Terminal se abrirá sola ejecutando el análisis."
              : "Descarga el archivo y haz doble clic. La Terminal se abrirá automáticamente y ejecutará el análisis."}
          </p>
          <Button
            onClick={downloadLauncher}
            className="mt-3 bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"
          >
            <Download className="h-4 w-4 mr-1.5" />
            Descargar lanzador
          </Button>
          {downloaded && (
            <div className="mt-3 inline-flex items-center gap-1.5 text-xs text-success">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Descargado. Búscalo en tu carpeta Descargas y haz doble clic.
            </div>
          )}
        </div>
      </div>

      {os === "mac" && (
        <details className="mt-4 text-xs">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
            ¿Sale "permiso denegado" al hacer doble clic?
          </summary>
          <div className="mt-2 p-3 rounded-md bg-card border border-border text-muted-foreground">
            Es una protección de macOS. Abre la Terminal una vez y pega:
            <pre className="mt-2 font-mono text-foreground bg-muted/40 p-2 rounded text-[11px] overflow-x-auto">
              chmod +x ~/Downloads/{launcher.filename}
            </pre>
            Luego vuelve a hacer doble clic en el archivo.
          </div>
        </details>
      )}
    </div>
  ) : (
    <CopyCommand command={command} label="Terminal" />
  );

  const preambleStep = {
    title: "Prepara el cable y el móvil",
    content: (
      <>
        <p>
          Ten a mano un <strong className="text-foreground">cable USB</strong> (mejor el original,
          que transmita datos, no solo carga). Mantén el móvil{" "}
          <strong className="text-foreground">desbloqueado y con la pantalla encendida</strong> durante
          todo el proceso.
        </p>
        <p className="mt-2 text-xs">
          Cuando estés listo, conecta el móvil al ordenador con el cable, así:
        </p>
        <div className="mt-4 rounded-xl border border-border bg-card/40 p-4">
          <UsbConnect />
        </div>
      </>
    ),
  };

  const subSteps: { title: string; content: React.ReactNode }[] =
    device === "android"
      ? [
          preambleStep,
          {
            title: "Activa el modo desarrollador en el móvil",
            content: (
              <>
                <p>
                  Abre <strong className="text-foreground">Ajustes</strong> →{" "}
                  <strong className="text-foreground">Información del teléfono</strong> y toca{" "}
                  <strong className="text-foreground">7 veces</strong> sobre "Número de compilación".
                  Verás un mensaje: "Ya eres desarrollador".
                </p>
                <details className="mt-3">
                  <summary className="cursor-pointer text-primary hover:underline text-sm">
                    Ruta exacta por marca
                  </summary>
                  <ul className="mt-2 space-y-1 pl-4 list-disc text-sm">
                    <li><strong className="text-foreground">Samsung:</strong> Ajustes → Acerca del teléfono → Información del software → tocar "Número de compilación" 7 veces.</li>
                    <li><strong className="text-foreground">Xiaomi/Redmi:</strong> Ajustes → Sobre el teléfono → tocar "Versión MIUI" 7 veces.</li>
                    <li><strong className="text-foreground">Pixel/Android puro:</strong> Ajustes → Acerca del teléfono → tocar "Número de compilación" 7 veces.</li>
                    <li><strong className="text-foreground">Huawei/Honor:</strong> Ajustes → Sistema → Acerca del teléfono → tocar "Número de compilación" 7 veces.</li>
                  </ul>
                </details>
              </>
            ),
          },
          {
            title: "Activa la Depuración USB",
            content: (
              <p>
                Vuelve a <strong className="text-foreground">Ajustes</strong> →{" "}
                <strong className="text-foreground">Sistema</strong> →{" "}
                <strong className="text-foreground">Opciones de desarrollador</strong> y activa{" "}
                <strong className="text-foreground">"Depuración USB"</strong>. Confirma cuando te lo pida.
              </p>
            ),
          },
          {
            title: "Conecta el móvil al ordenador con un cable USB",
            content: (
              <p>
                Usa el <strong className="text-foreground">cable original</strong> si puedes (algunos cables solo cargan, no transmiten datos).
                En el móvil aparecerá un aviso: <strong className="text-foreground">"¿Permitir depuración USB?"</strong>.
                Marca <strong className="text-foreground">"Permitir siempre desde este ordenador"</strong> y pulsa Aceptar.
              </p>
            ),
          },
        ]
      : [
          preambleStep,
          {
            title: "Confía en el ordenador desde el iPhone",
            content: (
              <p>
                Conecta el iPhone por USB, <strong className="text-foreground">desbloquéalo</strong> y, cuando aparezca el aviso{" "}
                <strong className="text-foreground">"¿Confiar en este ordenador?"</strong>, pulsa{" "}
                <strong className="text-foreground">Confiar</strong> e introduce el código del iPhone.
              </p>
            ),
          },
          {
            title: "Crea un backup cifrado del iPhone",
            content: (
              <p>
                Abre <strong className="text-foreground">Finder</strong> (macOS Catalina o superior) o{" "}
                <strong className="text-foreground">iTunes</strong>, selecciona el iPhone, marca{" "}
                <strong className="text-foreground">"Cifrar copia de seguridad local"</strong> y define una contraseña.
                <span className="block mt-1 text-warning">⚠ Apunta la contraseña: la necesitarás más adelante.</span>
              </p>
            ),
          },
          {
            title: "Mantén el iPhone conectado y desbloqueado",
            content: (
              <p>
                Durante todo el análisis el iPhone debe estar <strong className="text-foreground">conectado por USB</strong> y{" "}
                <strong className="text-foreground">desbloqueado</strong>. Si se bloquea, vuelve a desbloquearlo.
              </p>
            ),
          },
        ];

  subSteps.push({
    title: launcherPrimary ? "Descarga el lanzador y haz doble clic" : "Ejecuta el comando en la Terminal",
    content: (
      <>
        {launcherPrimary ? (
          <p className="mb-3">
            Descarga el archivo de abajo. Búscalo en tu carpeta{" "}
            <strong className="text-foreground">Descargas</strong> y haz{" "}
            <strong className="text-foreground">doble clic</strong> sobre él.
            Se abrirá una <strong className="text-foreground">ventana negra</strong> (Terminal/PowerShell):{" "}
            <strong className="text-foreground">no la cierres</strong>, está trabajando.
            El proceso puede tardar entre <strong className="text-foreground">5 y 15 minutos</strong>;
            verás texto avanzando, es normal.
            {device === "android" && (
              <span className="block mt-2 text-warning">
                ⚠ AndroidQF te hará varias preguntas en la ventana negra. En el siguiente paso te decimos qué pulsar en cada una.
              </span>
            )}
            {device === "ios" && (
              <span className="block mt-2">
                Cuando te pida la <strong className="text-foreground">contraseña del backup</strong>, escríbela y pulsa Enter.
              </span>
            )}
          </p>
        ) : (
          <p className="mb-3">
            Abre la Terminal, pega el comando y pulsa Enter. No cierres la ventana hasta que termine
            (puede tardar entre 5 y 15 minutos).
          </p>
        )}
        {launcherBlock}

        <button
          type="button"
          onClick={() => setShowAlt((v) => !v)}
          className="mt-3 inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
        >
          <Terminal className="h-3.5 w-3.5" />
          {launcherPrimary
            ? "Prefiero copiar el comando manualmente"
            : "Prefiero descargar un script"}
        </button>

        {showAlt && (
          <div className="mt-3">
            {launcherPrimary ? (
              <CopyCommand command={command} label="Terminal" />
            ) : (
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{launcher.filename}</div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Descárgalo y ejecuta:{" "}
                      <code className="font-mono text-foreground">bash ~/Downloads/{launcher.filename}</code>
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={downloadLauncher}>
                    <Download className="h-4 w-4 mr-1.5" /> Descargar
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={() => setShowHelp((v) => !v)}
          className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <HelpCircle className="h-3.5 w-3.5" />
          ¿Cómo abro la Terminal?
        </button>
        {showHelp && (
          <div className="mt-2 text-xs text-muted-foreground p-3 rounded-md bg-card border border-border">
            {terminalHelp[os]}
          </div>
        )}
      </>
    ),
  });

  if (device === "android") {
    subSteps.push({
      title: "Responde a las preguntas de AndroidQF",
      content: (
        <>
          <p className="mb-3">
            En la ventana negra irán apareciendo varias preguntas. Usa las{" "}
            <strong className="text-foreground">flechas ↑ ↓</strong> para moverte y{" "}
            <strong className="text-foreground">Enter</strong> para confirmar. Esto es lo que debes
            elegir en cada una:
          </p>
          <ul className="space-y-3">
            {[
              {
                prompt: "Would you like to take a backup of the device?",
                choose: "Everything",
                why: "Backup completo del usuario. Necesario para detectar artefactos.",
              },
              {
                prompt: "Download: (All / Only non-system / Do not download)",
                choose: "All",
                why: "Incluye los APKs del sistema, donde suele camuflarse el spyware.",
              },
              {
                prompt: "Upload to VirusTotal? (si aparece)",
                choose: "No",
                why: "Subiría tus APKs a internet. No hace falta para el análisis local.",
              },
              {
                prompt: "Remove? (después de descargar APKs)",
                choose: "No",
                why: "Conserva los APKs en la carpeta — MVT los necesita después.",
              },
              {
                prompt: 'Aviso en el móvil: "Allow USB debugging?"',
                choose: "Permitir siempre + Aceptar",
                why: "Sin esto, adb no puede leer el dispositivo y el análisis falla.",
              },
            ].map((row) => (
              <li
                key={row.prompt}
                className="rounded-lg border border-border bg-card/40 p-3"
              >
                <div className="font-mono text-xs text-muted-foreground">
                  {row.prompt}
                </div>
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-muted-foreground">Pulsa:</span>
                  <kbd className="inline-flex items-center rounded-md border border-primary/40 bg-primary/10 px-2 py-0.5 text-xs font-semibold text-foreground">
                    {row.choose}
                  </kbd>
                </div>
                <div className="mt-1.5 text-xs text-muted-foreground">{row.why}</div>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-muted-foreground">
            Tras la última pregunta verás "<span className="font-mono">Collecting information on installed apps. This might take a while…</span>".
            La ventana parecerá parada <strong className="text-foreground">5-15 minutos</strong>:
            es normal. Mira la <strong className="text-foreground">ventana de estado</strong> para confirmar que sigue trabajando.
          </p>
        </>
      ),
    });
  }

  subSteps.push({
    title: "Cuando termine, busca el archivo ZIP",
    content: (
      <p>
        Al acabar, el script deja un archivo{" "}
        <code className="font-mono text-foreground">mvt-resultados-AAAAMMDD.zip</code> en la misma carpeta
        donde ejecutaste el lanzador (normalmente <strong className="text-foreground">Descargas</strong>).
        Cuando lo tengas, pulsa el botón de abajo para subirlo.
      </p>
    ),
  });

  const total = subSteps.length;
  const current = Math.min(subStep, total);
  const active = subSteps[current - 1];
  const isLast = current === total;

  return (
    <section>
      <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
        Sigue los pasos en orden
      </h1>
      <p className="text-sm text-muted-foreground mt-1">
        Un paso cada vez. No te saltes ninguno o el análisis no funcionará.
      </p>

      <div className="mt-5 flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Paso {current} de {total}
        </span>
        <span className="truncate ml-3">{active.title}</span>
      </div>
      <Progress value={(current / total) * 100} className="h-1 mt-2" />


      <div className="mt-6">
        <NumberedStep n={current} title={active.title}>
          {active.content}
        </NumberedStep>
      </div>

      <div className="mt-6 flex items-center justify-between gap-3">
        <Button
          variant="ghost"
          onClick={() => setSubStep((s) => Math.max(1, s - 1))}
          disabled={current === 1}
          className="disabled:opacity-0"
        >
          <ArrowLeft className="h-4 w-4 mr-1.5" /> Anterior
        </Button>
        {isLast ? (
          <Button onClick={onDone} className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90">
            <CheckCircle2 className="h-4 w-4 mr-1.5" /> Ya tengo el ZIP
          </Button>
        ) : (
          <Button
            onClick={() => setSubStep((s) => Math.min(total, s + 1))}
            className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"
          >
            Hecho, siguiente →
          </Button>
        )}
      </div>
    </section>
  );
}

function NumberedStep({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <li className="rounded-xl border border-border bg-card/40 p-4">
      <div className="flex items-start gap-3">
        <div className="h-8 w-8 shrink-0 rounded-full bg-gradient-primary text-primary-foreground grid place-items-center text-sm font-semibold shadow-glow">
          {n}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-foreground">{title}</div>
          <div className="mt-1 text-sm text-muted-foreground">{children}</div>
        </div>
      </div>
    </li>
  );
}


/* -------------------------- Paso 4 -------------------------- */
function StepUpload() {
  const [files, setFiles] = useState<File[]>([]);
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const addFiles = (incoming: File[]) => {
    setError(null);
    const ok: File[] = [];
    for (const f of incoming) {
      const lower = f.name.toLowerCase();
      if (!lower.endsWith(".json") && !lower.endsWith(".zip")) {
        setError(`Archivo no soportado: ${f.name}. Solo .json o .zip generados por MVT.`);
        continue;
      }
      if (f.size > MAX_SIZE) {
        setError(`El archivo ${f.name} supera el límite de 500 MB.`);
        continue;
      }
      ok.push(f);
    }
    setFiles((prev) => [...prev, ...ok]);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files) addFiles(Array.from(e.dataTransfer.files));
  };

  const start = async () => {
    if (!files.length || !consent || busy) return;
    setBusy(true);
    setError(null);
    const id = crypto.randomUUID();
    const sourceName = files.length === 1 ? files[0].name : `${files.length} archivos MVT`;
    const totalSize = files.reduce((s, f) => s + f.size, 0);

    const base: Analysis = {
      id,
      fileName: sourceName,
      fileSize: totalSize,
      uploadedAt: new Date().toISOString(),
      status: "processing",
      progress: 10,
    };
    upsertAnalysis(base);

    try {
      const result = await parseMvtFiles(files, sourceName);
      const done: Analysis = { ...base, status: "completed", progress: 100, result };
      upsertAnalysis(done);
      navigate({ to: "/analysis/$id", params: { id } });
    } catch (e: any) {
      const errored: Analysis = { ...base, status: "error", progress: 0, error: e?.message || "Error al procesar" };
      upsertAnalysis(errored);
      setError(e?.message || "No se pudieron procesar los archivos.");
      setBusy(false);
    }
  };

  return (
    <section>
      <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
        Sube el ZIP de resultados
      </h1>
      <p className="text-sm text-muted-foreground mt-1">
        Arrastra el <code className="font-mono">.zip</code> que generó el script (o los <code className="font-mono">.json</code> sueltos).
      </p>

      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className="mt-6 rounded-xl border-2 border-dashed border-border bg-card/40 hover:border-primary/50 hover:bg-card/60 transition-colors p-10 text-center cursor-pointer"
      >
        <div className="mx-auto h-12 w-12 rounded-lg bg-gradient-primary grid place-items-center shadow-glow mb-3">
          <UploadCloud className="h-6 w-6 text-primary-foreground" />
        </div>
        <p className="text-sm font-medium">Arrastra aquí o haz clic</p>
        <p className="text-xs text-muted-foreground mt-1">.json o .zip · máx. 500 MB</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          accept=".json,.zip"
          onChange={(e) => e.target.files && addFiles(Array.from(e.target.files))}
        />
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" /> {error}
        </div>
      )}

      {files.length > 0 && (
        <div className="mt-4 space-y-2">
          {files.map((f, i) => (
            <div key={i} className="flex items-center justify-between rounded-lg border border-border bg-card p-3">
              <div className="flex items-center gap-3 min-w-0">
                <FileArchive className="h-5 w-5 text-primary shrink-0" />
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{f.name}</div>
                  <div className="text-xs text-muted-foreground">{(f.size / 1024).toFixed(1)} KB</div>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setFiles(files.filter((_, j) => j !== i))}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <label className="mt-6 flex gap-3 items-start rounded-lg border border-warning/40 bg-warning/5 p-3 cursor-pointer">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1" />
        <span className="text-sm text-muted-foreground">
          Soy propietario del dispositivo o tengo <strong className="text-foreground">consentimiento explícito</strong>. Los archivos se procesan localmente en mi navegador.
        </span>
      </label>

      <div className="mt-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-success" /> 100% local
        </div>
        <Button
          onClick={start}
          disabled={!files.length || !consent || busy}
          className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"
        >
          {busy ? "Procesando…" : "Analizar"}
        </Button>
      </div>
    </section>
  );
}

/* -------------------------- Helpers -------------------------- */
function ChoiceCard({
  active,
  onClick,
  icon,
  title,
  subtitle,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`group rounded-xl border bg-card p-6 text-left transition-all hover:border-primary/60 hover:bg-card/80 ${
        active ? "border-primary shadow-glow" : "border-border"
      }`}
    >
      <div
        className={`h-12 w-12 rounded-lg grid place-items-center mb-3 transition-colors ${
          active ? "bg-gradient-primary text-primary-foreground shadow-glow" : "bg-muted text-foreground"
        }`}
      >
        {icon}
      </div>
      <div className="font-semibold">{title}</div>
      {subtitle && <div className="text-xs text-muted-foreground mt-0.5">{subtitle}</div>}
    </button>
  );
}
