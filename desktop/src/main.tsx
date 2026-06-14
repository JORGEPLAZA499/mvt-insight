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
      start: (device: "android" | "ios", options?: { password?: string }) => Promise<{ ok: boolean; zipPath?: string; error?: string }>;
      cancel: () => Promise<{ ok: boolean }>;
      onLog: (cb: (msg: string) => void) => () => void;
      onPhase: (cb: (p: { phase: number; label: string; progress: number }) => void) => () => void;
      openFolder: (p: string) => Promise<void>;
      openExternal: (url: string) => Promise<void>;
      getVersion: () => Promise<string>;
      checkForUpdates: () => Promise<{ currentVersion: string; latestVersion?: string; updateAvailable: boolean; error?: string }>;
      downloadUpdate: () => Promise<{ ok: boolean; error?: string }>;
      quitAndInstall: () => Promise<{ ok: boolean }>;
      onUpdaterStatus: (cb: (s: { state: string; version?: string; percent?: number; error?: string }) => void) => () => void;
      auth: {
        get: () => Promise<{ token: string | null; error?: string }>;
        save: (token: string) => Promise<{ ok: boolean; error?: string }>;
        clear: () => Promise<{ ok: boolean; error?: string }>;
      };
      readZip: (zipPath: string) => Promise<{ ok: boolean; data?: Uint8Array; size?: number; error?: string }>;
      parseZipEntries: (zipPath: string) => Promise<{ ok: boolean; entries?: { name: string; text: string }[]; fileSize?: number; error?: string }>;
    };
  }
}
