Mover el extremo del cable USB (cuando está conectado) al **borde inferior** del teléfono.

**Archivo:** `src/components/usb-connect.tsx`, bloque `connected` (líneas 56-84).

Cambios:
- Reemplazar el path `"M160 125 C 210 175, 250 175, 300 95"` (termina en el lateral izquierdo del teléfono a y=95) por `"M160 125 C 220 180, 290 185, 335 158"` (termina en el centro inferior del teléfono, x=335, y=158, justo en el borde donde está el puerto USB).
- Aplicar el mismo nuevo path a los tres `<animateMotion>` para que los pulsos de datos sigan el cable.
- Reposicionar el conector del lado del teléfono: rect `x=331, y=153, width=8, height=10` (sobresale ligeramente del borde inferior, donde está el puerto USB real).
- El conector del lado del portátil se mantiene igual.

No se toca el estado `connected={false}` (cable suelto) ni el resto del SVG.