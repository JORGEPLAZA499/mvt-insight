// TEMP — used once to seed pg_cron. Delete immediately after use.
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/internal/cron-secret-once")({
  server: {
    handlers: {
      GET: async () => {
        return Response.json({ v: process.env.CRON_SECRET ?? null });
      },
    },
  },
});
