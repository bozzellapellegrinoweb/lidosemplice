"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/logo";
import {
  LayoutDashboard,
  Map,
  CalendarDays,
  Euro,
  Package,
  Users,
  UtensilsCrossed,
  BarChart3,
  Settings,
  LogOut,
  ChevronLeft,
  Menu,
  Loader2,
  Coffee,
} from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

// ── Definizione voci di navigazione con permessi richiesti ────────────────
// permission: null → sempre visibile
// permission: "admin" → solo admin
// permission: "bookings" ecc. → solo se il dipendente ha quel permesso

const navigation = [
  { label: "Dashboard",          href: "",               icon: LayoutDashboard, permission: null },
  { label: "Mappa stabilimento", href: "/mappa",         icon: Map,             permission: null },
  { label: "Prenotazioni",       href: "/prenotazioni",  icon: CalendarDays,    permission: "bookings" },
  { label: "Prezzi e stagioni",  href: "/prezzi",        icon: Euro,            permission: "pricing" },
  { label: "Servizi extra",      href: "/servizi",       icon: Package,         permission: "pricing" },
  { label: "Dipendenti",         href: "/dipendenti",    icon: Users,           permission: "admin" },
  { label: "Menu bar",           href: "/menu-bar",      icon: Coffee,          permission: "bar_orders", requiresBar: true },
  { label: "Ordini bar",         href: "/ordini-bar",    icon: UtensilsCrossed, permission: "bar_orders", requiresBar: true },
  { label: "Statistiche",        href: "/analytics",     icon: BarChart3,       permission: "analytics" },
  { label: "Impostazioni",       href: "/impostazioni",  icon: Settings,        permission: "settings" },
];

interface DashboardSidebarProps {
  role: string;
  permissions: Record<string, boolean>;
  barEnabled: boolean;
}

export function DashboardSidebar({ role, permissions, barEnabled }: DashboardSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const segments = pathname.split("/");
  const basePath = segments.slice(0, 3).join("/"); // /dashboard/[slug]

  const isAdmin = role === "admin";

  // Filtra le voci in base al ruolo, ai permessi e al servizio bar
  const visibleNav = navigation.filter((item) => {
    if ("requiresBar" in item && item.requiresBar && !barEnabled) return false;
    if (item.permission === null) return true;       // sempre visibile
    if (item.permission === "admin") return isAdmin; // solo admin
    if (isAdmin) return true;                        // admin vede tutto
    return permissions[item.permission] === true;    // dipendente: controlla permesso
  });

  async function handleLogout() {
    setLoggingOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
  }

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-lg bg-sidebar text-sidebar-foreground shadow-lg lg:hidden"
        aria-label="Apri menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex h-screen flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300",
          collapsed ? "w-[72px]" : "w-[260px]",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
          {!collapsed && (
            <Link href="/">
              <Logo size="sm" />
            </Link>
          )}
          <button
            onClick={() => { setCollapsed(!collapsed); setMobileOpen(false); }}
            className="flex h-8 w-8 items-center justify-center rounded-md text-sidebar-foreground/50 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
            aria-label={collapsed ? "Espandi menu" : "Riduci menu"}
          >
            <ChevronLeft className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
          </button>
        </div>

        {/* Badge ruolo */}
        {!collapsed && !isAdmin && (
          <div className="px-4 py-2">
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              Dipendente
            </span>
          </div>
        )}

        {/* Nav items */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {visibleNav.map((item) => {
            const href = `${basePath}${item.href}`;
            const isActive =
              item.href === ""
                ? pathname === basePath
                : pathname.startsWith(href);

            return (
              <Link
                key={item.href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                )}
              >
                <item.icon className={cn("h-5 w-5 shrink-0", isActive && "text-brand-azure")} />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="border-t border-sidebar-border p-3">
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
          >
            {loggingOut ? (
              <Loader2 className="h-5 w-5 shrink-0 animate-spin" />
            ) : (
              <LogOut className="h-5 w-5 shrink-0" />
            )}
            {!collapsed && <span>{loggingOut ? "Uscita..." : "Esci"}</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
