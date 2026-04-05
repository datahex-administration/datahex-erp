"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/providers/auth-provider";
import { navigationGroups } from "@/components/layout/navigation";
import {
  Building2,
  LogOut,
  ChevronDown,
  ChevronLeft,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useEffect, useState } from "react";

const appName = process.env.NEXT_PUBLIC_APP_NAME || "Datahex ERP";

interface SidebarProps {
  desktopCollapsed: boolean;
  mobileOpen: boolean;
  onDesktopToggle: () => void;
  onMobileClose: () => void;
}

function isActivePath(pathname: string, href: string) {
  if (href === "/dashboard") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar({
  desktopCollapsed,
  mobileOpen,
  onDesktopToggle,
  onMobileClose,
}: SidebarProps) {
  const pathname = usePathname();
  const { user, company, logout, hasPermission } = useAuth();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(navigationGroups.map((group) => [group.id, group.id === "overview"]))
  );

  const visibleGroups = navigationGroups
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) => !item.permission || hasPermission(item.permission)
      ),
    }))
    .filter((group) => group.items.length > 0);

  useEffect(() => {
    if (desktopCollapsed) {
      return;
    }

    setOpenGroups((current) => {
      const next = { ...current };
      let changed = false;

      visibleGroups.forEach((group) => {
        const groupIsActive = group.items.some((item) => isActivePath(pathname, item.href));
        if (groupIsActive && !next[group.id]) {
          next[group.id] = true;
          changed = true;
        }
      });

      return changed ? next : current;
    });
  }, [desktopCollapsed, pathname, visibleGroups]);

  const handleToggleGroup = (groupId: string) => {
    setOpenGroups((current) => ({
      ...current,
      [groupId]: !current[groupId],
    }));
  };

  const handleNavigateOnMobile = () => {
    if (mobileOpen) {
      onMobileClose();
    }
  };

  const renderCompactItem = (
    item: (typeof visibleGroups)[number]["items"][number]
  ) => {
    const itemIsActive = isActivePath(pathname, item.href);

    return (
      <Tooltip key={item.href}>
        <TooltipTrigger
          render={
            <Link
              href={item.href}
              onClick={handleNavigateOnMobile}
              className={cn(
                "flex h-11 items-center justify-center rounded-2xl transition-colors",
                itemIsActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
            </Link>
          }
        />
        <TooltipContent side="right">{item.name}</TooltipContent>
      </Tooltip>
    );
  };

  const sidebarWidthClass = desktopCollapsed ? "md:w-24" : "md:w-80";

  const userInitials =
    user?.name
      ?.split(" ")
      .map((namePart) => namePart[0])
      .join("")
      .toUpperCase() || "?";

  const asideContent = (
    <>
      <div className="flex items-center justify-between border-b px-4 py-4">
        <Link href="/dashboard" onClick={handleNavigateOnMobile} className="flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
            <Building2 className="h-5 w-5" />
          </div>
          {!desktopCollapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold leading-none">{appName}</p>
              <p className="mt-1 truncate text-xs text-muted-foreground">
                {company?.name || "Workspace"}
              </p>
            </div>
          )}
        </Link>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="hidden md:inline-flex"
            onClick={onDesktopToggle}
            title={desktopCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <ChevronLeft
              className={cn("h-4 w-4 transition-transform", desktopCollapsed && "rotate-180")}
            />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={onMobileClose}
            title="Close menu"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 px-3 py-4">
        {desktopCollapsed ? (
          <nav className="space-y-4">
            {visibleGroups.map((group) => (
              <div key={group.id} className="space-y-1">
                {group.items.map((item) => renderCompactItem(item))}
                <Separator className="mt-2" />
              </div>
            ))}
          </nav>
        ) : (
          <nav className="space-y-3">
            {visibleGroups.map((group) => {
              const groupIsActive = group.items.some((item) => isActivePath(pathname, item.href));
              const groupIsOpen = openGroups[group.id] ?? false;

              return (
                <section
                  key={group.id}
                  className={cn(
                    "overflow-hidden rounded-2xl border bg-white/80",
                    groupIsActive && "border-primary/20 shadow-sm"
                  )}
                >
                  <button
                    type="button"
                    onClick={() => handleToggleGroup(group.id)}
                    className={cn(
                      "flex w-full items-center justify-between px-3 py-3 text-left transition-colors",
                      groupIsActive ? "bg-primary/5" : "hover:bg-accent/70"
                    )}
                  >
                    <span className="flex items-center gap-3 min-w-0">
                      <span
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                          groupIsActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                        )}
                      >
                        <group.icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold">{group.label}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {group.items.length} menu items
                        </span>
                      </span>
                    </span>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                        groupIsOpen && "rotate-180"
                      )}
                    />
                  </button>

                  {groupIsOpen && (
                    <div className="space-y-1 border-t px-2 py-2">
                      {group.items.map((item) => {
                        const itemIsActive = isActivePath(pathname, item.href);

                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={handleNavigateOnMobile}
                            className={cn(
                              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                              itemIsActive
                                ? "bg-primary text-primary-foreground shadow-sm"
                                : "text-muted-foreground hover:bg-accent hover:text-foreground"
                            )}
                          >
                            <item.icon className="h-4 w-4 shrink-0" />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate font-medium">{item.name}</span>
                              {item.description && (
                                <span
                                  className={cn(
                                    "block truncate text-xs",
                                    itemIsActive
                                      ? "text-primary-foreground/80"
                                      : "text-muted-foreground"
                                  )}
                                >
                                  {item.description}
                                </span>
                              )}
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </section>
              );
            })}
          </nav>
        )}
      </ScrollArea>

      <div className="border-t px-3 py-3">
        <div className="flex items-center gap-3 rounded-2xl bg-muted/60 px-3 py-3">
          <Avatar className="h-10 w-10 shrink-0">
            <AvatarFallback className="text-xs font-medium">{userInitials}</AvatarFallback>
          </Avatar>
          {!desktopCollapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{user?.name}</p>
              <p className="truncate text-xs capitalize text-muted-foreground">
                {user?.role?.replace("_", " ")}
              </p>
            </div>
          )}
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 shrink-0"
                  onClick={logout}
                  title="Logout"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              }
            />
            <TooltipContent side={desktopCollapsed ? "right" : "top"}>Logout</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </>
  );

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={onMobileClose}
          aria-label="Close menu overlay"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[86vw] max-w-[320px] flex-col border-r border-border bg-white/95 shadow-xl backdrop-blur transition-[transform,width] duration-300 md:max-w-none md:shadow-none",
          sidebarWidthClass,
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        {asideContent}
      </aside>
    </>
  );
}
