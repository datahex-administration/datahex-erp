"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Combobox } from "@/components/ui/combobox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Textarea } from "@/components/ui/textarea";
import { Pagination } from "@/components/ui/pagination";
import { ExportButton } from "@/components/ui/export-button";
import { extractCollectionData } from "@/lib/form-options";
import { Bug, Plus, Search, AlertTriangle, CheckCircle2, Clock, CircleDot, FileDown } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

/* ─── types ─── */

interface ProjectOption {
  _id: string;
  name: string;
}

interface EmployeeOption {
  _id: string;
  name: string;
  employeeId: string;
  designation: string;
}

interface BugData {
  _id: string;
  title: string;
  description?: string;
  stepsToReproduce?: string;
  priority: string;
  status: string;
  environment?: string;
  projectId?: { _id: string; name: string };
  assignedTo?: { _id: string; name: string; employeeId: string; designation: string };
  reportedBy?: { _id: string; name: string; email: string };
  resolvedAt?: string;
  closedAt?: string;
  createdAt: string;
  updatedAt: string;
}

/* ─── constants ─── */

const PRIORITY_COLORS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  low: "secondary",
  medium: "default",
  high: "outline",
  critical: "destructive",
};

const STATUS_COLORS: Record<string, string> = {
  open: "bg-red-100 text-red-800 border-0",
  in_progress: "bg-blue-100 text-blue-800 border-0",
  resolved: "bg-green-100 text-green-800 border-0",
  closed: "bg-gray-100 text-gray-800 border-0",
  reopened: "bg-yellow-100 text-yellow-800 border-0",
};

const STATUS_LABELS: Record<string, string> = {
  open: "Open",
  in_progress: "In Progress",
  resolved: "Resolved",
  closed: "Closed",
  reopened: "Reopened",
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  open: <CircleDot className="h-3.5 w-3.5" />,
  in_progress: <Clock className="h-3.5 w-3.5" />,
  resolved: <CheckCircle2 className="h-3.5 w-3.5" />,
  closed: <CheckCircle2 className="h-3.5 w-3.5" />,
  reopened: <AlertTriangle className="h-3.5 w-3.5" />,
};

/* ─── component ─── */

export default function BugReportingPage() {
  const { user, hasPermission } = useAuth();
  const [bugs, setBugs] = useState<BugData[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Dropdown data
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBug, setEditingBug] = useState<BugData | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    stepsToReproduce: "",
    priority: "medium",
    projectId: "",
    assignedTo: "",
    environment: "",
  });

  // Detail dialog
  const [detailBug, setDetailBug] = useState<BugData | null>(null);

  /* ─── data fetching ─── */

  useEffect(() => {
    fetch("/api/projects?limit=200")
      .then((r) => r.json())
      .then((json) => setProjects(extractCollectionData<ProjectOption>(json)));
    fetch("/api/employees?limit=200&status=active")
      .then((r) => r.json())
      .then((json) => setEmployees(extractCollectionData<EmployeeOption>(json)));
  }, []);

  const fetchBugs = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", "20");
    if (search) params.set("search", search);
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (priorityFilter !== "all") params.set("priority", priorityFilter);
    if (projectFilter !== "all") params.set("projectId", projectFilter);
    if (assigneeFilter !== "all") params.set("assignedTo", assigneeFilter);
    if (dateFrom) params.set("from", dateFrom);
    if (dateTo) params.set("to", dateTo);

    const res = await fetch(`/api/bugs?${params}`);
    if (res.ok) {
      const json = await res.json();
      setBugs(json.data ?? []);
      setTotalPages(json.totalPages ?? 1);
      setTotal(json.total ?? 0);
    }
    setLoading(false);
  }, [page, search, statusFilter, priorityFilter, projectFilter, assigneeFilter, dateFrom, dateTo]);

  useEffect(() => { setPage((prev) => prev === 1 ? prev : 1); }, [search, statusFilter, priorityFilter, projectFilter, assigneeFilter, dateFrom, dateTo]);

  useEffect(() => {
    const timer = setTimeout(fetchBugs, 300);
    return () => clearTimeout(timer);
  }, [fetchBugs]);

  /* ─── dialog handlers ─── */

  const openCreate = () => {
    setEditingBug(null);
    setForm({ title: "", description: "", stepsToReproduce: "", priority: "medium", projectId: "", assignedTo: "", environment: "" });
    setDialogOpen(true);
  };

  const openEdit = (bug: BugData) => {
    setEditingBug(bug);
    setForm({
      title: bug.title,
      description: bug.description || "",
      stepsToReproduce: bug.stepsToReproduce || "",
      priority: bug.priority,
      projectId: bug.projectId?._id || "",
      assignedTo: bug.assignedTo?._id || "",
      environment: bug.environment || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) return toast.error("Title is required");
    if (!form.projectId) return toast.error("Project is required");

    setSaving(true);
    const url = editingBug ? `/api/bugs/${editingBug._id}` : "/api/bugs";
    const method = editingBug ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title,
        description: form.description,
        stepsToReproduce: form.stepsToReproduce,
        priority: form.priority,
        projectId: form.projectId,
        assignedTo: form.assignedTo || undefined,
        environment: form.environment,
      }),
    });

    if (res.ok) {
      toast.success(editingBug ? "Bug updated" : "Bug reported");
      setDialogOpen(false);
      fetchBugs();
    } else {
      const data = await res.json().catch(() => ({ error: "Failed" }));
      toast.error(data.error || "Failed to save bug");
    }
    setSaving(false);
  };

  /* ─── status update (inline) ─── */

  const handleStatusChange = async (bugId: string, newStatus: string) => {
    // Avoid re-fetching if the status hasn't actually changed
    const current = bugs.find((b) => b._id === bugId);
    if (current?.status === newStatus) return;

    const res = await fetch(`/api/bugs/${bugId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      const updated = await res.json();
      toast.success(`Status updated to ${STATUS_LABELS[newStatus]}`);
      if (detailBug?._id === bugId) {
        setDetailBug(updated);
      }
      fetchBugs();
    } else {
      toast.error("Failed to update status");
    }
  };

  const handleDelete = async (bug: BugData) => {
    if (!confirm(`Delete bug "${bug.title}"?`)) return;
    const res = await fetch(`/api/bugs/${bug._id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Bug deleted");
      fetchBugs();
    } else {
      toast.error("Failed to delete");
    }
  };

  /* ─── summary counts ─── */

  const openCount = bugs.filter((b) => b.status === "open" || b.status === "reopened").length;
  const inProgressCount = bugs.filter((b) => b.status === "in_progress").length;
  const resolvedCount = bugs.filter((b) => b.status === "resolved" || b.status === "closed").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Bug Reporting</h1>
          <p className="text-muted-foreground mt-1">{total} bug{total !== 1 ? "s" : ""} tracked</p>
        </div>
        <div className="flex items-center gap-2">
          {hasPermission("reports:export") && (
            <ExportButton
              data={bugs.map((b) => ({
                title: b.title,
                project: b.projectId?.name || "",
                priority: b.priority,
                status: STATUS_LABELS[b.status] || b.status,
                assignedTo: b.assignedTo?.name || "Unassigned",
                reportedBy: b.reportedBy?.name || "",
                environment: b.environment || "",
                created: b.createdAt ? format(new Date(b.createdAt), "dd MMM yyyy") : "",
              }))}
              columns={[
                { key: "title", label: "Title" },
                { key: "project", label: "Project" },
                { key: "priority", label: "Priority" },
                { key: "status", label: "Status" },
                { key: "assignedTo", label: "Assigned To" },
                { key: "reportedBy", label: "Reported By" },
                { key: "environment", label: "Environment" },
                { key: "created", label: "Created" },
              ]}
              filename="bug-reports"
            />
          )}
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" /> Report Bug
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <Bug className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total</span>
            </div>
            <p className="text-2xl font-bold mt-1">{total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <CircleDot className="h-4 w-4 text-red-500" />
              <span className="text-sm text-muted-foreground">Open</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-red-600">{openCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-muted-foreground">In Progress</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-blue-600">{inProgressCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-sm text-muted-foreground">Resolved</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-green-600">{resolvedCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search bugs..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => v && setStatusFilter(v)}>
            <SelectTrigger className="w-[150px]">
              <SelectValue>{statusFilter === "all" ? "All Status" : STATUS_LABELS[statusFilter]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
              <SelectItem value="reopened">Reopened</SelectItem>
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={(v) => v && setPriorityFilter(v)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue>{priorityFilter === "all" ? "All Priority" : priorityFilter.charAt(0).toUpperCase() + priorityFilter.slice(1)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Select value={projectFilter} onValueChange={(v) => v && setProjectFilter(v)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue>{projectFilter === "all" ? "All Projects" : projects.find((p) => p._id === projectFilter)?.name || "Project"}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p._id} value={p._id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={assigneeFilter} onValueChange={(v) => v && setAssigneeFilter(v)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue>{assigneeFilter === "all" ? "All Assignees" : employees.find((e) => e._id === assigneeFilter)?.name || "Employee"}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Assignees</SelectItem>
              {employees.map((e) => (
                <SelectItem key={e._id} value={e._id}>{e.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-[160px]"
            placeholder="From date"
          />
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-[160px]"
            placeholder="To date"
          />
        </div>
      </div>

      {/* Bug Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bug className="h-5 w-5" /> Bug Reports
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground py-8 text-center">Loading...</p>
          ) : bugs.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center">No bugs found</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Bug</TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Assigned To</TableHead>
                      <TableHead>Reported</TableHead>
                      <TableHead className="w-[180px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bugs.map((bug) => (
                      <TableRow key={bug._id} className="cursor-pointer" onClick={() => setDetailBug(bug)}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{bug.title}</p>
                            {bug.description && (
                              <p className="text-xs text-muted-foreground line-clamp-1">{bug.description}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {bug.projectId?.name || "—"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={PRIORITY_COLORS[bug.priority]} className="capitalize">
                            {bug.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${STATUS_COLORS[bug.status]} gap-1`}>
                            {STATUS_ICONS[bug.status]}
                            {STATUS_LABELS[bug.status]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {bug.assignedTo?.name || <span className="text-muted-foreground">Unassigned</span>}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm">{format(new Date(bug.createdAt), "dd MMM yyyy")}</p>
                            <p className="text-xs text-muted-foreground">{bug.reportedBy?.name}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <Select
                              value={bug.status}
                              onValueChange={(v) => v && handleStatusChange(bug._id, v)}
                            >
                              <SelectTrigger className="h-8 w-[120px] text-xs">
                                <SelectValue>{STATUS_LABELS[bug.status]}</SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="open">Open</SelectItem>
                                <SelectItem value="in_progress">In Progress</SelectItem>
                                <SelectItem value="resolved">Resolved</SelectItem>
                                <SelectItem value="closed">Closed</SelectItem>
                                <SelectItem value="reopened">Reopened</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              title="Download Bug Report"
                              onClick={() => window.open(`/api/bugs/${bug._id}/report`, "_blank")}
                            >
                              <FileDown className="h-4 w-4" />
                            </Button>
                            {(user?.role === "super_admin" || user?.role === "manager" || user?.role === "customer_success") && (
                              <>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(bug)}>
                                  <span className="text-xs">✏️</span>
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(bug)}>
                                  <span className="text-xs text-destructive">🗑</span>
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
            </>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingBug ? "Edit Bug" : "Report a Bug"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Short summary of the bug"
              />
            </div>

            <div className="space-y-2">
              <Label>Project *</Label>
              <Combobox
                options={projects.map((p) => ({ value: p._id, label: p.name }))}
                value={form.projectId}
                onValueChange={(v) => setForm({ ...form, projectId: v })}
                placeholder="Select project"
                searchPlaceholder="Search projects..."
                emptyText="No projects found"
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Describe the bug in detail"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Steps to Reproduce</Label>
              <Textarea
                value={form.stepsToReproduce}
                onChange={(e) => setForm({ ...form, stepsToReproduce: e.target.value })}
                placeholder="1. Go to...&#10;2. Click on...&#10;3. See error"
                rows={3}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={(v) => v && setForm({ ...form, priority: v })}>
                  <SelectTrigger>
                    <SelectValue>{form.priority.charAt(0).toUpperCase() + form.priority.slice(1)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Environment</Label>
                <Select value={form.environment || "none"} onValueChange={(v) => v && setForm({ ...form, environment: v === "none" ? "" : v })}>
                  <SelectTrigger>
                    <SelectValue>{form.environment || "Select environment"}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Not specified</SelectItem>
                    <SelectItem value="Production">Production</SelectItem>
                    <SelectItem value="Staging">Staging</SelectItem>
                    <SelectItem value="Development">Development</SelectItem>
                    <SelectItem value="Testing">Testing</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Assign To</Label>
              <Combobox
                options={employees.map((e) => ({ value: e._id, label: `${e.name} (${e.designation})` }))}
                value={form.assignedTo}
                onValueChange={(v) => setForm({ ...form, assignedTo: v })}
                placeholder="Select employee (optional)"
                searchPlaceholder="Search employees..."
                emptyText="No employees found"
              />
            </div>

            <Button onClick={handleSave} className="w-full" disabled={saving}>
              {saving ? "Saving..." : editingBug ? "Update Bug" : "Submit Bug Report"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={!!detailBug} onOpenChange={(open) => !open && setDetailBug(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bug className="h-5 w-5" />
              Bug Details
            </DialogTitle>
          </DialogHeader>
          {detailBug && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg">{detailBug.title}</h3>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant={PRIORITY_COLORS[detailBug.priority]} className="capitalize">
                    {detailBug.priority}
                  </Badge>
                  <Badge className={`${STATUS_COLORS[detailBug.status]} gap-1`}>
                    {STATUS_ICONS[detailBug.status]}
                    {STATUS_LABELS[detailBug.status]}
                  </Badge>
                  {detailBug.environment && (
                    <Badge variant="outline">{detailBug.environment}</Badge>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Project:</span>
                  <p className="font-medium">{detailBug.projectId?.name || "—"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Assigned To:</span>
                  <p className="font-medium">{detailBug.assignedTo?.name || "Unassigned"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Reported By:</span>
                  <p className="font-medium">{detailBug.reportedBy?.name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Created:</span>
                  <p className="font-medium">{format(new Date(detailBug.createdAt), "dd MMM yyyy, h:mm a")}</p>
                </div>
                {detailBug.resolvedAt && (
                  <div>
                    <span className="text-muted-foreground">Resolved:</span>
                    <p className="font-medium">{format(new Date(detailBug.resolvedAt), "dd MMM yyyy, h:mm a")}</p>
                  </div>
                )}
              </div>

              {detailBug.description && (
                <div>
                  <span className="text-sm text-muted-foreground">Description:</span>
                  <p className="text-sm mt-1 whitespace-pre-wrap">{detailBug.description}</p>
                </div>
              )}

              {detailBug.stepsToReproduce && (
                <div>
                  <span className="text-sm text-muted-foreground">Steps to Reproduce:</span>
                  <p className="text-sm mt-1 whitespace-pre-wrap bg-muted/50 rounded p-3">{detailBug.stepsToReproduce}</p>
                </div>
              )}

              {/* Inline status update */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t">
                <div className="flex items-center gap-2">
                  <Label className="text-sm">Update Status:</Label>
                  <Select
                    value={detailBug.status}
                    onValueChange={(v) => v && handleStatusChange(detailBug._id, v)}
                  >
                    <SelectTrigger className="w-[160px]">
                      <SelectValue>{STATUS_LABELS[detailBug.status]}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                      <SelectItem value="reopened">Reopened</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(`/api/bugs/${detailBug._id}/report`, "_blank")}
                >
                  <FileDown className="mr-2 h-4 w-4" /> Download
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
