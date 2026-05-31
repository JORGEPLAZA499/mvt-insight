## Objetivo
Mostrar el procedimiento forense recomendado (PC offline + móvil en modo avión + cable USB; luego subir ZIP desde otro PC con Internet) como pasos visuales dentro del flujo de análisis de la web.

## Cambios propuestos

### 1. Componente de protocolo forense en `upload.tsx`
En el paso 3 (`StepRun`), justo antes de las instrucciones de conexión actual, añadir un bloque visual desplegable o fijo que muestre los 3 pasos del protocolo forense ideal:

- **Paso A**: Preparar un PC sin conexión a Internet (o en modo avión).
- **Paso B**: Poner el móvil en modo avión y conectarlo por USB al PC offline.
- **Paso C**: Realizar la recolección con la app de escritorio y guardar el ZIP.
- **Paso D**: En otro PC con Internet, subir el ZIP a esta plataforma para el informe.

Diseño: usar una caja destacada con borde sutil, iconos de escudo/candado, y texto conciso. Esto reforzará la privacidad y seriedad forense del producto.

### 2. (Opcional) Badge/etiqueta en landing
Añadir una línea corta en la sección "Cómo funciona" de `index.tsx` que mencione el análisis 100 % offline como ventaja de privacidad.

## Archivos a editar
- `src/routes/upload.tsx` — añadir el bloque de protocolo forense en `StepRun`.
- `src/routes/index.tsx` — añadir mención al protocolo offline en la sección "Cómo funciona".

## Técnico
- Usar tokens de diseño existentes (`--warning`, `--success`, bordes, fondos de tarjeta).
- No modificar lógica de negocio ni el flujo de pasos numéricos (1-4); el bloque forense será informativo/desplegable dentro del paso 3.
- Iconos sugeridos: `Shield`, `WifiOff`, `Smartphone`, `Usb`, `UploadCloud` de lucide-react.