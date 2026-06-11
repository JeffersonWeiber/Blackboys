import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  Users, 
  Settings, 
  LogOut,
  BarChart3,
  X,
  Menu,
  Film,
  Webhook,
  Layers,
  Building2,
  FileText
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import logoBlackboy from "@/assets/logo-blackboy-films.svg";

const navItems = [
  { to: "/admin", icon: LayoutDashboard, label: "Dashboard", exact: true },
  { to: "/admin/leads", icon: Users, label: "Leads" },
  { to: "/admin/portfolio", icon: Film, label: "Portfólio" },
  { to: "/admin/nichos", icon: Layers, label: "Nichos" },
  { to: "/admin/clients", icon: Building2, label: "Clientes" },
  { to: "/admin/orcamentos", icon: FileText, label: "Orçamentos" },
  { to: "/admin/analytics", icon: BarChart3, label: "Analytics" },
  { to: "/admin/tracking", icon: Settings, label: "Tracking", adminOnly: true },
  { to: "/admin/config", icon: Webhook, label: "Config", adminOnly: true },
];

export function AdminSidebar() {
  const { role, signOut, user } = useAuth();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
  };

  const isActive = (path: string, exact?: boolean) => {
    if (exact) {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  const filteredNavItems = navItems.filter(item => 
    !item.adminOnly || role === "admin"
  );

  return (
    <>
      {/* Mobile Toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 lg:hidden"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-screen w-64 transform bg-card border-r border-border transition-transform duration-200 lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-border">
            <NavLink to="/admin" className="flex items-center gap-3" onClick={() => setIsOpen(false)}>
              <img 
                src={logoBlackboy} 
                alt="Blackboy Films" 
                className="h-10 w-auto"
              />
            </NavLink>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            {filteredNavItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setIsOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                  isActive(item.to, item.exact)
                    ? "bg-gold/20 text-gold"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* User Info & Logout */}
          <div className="p-4 border-t border-border">
            <div className="px-4 py-2 mb-2">
              <p className="text-sm font-medium truncate">{user?.email}</p>
              <p className="text-xs text-muted-foreground capitalize">{role}</p>
            </div>
            <Button
              variant="ghost"
              className="w-full justify-start text-muted-foreground hover:text-destructive"
              onClick={handleSignOut}
            >
              <LogOut className="h-5 w-5 mr-3" />
              Sair
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
}
