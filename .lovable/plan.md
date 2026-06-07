## Objetivo

Incluir en el informe los nombres concretos de las familias de spyware que MVT puede detectar mediante sus IOCs públicos, para que el lector entienda qué cubre exactamente "amenazas con firma pública".

## Familias a listar

Basado en los indicadores publicados por Amnesty International Security Lab y Citizen Lab que MVT consume:

- **Pegasus** (NSO Group) — spyware mercenario, iOS y Android
- **Predator** (Intellexa / Cytrox) — spyware comercial, iOS y Android
- **Reign** (QuaDream) — implante para iOS
- **Hermit** (RCS Lab / Tykelab) — Android e iOS
- **Triangulation** (operación contra iOS, 2023)
- **Stalkerware comercial** detectado por nombres de paquete conocidos (familias tipo FlexiSpy, mSpy, Cerberus, Hermit-like)
- IOCs publicados por **Google TAG**, **Citizen Lab** y **Amnesty** sobre campañas dirigidas

## Cambios

### 1. Web — `src/routes/analysis.$id.tsx`

En la sección **08 "Aviso legal y metodología"** (línea 362+), añadir un bloque tras el párrafo sobre IOCs:

- Nuevo subapartado "Familias de spyware cubiertas" con la lista en formato chip/lista breve.
- Aclarar que la cobertura depende de la versión de MVT instalada y de los IOCs públicos vigentes.

### 2. PDF — `src/lib/pdf-report.ts`

En la sección **08 "Aviso legal y metodología"** (línea 610+), añadir tras el primer párrafo:

- Línea con la lista de familias separadas por coma, tamaño 9pt, igual estilo que el resto.
- Misma nota de cobertura variable.

### 3. Sin cambios en el parser ni en la lógica de análisis

Es texto informativo. No toca `mvt-parser.ts`, ni la base de datos, ni el flujo de análisis.

### 4. Sin bump de versión

El cambio es solo en la web (`src/`); el escritorio (`desktop/`) no se toca.

## Texto propuesto (mismo en web y PDF)

> **Familias de spyware cubiertas por los IOCs públicos de MVT:** Pegasus (NSO Group), Predator (Intellexa/Cytrox), Reign (QuaDream), Hermit (RCS Lab), la operación Triangulation contra iOS y diversas familias de stalkerware comercial identificadas por nombre de paquete. La lista exacta evoluciona con cada actualización de los repositorios públicos de Amnesty International, Citizen Lab y Google TAG, por lo que la cobertura real depende de la versión de MVT y de los indicadores vigentes en el momento del análisis.
