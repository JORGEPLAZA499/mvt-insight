# Reordenar subpasos del proceso de análisis

## Objetivo
En el paso 3 de `/upload`, cambiar el orden para que el usuario primero descargue la app de escritorio (.exe/.dmg/.AppImage) y, en segundo lugar, vea las instrucciones de desconexión de internet (modo avión en ordenador y teléfono). El resto de subpasos se mantiene a continuación.

## Nuevo orden propuesto

**Android:**
1. Descargar la app (Windows/macOS/Linux)
2. Cortar datos / modo avión (PC + móvil)
3. Activar modo desarrollador y depuración USB
4. Usar cable USB de datos
5. Conectar el teléfono al ordenador
6. Subir el resultado

**iOS:**
1. Descargar la app
2. Cortar datos / modo avión (PC + móvil)
3. Confiar en el ordenador
4. Hacer backup cifrado
5. Mantener el iPhone desbloqueado
6. Subir el resultado

Nota: el subpaso "preámbulo" actual (que incluía el componente `UsbConnect` y el texto introductorio sobre conectar el USB) queda absorbido por el nuevo subpaso "Conectar el teléfono al ordenador" en Android. En iOS desaparece porque el flujo iOS ya no necesita esa intro USB. Si prefieres conservarlo como subpaso 0 ("antes de empezar"), dímelo y lo dejamos.

## Cambios técnicos

Archivo único: `src/routes/upload.tsx` (función `Step3Process`, líneas ~209–474).

- Reordenar el array `subSteps`:
  - Quitar `preambleStep` del principio en ambas ramas.
  - Mover el bloque de descarga (`subSteps.push({ title: …download… })`) para que sea el **primer** elemento.
  - Mover `protocolStep` (modo avión) para que sea el **segundo** elemento.
  - A continuación, los subpasos específicos del dispositivo en su orden actual.
  - Mantener el subpaso final `upload` al final.
- El componente `UsbConnect` (que estaba dentro del preámbulo) se reubica dentro del subpaso "Conectar el teléfono" en Android (ya existe ese subpaso con `<UsbConnect connected />`; añadimos también la variante inicial si quieres feedback antes de conectar).
- No se tocan claves de i18n (`es.json` / `en.json`); solo cambia el orden de renderizado.
- La barra de progreso y el contador (`current / total`) siguen funcionando porque dependen del tamaño del array.

## Fuera de alcance
- Textos, estilos, lógica de detección de dispositivo/OS, y los componentes auxiliares (`UsbConnect`, `CopyCommand`) no se modifican.
- No se tocan los scripts de `public/scripts/` ni el flujo del paso 4 (subida).

¿Confirmas el nuevo orden y que el "preámbulo" se puede eliminar (absorbido en "Conectar")? Si quieres conservarlo, lo movemos justo antes de "Conectar" en Android y al final de iOS.
