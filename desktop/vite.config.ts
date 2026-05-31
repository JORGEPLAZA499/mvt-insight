import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base: './' es obligatorio: Electron carga el HTML por file:// y rutas absolutas darían blanco.
export default defineConfig({
  base: "./",
  plugins: [react()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
