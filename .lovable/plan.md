Eliminar la página de guía manual (/guia) y consolidar todo el flujo en el wizard de Nuevo análisis (/upload).

1. Eliminar src/routes/guia.tsx por completo.
2. Quitar la entrada "Guía MVT" del menú lateral en src/components/app-shell.tsx (y eliminar la importación de BookOpen si queda sin uso).
3. Quitar el enlace "Ver guía manual completa" del paso 3 del wizard en src/routes/upload.tsx.

routeTree.gen.ts se regenera automáticamente por el plugin de TanStack Router, no requiere edición manual.