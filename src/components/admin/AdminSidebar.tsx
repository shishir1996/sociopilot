import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  Shield, BarChart3, Cpu, Settings, CreditCard, Video,
  ChevronLeft, ChevronRight, ArrowLeft, Users, Sparkles, Plug, Zap, LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = { icon: any; label: string; route: string };
type NavGroup = { label: string; items: NavItem[] };

const groups: NavGroup[] = [
  { label: "Overview", items: [
    { icon: Shield, label: "Dashboard", route: "/admin" },
    { icon: BarChart3, label: "Analytics", route: "/admin/analytics" },
  ]},
  { label: "AI Engine", items: [
    { icon: Cpu, label: "AI Control", route: "/admin/ai" },
    { icon: Video, label: "AI Video", route: "/admin/ai-video" },
  ]},
  { label: "Integrations", items: [
    { icon: Plug, label: "Social APIs", route: "/admin/integrations" },
    { icon: CreditCard, label: "Payments", route: "/admin/payments" },
  ]},
];

interface AdminSidebarProps {
  brand?: string;
  icon?: any;
}

export function AdminSidebar({ brand = "Admin", icon: Icon = Shield }: AdminSidebarProps) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { signOut } = useAuth();
  const [open, setOpen] = useState(true);

  const handleSignOut = async () => {
    localStorage.removeItem("growvix_admin");
    await signOut();
    window.location.href = "/admin";
  };

  return (
    <aside
      className={cn(
        open ? "w-56" : "w-16",
        "bg-gradient-to-b from-[#0f1219] via-[#131722] to-[#0f1219] transition-all duration-300 flex-col hidden md:flex flex-shrink-0 min-h-screen sticky top-0 relative",
      )}
    >
      <div className="mesh-gradient-dark absolute inset-0 pointer-events-none" />
      <div className="p-4 flex items-center gap-2 relative z-10">
        <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center flex-shrink-0 shadow-glow">
          <Icon className="h-4 w-4 text-white" />
        </div>
        {open && <span className="text-sm font-bold gradient-text-anim truncate">{brand}</span>}
      </div>
      <nav className="flex-1 px-2 mt-2 space-y-4 overflow-y-auto relative z-10">
        {groups.map((g) => (
          <div key={g.label} className="space-y-1">
            {open && (
              <div className="px-3 text-[10px] uppercase tracking-wider text-muted-foreground/30 font-semibold">
                {g.label}
              </div>
            )}
            {g.items.map((item) => {
              const active = pathname === item.route;
              return (
                <button
                  key={item.route}
                  onClick={() => navigate(item.route)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200",
                    active
                      ? "bg-gradient-to-r from-primary/25 to-accent/15 text-primary shadow-sm border border-primary/10"
                      : "text-muted-foreground/50 hover:text-muted-foreground/70 hover:bg-white/5",
                  )}
                  title={!open ? item.label : undefined}
                >
                  <item.icon className="h-4 w-4 flex-shrink-0" />
                  {open && <span>{item.label}</span>}
                  {active && open && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />}
                </button>
              );
            })}
          </div>
        ))}
      </nav>
      <div className="p-3 border-t border-white/5 relative z-10 space-y-1">
        <button onClick={() => navigate("/")}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-muted-foreground/40 hover:text-muted-foreground/60 hover:bg-white/5 transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" />
          {open && <span>Back to App</span>}
        </button>
        <button onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-red-400/40 hover:text-red-400/60 hover:bg-red-500/5 transition-colors">
          <LogOut className="h-3.5 w-3.5" />
          {open && <span>Sign Out</span>}
        </button>
        <button onClick={() => setOpen(!open)}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-muted-foreground/40 hover:text-muted-foreground/60 hover:bg-white/5 transition-colors">
          {open ? <ChevronLeft className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          {open && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  );
}
