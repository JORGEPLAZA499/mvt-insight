## Cambio

En `desktop/src/App.tsx`, durante la pantalla `running`, los logs técnicos están dentro de un `<details>` nativo que se expande inline y se ve mal. Lo convierto en:

- Un **botón** `"Ver detalles técnicos"` (estilo `btn btn-secondary`, alineado donde está hoy el `<details>`).
- Al hacer clic, abre una **modal flotante** (overlay oscuro + tarjeta centrada) con:
  - Título: "Detalles técnicos".
  - Área de log con `overflow-y: auto`, `max-height: 70vh`, fuente monoespaciada, fondo oscuro (igual que `.log` actual).
  - Auto-scroll al final cuando llegan logs nuevos (mantener el `useEffect` con `logRef`).
  - Botón "Cerrar" arriba a la derecha + cerrar con click fuera + tecla `Esc`.
- Estado local nuevo: `const [showLogs, setShowLogs] = useState(false)`.

## Detalles

- Reutiliza el contenido actual: `logs.length === 0 ? tr("details.waiting", ...) : logs.join("")`.
- Mantiene las claves i18n existentes (`details.toggle`, `details.waiting`) y añade `details.close` ("Cerrar") + `details.title` ("Detalles técnicos") en `desktop/src/i18n/locales/es.json` y `en.json`.
- Estilos inline o clases existentes (`card`, `btn`); no se toca `styles.css` salvo añadir una pequeña clase `.modal-overlay` y `.modal-panel` si hace falta para el overlay + scroll. Si prefieres todo inline, lo dejo inline sin tocar CSS.
- No se cambia ningún otro flujo (cancelar, fases, upload, etc.).

## Archivos afectados

- `desktop/src/App.tsx` — reemplazar bloque `<details>` por botón + modal.
- `desktop/src/i18n/locales/es.json` y `en.json` — añadir `details.title` y `details.close`.
- `desktop/src/styles.css` — añadir clases del overlay (opcional, si no usamos inline).

No se bumpea `desktop/package.json > version` (regla del proyecto: solo bump explícito al publicar).
