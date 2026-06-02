## Objetivo

Mejorar la pantalla de bienvenida de **MVT Insight Desktop** (`/dev-server/desktop/src/App.tsx`) con un header con logo, texto visible en las tarjetas y sin referencias a marcas comerciales.

## Cambios

### 1. Soporte para logo (pendiente de tu archivo)
- Crear `/dev-server/desktop/src/assets/` y dejar el logo que subas (`logo.png` o `logo.svg`).
- Importarlo en `App.tsx` y renderizarlo en la cabecera.
- Mientras no subas el archivo, dejaré un placeholder (un círculo con las iniciales "MVT" usando `--primary`) para que el layout se vea bien y solo haya que reemplazar el `src` cuando lo entregues.

### 2. Nuevo layout de la pantalla welcome
Estructura centrada en columna:

```text
┌──────────────────────────── TopBar (Language) ─┐
│                                                │
│              [LOGO]                            │
│         MVT Insight Desktop                    │
│   Análisis forense de indicios de spyware      │
│                                                │
│   ┌──────────────┐    ┌──────────────┐         │
│   │   Android    │    │    iPhone    │         │
│   │ (operativa)  │    │ (próximam.)  │         │
│   └──────────────┘    └──────────────┘         │
└────────────────────────────────────────────────┘
```

- Logo + título + subtítulo agrupados y centrados (text-align center).
- Grid de 2 tarjetas debajo, manteniendo el ancho máximo de 760px del contenedor `.app`.

### 3. Texto blanco en las tarjetas
Actualmente `.choice .title` hereda color y `.choice .sub` usa `--muted` (gris muy bajo contraste sobre `--card #14141e`). Cambios en `styles.css`:
- `.choice .title` → `color: var(--text)` explícito y subir tamaño a 16px.
- `.choice .sub` → cambiar de `--muted` a un blanco con opacidad (`color: rgba(245,245,250,0.75)`) para mantener jerarquía pero visible.
- Añadir reglas para el estado `:disabled` de la tarjeta iPhone para que también se lea (opacidad 0.6 en lugar de heredar gris invisible).

### 4. Eliminar marcas comerciales
En `/dev-server/desktop/src/i18n/locales/es.json` y `en.json`:
- `welcome.android.sub`: `"Samsung, Xiaomi, Pixel…"` → `"Sistema operativo Android"` / `"Android operating system"`.
- `welcome.ios.sub`: mantener "Próximamente (solo macOS)" / "Coming soon (macOS only)" (ya no menciona marca, ok).

### 5. Logo en cabecera
- Añadir `<img class="brand-logo" />` (o el placeholder de iniciales) encima del `<h1>` en el bloque `welcome`.
- CSS nuevo `.brand-logo { width: 72px; height: 72px; margin: 0 auto 16px; display: block; border-radius: 16px; }`.
- También se mostrará en las pantallas `running` y `done` para coherencia (versión más pequeña, 40px).

## Archivos a tocar

- `desktop/src/App.tsx` — nuevo header con logo + import del asset.
- `desktop/src/styles.css` — `.brand-logo`, contraste de `.choice .title/.sub`, centrado del header.
- `desktop/src/i18n/locales/es.json` y `en.json` — quitar marcas en `welcome.android.sub`.
- `desktop/src/assets/logo.*` — se añadirá cuando subas el archivo.

## Detalles técnicos

- No se tocan `electron/main.cjs`, `preload.cjs` ni la lógica de fases.
- No hay cambios en backend, i18n del web app principal ni en `src/routes/upload.tsx`.
- Recordatorio: tras tocar la app desktop hay que volver a empaquetar el `.exe`/`.zip` con `@electron/packager` (igual que en builds anteriores) para que los cambios lleguen al binario que descargan los usuarios.

## Pendiente de tu parte

Subir el archivo del logo (PNG o SVG, idealmente cuadrado y con fondo transparente). Mientras tanto dejo el monograma "MVT" como placeholder y lo sustituyo cuando llegue.
