import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
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
  Download,
  CheckCircle2,
  WifiOff,
  Usb,
  Lock,



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
const RELEASES_BASE_URL = "https://github.com/JORGEPLAZA499/mvt-insight/releases/latest/download";
const RELEASES_PAGE_URL = "https://github.com/JORGEPLAZA499/mvt-insight/releases/latest";
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
  const [subStep, setSubStep] = useState<number>(1);

  const blocked = device === "ios" && os === "windows";

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
    title: "Descarga la app de escritorio",
    content: (
      <>
        <p className="mb-4">
          Descarga la app <strong className="text-foreground">MVT Insight Desktop</strong> para tu
          sistema. La app hace todo el análisis con un solo botón: descarga las herramientas,
          conecta con el móvil y guarda el ZIP listo para subir aquí. <strong className="text-foreground">Sin ventana negra ni comandos.</strong>
        </p>

        <div className="rounded-xl border border-primary/40 bg-gradient-to-br from-primary/10 to-transparent p-5 shadow-glow">
          <div className="flex items-start gap-4 mb-4">
            <div className="h-12 w-12 rounded-lg bg-gradient-primary grid place-items-center shadow-glow shrink-0">
              <Download className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <div className="font-semibold">MVT Insight Desktop</div>
              <p className="text-xs text-muted-foreground mt-1">
                Versión 1.0 · Análisis con interfaz visual y barras de progreso
              </p>
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-2">
            <a
              href={`${RELEASES_BASE_URL}/MvtInsight-windows-x64.zip`}
              className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition ${
                os === "windows"
                  ? "border-primary bg-primary text-primary-foreground shadow-glow"
                  : "border-border bg-card hover:border-primary/40"
              }`}
            >
              <Monitor className="h-4 w-4" />
              Windows
            </a>
            <a
              href={`${RELEASES_BASE_URL}/MvtInsight-macos-x64.zip`}
              className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition ${
                os === "mac"
                  ? "border-primary bg-primary text-primary-foreground shadow-glow"
                  : "border-border bg-card hover:border-primary/40"
              }`}
            >
              <Apple className="h-4 w-4" />
              macOS
            </a>
            <a
              href={`${RELEASES_BASE_URL}/MvtInsight-linux-x64.tar.gz`}
              className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition ${
                os === "linux"
                  ? "border-primary bg-primary text-primary-foreground shadow-glow"
                  : "border-border bg-card hover:border-primary/40"
              }`}
            >
              <Monitor className="h-4 w-4" />
              Linux
            </a>
          </div>

          <p className="mt-3 text-[11px] text-muted-foreground">
            Recomendado para ti: <strong className="text-foreground">
              {os === "windows" ? "Windows" : os === "mac" ? "macOS" : "Linux"}
            </strong> (detectado automáticamente) · {" "}
            <a href={RELEASES_PAGE_URL} target="_blank" rel="noreferrer" className="underline hover:text-foreground">
              Ver todas las versiones en GitHub
            </a>
          </p>
        </div>

        <ol className="mt-5 space-y-2 text-sm text-muted-foreground list-decimal pl-5">
          <li>
            Descomprime el archivo descargado y haz <strong className="text-foreground">doble clic</strong> en{" "}
            <code className="font-mono text-foreground">MvtInsight</code>.
          </li>
          <li>
            Pulsa <strong className="text-foreground">"Iniciar análisis"</strong> dentro de la app.
            Verás barras de progreso para cada fase (descarga, conexión, recolección).
          </li>
          <li>
            Al terminar, la app te dirá dónde está el ZIP y te traerá de vuelta aquí para subirlo.
          </li>
        </ol>

        <details className="mt-4 text-xs">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" />
            ¿Sale un aviso de "editor desconocido" al abrirla?
          </summary>
          <div className="mt-2 p-3 rounded-md bg-card border border-border text-muted-foreground space-y-1.5">
            <p>
              Es normal: la app aún no tiene firma comercial (cuesta varios cientos al año).
              No es un virus, su código es abierto.
            </p>
            <p>
              <strong className="text-foreground">Windows:</strong> pulsa "Más información" → "Ejecutar de todos modos".
            </p>
            <p>
              <strong className="text-foreground">macOS:</strong> clic derecho sobre la app → "Abrir" → confirma.
            </p>
          </div>
        </details>
      </>
    ),
  });

  subSteps.push({
    title: "Sube el ZIP generado por la app",
    content: (
      <p>
        Cuando la app termine, te mostrará un botón{" "}
        <strong className="text-foreground">"Subir al informe"</strong> y la ruta del archivo{" "}
        <code className="font-mono text-foreground">mvt-resultados-AAAAMMDD.zip</code>{" "}
        (normalmente en <strong className="text-foreground">Descargas</strong>).
        Pulsa el botón de abajo para subirlo y ver el informe.
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
