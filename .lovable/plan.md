Detecté la causa exacta: la subida no falla por compresión. El backend rechaza el guardado porque la función que descuenta créditos actualiza `accounts.credits`, pero el trigger de seguridad `prevent_account_privilege_escalation` bloquea cualquier cambio de créditos salvo que `auth.uid()` sea admin. En la llamada de escritorio entra por token de escritorio/servidor, así que `auth.uid()` no es el usuario admin y el trigger lanza: `No tienes permiso para modificar los créditos`. Eso termina como `SERVER_ERROR`, y la app muestra el mensaje genérico “No se pudo subir el informe”.

Plan:

1. Ajustar la función segura `consume_credit_and_insert_analysis`
   - Modificarla con una migración para que pueda descontar créditos e insertar el análisis de forma atómica sin chocar con el trigger de protección.
   - Mantener el coste de 98 créditos.
   - Mantener los errores controlados `INSUFFICIENT_CREDITS` y `ACCOUNT_NOT_FOUND`.
   - Conservar la protección contra cambios manuales de créditos desde cliente.

2. Corregir el endpoint de escritorio
   - Traducir el error específico de permisos de créditos a una respuesta clara, no a error genérico.
   - Mantener logs técnicos en servidor para auditoría, pero no mostrarlos al usuario final.

3. Mejorar la pantalla de la app de escritorio
   - Cambiar el mensaje “No se pudo subir el informe” por uno más honesto según el caso:
     - sin créditos,
     - sesión caducada,
     - problema temporal del servidor,
     - informe guardado localmente.
   - Evitar que parezca un problema de compresión cuando el análisis ya terminó correctamente y la carpeta está guardada.

4. Verificar
   - Revisar que el usuario `5SZ-UU2-KH3` conserva créditos suficientes.
   - Probar la ruta de subida con la lógica nueva hasta confirmar que ya no aparece el error de permisos.
   - Si todo queda correcto y lo pides, agrupar el bump de versión del desktop en una sola versión.