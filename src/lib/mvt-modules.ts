// Catálogo de módulos MVT conocidos (iOS y Android).
// La detección de plataforma se hace por la presencia de estos nombres.

export type Platform = "ios" | "android" | "unknown";

export interface ModuleInfo {
  key: string;            // basename sin .json y sin sufijo _detected
  label: string;
  platform: Platform;
  description: string;
}

export const IOS_MODULES: ModuleInfo[] = [
  { key: "manifest", label: "Manifest", platform: "ios", description: "Manifiesto del backup de iOS." },
  { key: "sms", label: "SMS / iMessage", platform: "ios", description: "Mensajes y adjuntos de iMessage/SMS." },
  { key: "sms_attachments", label: "Adjuntos SMS", platform: "ios", description: "Archivos adjuntos enviados/recibidos." },
  { key: "calls", label: "Llamadas", platform: "ios", description: "Historial de llamadas." },
  { key: "contacts", label: "Contactos", platform: "ios", description: "Libreta de contactos." },
  { key: "safari_browser_state", label: "Safari estado", platform: "ios", description: "Estado del navegador Safari." },
  { key: "safari_history", label: "Safari historial", platform: "ios", description: "Historial de navegación de Safari." },
  { key: "safari_favicon", label: "Safari favicons", platform: "ios", description: "Caché de favicons." },
  { key: "webkit_resource_load_statistics", label: "WebKit RLS", platform: "ios", description: "Estadísticas de carga de recursos WebKit." },
  { key: "webkit_session_resource_log", label: "WebKit Session", platform: "ios", description: "Log de sesión WebKit." },
  { key: "idstatuscache", label: "IDStatusCache", platform: "ios", description: "Caché de Apple IDs contactados." },
  { key: "interactionc", label: "InteractionC", platform: "ios", description: "Interacciones entre apps/contactos." },
  { key: "locationd_clients", label: "LocationD", platform: "ios", description: "Clientes que consumieron localización." },
  { key: "datausage", label: "Uso de datos", platform: "ios", description: "Consumo de datos por proceso." },
  { key: "net_datausage", label: "Net datausage", platform: "ios", description: "Consumo de red por proceso." },
  { key: "tcc", label: "TCC", platform: "ios", description: "Permisos otorgados a apps." },
  { key: "shutdown_log", label: "Shutdown log", platform: "ios", description: "Registro de apagado del sistema." },
  { key: "version_history", label: "Historial de versiones", platform: "ios", description: "Versiones de iOS instaladas." },
  { key: "configuration_profiles", label: "Perfiles de configuración", platform: "ios", description: "Perfiles MDM/config instalados." },
  { key: "installed_applications", label: "Apps instaladas", platform: "ios", description: "Listado de apps." },
  { key: "cache_files", label: "Cache files", platform: "ios", description: "Archivos en caché del sistema." },
  { key: "filesystem", label: "Filesystem", platform: "ios", description: "Inventario de archivos del backup." },
  { key: "profile_events", label: "Eventos de perfil", platform: "ios", description: "Eventos asociados a perfiles." },
  { key: "calendar", label: "Calendario", platform: "ios", description: "Eventos del calendario." },
  { key: "chrome_history", label: "Chrome historial", platform: "ios", description: "Historial de Chrome." },
  { key: "chrome_favicon", label: "Chrome favicons", platform: "ios", description: "Caché de favicons de Chrome." },
];

export const ANDROID_MODULES: ModuleInfo[] = [
  { key: "packages", label: "Paquetes instalados", platform: "android", description: "Apps (.apk) instaladas en el dispositivo." },
  { key: "processes", label: "Procesos", platform: "android", description: "Procesos en ejecución." },
  { key: "sms", label: "SMS", platform: "android", description: "Mensajes de texto recibidos." },
  { key: "settings", label: "Settings", platform: "android", description: "Configuración global del sistema." },
  { key: "dumpsys_accessibility", label: "Dumpsys accesibilidad", platform: "android", description: "Servicios de accesibilidad activos." },
  { key: "dumpsys_activities", label: "Dumpsys actividades", platform: "android", description: "Actividades del sistema." },
  { key: "dumpsys_appops", label: "Dumpsys appops", platform: "android", description: "Operaciones permitidas por app." },
  { key: "dumpsys_battery", label: "Dumpsys batería", platform: "android", description: "Estadísticas de batería por app." },
  { key: "dumpsys_dbinfo", label: "Dumpsys DB info", platform: "android", description: "Información de bases de datos." },
  { key: "dumpsys_full", label: "Dumpsys completo", platform: "android", description: "Volcado completo de dumpsys." },
  { key: "dumpsys_packages", label: "Dumpsys packages", platform: "android", description: "Detalle de paquetes." },
  { key: "dumpsys_receivers", label: "Dumpsys receivers", platform: "android", description: "Broadcast receivers registrados." },
  { key: "files", label: "Files", platform: "android", description: "Listado de archivos del dispositivo." },
  { key: "getprop", label: "getprop", platform: "android", description: "Propiedades del sistema." },
  { key: "logcat", label: "logcat", platform: "android", description: "Registros del sistema." },
  { key: "root_binaries", label: "Binarios root", platform: "android", description: "Indicios de binarios de root." },
  { key: "selinux_status", label: "SELinux", platform: "android", description: "Estado de SELinux." },
  { key: "sms_messages", label: "SMS mensajes", platform: "android", description: "Base de datos de SMS." },
  { key: "whatsapp", label: "WhatsApp", platform: "android", description: "Datos de WhatsApp." },
];

const ALL = [...IOS_MODULES, ...ANDROID_MODULES];
const MAP = new Map(ALL.map((m) => [m.key, m]));

export function lookupModule(key: string): ModuleInfo | undefined {
  return MAP.get(key);
}

export function detectPlatform(moduleKeys: string[]): Platform {
  let ios = 0, android = 0;
  for (const k of moduleKeys) {
    const m = MAP.get(k);
    if (!m) continue;
    if (m.platform === "ios") ios++;
    else if (m.platform === "android") android++;
  }
  if (ios === 0 && android === 0) return "unknown";
  return ios >= android ? "ios" : "android";
}
