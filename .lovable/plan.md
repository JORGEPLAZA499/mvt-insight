## Problema

Al pulsar "Cómo funciona", el título de la sección queda demasiado abajo (mucho espacio vacío entre el header y el título "Tres pasos para un análisis preliminar"), como se ve en la imagen.

## Causa

En `src/routes/index.tsx` línea 91, la sección `#how` tiene:
- `scroll-mt-[200px]` → reserva 200 px de margen superior al hacer scroll
- `py-24` interno (96 px arriba) sobre el contenedor del título

Total desde el borde superior visible hasta el título: ~200 + 96 = **~296 px**, lo que deja el hueco que se aprecia.

## Cambio

**`src/routes/index.tsx` (línea 91)**
- Reducir `scroll-mt-[200px]` a `scroll-mt-[180px]` para igualarlo al ajuste usado en las otras anclas (Características y Aviso legal anterior).

No se toca el padding interno (`py-24`), solo el margen de scroll, para que el título quede alineado justo debajo del header sticky.

## Resultado

Al pulsar "Cómo funciona" en el menú, el título de la sección quedará anclado a 180 px del borde superior, eliminando el hueco vacío visible en la captura.