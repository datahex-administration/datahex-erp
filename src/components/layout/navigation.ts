import {
  Bell,
  Bug,
  Building2,
  CalendarDays,
  Clock,
  Contact,
  CreditCard,
  FileText,
  FolderKanban,
  LayoutDashboard,
  ListTodo,
  MessageSquare,
  Receipt,
  Settings,
  Shield,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export interface NavigationItem {
  name: string;
  href: string;
  icon: LucideIcon;
  permission: string | null;
  description?: string;
  keywords?: string[];
}

export interface NavigationGroup {
  id: string;
  label: string;
  icon: LucideIcon;
  items: NavigationItem[];
}

export const navigationGroups: NavigationGroup[] = [
  {
    id: "overview",
    label: "Overview",
    icon: LayoutDashboard,
    items: [
      {
        name: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
        permission: null,
        description: "Business summary and activity",
        keywords: ["home", "overview", "summary"],
      },
      {
        name: "Notifications",
        href: "/dashboard/notifications",
        icon: Bell,
        permission: null,
        description: "Alerts and user activity",
        keywords: ["alerts", "messages"],
      },
    ],
  },
  {
    id: "operations",
    label: "People & Operations",
    icon: Users,
    items: [
      {
        name: "Companies",
        href: "/dashboard/companies",
        icon: Building2,
        permission: "companies:read",
        description: "Manage tenant companies",
        keywords: ["organization", "branches"],
      },
      {
        name: "Employees",
        href: "/dashboard/employees",
        icon: Users,
        permission: "employees:read",
        description: "Staff directory and records",
        keywords: ["team", "staff", "hr"],
      },
      {
        name: "Leaves",
        href: "/dashboard/leaves",
        icon: CalendarDays,
        permission: "leaves:read",
        description: "Time off requests and balances",
        keywords: ["vacation", "attendance"],
      },
      {
        name: "Attendance",
        href: "/dashboard/attendance",
        icon: Clock,
        permission: "attendance:read",
        description: "Clock in/out and work mode",
        keywords: ["clock", "check-in", "wfh", "office", "presence"],
      },
      {
        name: "Daily Tasks",
        href: "/dashboard/tasks",
        icon: ListTodo,
        permission: "reports:read",
        description: "Daily work tracking",
        keywords: ["todo", "work log", "tasks"],
      },
    ],
  },
  {
    id: "delivery",
    label: "Clients & Projects",
    icon: FolderKanban,
    items: [
      {
        name: "Clients",
        href: "/dashboard/clients",
        icon: Contact,
        permission: "clients:read",
        description: "Customer accounts and contacts",
        keywords: ["crm", "customers"],
      },
      {
        name: "Projects",
        href: "/dashboard/projects",
        icon: FolderKanban,
        permission: "projects:read",
        description: "Project pipeline and delivery",
        keywords: ["kanban", "milestones"],
      },
      {
        name: "Chat",
        href: "/dashboard/chat",
        icon: MessageSquare,
        permission: null,
        description: "Internal and client communication",
        keywords: ["messages", "conversation"],
      },
      {
        name: "Bug Reporting",
        href: "/dashboard/bugs",
        icon: Bug,
        permission: "bugs:read",
        description: "Track and manage bugs",
        keywords: ["bugs", "issues", "defects", "qa", "testing"],
      },
    ],
  },
  {
    id: "finance",
    label: "Finance",
    icon: Wallet,
    items: [
      {
        name: "Salary",
        href: "/dashboard/salary",
        icon: Wallet,
        permission: "salary:read",
        description: "Payroll and increments",
        keywords: ["payroll", "payments"],
      },
      {
        name: "Invoices",
        href: "/dashboard/invoices",
        icon: FileText,
        permission: "invoices:read",
        description: "Billing and collections",
        keywords: ["billing", "receivables"],
      },
      {
        name: "Expenses",
        href: "/dashboard/expenses",
        icon: Receipt,
        permission: "expenses:read",
        description: "Expense approvals and tracking",
        keywords: ["costs", "spend"],
      },
      {
        name: "Subscriptions",
        href: "/dashboard/subscriptions",
        icon: CreditCard,
        permission: "subscriptions:read",
        description: "Recurring services and renewals",
        keywords: ["plans", "hosting", "licenses"],
      },
    ],
  },
  {
    id: "system",
    label: "Administration",
    icon: Settings,
    items: [
      {
        name: "Settings",
        href: "/dashboard/settings",
        icon: Settings,
        permission: "settings:read",
        description: "Users, roles, and configuration",
        keywords: ["configuration", "preferences", "roles"],
      },
      {
        name: "Audit Log",
        href: "/dashboard/audit-log",
        icon: Shield,
        permission: "settings:read",
        description: "Track changes and actions",
        keywords: ["history", "activity", "security"],
      },
    ],
  },
];

export const quickActionItems: NavigationItem[] = [
  {
    name: "Add Employee",
    href: "/dashboard/employees/new",
    icon: Users,
    permission: "employees:create",
    description: "Create a new employee record",
    keywords: ["hire", "create employee"],
  },
  {
    name: "New Project",
    href: "/dashboard/projects/new",
    icon: FolderKanban,
    permission: "projects:create",
    description: "Start a new project",
    keywords: ["create project", "delivery"],
  },
  {
    name: "New Invoice",
    href: "/dashboard/invoices/new",
    icon: FileText,
    permission: "invoices:create",
    description: "Draft and send an invoice",
    keywords: ["create invoice", "bill"],
  },
];