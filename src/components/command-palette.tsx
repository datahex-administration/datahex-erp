"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
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
  Bell,
  Settings,
  Contact,
  MessageSquare,
  Shield,
  Search,
  Plus,
  ListTodo,
} from "lucide-react";

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  action: () => void;
  keywords?: string[];
  group: string;
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const nav = useCallback(
    (path: string) => {
      setOpen(false);
      router.push(path);
    },
    [router]
  );

  const commands: CommandItem[] = [
    // Navigation
    { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" />, action: () => nav("/dashboard"), group: "Navigation", keywords: ["home", "overview"] },
    { id: "companies", label: "Companies", icon: <Building2 className="h-4 w-4" />, action: () => nav("/dashboard/companies"), group: "Navigation", keywords: ["organizations"] },
    { id: "employees", label: "Employees", icon: <Users className="h-4 w-4" />, action: () => nav("/dashboard/employees"), group: "Navigation", keywords: ["staff", "team"] },
    { id: "salary", label: "Salary Management", icon: <Wallet className="h-4 w-4" />, action: () => nav("/dashboard/salary"), group: "Navigation", keywords: ["payroll", "payment"] },
    { id: "leaves", label: "Leave Management", icon: <CalendarDays className="h-4 w-4" />, action: () => nav("/dashboard/leaves"), group: "Navigation", keywords: ["vacation", "time off"] },
    { id: "clients", label: "Clients", icon: <Contact className="h-4 w-4" />, action: () => nav("/dashboard/clients"), group: "Navigation", keywords: ["customers"] },
    { id: "projects", label: "Projects", icon: <FolderKanban className="h-4 w-4" />, action: () => nav("/dashboard/projects"), group: "Navigation", keywords: ["kanban", "tasks"] },
    { id: "tasks", label: "Daily Tasks", icon: <ListTodo className="h-4 w-4" />, action: () => nav("/dashboard/tasks"), group: "Navigation", keywords: ["todo", "work log"] },
    { id: "invoices", label: "Invoices", icon: <FileText className="h-4 w-4" />, action: () => nav("/dashboard/invoices"), group: "Navigation", keywords: ["billing", "payment"] },
    { id: "expenses", label: "Expenses", icon: <Receipt className="h-4 w-4" />, action: () => nav("/dashboard/expenses"), group: "Navigation", keywords: ["costs", "spending"] },
    { id: "subscriptions", label: "Subscriptions", icon: <CreditCard className="h-4 w-4" />, action: () => nav("/dashboard/subscriptions"), group: "Navigation", keywords: ["services", "hosting", "domain"] },
    { id: "chat", label: "Chat", icon: <MessageSquare className="h-4 w-4" />, action: () => nav("/dashboard/chat"), group: "Navigation", keywords: ["messages"] },
    { id: "notifications", label: "Notifications", icon: <Bell className="h-4 w-4" />, action: () => nav("/dashboard/notifications"), group: "Navigation", keywords: ["alerts"] },
    { id: "audit-log", label: "Audit Log", icon: <Shield className="h-4 w-4" />, action: () => nav("/dashboard/audit-log"), group: "Navigation", keywords: ["activity", "history"] },
    { id: "settings", label: "Settings", icon: <Settings className="h-4 w-4" />, action: () => nav("/dashboard/settings"), group: "Navigation", keywords: ["users", "roles", "config"] },
    // Quick Actions
    { id: "new-employee", label: "Add Employee", icon: <Plus className="h-4 w-4" />, action: () => nav("/dashboard/employees/new"), group: "Quick Actions", keywords: ["create employee", "hire"] },
    { id: "new-project", label: "New Project", icon: <Plus className="h-4 w-4" />, action: () => nav("/dashboard/projects/new"), group: "Quick Actions", keywords: ["create project"] },
    { id: "new-invoice", label: "New Invoice", icon: <Plus className="h-4 w-4" />, action: () => nav("/dashboard/invoices/new"), group: "Quick Actions", keywords: ["create invoice", "bill"] },
  ];

  const filtered = query
    ? commands.filter((cmd) => {
        const q = query.toLowerCase();
        return (
          cmd.label.toLowerCase().includes(q) ||
          cmd.description?.toLowerCase().includes(q) ||
          cmd.keywords?.some((k) => k.includes(q))
        );
      })
    : commands;

  const groups = filtered.reduce(
    (acc, cmd) => {
      if (!acc[cmd.group]) acc[cmd.group] = [];
      acc[cmd.group].push(cmd);
      return acc;
    },
    {} as Record<string, CommandItem[]>
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
        setQuery("");
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      filtered[selectedIndex]?.action();
    }
  };

  // Scroll selected item into view
  useEffect(() => {
    const item = listRef.current?.querySelector(`[data-index="${selectedIndex}"]`);
    item?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  if (!open) return null;

  let flatIndex = -1;

  return (
    <div className="fixed inset-0 z-50">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
      <div className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-lg">
        <div className="bg-white rounded-xl shadow-2xl border overflow-hidden">
          {/* Search Input */}
          <div className="flex items-center border-b px-4">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a command or search..."
              className="flex-1 px-3 py-3.5 text-sm bg-transparent outline-none placeholder:text-muted-foreground"
            />
            <kbd className="hidden sm:inline-flex text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded font-mono">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <div ref={listRef} className="max-h-[320px] overflow-y-auto p-2">
            {filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No results found</p>
            ) : (
              Object.entries(groups).map(([group, items]) => (
                <div key={group}>
                  <p className="text-xs font-medium text-muted-foreground px-2 py-1.5">{group}</p>
                  {items.map((cmd) => {
                    flatIndex++;
                    const idx = flatIndex;
                    return (
                      <button
                        key={cmd.id}
                        data-index={idx}
                        onClick={() => cmd.action()}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                          selectedIndex === idx ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
                        }`}
                      >
                        <span className="text-muted-foreground">{cmd.icon}</span>
                        <span className="font-medium">{cmd.label}</span>
                        {cmd.description && (
                          <span className="text-muted-foreground text-xs ml-auto">{cmd.description}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t px-4 py-2 text-xs text-muted-foreground">
            <div className="flex gap-2">
              <span className="flex items-center gap-1"><kbd className="bg-muted px-1.5 py-0.5 rounded font-mono">↑↓</kbd> Navigate</span>
              <span className="flex items-center gap-1"><kbd className="bg-muted px-1.5 py-0.5 rounded font-mono">↵</kbd> Open</span>
            </div>
            <span className="flex items-center gap-1"><kbd className="bg-muted px-1.5 py-0.5 rounded font-mono">⌘K</kbd> Toggle</span>
          </div>
        </div>
      </div>
    </div>
  );
}
