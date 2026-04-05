"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/providers/auth-provider";
import {
  LayoutDashboard,
  Users,
  Building2,
  Wallet,
  CalendarDays,
  FolderKanban,
  FileText,
  Receipt,
  CreditCard,
  ListTodo,
  Bell,
  Settings,
  LogOut,
  ChevronLeft,
  Menu,
  Contact,
  MessageSquare,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useState } from "react";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, permission: null },
  { name: "Companies", href: "/dashboard/companies", icon: Building2, permission: "companies:read" },
  { name: "Employees", href: "/dashboard/employees", icon: Users, permission: "employees:read" },
  { name: "Salary", href: "/dashboard/salary", icon: Wallet, permission: "salary:read" },
  { name: "Leaves", href: "/dashboard/leaves", icon: CalendarDays, permission: "leaves:read" },
  { name: "Clients", href: "/dashboard/clients", icon: Contact, permission: "clients:read" },
  { name: "Projects", href: "/dashboard/projects", icon: FolderKanban, permission: "projects:read" },
  { name: "Daily Tasks", href: "/dashboard/tasks", icon: ListTodo, permission: "reports:read" },
  { name: "Invoices", href: "/dashboard/invoices", icon: FileText, permission: "invoices:read" },
  { name: "Expenses", href: "/dashboard/expenses", icon: Receipt, permission: "expenses:read" },
  { name: "Subscriptions", href: "/dashboard/subscriptions", icon: CreditCard, permission: "subscriptions:read" },
  { name: "Chat", href: "/dashboard/chat", icon: MessageSquare, permission: null },
  { name: "Notifications", href: "/dashboard/notifications", icon: Bell, permission: null },
  { name: "Audit Log", href: "/dashboard/audit-log", icon: Shield, permission: "settings:read" },
  { name: "Settings", href: "/dashboard/settings", icon: Settings, permission: "settings:read" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, company, logout, hasPermission } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const visibleNav = navigation.filter(
    (item) => !item.permission || hasPermission(item.permission)
  );

  return (
    <>
      {/* Mobile overlay */}
      <div className="md:hidden fixed top-0 left-0 z-40 p-3">
        <Button variant="outline" size="icon" onClick={() => setCollapsed(!collapsed)}>
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 flex flex-col bg-white border-r border-border transition-all duration-300",
          collapsed ? "w-[70px]" : "w-[260px]",
          "max-md:hidden"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b">
          {!collapsed && (
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Building2 className="w-4 h-4 text-primary-foreground" />
              </div>
              <div>
                <h1 className="font-semibold text-sm leading-none">Datahex ERP</h1>
                {company && (
                  <p className="text-xs text-muted-foreground mt-0.5">{company.name}</p>
                )}
              </div>
            </Link>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setCollapsed(!collapsed)}
          >
            <ChevronLeft className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
          </Button>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 py-4">
          <nav className="space-y-1 px-3">
            {visibleNav.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                  title={collapsed ? item.name : undefined}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  {!collapsed && <span>{item.name}</span>}
                </Link>
              );
            })}
          </nav>
        </ScrollArea>

        {/* User section */}
        <div className="border-t p-3">
          <Separator className="mb-3" />
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9 shrink-0">
              <AvatarFallback className="text-xs font-medium">
                {user?.name?.split(" ").map((n) => n[0]).join("").toUpperCase() || "?"}
              </AvatarFallback>
            </Avatar>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.name}</p>
                <p className="text-xs text-muted-foreground truncate capitalize">{user?.role?.replace("_", " ")}</p>
              </div>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={logout}
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
}
