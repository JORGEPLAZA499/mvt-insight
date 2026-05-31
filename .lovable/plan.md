## Plan: conectar i18n en `App.tsx`

Voy a entregarte el archivo `desktop\src\App.tsx` completo con i18n integrado:

- Imports de `./i18n`, `LanguageSelector` y `useTranslation` añadidos.
- Hook `const { t } = useTranslation()` dentro del componente.
- `<LanguageSelector />` renderizado en la esquina superior derecha de cada una de las 3 pantallas (`welcome`, `running`, `done`).
- Todos los textos visibles (títulos, descripciones, botones, fases, mensajes de error, instrucciones) reemplazados por `t('clave')` usando las claves que ya tienes en `es.json` y `en.json`.
- La constante `PHASES` se moverá dentro del componente para que use `t()`.

### Supuesto sobre las claves de traducción

Asumo que tus archivos `es.json` / `en.json` contienen una estructura tipo:

```
app.title, app.subtitle
welcome.android.title, welcome.android.sub
welcome.ios.title, welcome.ios.sub
welcome.before.title, welcome.before.usb, welcome.before.cable, welcome.before.unlocked
running.title.android, running.title.ios, running.subtitle
running.starting
phases.download, phases.connect, phases.collect
details.toggle, details.waiting
error.title, error.back
done.title, done.subtitle, done.filename, done.upload, done.openFolder, done.new
language.label, language.spanish, language.english
```

Si tus claves tienen otros nombres, dímelo y ajusto el código antes de generarlo.

### Acción tras aprobar

1. Sobrescribir `desktop\src\App.tsx` con la versión nueva.
2. Tú lo copias/pegas en tu PC, ejecutas `npm install i18next react-i18next` en la carpeta `desktop` (si aún no lo hiciste) y vuelves a lanzar la app.

¿Confirmas la estructura de claves de arriba o me pegas tu `es.json` para usar exactamente las que tienes?
