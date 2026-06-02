## Objetivo

Cuando un usuario con rol **Admin** entra a `/admin`, el sidebar y la página cambian:

- El sidebar **NO** muestra: Panel, Nuevo análisis, Informes, Historial.
- El sidebar **NO** muestra el bloque "Acceso rápido" (Subir ZIP/JSON, Comprar créditos).
- El sidebar **SÍ** muestra como navegación principal: **Clientes**, **Tokens**, **Salud del sistema** (las tabs actuales).
- La página `/admin` deja de mostrar la barra de Tabs interna; el contenido cambia según la sección elegida en el sidebar.

Para el resto de usuarios (no admin) y para el admin cuando está fuera de `/admin` (p. ej. en `/dashboard`), el sidebar sigue **idéntico a hoy**. No se toca nada más del proyecto.

## Cambios

### 1. `src/components/app-shell.tsx`
- Detectar `isAdminRoute = path.startsWith("/admin")` y `isAdmin = userCode === "Admin"`.
- Si `isAdmin && isAdminRoute`:
  - Sustituir el array `nav` por las tres entradas admin, apuntando a query params:
    - Clientes → `/admin?tab=clients` (icon `Users`)
    - Tokens → `/admin?tab=tokens` (icon `Ticket`)
    - Salud del sistema → `/admin?tab=health` (icon `Activity`)
  - Marcar activo según el `tab` actual (leído con `useRouterState` → `location.search`), con `clients` como default.
  - Ocultar el bloque "Acceso rápido" completo (input file, botón Subir ZIP/JSON, botón Comprar créditos, texto de ayuda, errores).
  - Cambiar el label de sección de `shell.sectionPrimary` a `Administración`.
- El resto del shell (logo, tarjeta de usuario, logout, selector de idioma, header móvil) se mantiene.

### 2. `src/routes/admin.tsx`
- Declarar `validateSearch` en `createFileRoute` para el parámetro `tab: "clients" | "tokens" | "health"` (default `clients`).
- Reemplazar el bloque `<Tabs>` + `<TabsList>` + `<TabsContent>` por un switch sobre `Route.useSearch().tab` que renderiza `<ClientsTab />`, `<TokensTab />` o `<HealthTab />`.
- Mantener el header "Administración / Panel de control" y la verificación de acceso actual sin cambios.
- `ClientsTab`, `TokensTab`, `HealthTab` se quedan tal cual.

## Notas técnicas

- Uso de query param (`?tab=...`) en lugar de subrutas para evitar tener que crear `/admin/clients`, `/admin/tokens`, `/admin/health` y regenerar `routeTree.gen.ts` con más ficheros. El estado se comparte con el sidebar de forma type-safe vía `validateSearch`.
- No se introducen tablas, migraciones ni cambios de backend.
- No se modifica el comportamiento del shell para usuarios no admin ni cuando el admin navega por `/dashboard`, `/upload`, `/reports`, `/history`.
