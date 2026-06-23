# Project Memory

## Core
Desktop app vive en `desktop/`. NO bumpear `desktop/package.json > version` salvo que el usuario diga explícitamente "publica" o "saca versión" — entonces un solo bump agrupa todos los cambios pendientes en una sola release de GitHub Actions.
ZIP en `desktop/electron/main.cjs` se hace con `archiver` en streaming (no JSZip): evita "Array buffer allocation failed" en carpetas de varios GB y emite progreso real (`processed/total` y bytes).
Monitor de análisis: NO mostrar avisos de "sin actividad / cancelar" durante fases bloqueantes (`phaseStatus.compressing`, `phaseStatus.downloadingBinary`, `phaseStatus.iosEnablingEncryption`, `phaseStatus.done`) ni cuando `upload.state === "uploading"` — el sistema sí está trabajando.

## Memories
