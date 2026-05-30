import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { Shield, LayoutDashboard, UploadCloud, FileSearch, History, LogOut } from "lucide-react";
import { ReactNode, useEffect } from "react";
import { getSession, setSession } from "@/lib/mock-store";
import { Button } from "@/components/ui/button";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/upload", label: "Nuevo análisis", icon: UploadCloud },
  
  { to: "/reports", label: "Informes", icon: FileSearch },
  { to: "/history", label: "Historial", icon: History },
];

export function AppShell({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();

  useEffect(() => {
    if (!getSession()) navigate({ to: "/login" });
  }, [navigate]);

  return (
    <div className="min-h-screen flex w-full bg-background">
      <aside className="w-64 border-r border-sidebar-border bg-sidebar hidden md:flex flex-col">
        <Link to="/dashboard" className="flex items-center gap-2 px-6 py-5 border-b border-sidebar-border">
          <div className="h-9 w-9 rounded-lg bg-gradient-primary grid place-items-center shadow-glow">
            <Shield className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <div className="text-sm font-semibold tracking-tight">Spyware Forensic</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-widest">Analyzer</div>
          </div>
        </Link>
        <nav className="flex-1 p-3 space-y-1">
          {nav.map((n) => {
            const active = path.startsWith(n.to);
            const Icon = n.icon;
            return (
              <Link key={n.to} to={n.to}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                  active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/60"
                }`}>
                <Icon className="h-4 w-4" /> {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-sidebar-border">
          <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => { setSession(null); navigate({ to: "/login" }); }}>
            <LogOut className="h-4 w-4 mr-2" /> Cerrar sesión
          </Button>
        </div>
      </aside>
      <main className="flex-1 min-w-0">
        <div className="md:hidden border-b border-border px-4 py-3 flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <span className="text-sm font-semibold">Spyware Forensic Analyzer</span>
        </div>
        {children}
      </main>
    </div>
  );
}
