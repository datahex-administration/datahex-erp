"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Plus,
  Receipt,
  Search,
  Loader2,
  CheckCircle,
  XCircle,
  TrendingDown,
  DollarSign,
  Clock,
  Filter,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Pagination } from "@/components/ui/pagination";
import { ExportButton } from "@/components/ui/export-button";
import { CurrencySelect } from "@/components/forms/currency-select";
import { extractCollectionData } from "@/lib/form-options";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyObj = Record<string, any>;

const CATEGORIES = [
  "Server & Hosting",
  "Software & Licenses",
  "Office Supplies",
  "Travel",
  "Marketing",
  "Salary",
  "Consulting",
  "Equipment",
  "Utilities",
  "Insurance",
  "Other",
];

const TYPE_LABELS: Record<string, string> = {
  general: "General",
  salary: "Salary",
  subscription: "Subscription",
  operational: "Operational",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<AnyObj[]>([]);
  const [projects, setProjects] = useState<AnyObj[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    category: "",
    description: "",
    amount: "",
    currency: "INR",
    date: format(new Date(), "yyyy-MM-dd"),
    projectId: "",
    type: "general",
    isRecurring: false,
    frequency: "monthly",
  });

  useEffect(() => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", "10");
    if (search) params.set("search", search);
    if (typeFilter !== "all") params.set("type", typeFilter);
    if (statusFilter !== "all") params.set("status", statusFilter);
    Promise.all([
      fetch(`/api/expenses?${params}`).then((r) => r.json()),
      fetch("/api/projects?limit=100").then((r) => r.json()),
    ]).then(([e, p]) => {
      setExpenses(e.data ?? (Array.isArray(e) ? e : []));
      setTotalPages(e.totalPages ?? 1);
      setTotal(e.total ?? 0);
      setProjects(extractCollectionData<AnyObj>(p));
      setLoading(false);
    });
  }, [page, search, typeFilter, statusFilter]);

  useEffect(() => { setPage(1); }, [search, typeFilter, statusFilter]);

  const handleCreate = async () => {
    setSaving(true);
    const payload: AnyObj = {
      category: form.category,
      description: form.description,
      amount: Number(form.amount),
      currency: form.currency,
      date: form.date,
      type: form.type,
      projectId: form.projectId || undefined,
    };
    if (form.isRecurring) {
      payload.recurring = { isRecurring: true, frequency: form.frequency };
    }

    const res = await fetch("/api/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      setDialogOpen(false);
      setForm({ category: "", description: "", amount: "", currency: "INR", date: format(new Date(), "yyyy-MM-dd"), projectId: "", type: "general", isRecurring: false, frequency: "monthly" });
      toast.success("Expense recorded");
      setPage(1);
    } else {
      const data = await res.json();
      toast.error(data.error || "Failed to add expense");
    }
    setSaving(false);
  };

  const updateStatus = async (id: string, status: string) => {
    const res = await fetch(`/api/expenses/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      const updated = await res.json();
      setExpenses((prev) => prev.map((e) => (e._id === id ? updated : e)));
      toast.success(`Expense ${status}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this expense?")) return;
    const res = await fetch(`/api/expenses/${id}`, { method: "DELETE" });
    if (res.ok) {
      setExpenses((prev) => prev.filter((e) => e._id !== id));
      toast.success("Expense deleted");
    }
  };

  const totalApproved = expenses.filter((e) => e.status === "approved").reduce((s, e) => s + e.amount, 0);
  const totalPending = expenses.filter((e) => e.status === "pending").reduce((s, e) => s + e.amount, 0);
  const thisMonth = expenses.filter((e) => {
    const d = new Date(e.date);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && e.status === "approved";
  }).reduce((s, e) => s + e.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Expenses</h1>
          <p className="text-muted-foreground mt-1">Track and manage business expenses</p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton data={expenses} columns={[
            { key: "description", label: "Description" },
            { key: "category", label: "Category" },
            { key: "type", label: "Type" },
            { key: "amount", label: "Amount" },
            { key: "currency", label: "Currency" },
            { key: "date", label: "Date" },
            { key: "status", label: "Status" },
          ]} filename="expenses" />
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger render={<Button><Plus className="h-4 w-4 mr-2" />Add Expense</Button>} />
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Record Expense</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Category *</Label>
                  <Select value={form.category} onValueChange={(v) => v && setForm({ ...form, category: v })}>
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={form.type} onValueChange={(v) => v && setForm({ ...form, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="salary">Salary</SelectItem>
                      <SelectItem value="subscription">Subscription</SelectItem>
                      <SelectItem value="operational">Operational</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Description *</Label>
                  <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Expense description" rows={2} />
                </div>
                <div className="space-y-2">
                  <Label>Amount *</Label>
                  <div className="flex gap-2">
                    <Input type="number" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="flex-1" />
                    <CurrencySelect
                      value={form.currency}
                      onValueChange={(value) => setForm({ ...form, currency: value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Date *</Label>
                  <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Project (optional)</Label>
                  <Select value={form.projectId} onValueChange={(v) => v && setForm({ ...form, projectId: v })}>
                    <SelectTrigger><SelectValue placeholder="Link to project" /></SelectTrigger>
                    <SelectContent>
                      {projects.map((p) => (
                        <SelectItem key={p._id} value={p._id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-2 flex items-center gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={form.isRecurring}
                      onChange={(e) => setForm({ ...form, isRecurring: e.target.checked })}
                      className="rounded"
                    />
                    Recurring expense
                  </label>
                  {form.isRecurring && (
                    <Select value={form.frequency} onValueChange={(v) => v && setForm({ ...form, frequency: v })}>
                      <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="yearly">Yearly</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
              <Button onClick={handleCreate} disabled={saving || !form.category || !form.description || !form.amount} className="w-full">
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Record Expense
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100"><TrendingDown className="h-5 w-5 text-red-600" /></div>
              <div>
                <p className="text-xs text-muted-foreground">This Month</p>
                <p className="text-lg font-bold">{thisMonth.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100"><DollarSign className="h-5 w-5 text-green-600" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Total Approved</p>
                <p className="text-lg font-bold">{totalApproved.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-100"><Clock className="h-5 w-5 text-yellow-600" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Pending Approval</p>
                <p className="text-lg font-bold">{totalPending.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search expenses..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={typeFilter} onValueChange={(v) => v && setTypeFilter(v)}>
          <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="general">General</SelectItem>
            <SelectItem value="salary">Salary</SelectItem>
            <SelectItem value="subscription">Subscription</SelectItem>
            <SelectItem value="operational">Operational</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => v && setStatusFilter(v)}>
          <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Expense List */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : expenses.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Receipt className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">{search || typeFilter !== "all" || statusFilter !== "all" ? "No matching expenses" : "No expenses yet"}</p>
          </CardContent>
        </Card>
      ) : (
        <>
        <div className="space-y-3">
          {expenses.map((exp) => (
            <Card key={exp._id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium truncate">{exp.description}</h3>
                      <Badge className={`${STATUS_COLORS[exp.status] || ""} border-0`}>{exp.status}</Badge>
                      <Badge variant="outline" className="text-xs">{TYPE_LABELS[exp.type] || exp.type}</Badge>
                      {exp.recurring?.isRecurring && (
                        <Badge variant="outline" className="text-xs">Recurring ({exp.recurring.frequency})</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{exp.category}</span>
                      {exp.projectId && <span>• {exp.projectId.name || exp.projectId}</span>}
                      <span>• {format(new Date(exp.date), "MMM d, yyyy")}</span>
                      {exp.approvedBy && <span>• Approved by {exp.approvedBy.name || exp.approvedBy.email}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <p className="font-bold text-lg">{exp.currency} {exp.amount?.toLocaleString()}</p>
                    <div className="flex gap-1">
                      {exp.status === "pending" && (
                        <>
                          <Button variant="outline" size="sm" className="text-green-600" onClick={() => updateStatus(exp._id, "approved")}>
                            <CheckCircle className="h-3 w-3" />
                          </Button>
                          <Button variant="outline" size="sm" className="text-red-600" onClick={() => updateStatus(exp._id, "rejected")}>
                            <XCircle className="h-3 w-3" />
                          </Button>
                        </>
                      )}
                      <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(exp._id)}>
                        <XCircle className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
