import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { LanguageSelector } from "@/components/language-selector";
import logoAsset from "@/assets/logo.png.asset.json";

interface PublicHeaderProps {
  /** When true, nav anchors point to "/#features" etc. so they work from other routes */
  anchorsToHome?: boolean;
}

export function PublicHeader({ anchorsToHome = false }: PublicHeaderProps) {
  const { t } = useTranslation();
  const prefix = anchorsToHome ? "/" : "";

  return (
    <header className="border-b border-border/60 backdrop-blur-md sticky top-0 z-50 bg-background/70 md:py-2 lg:py-4">
      <div className="max-w-7xl mx-auto px-6 h-auto py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <img src={logoAsset.url} alt="" className="h-[80px] md:h-[100px] lg:h-[180px] w-auto object-contain" />
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-sm uppercase tracking-widest">
          <a href={`${prefix}#features`} className="relative text-muted-foreground hover:text-primary transition-colors duration-300 group">
            <span className="drop-shadow-[0_0_6px_rgba(0,0,0,0)] group-hover:drop-shadow-[0_0_8px_var(--primary)] transition-all duration-300">
              {t("landing.nav.features")}
            </span>
            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary group-hover:w-full transition-all duration-300 shadow-[0_0_8px_var(--primary)]" />
          </a>
          <a href={`${prefix}#how`} className="relative text-muted-foreground hover:text-primary transition-colors duration-300 group">
            <span className="drop-shadow-[0_0_6px_rgba(0,0,0,0)] group-hover:drop-shadow-[0_0_8px_var(--primary)] transition-all duration-300">
              {t("landing.nav.how")}
            </span>
            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary group-hover:w-full transition-all duration-300 shadow-[0_0_8px_var(--primary)]" />
          </a>
          <Link to="/legal" className="relative text-muted-foreground hover:text-primary transition-colors duration-300 group">
            <span className="drop-shadow-[0_0_6px_rgba(0,0,0,0)] group-hover:drop-shadow-[0_0_8px_var(--primary)] transition-all duration-300">
              {t("landing.nav.legal")}
            </span>
            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary group-hover:w-full transition-all duration-300 shadow-[0_0_8px_var(--primary)]" />
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          <LanguageSelector />
          <Button asChild variant="ghost" size="sm"><Link to="/login">{t("landing.nav.login")}</Link></Button>
          <Button asChild size="sm" className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"><Link to="/login">{t("landing.nav.start")}</Link></Button>
        </div>
      </div>
    </header>
  );
}
