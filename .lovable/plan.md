## Añadir soporte bilingüe (Inglés / Español) con selector de idioma

### Objetivo
Permitir cambiar toda la interfaz de la web entre **Español** e **Inglés** mediante un selector con banderitas (SVG) visible en todas las páginas.

### Qué se hará

1. **Sistema de i18n ligero (sin dependencias pesadas)**
   - Crear `src/i18n/translations.ts` con un objeto `{ es: {...}, en: {...} }` que contenga todas las cadenas de la web (home, upload, dashboard, history, reports, login, analysis, navegación, protocolo forense, etc.).
   - Crear `src/i18n/LanguageContext.tsx` con un `LanguageProvider` + hook `useT()` que devuelve `t('clave')` y `{ lang, setLang }`.
   - Persistir el idioma elegido en `localStorage` y autodetectar el idioma del navegador la primera vez (`navigator.language`).

2. **Selector de idioma con banderitas SVG**
   - Nuevo componente `src/components/LanguageSwitcher.tsx`.
   - Banderas dibujadas como SVG inline (sin imágenes externas): bandera de **España** (rojo/amarillo/rojo) y bandera de **Reino Unido / Union Jack** para inglés.
   - UI: botón redondeado con la bandera actual + dropdown (usando `DropdownMenu` de shadcn ya disponible) para elegir la otra. Tamaño ~24×16 px.
   - Se monta en `src/routes/__root.tsx` (esquina superior derecha, fixed) para que aparezca en todas las páginas.

3. **Aplicar traducciones**
   - Reemplazar todas las cadenas literales en español de las páginas (`upload.tsx`, `index.tsx`, `dashboard.tsx`, `history.tsx`, `reports.tsx`, `login.tsx`, `analysis.$id.tsx`) por llamadas `t('...')`.
   - Incluye el bloque del **protocolo forense** (pasos A/B/C/D) recién añadido en `upload.tsx`.
   - Los `<title>` y `meta description` de cada `head()` también se traducen.

4. **Sin cambios de backend ni de lógica** — solo capa de presentación e i18n.

### Detalles técnicos
- Stack: React Context + hook propio, **sin** `react-i18next` (evita peso y configuración SSR).
- Tipo seguro: las claves de traducción se tipan con `keyof typeof translations.es`.
- Provider envuelve el `<Outlet />` en `__root.tsx`, dentro del shell ya existente.
- El selector usa los tokens del design system (`bg-card`, `border-border`, `hover:bg-accent`).
- Banderas SVG accesibles con `<title>` y `aria-label`.

### Resultado esperado
En la esquina superior derecha aparece un botón con la banderita del idioma activo. Al pulsarlo, se despliega la otra opción; al elegirla, toda la web (incluido el protocolo forense recién añadido) cambia de idioma al instante y se recuerda en la próxima visita.