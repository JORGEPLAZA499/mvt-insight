## Cambio en código

**`desktop/package.json`** — añadir `"releaseType": "release"` al bloque `publish` para que futuras versiones se publiquen automáticamente en GitHub Releases (sin quedarse como Draft).

```json
"publish": [
  {
    "provider": "github",
    "owner": "JORGEPLAZA499",
    "repo": "mvt-insight",
    "releaseType": "release"
  }
]
```

Es el único cambio. No toco nada más del proyecto.

## Pasos que harás tú después

### 1. Publicar el draft v1.0.3 actual (una vez)
- Ve a https://github.com/JORGEPLAZA499/mvt-insight/releases
- Click en el draft `1.0.3` con **10 assets**
- Lápiz ✏️ (Edit) → botón verde **Publish release**
- Borra el otro draft con 4 assets

### 2. Resetear tu repo local a GitHub
Tu local está 398 commits por detrás y con archivos sin commitear que ya existen en remoto. En PowerShell:

```powershell
cd $HOME\Documents\mvt-insight
git reset --hard origin/main
git clean -fd
git pull
```

⚠️ Esto descarta cambios locales sin recuperación. Todo lo que veo en tu `git status` (i18n, package.json, App.tsx, main.tsx) ya está en GitHub hecho por Lovable, así que es seguro.

### 3. Para futuras releases
Solo necesitas:
```powershell
git pull
git tag v1.0.4
git push origin v1.0.4
```
Y la release se publicará sola en GitHub, sin draft.
