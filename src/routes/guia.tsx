import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { CodeBlock } from "@/components/code-block";
import { CopyCommand } from "@/components/copy-command";
import { Apple, Smartphone, ShieldCheck, AlertTriangle, ExternalLink, Download, Zap, Monitor, HelpCircle } from "lucide-react";


export const Route = createFileRoute("/guia")({
  head: () => ({ meta: [
    { title: "Guía MVT paso a paso — Spyware Forensic Analyzer" },
    { name: "description", content: "Cómo generar resultados de MVT (mvt-ios y mvt-android) para analizarlos en la plataforma." },
  ]}),
  component: Guide,
});

function Guide() {
  const [tab, setTab] = useState<"ios" | "android">("ios");

  return (
    <AppShell>
      <div className="p-6 md:p-10 max-w-4xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Guía MVT paso a paso</h1>
        <p className="text-sm text-muted-foreground mt-1">
          MVT (Mobile Verification Toolkit) se ejecuta <strong className="text-foreground">en tu computador</strong>, no en la web.
          Genera los archivos JSON con MVT y luego súbelos aquí para visualizar el informe.
        </p>

        <div className="mt-4 rounded-lg border border-warning/40 bg-warning/5 p-4 flex items-start gap-3 text-sm">
          <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
          <div>
            Esta plataforma no instala spyware, no accede a dispositivos y no realiza vigilancia.
            Solo analizas dispositivos de tu propiedad o con consentimiento expreso del propietario.
          </div>
        </div>

        <QuickStart />

        <div className="mt-8 inline-flex rounded-lg border border-border bg-card p-1">
          <button
            onClick={() => setTab("ios")}
            className={`px-4 py-1.5 text-sm rounded-md flex items-center gap-2 transition-colors ${tab === "ios" ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Apple className="h-4 w-4" /> iOS
          </button>
          <button
            onClick={() => setTab("android")}
            className={`px-4 py-1.5 text-sm rounded-md flex items-center gap-2 transition-colors ${tab === "android" ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Smartphone className="h-4 w-4" /> Android
          </button>
        </div>

        {tab === "ios" ? <IosGuide /> : <AndroidGuide />}

        <div className="mt-10 rounded-lg border border-border bg-card p-5">
          <div className="flex items-center gap-2 text-sm font-medium">
            <ShieldCheck className="h-4 w-4 text-success" /> Privacidad
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Los archivos JSON que subas se procesan en tu navegador. No se envían a ningún servidor.
          </p>
        </div>

        <p className="text-xs text-muted-foreground mt-6">
          Documentación oficial de MVT:{" "}
          <a href="https://docs.mvt.re/" target="_blank" rel="noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
            docs.mvt.re <ExternalLink className="h-3 w-3" />
          </a>
        </p>
      </div>
    </AppShell>
  );
}

type OS = "mac" | "linux" | "windows";
type Device = "android" | "ios";
const SCRIPT_BASE_URL = "https://mvt-insight.lovable.app";

function detectOS(): OS {
  if (typeof navigator === "undefined") return "mac";
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("mac")) return "mac";
  if (ua.includes("win")) return "windows";
  return "linux";
}

function QuickStart() {
  const [os, setOs] = useState<OS>("mac");
  const [device, setDevice] = useState<Device>("android");
  const [showTerminalHelp, setShowTerminalHelp] = useState(false);
  const base = SCRIPT_BASE_URL;

  const installCmd: Record<OS, string> = {
    mac: `curl -fsSL ${base}/api/public/scripts/instalar-mvt-macos.sh | bash`,
    linux: `curl -fsSL ${base}/api/public/scripts/instalar-mvt-linux.sh | bash`,
    windows: `irm ${base}/api/public/scripts/instalar-mvt-windows.ps1 | iex`,
  };

  const analyzeCmd: Record<Device, Record<OS, string>> = {
    android: {
      mac: `curl -fsSL ${base}/api/public/scripts/analizar-android.sh | bash`,
      linux: `curl -fsSL ${base}/api/public/scripts/analizar-android.sh | bash`,
      windows: `irm ${base}/api/public/scripts/analizar-android.ps1 | iex`,
    },
    ios: {
      mac: `curl -fsSL ${base}/api/public/scripts/analizar-ios.sh | bash`,
      linux: `curl -fsSL ${base}/api/public/scripts/analizar-ios.sh | bash`,
      windows: `# iOS no soportado en Windows. Usa un Mac con Finder.`,
    },
  };

  const osOptions: { id: OS; label: string; icon: React.ReactNode }[] = [
    { id: "mac", label: "Mac", icon: <Apple className="h-4 w-4" /> },
    { id: "linux", label: "Linux", icon: <Monitor className="h-4 w-4" /> },
    { id: "windows", label: "Windows", icon: <Monitor className="h-4 w-4" /> },
  ];

  const terminalHelp: Record<OS, string> = {
    mac: "Pulsa Cmd (⌘) + Espacio, escribe «terminal» y pulsa Enter. Se abrirá una ventana con texto. Eso es la Terminal.",
    linux: "Pulsa Ctrl + Alt + T. Si no funciona, busca «Terminal» en el menú de aplicaciones.",
    windows: "Pulsa la tecla Windows, escribe «powershell», haz clic derecho sobre «Windows PowerShell» y elige «Ejecutar como administrador».",
  };

  useEffect(() => {
    setOs(detectOS());
  }, []);

  const installFile = os === "mac" ? "instalar-mvt-macos.sh" : os === "linux" ? "instalar-mvt-linux.sh" : "instalar-mvt-windows.ps1";
  const analyzerFile = device === "ios" ? "analizar-ios.sh" : os === "windows" ? "analizar-android.ps1" : "analizar-android.sh";

  return (
    <div className="mt-6 rounded-xl border border-primary/40 bg-gradient-to-br from-primary/5 to-transparent p-5">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Zap className="h-4 w-4 text-primary" /> Modo rápido — 2 comandos
      </div>
      <p className="text-xs text-muted-foreground mt-1">
        Abre la Terminal, copia y pega los comandos. No necesitas descargar nada manualmente.
      </p>

      {/* Selector de sistema operativo */}
      <div className="mt-4 inline-flex rounded-lg border border-border bg-card p-1">
        {osOptions.map((o) => (
          <button
            key={o.id}
            onClick={() => setOs(o.id)}
            className={`px-3 py-1.5 text-xs rounded-md flex items-center gap-1.5 transition-colors ${
              os === o.id ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {o.icon} {o.label}
          </button>
        ))}
      </div>

      {/* Ayuda terminal */}
      <button
        type="button"
        onClick={() => setShowTerminalHelp(!showTerminalHelp)}
        className="mt-3 inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
      >
        <HelpCircle className="h-3.5 w-3.5" />
        ¿Cómo abro la Terminal?
      </button>
      {showTerminalHelp && (
        <div className="mt-2 text-xs text-muted-foreground p-3 rounded-md bg-card border border-border">
          {terminalHelp[os]}
        </div>
      )}

      {/* Paso 1 */}
      <div className="mt-5">
        <div className="text-sm font-semibold text-foreground mb-1">
          Paso 1 — Instalar MVT <span className="text-xs font-normal text-muted-foreground">(solo la primera vez, ~5 min)</span>
        </div>
        <p className="text-xs text-muted-foreground mb-2">
          Pega esto en la Terminal y pulsa Enter. El script te pedirá confirmación antes de instalar nada.
        </p>
        <CopyCommand command={installCmd[os]} label={`Terminal · ${osOptions.find(o => o.id === os)?.label}`} />
      </div>

      {/* Paso 2 */}
      <div className="mt-5">
        <div className="text-sm font-semibold text-foreground mb-1">
          Paso 2 — Analizar el dispositivo
        </div>
        <div className="inline-flex rounded-lg border border-border bg-card p-1 mb-2">
          <button
            onClick={() => setDevice("android")}
            className={`px-3 py-1 text-xs rounded-md flex items-center gap-1.5 transition-colors ${
              device === "android" ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Smartphone className="h-3.5 w-3.5" /> Android
          </button>
          <button
            onClick={() => setDevice("ios")}
            className={`px-3 py-1 text-xs rounded-md flex items-center gap-1.5 transition-colors ${
              device === "ios" ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Apple className="h-3.5 w-3.5" /> iOS
          </button>
        </div>
        <p className="text-xs text-muted-foreground mb-2">
          {device === "android"
            ? "Antes: activa Depuración USB en el móvil y conéctalo por cable."
            : "Antes: crea un backup cifrado del iPhone con Finder/iTunes y guarda la contraseña."}
        </p>
        <CopyCommand command={analyzeCmd[device][os]} label={`Terminal · ${osOptions.find(o => o.id === os)?.label}`} />
        {device === "android" && (
          <p className="text-xs text-muted-foreground mt-2">
            Si la ventana parece cerrarse sola, vuelve a lanzar el comando: el script se queda abierto hasta que pulses Enter y guarda <code className="px-1 rounded bg-muted">run.log</code> dentro de la carpeta de resultados con el detalle del error.
          </p>
        )}
      </div>

      {/* Paso 3 */}
      <div className="mt-5 text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">Paso 3 — Subir resultados:</span>{" "}
        cuando termine, el script abrirá automáticamente la página de subida con tu ZIP listo.
      </div>

      {/* Fallback descarga manual */}
      <details className="mt-4 text-xs">
        <summary className="cursor-pointer text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5">
          <Download className="h-3.5 w-3.5" /> ¿El comando falla? Descargar el script manualmente
        </summary>
        <div className="mt-2 flex flex-col gap-1.5 pl-5">
          <a href={`${base}/api/public/scripts/${installFile}`} download className="text-primary hover:underline">
            Descargar instalador
          </a>
          <a href={`${base}/api/public/scripts/${analyzerFile}`} download className="text-primary hover:underline">
            Descargar analizador
          </a>
        </div>
      </details>

      <p className="text-xs text-muted-foreground mt-4 pt-4 border-t border-border/60">
        ¿Prefieres entender cada paso manualmente? Sigue la guía detallada abajo.
      </p>
    </div>
  );
}


function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="mt-6 rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-3">
        <div className="h-7 w-7 rounded-full bg-gradient-primary grid place-items-center text-xs font-semibold text-primary-foreground shadow-glow">{n}</div>
        <h3 className="text-base font-semibold">{title}</h3>
      </div>
      <div className="mt-3 text-sm text-muted-foreground space-y-2">{children}</div>
    </div>
  );
}

function IosGuide() {
  return (
    <div>
      <Step n={1} title="Conecta el iPhone por cable USB y crea un backup cifrado">
        <p>En <strong className="text-foreground">macOS</strong>: abre Finder, selecciona el iPhone, marca <em>"Cifrar copia de seguridad local"</em>, define una contraseña y pulsa <em>"Realizar copia ahora"</em>.</p>
        <p>En <strong className="text-foreground">Windows</strong>: usa iTunes o la app <em>"Dispositivos Apple"</em> con la misma opción de cifrado activada.</p>
        <p className="text-xs">Guarda la contraseña: la necesitarás en el paso 4.</p>
      </Step>

      <Step n={2} title="Instala Python 3.10+ y MVT">
        <p>Instala las dependencias necesarias y luego MVT con pip:</p>
        <CodeBlock code={`# macOS
brew install python@3.11 libusb

# Debian/Ubuntu
sudo apt install python3-pip libusb-1.0-0

# Después, en cualquier sistema:
pip3 install mvt`} />
      </Step>

      <Step n={3} title="Localiza tu backup">
        <p>Rutas habituales donde macOS/Windows guardan el backup:</p>
        <CodeBlock code={`# macOS
~/Library/Application Support/MobileSync/Backup/

# Windows
%APPDATA%\\Apple Computer\\MobileSync\\Backup\\`} />
        <p>Dentro habrá una carpeta con un identificador largo: ese es tu backup.</p>
      </Step>

      <Step n={4} title="Descifra el backup">
        <CodeBlock code={`mvt-ios decrypt-backup -p <TU_PASSWORD> -d ./backup_descifrado <RUTA_AL_BACKUP>`} />
      </Step>

      <Step n={5} title="Ejecuta el análisis MVT">
        <CodeBlock code={`mvt-ios check-backup -o ./resultados ./backup_descifrado`} />
        <p>MVT generará una carpeta <code className="font-mono text-foreground">./resultados</code> con muchos archivos <code className="font-mono text-foreground">.json</code>. Si encuentra coincidencias con indicadores conocidos, generará también archivos con sufijo <code className="font-mono text-foreground">_detected.json</code>.</p>
      </Step>

      <Step n={6} title="Comprime y sube">
        <CodeBlock code={`# macOS / Linux
cd ./resultados && zip -r ../resultados-mvt.zip .

# Windows: clic derecho sobre la carpeta → Enviar a → Carpeta comprimida`} />
        <p>Sube <code className="font-mono text-foreground">resultados-mvt.zip</code> en la sección <em>Nuevo análisis</em>.</p>
      </Step>

      <Troubleshooting items={[
        { q: "MVT pide la contraseña pero falla", a: "Verifica que el backup esté cifrado y que la contraseña sea exactamente la que pusiste al activar el cifrado en Finder/iTunes." },
        { q: "No encuentro la carpeta del backup", a: "Asegúrate de haber realizado el backup al menos una vez tras conectar el iPhone. En Windows comprueba también %USERPROFILE%\\Apple\\MobileSync\\Backup\\." },
        { q: "MVT no se instala con pip", a: "Necesitas Python 3.10 o superior. Comprueba con python3 --version y usa pip3 install --user mvt si tienes problemas de permisos." },
      ]} />
    </div>
  );
}

function AndroidGuide() {
  return (
    <div>
      <Step n={1} title="Activa la depuración USB en el teléfono">
        <p>Ajustes → Acerca del teléfono → toca <em>"Número de compilación"</em> 7 veces para habilitar <em>"Opciones de desarrollador"</em>.</p>
        <p>Luego: Ajustes → Sistema → Opciones de desarrollador → activa <strong className="text-foreground">Depuración USB</strong>.</p>
        <p>Conecta el teléfono por cable USB y autoriza el equipo cuando aparezca el aviso.</p>
      </Step>

      <Step n={2} title="Instala adb, libusb y MVT">
        <CodeBlock code={`# macOS
brew install android-platform-tools libusb

# Debian/Ubuntu
sudo apt install adb libusb-1.0-0

# Windows: descarga "SDK Platform Tools" de developer.android.com

# Después:
pip3 install mvt`} />
      </Step>

      <Step n={3} title="Verifica la conexión ADB">
        <CodeBlock code={`adb devices`} />
        <p>Debes ver tu dispositivo listado como <code className="font-mono text-foreground">device</code>. Si aparece <code className="font-mono text-foreground">unauthorized</code>, acepta el diálogo en el teléfono.</p>
      </Step>

      <Step n={4} title="Adquiere con AndroidQF y analiza con MVT">
        <p>Desde finales de 2025 <code className="font-mono text-foreground">mvt-android check-adb</code> está eliminado. El flujo oficial actual es: AndroidQF realiza la adquisición forense del dispositivo (es interactivo y pedirá confirmación en el móvil) y luego MVT analiza la carpeta resultante.</p>
        <CodeBlock code={`# 1) Descargar AndroidQF (elige el binario de tu SO desde la última release)
#    https://github.com/mvt-project/androidqf/releases/latest

# 2) Adquisición (genera una carpeta con timestamp dentro del CWD)
mkdir acquisition && cd acquisition
./androidqf            # Linux/macOS
.\\androidqf.exe       # Windows

# 3) Analizar la adquisición con MVT
cd ..
mvt-android download-iocs
mvt-android check-androidqf -o ./report ./acquisition`} />
        <p>Como alternativa puedes analizar un backup Android (<code className="font-mono text-foreground">.ab</code>) o un bug report:</p>
        <CodeBlock code={`adb backup -all -f backup.ab
mvt-android check-backup -o ./report backup.ab

# o
adb bugreport bugreport.zip
mvt-android check-bugreport -o ./report bugreport.zip`} />
      </Step>


      <Step n={5} title="Comprime y sube">
        <CodeBlock code={`cd ./resultados && zip -r ../resultados-mvt.zip .`} />
        <p>Sube el ZIP en <em>Nuevo análisis</em>.</p>
      </Step>

      <Troubleshooting items={[
        { q: "adb devices muestra 'unauthorized'", a: "Desconecta y vuelve a conectar el cable. Acepta el diálogo de RSA en el teléfono y marca 'Permitir siempre'." },
        { q: "adb no se reconoce como comando", a: "Asegúrate de añadir la carpeta platform-tools al PATH del sistema." },
        { q: "MVT no detecta el dispositivo", a: "Comprueba primero con adb devices. Si no aparece, prueba otro cable USB (el cable debe soportar datos, no solo carga)." },
      ]} />
    </div>
  );
}

function Troubleshooting({ items }: { items: { q: string; a: string }[] }) {
  return (
    <div className="mt-8">
      <h3 className="text-base font-semibold">Solución de problemas</h3>
      <div className="mt-3 space-y-2">
        {items.map((it, i) => (
          <details key={i} className="rounded-lg border border-border bg-card p-3 text-sm group">
            <summary className="cursor-pointer font-medium">{it.q}</summary>
            <p className="text-muted-foreground mt-2">{it.a}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
