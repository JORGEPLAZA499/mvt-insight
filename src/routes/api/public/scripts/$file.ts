import { createFileRoute } from "@tanstack/react-router";

import macInstall from "../../../../../public/scripts/instalar-mvt-macos.sh?raw";
import linuxInstall from "../../../../../public/scripts/instalar-mvt-linux.sh?raw";
import winInstall from "../../../../../public/scripts/instalar-mvt-windows.ps1?raw";
import androidShell from "../../../../../public/scripts/analizar-android.sh?raw";
import androidPs from "../../../../../public/scripts/analizar-android.ps1?raw";
import iosShell from "../../../../../public/scripts/analizar-ios.sh?raw";

const SCRIPTS: Record<string, { body: string; type: string }> = {
  "instalar-mvt-macos.sh": { body: macInstall, type: "text/x-shellscript; charset=utf-8" },
  "instalar-mvt-linux.sh": { body: linuxInstall, type: "text/x-shellscript; charset=utf-8" },
  "instalar-mvt-windows.ps1": { body: winInstall, type: "text/plain; charset=utf-8" },
  "analizar-android.sh": { body: androidShell, type: "text/x-shellscript; charset=utf-8" },
  "analizar-android.ps1": { body: androidPs, type: "text/plain; charset=utf-8" },
  "analizar-ios.sh": { body: iosShell, type: "text/x-shellscript; charset=utf-8" },
};

export const Route = createFileRoute("/api/public/scripts/$file")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const entry = SCRIPTS[params.file];
        if (!entry) {
          return new Response("Not found", { status: 404 });
        }
        return new Response(entry.body, {
          status: 200,
          headers: {
            "Content-Type": entry.type,
            "Cache-Control": "no-store",
            "X-Content-Type-Options": "nosniff",
          },
        });
      },
    },
  },
});
