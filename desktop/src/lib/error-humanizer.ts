// Humaniza errores crudos de AndroidQF / mvt-ios / Electron a copy bilingüe.
// Devuelve título, causa probable, acción sugerida y severidad.

export type ErrorSeverity = "info" | "warning" | "danger";

export interface HumanError {
  id: string;
  severity: ErrorSeverity;
  title: string;
  body: string;
  action?: string;
  technical: string; // mensaje original (para detalle colapsable)
}

interface Pattern {
  id: string;
  severity: ErrorSeverity;
  test: (raw: string) => boolean;
  es: { title: string; body: string; action?: string };
  en: { title: string; body: string; action?: string };
}

const PATTERNS: Pattern[] = [
  {
    id: "cancelled",
    severity: "info",
    test: (r) => /^cancelled$/i.test(r) || /cancelado/i.test(r),
    es: { title: "Análisis cancelado", body: "Has detenido el análisis antes de que terminara.", action: "Puedes iniciar uno nuevo cuando quieras." },
    en: { title: "Analysis cancelled", body: "You stopped the analysis before it finished.", action: "You can start a new one whenever you want." },
  },
  {
    id: "insufficient_credits",
    severity: "warning",
    test: (r) => /INSUFFICIENT_CREDITS|sin créditos|no credits/i.test(r),
    es: { title: "Sin créditos suficientes", body: "Tu cuenta no tiene créditos disponibles para subir el informe.", action: "Recarga créditos desde el panel web y reintenta la subida." },
    en: { title: "Not enough credits", body: "Your account has no credits left to upload the report.", action: "Top up credits from the web panel and retry the upload." },
  },
  {
    id: "multiple_devices",
    severity: "warning",
    test: (r) => /multiple (android )?devices|more than one device/i.test(r),
    es: { title: "Hay varios dispositivos conectados", body: "El sistema detectó más de un teléfono o emulador conectado por USB.", action: "Desconecta los demás dispositivos (incluidos emuladores) y deja solo el teléfono a analizar." },
    en: { title: "Multiple devices connected", body: "More than one phone or emulator was detected over USB.", action: "Disconnect the other devices (including emulators) and keep only the phone you want to analyse." },
  },
  {
    id: "device_unauthorized",
    severity: "warning",
    test: (r) => /unauthorized/i.test(r),
    es: { title: "El teléfono no ha autorizado al ordenador", body: "Android pide tu permiso explícito antes de exponer datos por USB.", action: "Mira la pantalla del móvil y toca «Permitir» en el aviso de depuración USB. Si no aparece, desconecta y vuelve a conectar el cable." },
    en: { title: "The phone has not authorised this computer", body: "Android requires explicit consent before exposing data over USB.", action: "Look at the phone screen and tap “Allow” on the USB debugging prompt. If nothing appears, unplug and plug the cable back in." },
  },
  {
    id: "no_device",
    severity: "warning",
    test: (r) => /no devices|device not found|no device\/emulator/i.test(r),
    es: { title: "No se detecta ningún teléfono", body: "El ordenador no ve ningún Android conectado por USB.", action: "Comprueba el cable (preferible el original), prueba otro puerto USB y asegúrate de tener activada la Depuración USB en el móvil." },
    en: { title: "No phone detected", body: "The computer cannot see any Android connected over USB.", action: "Check the cable (use the original one), try another USB port, and make sure USB Debugging is enabled on the phone." },
  },
  {
    id: "device_offline",
    severity: "warning",
    test: (r) => /device offline/i.test(r),
    es: { title: "El teléfono está en estado «offline»", body: "ADB ve el móvil pero no puede comunicarse con él.", action: "Desbloquea la pantalla, desconecta el cable y vuelve a conectarlo. Si persiste, reinicia el móvil." },
    en: { title: "The phone is in “offline” state", body: "ADB sees the phone but cannot talk to it.", action: "Unlock the screen, unplug the cable and plug it back in. If it persists, reboot the phone." },
  },
  {
    id: "adb_binary_blocked",
    severity: "danger",
    test: (r) => /Impossible to initialize ADB|failed to use the adb executable/i.test(r),
    es: { title: "Windows bloqueó el ejecutable de ADB", body: "El antivirus o SmartScreen está impidiendo que se ejecute la herramienta oficial de Google necesaria para hablar con el móvil.", action: "Añade la carpeta de descargas a las exclusiones del antivirus y reintenta. Si usas Windows Defender, abre Seguridad de Windows → Protección antivirus → Exclusiones." },
    en: { title: "Windows blocked the ADB executable", body: "Your antivirus or SmartScreen is preventing the official Google tool needed to talk to the phone from running.", action: "Add the downloads folder to your antivirus exclusions and retry. On Windows Defender: Windows Security → Virus protection → Exclusions." },
  },
  {
    id: "platform_tools_quarantined",
    severity: "danger",
    test: (r) => /ENOENT[^]*platform-tools|ENOENT[^]*adb/i.test(r),
    es: { title: "El antivirus puso en cuarentena el archivo de ADB", body: "Descargamos platform-tools de Google y desapareció antes de poder usarlo. Suele ser Windows Defender o Avast/AVG.", action: "Añade la carpeta de Descargas a las exclusiones de tu antivirus y vuelve a iniciar el análisis." },
    en: { title: "Antivirus quarantined the ADB file", body: "We downloaded platform-tools from Google but it disappeared before we could use it. Usually Windows Defender or Avast/AVG.", action: "Add the Downloads folder to your antivirus exclusions and start the analysis again." },
  },
  {
    id: "adb_missing_dlls",
    severity: "danger",
    test: (r) => /Faltan DLLs de ADB|missing.*dll/i.test(r),
    es: { title: "Faltan librerías de ADB", body: "La descarga de platform-tools quedó incompleta. Lo más probable es que el antivirus eliminara parte del paquete.", action: "Pausa el antivirus brevemente, reinicia el análisis y déjalo terminar la descarga." },
    en: { title: "ADB libraries are missing", body: "The platform-tools download was incomplete. Most likely your antivirus removed part of the package.", action: "Pause the antivirus briefly, restart the analysis and let the download finish." },
  },
  {
    id: "download_http",
    severity: "warning",
    test: (r) => /HTTP \d{3}/i.test(r),
    es: { title: "No se pudo descargar una herramienta necesaria", body: "El servidor de GitHub o Google devolvió un error al intentar bajar una dependencia.", action: "Comprueba tu conexión a Internet y reintenta en unos minutos. Si usas VPN o proxy corporativo, desactívalos temporalmente." },
    en: { title: "Could not download a required tool", body: "GitHub or Google returned an error while fetching a dependency.", action: "Check your internet connection and retry in a few minutes. If you use a VPN or corporate proxy, disable it temporarily." },
  },
  {
    id: "download_invalid",
    severity: "warning",
    test: (r) => /Descarga inválida|invalid download/i.test(r),
    es: { title: "La descarga llegó corrupta", body: "El archivo recibido tiene un tamaño inesperado, probablemente por un corte de conexión.", action: "Reintenta el análisis. Si vuelve a fallar, prueba a cambiar de red (móvil ↔ wifi)." },
    en: { title: "The download arrived corrupted", body: "The received file has an unexpected size, likely due to a connection drop.", action: "Retry the analysis. If it fails again, try switching networks (mobile ↔ wifi)." },
  },
  {
    id: "memory_zip",
    severity: "danger",
    test: (r) => /Array buffer allocation failed|out of memory|ERR_BUFFER/i.test(r),
    es: { title: "El equipo se quedó sin memoria al comprimir", body: "La carpeta de resultados es muy grande (varios GB) y la versión antigua de la app la cargaba entera en RAM.", action: "Actualiza a la última versión de MVT Insight (ya usa compresión por streaming). Mientras tanto, comprime la carpeta manualmente con clic derecho → Enviar a → Carpeta comprimida y súbela desde el panel admin." },
    en: { title: "The computer ran out of memory while compressing", body: "The results folder is very large (several GB) and the old version of the app loaded it entirely into RAM.", action: "Update to the latest MVT Insight (it already uses streaming compression). Meanwhile, compress the folder manually (right-click → Send to → Compressed folder) and upload it from the admin panel." },
  },
  {
    id: "disk_full",
    severity: "danger",
    test: (r) => /ENOSPC|no space left/i.test(r),
    es: { title: "No queda espacio en el disco", body: "El análisis necesita escribir varios GB en la carpeta de Descargas y el disco está lleno.", action: "Libera al menos 10 GB en la unidad del sistema y vuelve a iniciar el análisis." },
    en: { title: "No disk space left", body: "The analysis needs to write several GB to the Downloads folder and the disk is full.", action: "Free at least 10 GB on the system drive and start the analysis again." },
  },
  {
    id: "permission_denied",
    severity: "warning",
    test: (r) => /EACCES|EPERM|permission denied/i.test(r),
    es: { title: "El sistema bloqueó el acceso a una carpeta", body: "Windows o macOS denegó permisos de escritura/lectura sobre la carpeta de trabajo.", action: "Cierra la app, haz clic derecho sobre el icono y ábrela «Como administrador» (Windows) o concédele permisos de Archivos en Configuración → Privacidad (macOS)." },
    en: { title: "The system blocked folder access", body: "Windows or macOS denied read/write permissions on the working folder.", action: "Close the app, right-click the icon and open it “As administrator” (Windows) or grant Files access in System Settings → Privacy (macOS)." },
  },
  {
    id: "network",
    severity: "warning",
    test: (r) => /ECONNREFUSED|ENOTFOUND|ETIMEDOUT|network error|getaddrinfo/i.test(r),
    es: { title: "Problema de conexión a Internet", body: "No pudimos contactar con los servidores necesarios para iniciar el análisis.", action: "Comprueba tu conexión y vuelve a intentarlo. Si usas VPN, desactívala." },
    en: { title: "Internet connection problem", body: "We could not reach the servers required to start the analysis.", action: "Check your connection and try again. If you use a VPN, disable it." },
  },
  {
    id: "androidqf_exit",
    severity: "danger",
    test: (r) => /AndroidQF terminó con código|androidqf.*exit/i.test(r),
    es: { title: "AndroidQF terminó con error", body: "La herramienta de recolección se detuvo de forma inesperada antes de completar todos los módulos.", action: "Desconecta y vuelve a conectar el teléfono, asegúrate de que la pantalla está desbloqueada y reintenta. Si persiste, reinicia el móvil." },
    en: { title: "AndroidQF ended with an error", body: "The collection tool stopped unexpectedly before completing all modules.", action: "Unplug and reconnect the phone, make sure the screen is unlocked, and retry. If it persists, reboot the phone." },
  },
  {
    id: "ios_backup_password",
    severity: "warning",
    test: (r) => /contraseña de backup|backup password|encryption password/i.test(r),
    es: { title: "Se necesita contraseña de backup cifrado", body: "iOS exige una contraseña de al menos 4 caracteres para crear backups cifrados (obligatorio para el análisis).", action: "Introduce una contraseña en el campo correspondiente. Guárdala: la necesitarás también en futuros backups de iTunes." },
    en: { title: "Encrypted backup password required", body: "iOS requires a password of at least 4 characters to create encrypted backups (mandatory for analysis).", action: "Enter a password in the field. Save it: you will need it for future iTunes backups too." },
  },
  {
    id: "ios_trust",
    severity: "warning",
    test: (r) => /lockdownd|trust this computer|pair the device|not paired/i.test(r),
    es: { title: "El iPhone no confía aún en este ordenador", body: "iOS pide confirmar explícitamente la primera vez que conectas el cable.", action: "Desbloquea el iPhone, toca «Confiar» en el aviso que aparece y vuelve a iniciar el análisis." },
    en: { title: "The iPhone does not trust this computer yet", body: "iOS asks for explicit confirmation the first time you plug in the cable.", action: "Unlock the iPhone, tap “Trust” on the prompt that appears, and start the analysis again." },
  },
  {
    id: "ios_drivers",
    severity: "warning",
    test: (r) => /IOS_DRIVERS_MISSING|Apple Mobile Device|AMDS/i.test(r),
    es: { title: "Faltan los drivers de Apple en Windows", body: "Windows necesita los drivers de Apple Mobile Device para reconocer el iPhone.", action: "Instala la app gratuita «Apple Devices» desde la Microsoft Store o iTunes desde apple.com y reintenta." },
    en: { title: "Apple drivers are missing on Windows", body: "Windows requires Apple Mobile Device drivers to recognise the iPhone.", action: "Install the free «Apple Devices» app from the Microsoft Store or iTunes from apple.com and retry." },
  },
  {
    id: "mvt_ios_failed",
    severity: "danger",
    test: (r) => /mvt[-_ ]ios|mvt-ios.*failed/i.test(r),
    es: { title: "El análisis de iOS falló", body: "mvt-ios no pudo terminar de procesar el backup del iPhone.", action: "Reinicia el iPhone, desconéctalo y vuelve a conectarlo. Asegúrate de que tienes suficiente batería y espacio libre en el ordenador." },
    en: { title: "iOS analysis failed", body: "mvt-ios could not finish processing the iPhone backup.", action: "Reboot the iPhone, unplug it and plug it back in. Make sure you have enough battery and free space on the computer." },
  },
  {
    id: "unsupported_platform",
    severity: "danger",
    test: (r) => /Plataforma no soportada|unsupported platform/i.test(r),
    es: { title: "Sistema operativo no compatible", body: "MVT Insight solo se ha probado en Windows 10/11, macOS 12+ y Linux x64/arm64.", action: "Si crees que tu sistema debería ser compatible, contacta con soporte e indícanos tu versión." },
    en: { title: "Operating system not supported", body: "MVT Insight has only been tested on Windows 10/11, macOS 12+ and Linux x64/arm64.", action: "If you think your system should be supported, contact support and let us know your version." },
  },
  {
    id: "zip_failed",
    severity: "warning",
    test: (r) => /(zip|archive|compress).*fail|archiver/i.test(r),
    es: { title: "Falló la compresión del resultado", body: "No pudimos empaquetar la carpeta de resultados en un ZIP.", action: "La carpeta de datos sigue intacta en Descargas. Compríme­la manualmente con clic derecho → Enviar a → Carpeta comprimida y súbela desde el panel admin." },
    en: { title: "Failed to compress the result", body: "We could not package the results folder into a ZIP.", action: "The data folder is still intact in Downloads. Compress it manually (right-click → Send to → Compressed folder) and upload it from the admin panel." },
  },
  {
    id: "unknown",
    severity: "danger",
    test: () => true,
    es: { title: "Algo salió mal durante el análisis", body: "Hemos detectado un error que no reconocemos automáticamente.", action: "Reintenta el análisis. Si vuelve a ocurrir, copia el detalle técnico y envíalo a soporte." },
    en: { title: "Something went wrong during the analysis", body: "We detected an error we cannot recognise automatically.", action: "Retry the analysis. If it happens again, copy the technical detail and send it to support." },
  },
];

export function humanizeRunError(raw: string | null | undefined, lang: string = "es"): HumanError | null {
  if (!raw) return null;
  const text = String(raw).trim();
  if (!text) return null;
  const useEn = /^en/i.test(lang);
  for (const p of PATTERNS) {
    if (p.test(text)) {
      const copy = useEn ? p.en : p.es;
      return { id: p.id, severity: p.severity, title: copy.title, body: copy.body, action: copy.action, technical: text };
    }
  }
  // unreachable (unknown matches all)
  return null;
}
