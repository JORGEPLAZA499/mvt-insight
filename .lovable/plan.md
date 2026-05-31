## Paso final: conectar i18n en `App.tsx`

Abre el archivo `desktop\src\App.tsx` con Bloc de notas o VS Code y haz **2 cambios**:

### 1. Agregar estos imports al inicio del archivo (junto a los otros `import`):

```tsx
import './i18n';
import LanguageSelector from './components/LanguageSelector';
import { useTranslation } from 'react-i18next';
```

### 2. Dentro del componente `App`, usar `useTranslation` y renderizar el `<LanguageSelector />`

Por ejemplo, al inicio del `return (...)` del componente, agrega:

```tsx
const { t } = useTranslation();
```

Y dentro del JSX, agrega el selector donde quieras que aparezca (por ejemplo, arriba de todo):

```tsx
<LanguageSelector />
```

Después puedes reemplazar textos fijos por `{t('clave.de.traduccion')}` usando las claves que pusiste en `es.json` y `en.json`.

---

### Para que pueda darte el código exacto

Necesito ver tu `App.tsx` actual. Por favor:

1. Abre `desktop\src\App.tsx`
2. Copia **todo** su contenido
3. Pégalo aquí en el chat

Con eso te devuelvo el archivo completo ya modificado, listo para pegar y guardar.
