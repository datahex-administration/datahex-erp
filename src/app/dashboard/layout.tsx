"use client";

import { useAuth } from "@/components/providers/auth-provider";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { CommandPalette } from "@/components/command-palette";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Bell, Loader2, Menu, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState, useCallback } from "react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyObj = Record<string, any>;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, company, loading } = useAuth();
  const router = useRouter();
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifItems, setNotifItems] = useState<AnyObj[]>([]);
  const [notifCount, setNotifCount] = useState(0);

  const fetchNotifs = useCallback(() => {
    fetch("/api/notifications?limit=5")
      .then((r) => r.json())
      .then((json) => {
        setNotifItems(json.data || []);
        setNotifCount(json.data?.filter((n: AnyObj) => !n.read).length || 0);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 60_000);
    return () => clearInterval(interval);
  }, [user, fetchNotifs]);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background [background-image:radial-gradient(circle_at_top_left,rgba(79,107,246,0.12),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(126,87,255,0.1),transparent_22%)]">
      <Sidebar
        desktopCollapsed={desktopCollapsed}
        mobileOpen={mobileOpen}
        onDesktopToggle={() => setDesktopCollapsed((current) => !current)}
        onMobileClose={() => setMobileOpen(false)}
      />
      <CommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
      />

      <main
        className={cn(
          "min-h-screen transition-[margin-left] duration-300",
          desktopCollapsed ? "md:ml-24" : "md:ml-80"
        )}
      >
        <div className="sticky top-0 z-30 border-b border-border/70 bg-background/80 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 md:px-8">
            <Button
              variant="outline"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileOpen(true)}
              title="Open menu"
            >
              <Menu className="h-4 w-4" />
            </Button>

            <Button
              type="button"
              variant="outline"
              className="h-11 flex-1 justify-between rounded-2xl border-primary/10 bg-card/70 px-4 text-left text-muted-foreground shadow-sm backdrop-blur"
              onClick={() => setCommandPaletteOpen(true)}
            >
              <span className="flex items-center gap-3 overflow-hidden">
                <Search className="h-4 w-4 shrink-0" />
                <span className="truncate">Search menus, pages, and quick actions</span>
              </span>
              <span className="hidden items-center gap-1 rounded-lg bg-muted px-2 py-1 text-xs font-medium text-muted-foreground sm:flex">
                <kbd>⌘</kbd>
                <kbd>K</kbd>
              </span>
            </Button>

            <div className="relative">
              <Button
                variant="outline"
                size="icon"
                className="relative"
                onClick={() => setNotifOpen((v) => !v)}
                title="Notifications"
              >
                <Bell className="h-4 w-4" />
                {notifCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                    {notifCount > 9 ? "9+" : notifCount}
                  </span>
                )}
              </Button>
              {notifOpen && (
                <>
                  <button
                    type="button"
                    className="fixed inset-0 z-40"
                    onClick={() => setNotifOpen(false)}
                    aria-label="Close notifications"
                  />
                  <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-xl border border-border/70 bg-background/95 shadow-lg backdrop-blur-xl">
                    <div className="flex items-center justify-between border-b px-4 py-3">
                      <p className="text-sm font-semibold">Notifications</p>
                      <Link
                        href="/dashboard/notifications"
                        className="text-xs text-primary hover:underline"
                        onClick={() => setNotifOpen(false)}
                      >
                        View all
                      </Link>
                    </div>
                    <div className="max-h-72 overflow-y-auto">
                      {notifItems.length === 0 ? (
                        <p className="py-8 text-center text-sm text-muted-foreground">No notifications</p>
                      ) : (
                        notifItems.map((n) => (
                          <div
                            key={n._id}
                            className={cn(
                              "border-b px-4 py-3 last:border-0",
                              !n.read && "bg-accent/30"
                            )}
                          >
                            <p className="text-sm font-medium">{n.title}</p>
                            <p className="text-xs text-muted-foreground line-clamp-2">{n.message}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="hidden min-w-0 rounded-2xl border border-border/70 bg-card/75 px-4 py-2 text-right shadow-sm backdrop-blur lg:block">
              <p className="truncate text-sm font-semibold">{company?.name || "Datahex ERP"}</p>
              <p className="truncate text-xs text-muted-foreground">{user.role.replace("_", " ")}</p>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 py-6 pb-24 md:px-8 md:py-8 md:pb-8">
          {children}
        </div>
      </main>

      <MobileBottomNav />
    </div>
  );
}
