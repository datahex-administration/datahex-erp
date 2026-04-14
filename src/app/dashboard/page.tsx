"use client";

import { useAuth } from "@/components/providers/auth-provider";
import { AttendanceWidget } from "@/components/dashboard/attendance-widget";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  Users,
  FolderKanban,
  FileText,
  Receipt,
  Building2,
  CalendarDays,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CreditCard,
  Plus,
  ArrowRight,
  Clock,
  Contact,
} from "lucide-react";
import { useEffect, useState } from "react";
import { format } from "date-fns";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyObj = Record<string, any>;

const STATUS_COLORS: Record<string, string> = {
  requirement: "bg-blue-100 text-blue-800",
  proposal: "bg-purple-100 text-purple-800",
  in_progress: "bg-yellow-100 text-yellow-800",
  review: "bg-orange-100 text-orange-800",
  completed: "bg-green-100 text-green-800",
  maintenance: "bg-gray-100 text-gray-800",
  draft: "bg-gray-100 text-gray-800",
  sent: "bg-blue-100 text-blue-800",
  paid: "bg-green-100 text-green-800",
  overdue: "bg-red-100 text-red-800",
};

const STATUS_LABELS: Record<string, string> = {
  requirement: "Requirement",
  proposal: "Proposal",
  in_progress: "In Progress",
  review: "Review",
  completed: "Completed",
  maintenance: "Maintenance",
};

export default function DashboardPage() {
  const { user, company } = useAuth();
  const [stats, setStats] = useState<AnyObj | null>(null);

  useEffect(() => {
    fetch("/api/dashboard/stats")
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {});
  }, []);

  const kpiCards = [
    { title: "Employees", value: stats?.employees ?? "—", icon: Users, color: "text-blue-600", bg: "bg-blue-50", href: "/dashboard/employees" },
    { title: "Clients", value: stats?.clients ?? "—", icon: Contact, color: "text-teal-600", bg: "bg-teal-50", href: "/dashboard/clients" },
    { title: "Active Projects", value: stats?.activeProjects ?? "—", icon: FolderKanban, color: "text-purple-600", bg: "bg-purple-50", href: "/dashboard/projects" },
    { title: "Revenue", value: stats ? `₹${(stats.totalPaid || 0).toLocaleString()}` : "—", icon: TrendingUp, color: "text-green-600", bg: "bg-green-50", href: "/dashboard/invoices" },
    { title: "Pending Invoices", value: stats ? `₹${(stats.totalPending || 0).toLocaleString()}` : "—", icon: DollarSign, color: "text-orange-600", bg: "bg-orange-50", href: "/dashboard/invoices" },
    { title: "Monthly Expenses", value: stats ? `₹${(stats.monthlyExpenses || 0).toLocaleString()}` : "—", icon: Receipt, color: "text-red-600", bg: "bg-red-50", href: "/dashboard/expenses" },
  ];

  const alertCards = [
    { label: "Pending Leaves", value: stats?.pendingLeaves || 0, color: "text-yellow-600", href: "/dashboard/leaves" },
    { label: "Overdue Invoices", value: stats?.overdueInvoices || 0, color: "text-red-600", href: "/dashboard/invoices" },
    { label: "Upcoming Renewals", value: stats?.upcomingRenewals || 0, color: "text-orange-600", href: "/dashboard/subscriptions" },
    { label: "Companies", value: stats?.companies ?? 1, color: "text-indigo-600", href: "/dashboard/companies" },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Welcome back, {user?.name}
            {company ? ` — ${company.name}` : ""}
          </p>
        </div>
        {user?.role !== "customer_success" && user?.role !== "staff" && (
          <div className="flex gap-2">
            <Link href="/dashboard/invoices/new">
              <Button variant="outline" size="sm"><Plus className="h-4 w-4 mr-1" />Invoice</Button>
            </Link>
            <Link href="/dashboard/projects/new">
              <Button variant="outline" size="sm"><Plus className="h-4 w-4 mr-1" />Project</Button>
            </Link>
            <Link href="/dashboard/employees/new">
              <Button size="sm"><Plus className="h-4 w-4 mr-1" />Employee</Button>
            </Link>
          </div>
        )}
      </div>

      {/* Attendance Widget */}
      <AttendanceWidget compact />

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {kpiCards.map((card) => (
          <Link key={card.title} href={card.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${card.bg}`}>
                  <card.icon className={`h-4 w-4 ${card.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{card.value}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Alert Strip */}
      <div className="grid gap-3 sm:grid-cols-4">
        {alertCards.map((a) => (
          <Link key={a.label} href={a.href}>
            <Card className="hover:shadow-sm transition-shadow cursor-pointer">
              <CardContent className="p-3 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{a.label}</span>
                <span className={`font-bold text-lg ${a.color}`}>{a.value}</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Projects */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base">Recent Projects</CardTitle>
              <CardDescription>Last updated projects</CardDescription>
            </div>
            <Link href="/dashboard/projects">
              <Button variant="ghost" size="sm"><ArrowRight className="h-4 w-4" /></Button>
            </Link>
          </CardHeader>
          <CardContent>
            {!stats?.recentProjects?.length ? (
              <p className="text-sm text-muted-foreground text-center py-6">No projects yet</p>
            ) : (
              <div className="space-y-3">
                {stats.recentProjects.map((p: AnyObj) => (
                  <Link key={p._id} href={`/dashboard/projects/${p._id}`} className="block">
                    <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.clientId?.name || "No client"}</p>
                      </div>
                      <Badge className={`${STATUS_COLORS[p.status] || ""} border-0 text-xs`}>
                        {STATUS_LABELS[p.status] || p.status}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Invoices */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base">Recent Invoices</CardTitle>
              <CardDescription>Latest invoice activity</CardDescription>
            </div>
            <Link href="/dashboard/invoices">
              <Button variant="ghost" size="sm"><ArrowRight className="h-4 w-4" /></Button>
            </Link>
          </CardHeader>
          <CardContent>
            {!stats?.recentInvoices?.length ? (
              <p className="text-sm text-muted-foreground text-center py-6">No invoices yet</p>
            ) : (
              <div className="space-y-3">
                {stats.recentInvoices.map((inv: AnyObj) => (
                  <Link key={inv._id} href={`/dashboard/invoices/${inv._id}`} className="block">
                    <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{inv.invoiceNumber}</p>
                        <p className="text-xs text-muted-foreground">{inv.clientId?.name || "—"}{inv.clientId?.company ? ` (${inv.clientId.company})` : ""}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-sm">{inv.currency} {inv.total?.toLocaleString()}</p>
                        <Badge className={`${STATUS_COLORS[inv.status] || ""} border-0 text-xs`}>{inv.status}</Badge>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Project Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Projects by Status</CardTitle>
          </CardHeader>
          <CardContent>
            {!stats?.projectsByStatus?.length ? (
              <p className="text-sm text-muted-foreground text-center py-6">No data</p>
            ) : (
              <div className="space-y-3">
                {stats.projectsByStatus.map((s: AnyObj) => {
                  const total = stats.projects || 1;
                  const pct = Math.round((s.count / total) * 100);
                  return (
                    <div key={s._id}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="capitalize">{STATUS_LABELS[s._id] || s._id}</span>
                        <span className="text-muted-foreground">{s.count} ({pct}%)</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Expense Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Expense Breakdown</CardTitle>
            <CardDescription>Top categories by spend</CardDescription>
          </CardHeader>
          <CardContent>
            {!stats?.expensesByCategory?.length ? (
              <p className="text-sm text-muted-foreground text-center py-6">No expenses yet</p>
            ) : (
              <div className="space-y-3">
                {stats.expensesByCategory.map((cat: AnyObj) => {
                  const maxVal = stats.expensesByCategory[0]?.total || 1;
                  const pct = Math.round((cat.total / maxVal) * 100);
                  return (
                    <div key={cat._id}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span>{cat._id}</span>
                        <span className="font-medium">₹{cat.total.toLocaleString()}</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-orange-500 h-2 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Monthly Revenue Trend */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Monthly Revenue (Last 6 Months)</CardTitle>
          </CardHeader>
          <CardContent>
            {!stats?.monthlyRevenue?.length ? (
              <p className="text-sm text-muted-foreground text-center py-6">No revenue data yet</p>
            ) : (
              <div className="flex items-end gap-3 h-40">
                {stats.monthlyRevenue.map((m: AnyObj) => {
                  const maxVal = Math.max(...stats.monthlyRevenue.map((r: AnyObj) => r.total));
                  const height = maxVal > 0 ? (m.total / maxVal) * 100 : 0;
                  const monthNames = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                  return (
                    <div key={`${m._id.year}-${m._id.month}`} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-xs font-medium">₹{(m.total / 1000).toFixed(0)}k</span>
                      <div className="w-full bg-muted rounded-t-md relative" style={{ height: "120px" }}>
                        <div
                          className="absolute bottom-0 w-full bg-primary rounded-t-md transition-all"
                          style={{ height: `${Math.max(height, 4)}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">{monthNames[m._id.month]}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
