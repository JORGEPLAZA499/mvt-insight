import React from "react";
import { createRoot } from "react-dom/client";
import "./i18n";
import { App } from "./App";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Tipado del bridge expuesto por preload.cjs
declare global {
  interface Window {
    mvt: {
      start: (device: "android" | "ios") => Promise<{ ok: boolean; zipPath?: string; error?: string }>;
      onLog: (cb: (msg: string) => void) => () => void;
      onPhase: (cb: (p: { phase: number; label: string; progress: number }) => void) => () => void;
      openFolder: (p: string) => Promise<void>;
      openExternal: (url: string) => Promise<void>;
    };
  }
}
