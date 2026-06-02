# Mejoras de seguridad en el formulario de cuenta

Añadir tres capas de seguridad a los campos de contraseña en `src/routes/login.tsx` (registro y login):

## 1. Botón de ojo (mostrar/ocultar contraseña)

- Icono `Eye` / `EyeOff` de `lucide-react` dentro del input, alineado a la derecha.
- Alterna el `type` entre `password` y `text`.
- Se aplica a los 3 campos: contraseña (login), contraseña nueva y confirmación (registro).

## 2. Medidor de fortaleza con bloqueo

Indicador visual debajo del campo "contraseña nueva" en el registro:

- **Niveles**: Baja / Media / Alta / Muy alta — barra de color (rojo → ámbar → verde).
- **Criterios** (suman puntos):
  - Longitud ≥ 8 (obligatorio), ≥ 12, ≥ 16
  - Mayúscula, minúscula, número (ya obligatorios), símbolo
  - Sin secuencias triviales (`12345`, `abcd`, repeticiones)
- **Bloqueo**: si el nivel calculado es **Baja**, el botón "Crear cuenta" queda deshabilitado y se muestra el motivo. Mínimo aceptado para registrar = **Media**.
- La validación se duplica en el servidor (`registerAccount` en `src/lib/account.functions.ts`) para que no se pueda saltar desde el cliente.

## 3. Teclado virtual con orden cambiable

Nuevo componente `src/components/virtual-keyboard.tsx`:

- Botón "Usar teclado virtual" junto a cada campo de contraseña. Al activarlo se despliega el teclado y el input físico queda en solo-lectura (evita keyloggers de hardware).
- Layout en `popover` debajo del campo:
  - Fila de números 0–9
  - Letras a–z minúsculas
  - Letras A–Z mayúsculas (toggle Shift)
  - Símbolos comunes (toggle)
  - Teclas: `⌫ Borrar`, `Espacio`, `🔀 Reordenar`, `Cerrar`
- **Orden aleatorio**: al abrirlo las teclas se barajan (Fisher–Yates). Botón "Reordenar" vuelve a barajar en cualquier momento. Opción para volver al orden QWERTY estándar.
- Cada pulsación añade el carácter al valor del campo controlado (mismo `onChange` que el teclado físico).

## Detalles técnicos

- **Archivos modificados**: `src/routes/login.tsx`, `src/lib/account.functions.ts` (validación de fortaleza server-side).
- **Archivos nuevos**: `src/components/virtual-keyboard.tsx`, `src/lib/password-strength.ts` (función pura `scorePassword` reutilizada en cliente y servidor).
- **UI**: usa tokens semánticos de `src/styles.css` (`--destructive`, `--primary`, `--muted`) — sin colores hardcoded.
- **Accesibilidad**: `aria-label` en el botón de ojo y en cada tecla virtual; `aria-live` en el medidor de fortaleza.
- **Sin cambios en backend/DB**: la política se endurece en código, el esquema de Supabase no cambia.

¿Procedo?
