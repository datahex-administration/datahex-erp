"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Search,
  Loader2,
  Shield,
  ChevronLeft,
  ChevronRight,
  LogIn,
  LogOut,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  Activity,
} from "lucide-react";
import { format } from "date-fns";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyObj = Record<string, any>;

const MODULE_COLORS: Record<string, string> = {
  auth: "bg-blue-100 text-blue-800",
  employees: "bg-green-100 text-green-800",
  projects: "bg-purple-100 text-purple-800",
  invoices: "bg-emerald-100 text-emerald-800",
  expenses: "bg-orange-100 text-orange-800",
  leaves: "bg-yellow-100 text-yellow-800",
  clients: "bg-teal-100 text-teal-800",
  companies: "bg-indigo-100 text-indigo-800",
  users: "bg-pink-100 text-pink-800",
  subscriptions: "bg-cyan-100 text-cyan-800",
  proposals: "bg-violet-100 text-violet-800",
  salary: "bg-amber-100 text-amber-800",
};

const ACTION_ICONS: Record<string, React.ReactNode> = {
  login: <LogIn className="h-3.5 w-3.5" />,
  logout: <LogOut className="h-3.5 w-3.5" />,
  create: <Plus className="h-3.5 w-3.5" />,
  update: <Pencil className="h-3.5 w-3.5" />,
  delete: <Trash2 className="h-3.5 w-3.5" />,
  approve: <Check className="h-3.5 w-3.5" />,
  reject: <X className="h-3.5 w-3.5" />,
};

const MODULES = [
  "auth", "employees", "projects", "invoices", "expenses",
  "leaves", "clients", "companies", "users", "subscriptions",
  "proposals", "salary",
];

export default function AuditLogPage() {
  const [data, setData] = useState<{ logs: AnyObj[]; total: number }>({ logs: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [moduleFilter, setModuleFilter] = useState("all");
  const [search, setSearch] = useState("");
  const limit = 50;

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (moduleFilter !== "all") params.set("module", moduleFilter);
    if (search) params.set("action", search);

    fetch(`/api/audit-logs?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d.logs ? d : { logs: [], total: 0 });
        setLoading(false);
      });
  }, [page, moduleFilter, search]);

  const totalPages = Math.ceil(data.total / limit) || 1;

  const getActionIcon = (action: string) => {
    const key = Object.keys(ACTION_ICONS).find((k) => action.toLowerCase().includes(k));
    return key ? ACTION_ICONS[key] : <Activity className="h-3.5 w-3.5" />;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="h-6 w-6" /> Audit Log
        </h1>
        <p className="text-muted-foreground mt-1">Track all system actions and changes</p>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search actions..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>
        <Select value={moduleFilter} onValueChange={(v) => { if (v) { setModuleFilter(v); setPage(1); } }}>
          <SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Modules</SelectItem>
            {MODULES.map((m) => (
              <SelectItem key={m} value={m} className="capitalize">{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Activity Log</CardTitle>
            <p className="text-sm text-muted-foreground">{data.total} total entries</p>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : data.logs.length === 0 ? (
            <div className="text-center py-12">
              <Activity className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground">No audit logs found</p>
            </div>
          ) : (
            <ScrollArea>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[180px]">Time</TableHead>
                    <TableHead className="w-[150px]">User</TableHead>
                    <TableHead className="w-[120px]">Module</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.logs.map((log) => (
                    <TableRow key={log._id}>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(log.createdAt), "MMM d, yyyy HH:mm:ss")}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium">{log.userId?.name || "System"}</p>
                          <p className="text-xs text-muted-foreground">{log.userId?.email || ""}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${MODULE_COLORS[log.module] || "bg-gray-100 text-gray-800"} border-0 text-xs`}>
                          {log.module}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-sm">
                          {getActionIcon(log.action)}
                          <span>{log.action}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[300px] truncate">
                        {log.details || "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}

          {/* Pagination */}
          {data.total > limit && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
