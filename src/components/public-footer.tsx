import { useTranslation } from "react-i18next";

export function PublicFooter() {
  const { t } = useTranslation();

  return (
    <footer className="border-t border-border h-16">
      <div className="max-w-7xl mx-auto px-6 h-full flex flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>{t("landing.footer.copy", { year: new Date().getFullYear() })}</span>
        <span>{t("landing.footer.engine")}</span>
      </div>
    </footer>
  );
}
