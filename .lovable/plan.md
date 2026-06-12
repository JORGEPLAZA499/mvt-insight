## Añadir botón de eliminar informes

### Backend
1. **`src/lib/analyses.functions.ts`** — añadir nueva server function `deleteAnalysis`:
   - `createServerFn({ method: "POST" })` con `requireSupabaseAuth`
   - Input: `{ id: string (uuid) }`
   - Borra de `analyses` filtrando por `id` y `user_id = context.userId` (con supabaseAdmin) para garantizar que solo el dueño puede eliminarlo
   - Devuelve `{ ok: true }`

### Frontend
2. **`src/routes/reports.tsx`**:
   - Importar `Trash2` de lucide-react, `deleteAnalysis`, y `AlertDialog` de shadcn para confirmación
   - Añadir tercer botón en la fila de acciones de cada tarjeta: ícono papelera, variant `outline` con tinte destructivo (`text-destructive hover:bg-destructive/10`)
   - Al confirmar: llamar `deleteAnalysis({ data: { id: a.id } })` y al éxito eliminar el item del estado local (`setItems(prev => prev.filter(x => x.id !== a.id))`)
   - Mostrar toast con `sonner` en éxito/error

### Layout
- Reorganizar los 3 botones (`Ver` | `PDF` | papelera) en la misma fila; la papelera será un botón cuadrado/icon-only para no romper el ancho.