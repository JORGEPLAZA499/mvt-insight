## Plan: dejar la app de escritorio con i18n completo en el repo

Voy a crear/sobrescribir 6 archivos dentro de `desktop/`. Tú haces `git pull` (o "Fetch origin" en GitHub Desktop) y vuelves a lanzar `npm install` + `npm run dev`.

### Archivos a crear/actualizar

1. **`desktop/package.json`** — añadir dependencias `i18next` y `react-i18next`.
2. **`desktop/src/i18n/index.ts`** *(nuevo)* — inicialización de i18next con persistencia en `localStorage` (recuerda el idioma elegido).
3. **`desktop/src/i18n/locales/es.json`** *(nuevo)* — todas las claves: `app.*`, `welcome.*`, `running.*`, `phases.*`, `details.*`, `error.*`, `done.*`, `language.*`.
4. **`desktop/src/i18n/locales/en.json`** *(nuevo)* — equivalente en inglés.
5. **`desktop/src/components/LanguageSelector.tsx`** — versión limpia que usa `useTranslation` (sobrescribe la tuya local para que sea coherente con las claves nuevas).
6. **`desktop/src/App.tsx`** — versión final:
   - importa `./i18n` y `LanguageSelector`,
   - usa `t()` en todos los textos visibles,
   - blinda `window.mvt` con `if (!window.mvt) return;` en el `useEffect` y mensaje claro en `start()` si se abre desde navegador.

### Después de aplicar el plan, en tu PC

```
cd desktop
git pull              # o "Fetch origin" + "Pull" en GitHub Desktop
npm install           # instala i18next + react-i18next
npm run dev
```

Abre http://localhost:5173/ y deberías ver:
- Título "MVT Insight Desktop" y subtítulo traducidos.
- Tarjetas "Android / iPhone" con sus textos correctos.
- Lista "Antes de empezar" con sus 3 items en español.
- Selector "Idioma: Español / English" arriba a la derecha, cambia el idioma en caliente y lo recuerda al recargar.

### Notas

- Si tu `LanguageSelector.tsx` local tenía estilos diferentes y quieres conservarlos, dímelo antes de aprobar y ajusto el archivo #5.
- Las claves nuevas no chocan con las del proyecto web principal (`src/i18n/locales/*.json`), son archivos independientes dentro de `desktop/`.

Aprueba el plan (botón "Implement plan") y aplico los 6 archivos de una vez.
