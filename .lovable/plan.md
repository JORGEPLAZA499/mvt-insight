## Objetivo

Que el script de análisis Android nunca cierre la ventana sin dejar rastro: si algo falla (o si AndroidQF sale antes de tiempo tras aceptar el RSA), el usuario debe poder leer el error en pantalla y en un fichero de log.

## Cambios

### 1. `public/scripts/analizar-android.ps1`

- Añadir al principio un `Start-Transcript` hacia `mvt-resultados-android-<timestamp>/run.log` para que TODO lo que se ve en consola quede también en disco (stdout + stderr + excepciones).
- Envolver el cuerpo del script en un `try { ... } catch { Write-Host $_ -ForegroundColor Red } finally { Stop-Transcript; Read-Host "`nPulsa Enter para cerrar" }`. Así, tanto si termina bien como si lanza una excepción, la ventana **se queda abierta** hasta que el usuario pulse Enter — esto resuelve el "desapareció la ventana".
- Tras ejecutar `androidqf.exe`, **no abortar** si `$LASTEXITCODE` no es 0 ni si `acquisition/` está vacía: en su lugar, mostrar un aviso claro ("AndroidQF salió con código X / no se generaron ficheros, revisa run.log") y seguir hasta el `Read-Host`, de modo que el usuario vea exactamente qué pasó tras aceptar el RSA.
- Antes de llamar a AndroidQF, volver a comprobar `adb devices` y avisar si el dispositivo aparece como `unauthorized` o `offline` (causa típica de salida inmediata tras el RSA).
- Pequeño retoque cosmético: imprimir al final la ruta absoluta de `run.log` para que el usuario pueda pegármela si vuelve a fallar.

### 2. `public/scripts/analizar-android.sh`

Equivalente para Linux/macOS:
- `exec > >(tee -a "$OUT_DIR/run.log") 2>&1` al inicio para duplicar salida a fichero.
- `trap 'echo "Error en linea $LINENO"; read -p "Pulsa Enter para cerrar..."' ERR EXIT` para mantener la terminal abierta.
- Misma verificación extra de `adb devices` (estado `unauthorized`/`offline`) y mismo "no abortar si AndroidQF sale mal, solo avisar".

### 3. `src/routes/guia.tsx` (mínimo)

En el paso de Android, añadir una nota breve: *"Si la ventana parece cerrarse sola, vuelve a lanzar el comando: ahora el script se queda abierto hasta que pulses Enter y guarda `run.log` con el detalle del error."*. No se toca el resto del flujo.

## Fuera de alcance

- No se cambia la lógica de descarga de AndroidQF ni de `mvt-android check-androidqf`.
- No se toca el endpoint `/api/public/scripts/$file.ts` ni la subida en `/upload`.

## Cómo validar tras publicar

1. Relanzar `irm https://mvt-insight.lovable.app/api/public/scripts/analizar-android.ps1 | iex`.
2. Aceptar el RSA en el móvil.
3. Sea cual sea el resultado de AndroidQF, la ventana debe quedarse abierta con un `Pulsa Enter para cerrar` y la carpeta `mvt-resultados-android-<fecha>/run.log` debe existir y contener el traceback exacto. Si vuelve a fallar, ese log nos dice la causa real.
