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
  CreditCard,
  Search,
  Loader2,
  Eye,
  EyeOff,
  AlertTriangle,
  DollarSign,
  RefreshCw,
  Server,
  Globe,
  Mail,
  Shield,
  Cloud,
  Package,
  Trash2,
  Calendar,
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { toast } from "sonner";
import { Pagination } from "@/components/ui/pagination";
import { ExportButton } from "@/components/ui/export-button";
import { CurrencySelect } from "@/components/forms/currency-select";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyObj = Record<string, any>;

const TYPE_ICONS: Record<string, React.ReactNode> = {
  server: <Server className="h-4 w-4" />,
  gsuite: <Mail className="h-4 w-4" />,
  domain: <Globe className="h-4 w-4" />,
  cloudflare: <Cloud className="h-4 w-4" />,
  ssl: <Shield className="h-4 w-4" />,
  email: <Mail className="h-4 w-4" />,
  other: <Package className="h-4 w-4" />,
};

const TYPE_LABELS: Record<string, string> = {
  server: "Server",
  gsuite: "G Suite",
  domain: "Domain",
  cloudflare: "Cloudflare",
  ssl: "SSL",
  email: "Email",
  other: "Other",
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-800",
  expired: "bg-red-100 text-red-800",
  cancelled: "bg-gray-100 text-gray-800",
};

const EXPORT_COLUMNS = [
  { key: "name", label: "Name" },
  { key: "provider", label: "Provider" },
  { key: "type", label: "Type" },
  { key: "cost", label: "Cost" },
  { key: "currency", label: "Currency" },
  { key: "frequency", label: "Frequency" },
  { key: "status", label: "Status" },
  { key: "renewalDate", label: "Renewal Date" },
];

export default function SubscriptionsPage() {
  const [subs, setSubs] = useState<AnyObj[]>([]);
  const [projects, setProjects] = useState<AnyObj[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [showCreds, setShowCreds] = useState<Record<string, boolean>>({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [form, setForm] = useState({
    name: "",
    provider: "",
    type: "server",
    cost: "",
    currency: "USD",
    frequency: "monthly",
    startDate: format(new Date(), "yyyy-MM-dd"),
    renewalDate: "",
    autoRenew: true,
    credentials: "",
    projectId: "",
    notes: "",
  });

  useEffect(() => {
    fetch("/api/projects?limit=100").then((r) => r.json()).then((json) => setProjects(json.data || []));
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (typeFilter !== "all") params.set("type", typeFilter);
      params.set("page", String(page));
      params.set("limit", "10");
      fetch(`/api/subscriptions?${params}`)
        .then((r) => r.json())
        .then((json) => {
          setSubs(json.data || []);
          setTotalPages(json.totalPages || 1);
          setTotal(json.total || 0);
        })
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [search, typeFilter, page]);

  const resetForm = () => setForm({
    name: "", provider: "", type: "server", cost: "", currency: "USD",
    frequency: "monthly", startDate: format(new Date(), "yyyy-MM-dd"),
    renewalDate: "", autoRenew: true, credentials: "", projectId: "", notes: "",
  });

  const handleCreate = async () => {
    setSaving(true);
    const res = await fetch("/api/subscriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        cost: Number(form.cost),
        projectId: form.projectId || undefined,
        credentials: form.credentials || undefined,
        notes: form.notes || undefined,
      }),
    });
    if (res.ok) {
      const sub = await res.json();
      setSubs((prev) => [sub, ...prev]);
      setDialogOpen(false);
      resetForm();
      toast.success("Subscription added");
    } else {
      const data = await res.json();
      toast.error(data.error || "Failed to add subscription");
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this subscription?")) return;
    const res = await fetch(`/api/subscriptions/${id}`, { method: "DELETE" });
    if (res.ok) {
      setSubs((prev) => prev.filter((s) => s._id !== id));
      toast.success("Subscription deleted");
    }
  };

  const toggleStatus = async (id: string, current: string) => {
    const next = current === "active" ? "cancelled" : "active";
    const res = await fetch(`/api/subscriptions/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    if (res.ok) {
      const updated = await res.json();
      setSubs((prev) => prev.map((s) => (s._id === id ? updated : s)));
      toast.success(`Subscription ${next}`);
    }
  };

  const totalMonthlyCost = subs
    .filter((s) => s.status === "active")
    .reduce((sum, s) => sum + (s.frequency === "yearly" ? s.cost / 12 : s.cost), 0);
  const totalYearlyCost = subs
    .filter((s) => s.status === "active")
    .reduce((sum, s) => sum + (s.frequency === "monthly" ? s.cost * 12 : s.cost), 0);
  const upcomingRenewals = subs.filter((s) => {
    if (s.status !== "active") return false;
    const days = differenceInDays(new Date(s.renewalDate), new Date());
    return days >= 0 && days <= 30;
  }).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Subscriptions</h1>
          <p className="text-muted-foreground mt-1">{total} subscription{total !== 1 ? "s" : ""} total</p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton data={subs} columns={EXPORT_COLUMNS} filename="subscriptions" />
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger render={<Button><Plus className="h-4 w-4 mr-2" />Add Subscription</Button>} />
          <DialogContent className="sm:max-w-lg">
            <DialogHeader><DialogTitle>Add Subscription</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label>Name *</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g., AWS EC2 Instance" />
                </div>
                <div className="space-y-2">
                  <Label>Provider *</Label>
                  <Input value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })} placeholder="e.g., Amazon Web Services" />
                </div>
                <div className="space-y-2">
                  <Label>Type *</Label>
                  <Select value={form.type} onValueChange={(v) => v && setForm({ ...form, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(TYPE_LABELS).map(([k, l]) => (
                        <SelectItem key={k} value={k}>{l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Cost *</Label>
                  <div className="flex gap-2">
                    <Input type="number" min="0" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} className="flex-1" />
                    <CurrencySelect
                      value={form.currency}
                      onValueChange={(value) => setForm({ ...form, currency: value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Frequency *</Label>
                  <Select value={form.frequency} onValueChange={(v) => v && setForm({ ...form, frequency: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Start Date *</Label>
                  <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Renewal Date *</Label>
                  <Input type="date" value={form.renewalDate} onChange={(e) => setForm({ ...form, renewalDate: e.target.value })} />
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
                <div className="space-y-2 sm:col-span-2">
                  <Label>Credentials (encrypted)</Label>
                  <Textarea value={form.credentials} onChange={(e) => setForm({ ...form, credentials: e.target.value })} placeholder="Login details, API keys, etc." rows={2} />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Notes</Label>
                  <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Additional notes..." rows={2} />
                </div>
                <div className="sm:col-span-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={form.autoRenew} onChange={(e) => setForm({ ...form, autoRenew: e.target.checked })} className="rounded" />
                    Auto-renew
                  </label>
                </div>
              </div>
              <Button onClick={handleCreate} disabled={saving || !form.name || !form.provider || !form.cost || !form.renewalDate} className="w-full">
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Add Subscription
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
              <div className="p-2 rounded-lg bg-blue-100"><DollarSign className="h-5 w-5 text-blue-600" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Monthly Cost</p>
                <p className="text-lg font-bold">${Math.round(totalMonthlyCost).toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100"><RefreshCw className="h-5 w-5 text-purple-600" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Yearly Cost</p>
                <p className="text-lg font-bold">${Math.round(totalYearlyCost).toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-100"><AlertTriangle className="h-5 w-5 text-orange-600" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Renewing in 30 days</p>
                <p className="text-lg font-bold">{upcomingRenewals}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search subscriptions..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
        </div>
        <Select value={typeFilter} onValueChange={(v) => v && setTypeFilter(v)}>
          <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {Object.entries(TYPE_LABELS).map(([k, l]) => (
              <SelectItem key={k} value={k}>{l}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Subscription List */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : subs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <CreditCard className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">{search || typeFilter !== "all" ? "No matching subscriptions" : "No subscriptions yet"}</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-3">
          {subs.map((sub) => {
            const daysToRenewal = differenceInDays(new Date(sub.renewalDate), new Date());
            const isUrgent = sub.status === "active" && daysToRenewal >= 0 && daysToRenewal <= 7;
            const isUpcoming = sub.status === "active" && daysToRenewal > 7 && daysToRenewal <= 30;

            return (
              <Card key={sub._id} className={isUrgent ? "border-red-300 bg-red-50/30" : isUpcoming ? "border-orange-200" : ""}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="p-2 rounded-lg bg-muted shrink-0">
                        {TYPE_ICONS[sub.type] || <Package className="h-4 w-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold truncate">{sub.name}</h3>
                          <Badge className={`${STATUS_COLORS[sub.status] || ""} border-0`}>{sub.status}</Badge>
                          <Badge variant="outline" className="text-xs">{TYPE_LABELS[sub.type]}</Badge>
                          {sub.autoRenew && <Badge variant="outline" className="text-xs">Auto-renew</Badge>}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>{sub.provider}</span>
                          {sub.projectId && <span>• {sub.projectId.name}</span>}
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Renews {format(new Date(sub.renewalDate), "MMM d, yyyy")}
                            {isUrgent && <span className="text-red-600 font-medium ml-1">({daysToRenewal}d)</span>}
                            {isUpcoming && <span className="text-orange-600 font-medium ml-1">({daysToRenewal}d)</span>}
                          </span>
                        </div>
                        {sub.credentials && (
                          <div className="mt-1">
                            <button
                              onClick={() => setShowCreds((prev) => ({ ...prev, [sub._id]: !prev[sub._id] }))}
                              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                            >
                              {showCreds[sub._id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                              {showCreds[sub._id] ? "Hide" : "Show"} credentials
                            </button>
                            {showCreds[sub._id] && (
                              <pre className="text-xs bg-muted p-2 rounded mt-1 whitespace-pre-wrap">{sub.credentials}</pre>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <p className="font-bold text-lg">{sub.currency} {sub.cost?.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">/{sub.frequency}</p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleStatus(sub._id, sub.status)}
                          className={sub.status === "active" ? "text-orange-600" : "text-green-600"}
                        >
                          {sub.status === "active" ? "Cancel" : "Activate"}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(sub._id)}>
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
        <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
