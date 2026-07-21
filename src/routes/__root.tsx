import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { CookieBanner } from "../components/cookie-banner";
import { PaymentTestModeBanner } from "../components/payment-test-mode-banner";
import { Toaster } from "../components/ui/sonner";
import "../i18n";


function NotFoundComponent() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">{t("errors.notFoundTitle")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t("errors.notFoundDesc")}</p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {t("common.goHome")}
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  const { t } = useTranslation();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          {t("errors.boundaryTitle")}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("errors.boundaryDesc")}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {t("common.tryAgain")}
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            {t("common.goHome")}
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "SPYWARE FORENSIC ANALIZER" },
      { name: "description", content: "SPYWARE FORENSIC ANALIZER is a web platform for analyzing mobile device forensic data for potential spyware indicators." },
      { name: "author", content: "SPYWARE FORENSIC ANALIZER" },
      { property: "og:title", content: "SPYWARE FORENSIC ANALIZER" },
      { property: "og:description", content: "SPYWARE FORENSIC ANALIZER is a web platform for analyzing mobile device forensic data for potential spyware indicators." },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "https://spyware-rpjsoftware-com.lovable.app/__l5e/assets-v1/87cb0401-acec-48ee-85ac-e124f014500d/og-image-spyware.png" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:type", content: "image/png" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "SPYWARE FORENSIC ANALIZER" },
      { name: "twitter:description", content: "SPYWARE FORENSIC ANALIZER is a web platform for analyzing mobile device forensic data for potential spyware indicators." },
      { name: "twitter:image", content: "https://spyware-rpjsoftware-com.lovable.app/__l5e/assets-v1/87cb0401-acec-48ee-85ac-e124f014500d/og-image-spyware.png" },
    ],
    scripts: [
      {
        src: "https://plausible.io/js/pa-k0aaV4_hs1tteRksH2Wfx.js",
        async: true,
      },
      {
        type: "text/javascript",
        children: "window.plausible=window.plausible||function(){(plausible.q=plausible.q||[]).push(arguments)},plausible.init=plausible.init||function(i){plausible.o=i||{}};plausible.init();",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      {
        rel: "icon",
        type: "image/png",
        href: "/__l5e/assets-v1/f328a79e-6bc5-4aa0-907e-eeabbb4803ee/favicon.png",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation();
  return (
    <html lang={i18n.language || "es"}>
      <head>
        <HeadContent />
      </head>
      <body>
        <PaymentTestModeBanner />
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
      <CookieBanner />
      <Toaster richColors position="top-center" />
    </QueryClientProvider>
  );
}

