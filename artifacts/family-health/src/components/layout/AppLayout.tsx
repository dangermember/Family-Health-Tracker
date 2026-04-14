import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useLogout } from "@workspace/api-client-react";
import { 
  HeartPulse, 
  LayoutDashboard, 
  Scale, 
  Ruler, 
  Droplet, 
  Settings, 
  Users, 
  LogOut,
  Menu
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const [location, setLocation] = useLocation();
  const logout = useLogout();
  const [open, setOpen] = useState(false);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><div className="animate-pulse">Loading...</div></div>;
  }

  if (!user) {
    return <>{children}</>;
  }

  const navItems = [
    { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
    { href: "/weight", label: "Weight Log", icon: Scale },
    { href: "/length", label: "Length Log", icon: Ruler },
    ...(user.gender === "female" ? [{ href: "/period", label: "Cycle", icon: Droplet }] : []),
    ...(user.role === "admin" ? [{ href: "/admin", label: "Family Admin", icon: Users }] : []),
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => setLocation("/login"),
    });
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-sidebar border-r border-sidebar-border text-sidebar-foreground">
      <div className="p-6 pb-2">
        <div className="flex items-center gap-2 text-primary font-serif font-medium text-xl mb-6">
          <HeartPulse className="w-6 h-6" />
          <span>Family Health</span>
        </div>
        <div className="text-sm text-sidebar-foreground/60 mb-1">Signed in as</div>
        <div className="font-medium">{user.displayName}</div>
        {user.status === 'pending' && (
          <div className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-md mt-2 inline-block">
            Pending Approval
          </div>
        )}
        {user.status === 'suspended' && (
          <div className="text-xs bg-destructive/10 text-destructive px-2 py-1 rounded-md mt-2 inline-block">
            Account Suspended
          </div>
        )}
      </div>

      <nav className="flex-1 px-4 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.href || location.startsWith(`${item.href}/`);
          return (
            <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors ${isActive ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"}`}>
              <Icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-sidebar-border">
        <Button variant="ghost" className="w-full justify-start gap-3 text-sidebar-foreground/80 hover:text-destructive hover:bg-destructive/10" onClick={handleLogout}>
          <LogOut className="w-4 h-4" />
          Sign Out
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <div className="hidden md:block w-64 shrink-0 fixed inset-y-0 z-20">
        <SidebarContent />
      </div>

      {/* Main Content */}
      <div className="flex-1 md:ml-64 flex flex-col min-h-screen">
        <header className="md:hidden sticky top-0 z-10 bg-background border-b border-border flex items-center justify-between p-4">
          <div className="flex items-center gap-2 text-primary font-serif font-medium">
            <HeartPulse className="w-5 h-5" />
            <span>Family Health</span>
          </div>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64">
              <SidebarContent />
            </SheetContent>
          </Sheet>
        </header>

        <main className="flex-1 p-4 md:p-8 max-w-5xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
