"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Bell,
  CalendarDays,
  Clock,
  LayoutDashboard,
  ListChecks,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  {
    label: "Home",
    href: "/dashboard",
    icon: LayoutDashboard,
    matchExact: true,
  },
  {
    label: "Tasks",
    href: "/dashboard/tasks",
    icon: ListChecks,
  },
  {
    label: "Clock In",
    href: "/dashboard/attendance",
    icon: Clock,
    isCenter: true,
  },
  {
    label: "Leaves",
    href: "/dashboard/leaves",
    icon: CalendarDays,
  },
  {
    label: "Alerts",
    href: "/dashboard/notifications",
    icon: Bell,
  },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const [clockedIn, setClockedIn] = useState(false);
  const [notifCount, setNotifCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    function fetchStatus() {
      fetch("/api/attendance/today")
        .then((r) => r.json())
        .then((data) => {
          if (!cancelled) setClockedIn(data?.status === "clocked_in");
        })
        .catch(() => {});

      fetch("/api/notifications?limit=1&unread=true")
        .then((r) => r.json())
        .then((data) => {
          if (!cancelled) setNotifCount(data?.total || 0);
        })
        .catch(() => {});
    }

    fetchStatus();
    const interval = setInterval(fetchStatus, 60_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  function isActive(item: (typeof NAV_ITEMS)[0]) {
    if (item.matchExact) return pathname === item.href;
    return pathname.startsWith(item.href);
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/70 bg-background/80 backdrop-blur-xl md:hidden">
      <div className="mx-auto flex max-w-lg items-end justify-around px-2 pb-[env(safe-area-inset-bottom)]">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item);
          const Icon = item.icon;

          if (item.isCenter) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="relative -mt-4 flex flex-col items-center"
              >
                <div
                  className={cn(
                    "flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-colors",
                    clockedIn
                      ? "bg-green-500 text-white"
                      : active
                        ? "bg-primary text-primary-foreground"
                        : "bg-primary/90 text-primary-foreground"
                  )}
                >
                  <Icon className="h-6 w-6" />
                  {clockedIn && (
                    <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-background bg-green-400 animate-pulse" />
                  )}
                </div>
                <span
                  className={cn(
                    "mt-1 text-[10px] font-medium",
                    clockedIn
                      ? "text-green-600 dark:text-green-400"
                      : active
                        ? "text-primary"
                        : "text-muted-foreground"
                  )}
                >
                  {clockedIn ? "Active" : item.label}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className="relative flex flex-col items-center py-2 px-3"
            >
              <div className="relative">
                <Icon
                  className={cn(
                    "h-5 w-5 transition-colors",
                    active ? "text-primary" : "text-muted-foreground"
                  )}
                />
                {item.label === "Alerts" && notifCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground">
                    {notifCount > 9 ? "9+" : notifCount}
                  </span>
                )}
              </div>
              <span
                className={cn(
                  "mt-1 text-[10px] font-medium",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
