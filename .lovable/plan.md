Repo confirmado: `https://github.com/JORGEPLAZA499/mvt-insight.git`

## Pasos en tu PC Windows (PowerShell)

### 1. Verificar requisitos
```powershell
node --version
npm --version
git --version
```
Si falta alguno: instalar Node.js LTS desde nodejs.org y Git desde git-scm.com.

### 2. Clonar el repo
```powershell
cd "C:\Users\GAMING F15\Documents"
git clone https://github.com/JORGEPLAZA499/mvt-insight.git
cd mvt-insight
```

### 3. Instalar dependencias del proyecto raíz (necesario para que Vite construya el frontend que Electron carga)
```powershell
npm install
```

### 4. Construir el frontend
```powershell
npm run build
```
Esto genera la carpeta `dist/` que Electron va a empaquetar.

### 5. Instalar dependencias de Electron y empaquetar
```powershell
cd desktop
npm install
npm run package:win
```

Si tu PowerShell es 5.1 y `&&` falla, usar:
```powershell
npm install; if ($?) { npm run package:win }
```

### 6. Recoger el ejecutable
Ruta del binario:
```
C:\Users\GAMING F15\Documents\mvt-insight\desktop\release\MvtInsight-win32-x64\MvtInsight.exe
```
Doble clic para abrir. La primera vez Windows SmartScreen avisará → "Más información" → "Ejecutar de todas formas".

### 7. Distribuir
Comprimir la carpeta completa `MvtInsight-win32-x64` (no solo el `.exe` — necesita los archivos vecinos) en un `.zip` y subirla a Drive, GitHub Releases, etc. Quien la reciba solo descomprime y ejecuta.

### 8. Actualizaciones futuras
Cuando hagas cambios en Lovable:
```powershell
cd "C:\Users\GAMING F15\Documents\mvt-insight"
git pull
npm install
npm run build
cd desktop
npm install
npm run package:win
```

## Qué reportar si algo falla
- Comando exacto que falló
- Mensaje de error completo (copia/pega)
- Versión de Node (`node --version`)

No requiere cambios de código en Lovable. Aprueba el plan y procede con los pasos en tu PC.