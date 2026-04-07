"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Plus, FileText, Search, Loader2, Send, CheckCircle,
  DollarSign, TrendingUp, Clock, AlertTriangle, Pencil, Download,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Pagination } from "@/components/ui/pagination";
import { ExportButton } from "@/components/ui/export-button";
import { useAuth } from "@/components/providers/auth-provider";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyObj = Record<string, any>;

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800",
  sent: "bg-blue-100 text-blue-800",
  paid: "bg-green-100 text-green-800",
  overdue: "bg-red-100 text-red-800",
  cancelled: "bg-orange-100 text-orange-800",
};

export default function InvoicesPage() {
  const { hasPermission } = useAuth();
  const [invoices, setInvoices] = useState<AnyObj[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", "10");
    if (search) params.set("search", search);
    if (statusFilter !== "all") params.set("status", statusFilter);
    try {
      const res = await fetch(`/api/invoices?${params}`);
      if (res.ok) {
        const json = await res.json();
        setInvoices(json.data ?? []);
        setTotalPages(json.totalPages ?? 1);
        setTotal(json.total ?? 0);
      }
    } catch {
      toast.error("Failed to load invoices");
    }
    setLoading(false);
  }, [page, search, statusFilter]);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  useEffect(() => { setPage(1); }, [search, statusFilter]);

  const updateStatus = async (id: string, status: string) => {
    const res = await fetch(`/api/invoices/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      toast.success(`Invoice marked as ${status}`);
      fetchInvoices();
    } else {
      toast.error("Failed to update status");
    }
  };

  const summary = {
    collected: invoices.filter((i) => i.status === "paid").reduce((s, i) => s + (i.total || 0), 0),
    pending: invoices.filter((i) => i.status === "sent").reduce((s, i) => s + (i.total || 0), 0),
    overdue: invoices.filter((i) => i.status === "overdue").reduce((s, i) => s + (i.total || 0), 0),
    drafts: invoices.filter((i) => i.status === "draft").length,
  };

  const fmtCurrency = (v: number, c = "INR") =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: c }).format(v);

  const downloadInvoice = (invoiceId: string) => {
    const w = window.open(`/api/invoices/${invoiceId}/pdf`, "_blank");
    if (w) {
      w.addEventListener("afterprint", () => w.close());
      w.onload = () => setTimeout(() => w.print(), 400);
    }
  };

  const exportColumns = [
    { key: "invoiceNumber", label: "Invoice #" },
    { key: "clientId.name", label: "Client" },
    { key: "type", label: "Type" },
    { key: "status", label: "Status" },
    { key: "issueDate", label: "Issue Date" },
    { key: "dueDate", label: "Due Date" },
    { key: "subtotal", label: "Subtotal" },
    { key: "tax", label: "Tax" },
    { key: "total", label: "Total" },
    { key: "currency", label: "Currency" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6" /> Invoices
          </h1>
          <p className="text-muted-foreground text-sm">{total} total invoices</p>
        </div>
        <div className="flex items-center gap-2">
          {hasPermission("reports:export") && (
            <ExportButton data={invoices} columns={exportColumns} filename="invoices" />
          )}
          {hasPermission("invoices:create") && (
            <Link href="/dashboard/invoices/new">
              <Button><Plus className="h-4 w-4 mr-1" /> New Invoice</Button>
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100"><DollarSign className="h-5 w-5 text-green-600" /></div>
            <div>
              <p className="text-sm text-muted-foreground">Collected</p>
              <p className="text-lg font-bold">{fmtCurrency(summary.collected)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100"><TrendingUp className="h-5 w-5 text-blue-600" /></div>
            <div>
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="text-lg font-bold">{fmtCurrency(summary.pending)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-100"><AlertTriangle className="h-5 w-5 text-red-600" /></div>
            <div>
              <p className="text-sm text-muted-foreground">Overdue</p>
              <p className="text-lg font-bold">{fmtCurrency(summary.overdue)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gray-100"><Clock className="h-5 w-5 text-gray-600" /></div>
            <div>
              <p className="text-sm text-muted-foreground">Drafts</p>
              <p className="text-lg font-bold">{summary.drafts}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by invoice number..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={(v) => v && setStatusFilter(v)}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : invoices.length === 0 ? (
        <Card><CardContent className="p-12 text-center text-muted-foreground">No invoices found.</CardContent></Card>
      ) : (
        <>
          <div className="space-y-3">
            {invoices.map((inv) => (
              <Card key={inv._id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Link href={`/dashboard/invoices/${inv._id}`} className="font-semibold hover:underline">
                          {inv.invoiceNumber}
                        </Link>
                        <Badge className={STATUS_COLORS[inv.status] || ""}>{inv.status}</Badge>
                        <Badge variant="outline" className="text-xs">{inv.type}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {inv.clientId?.name || "Unknown Client"}
                        {inv.projectId?.name && ` · ${inv.projectId.name}`}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Issued {inv.issueDate ? format(new Date(inv.issueDate), "MMM d, yyyy") : "—"}
                        {" · "}Due {inv.dueDate ? format(new Date(inv.dueDate), "MMM d, yyyy") : "—"}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-lg font-bold">{fmtCurrency(inv.total || 0, inv.currency)}</p>
                        {inv.tax > 0 && (
                          <p className="text-xs text-muted-foreground">Tax: {fmtCurrency(inv.tax, inv.currency)}</p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" title="Download PDF" onClick={() => downloadInvoice(inv._id)}>
                          <Download className="h-3 w-3" />
                        </Button>
                        {hasPermission("invoices:update") && (inv.status === "draft" || inv.status === "sent") && (
                          <Link href={`/dashboard/invoices/${inv._id}/edit`}>
                            <Button size="sm" variant="ghost">
                              <Pencil className="h-3 w-3" />
                            </Button>
                          </Link>
                        )}
                        {hasPermission("invoices:update") && inv.status === "draft" && (
                          <Button size="sm" variant="outline" onClick={() => updateStatus(inv._id, "sent")}>
                            <Send className="h-3 w-3 mr-1" /> Send
                          </Button>
                        )}
                        {hasPermission("invoices:update") && inv.status === "sent" && (
                          <Button size="sm" variant="outline" className="text-green-600" onClick={() => updateStatus(inv._id, "paid")}>
                            <CheckCircle className="h-3 w-3 mr-1" /> Paid
                          </Button>
                        )}
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
