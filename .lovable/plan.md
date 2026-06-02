# Apertura automática del teclado virtual + protección contra keyloggers

## 1. Apertura automática (eliminar icono)

`src/components/password-field.tsx`:
- Eliminar el botón con icono `Keyboard`.
- Abrir el teclado virtual con `onFocus` del input; cerrar solo desde el botón "✕" del propio teclado.
- Input siempre `readOnly` cuando el VK está abierto.
- Añadir `inputMode="none"`, `spellCheck={false}`, `autoCapitalize="off"`, `autoCorrect="off"`.
- Bloquear `onCopy`, `onPaste`, `onCut`, `onDrop`, `onContextMenu`.

## 2. Endurecimiento anti-keylogger

**`src/components/virtual-keyboard.tsx`**:
- Re-barajar automáticamente tras cada pulsación de tecla (no solo al abrir).
- Mantener botón "Reordenar" y toggle de orden normal.
- Sin feedback visual del carácter pulsado.

**`src/lib/secure-string.ts`** (nuevo): utilidad `createSecureBuffer()` que guarda el valor XOR-eado con una clave aleatoria por instancia. API: `append(ch)`, `pop()`, `clear()`, `reveal()`, `length`. La contraseña en claro solo existe durante el `reveal()` justo antes del submit.

**`src/routes/login.tsx`**:
- Reemplazar `useState<string>` de `password`/`confirm` por un wrapper basado en `SecureBuffer` (estado con `[buffer, version]` para re-renderizar).
- Pasar al `PasswordField` un `value` enmascarado (longitud) y `onChange` que diff-ea y aplica `append`/`pop`/`clear` al buffer.
- En `submit`: `reveal()` → enviar → `clear()` inmediato.
- `useEffect` cleanup: `clear()` al desmontar.
- El medidor de fortaleza recibe la contraseña revelada en cada render (necesario para puntuar) — aceptable porque vive solo en memoria del componente; alternativa: puntuar sobre el buffer XOR-eado descodificando temporalmente.

## 3. UI / copy

- Nota debajo del formulario: "Teclado virtual con orden aleatorio y contraseña ofuscada en memoria. Úsalo desde un equipo de confianza."
- Sin cambios en backend ni en la BD.

## Archivos

- Modificados: `src/components/password-field.tsx`, `src/components/virtual-keyboard.tsx`, `src/routes/login.tsx`
- Nuevos: `src/lib/secure-string.ts`
