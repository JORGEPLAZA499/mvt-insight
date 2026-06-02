## Problema

El input "Código de usuario" del login aplica una máscara estricta (`XXX-XXX-XXX`) que:
- excluye letras `I`, `O` y números `0/1`
- inserta guiones cada 3 caracteres
- corta a 9 caracteres

Por eso al escribir `Admin` queda `ADM-N` (la `i` se filtra, la `n` cae tras un guión).

## Solución

Relajar `formatCodeInput` (solo en el campo de **login**, no en el registro) para que detecte si el usuario está escribiendo un código alfabético tipo `Admin` y, en ese caso, lo deje pasar sin máscara.

### Lógica nueva
- Si el input contiene **solo letras** (`/^[A-Za-z]+$/`) → devolverlo en mayúsculas, hasta 20 caracteres, **sin guiones ni filtrado de I/O**.
- En cualquier otro caso → aplicar la máscara actual `XXX-XXX-XXX`.

Esto permite escribir `Admin` → `ADMIN`, y sigue funcionando para los códigos generados (`VKG-Q8R-X2L`).

### Cambios
- `src/routes/login.tsx`: actualizar `formatCodeInput` con la rama de letras puras y aumentar `maxLength` del input a 20.

No se tocan: registro, server functions, ni base de datos.