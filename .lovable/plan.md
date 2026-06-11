## Cambios en `src/routes/pricing.tsx`

Eliminar los dos botones de la columna derecha de la card:
- "Pagar con Tarjeta" (Link a `/login`)
- "Pagar con Cripto — Próximamente" (botón deshabilitado)

En su lugar, dejar únicamente los logos de medios de pago aceptados (`Card Payments` con Mastercard/Visa/Amex/Apple Pay/Google Pay y `Crypto Payments` con BTC/ETH/USDT/TRX/BNB) como elemento informativo.

Añadir debajo de los logos un aviso discreto del tipo:
> "Las compras se realizan desde el panel de control una vez iniciada sesión."

Con un único CTA "Iniciar sesión" que lleve a `/login` (sin estilo de botón de pago — botón secundario discreto), para que el usuario sepa cómo proceder.

El resto del diseño (gradiente, glow orbs, grid, selector de paquete, features, badge) se mantiene intacto.

No se tocan otros archivos.
