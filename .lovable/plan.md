Voy a corregir el punto real que aún está mal: `desktop/src/main.tsx` no importa `./i18n`, así que la inicialización no ocurre antes de montar React. Aunque `App.tsx` lo importe, es más seguro y correcto inicializar i18n en el entrypoint.

Plan:
1. Editar `desktop/src/main.tsx` para agregar `import "./i18n";` antes de renderizar `<App />`.
2. Quitar el import duplicado de `./i18n` en `desktop/src/App.tsx` para dejar la inicialización en un solo lugar.
3. Confirmar que las claves de `es.json` y `en.json` coinciden con las usadas por `t()`.

Después de aplicar esto, en tu PC debes reiniciar el servidor con `npm run dev` dentro de `desktop` para que Vite tome el cambio.