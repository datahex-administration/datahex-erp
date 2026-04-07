"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Loader2,
  Send,
  Mail,
  MessageCircle,
  CheckCircle,
  XCircle,
  Printer,
  Edit,
  Trash2,
  Download,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyObj = Record<string, any>;

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800",
  sent: "bg-blue-100 text-blue-800",
  paid: "bg-green-100 text-green-800",
  overdue: "bg-red-100 text-red-800",
  cancelled: "bg-gray-200 text-gray-600",
};

export default function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [invoice, setInvoice] = useState<AnyObj | null>(null);
  const [loading, setLoading] = useState(true);
  const [dispatching, setDispatching] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/invoices/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setInvoice(data);
        setLoading(false);
      });
  }, [id]);

  const updateStatus = async (status: string) => {
    const res = await fetch(`/api/invoices/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      const updated = await res.json();
      setInvoice(updated);
      toast.success(`Invoice marked as ${status}`);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this invoice?")) return;
    const res = await fetch(`/api/invoices/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Invoice deleted");
      router.push("/dashboard/invoices");
    } else {
      const data = await res.json();
      toast.error(data.error || "Failed to delete");
    }
  };

  const downloadInvoice = () => {
    const w = window.open(`/api/invoices/${id}/pdf`, "_blank");
    if (w) {
      w.addEventListener("afterprint", () => w.close());
      w.onload = () => setTimeout(() => w.print(), 400);
    }
  };

  const dispatchInvoice = async (channels: Array<"email" | "whatsapp">, key: string) => {
    setDispatching(key);

    const res = await fetch(`/api/invoices/${id}/dispatch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channels }),
    });

    const data = await res.json();

    if (res.ok) {
      setInvoice(data.invoice || invoice);
      toast.success(data.message || "Invoice sent successfully");
    } else {
      toast.error(data.error || "Failed to send invoice");
    }

    setDispatching(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="text-center py-16">
        <h2 className="text-xl font-semibold">Invoice not found</h2>
        <Link href="/dashboard/invoices"><Button className="mt-4">Back to Invoices</Button></Link>
      </div>
    );
  }

  const isOverdue = invoice.status === "sent" && new Date(invoice.dueDate) < new Date();
  const displayStatus = isOverdue ? "overdue" : invoice.status;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/invoices">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{invoice.invoiceNumber}</h1>
              <Badge className={`${STATUS_COLORS[displayStatus] || ""} border-0`}>{displayStatus}</Badge>
              <Badge variant="outline">{invoice.type}</Badge>
            </div>
            <p className="text-muted-foreground mt-1">
              {invoice.clientId?.name || "—"}
              {invoice.clientId?.company ? ` — ${invoice.clientId.company}` : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => dispatchInvoice(["email"], "email")}
            disabled={dispatching !== null || invoice.status === "cancelled"}
          >
            {dispatching === "email" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Mail className="h-4 w-4 mr-1" />
            )}
            Email
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => dispatchInvoice(["whatsapp"], "whatsapp")}
            disabled={dispatching !== null || invoice.status === "cancelled"}
          >
            {dispatching === "whatsapp" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MessageCircle className="h-4 w-4 mr-1" />
            )}
            WhatsApp
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => dispatchInvoice(["email", "whatsapp"], "both")}
            disabled={dispatching !== null || invoice.status === "cancelled"}
          >
            {dispatching === "both" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-1" />
            )}
            Send Both
          </Button>
          {invoice.status === "draft" && (
            <>
              <Button variant="outline" size="sm" onClick={() => updateStatus("sent")}>
                <Send className="h-4 w-4 mr-1" />Mark Sent
              </Button>
              <Button variant="outline" size="sm" className="text-destructive" onClick={handleDelete}>
                <Trash2 className="h-4 w-4 mr-1" />Delete
              </Button>
            </>
          )}
          {(invoice.status === "sent" || isOverdue) && (
            <>
              <Button variant="outline" size="sm" className="text-green-600" onClick={() => updateStatus("paid")}>
                <CheckCircle className="h-4 w-4 mr-1" />Mark Paid
              </Button>
              <Button variant="outline" size="sm" className="text-destructive" onClick={() => updateStatus("cancelled")}>
                <XCircle className="h-4 w-4 mr-1" />Cancel
              </Button>
            </>
          )}
          {(invoice.status === "draft" || invoice.status === "sent") && (
            <Link href={`/dashboard/invoices/${id}/edit`}>
              <Button variant="outline" size="sm">
                <Edit className="h-4 w-4 mr-1" />Edit
              </Button>
            </Link>
          )}
          <Button variant="outline" size="sm" onClick={downloadInvoice}>
            <Download className="h-4 w-4 mr-1" />Download
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-1" />Print
          </Button>
        </div>
      </div>

      {/* Invoice Card (printable) */}
      <Card className="print:shadow-none print:border-0">
        <CardContent className="p-8">
          {/* Header */}
          <div className="flex justify-between mb-8">
            <div>
              {invoice.companyId?.logo && (
                <img
                  src={invoice.companyId.logo}
                  alt={invoice.companyId.name}
                  className="h-12 w-auto mb-3 object-contain"
                />
              )}
              <h2 className="text-2xl font-bold text-primary">INVOICE</h2>
              <p className="text-lg font-semibold mt-1">{invoice.invoiceNumber}</p>
              {invoice.companyId && (
                <div className="text-sm text-muted-foreground mt-2">
                  <p className="font-medium text-foreground">{invoice.companyId.name}</p>
                  {invoice.companyId.billingAddress && <p className="whitespace-pre-line">{invoice.companyId.billingAddress}</p>}
                  {!invoice.companyId.billingAddress && invoice.companyId.address && <p className="whitespace-pre-line">{invoice.companyId.address}</p>}
                  {invoice.companyId.gstNumber && <p>GST: {invoice.companyId.gstNumber}</p>}
                  {invoice.companyId.foreignRegistration && <p>Reg: {invoice.companyId.foreignRegistration}</p>}
                </div>
              )}
            </div>
            <div className="text-right text-sm">
              <div className="space-y-1">
                <p><span className="text-muted-foreground">Issue Date:</span> {format(new Date(invoice.issueDate), "MMM d, yyyy")}</p>
                <p><span className="text-muted-foreground">Due Date:</span> {format(new Date(invoice.dueDate), "MMM d, yyyy")}</p>
                {invoice.paidAt && (
                  <p><span className="text-muted-foreground">Paid:</span> {format(new Date(invoice.paidAt), "MMM d, yyyy")}</p>
                )}
              </div>
            </div>
          </div>

          {/* Bill To */}
          <div className="mb-8">
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Bill To</p>
            <p className="font-medium">{invoice.clientId?.name}</p>
            {invoice.clientId?.company && <p className="text-sm text-muted-foreground">{invoice.clientId.company}</p>}
            {invoice.clientId?.email && <p className="text-sm text-muted-foreground">{invoice.clientId.email}</p>}
            {invoice.clientId?.address && <p className="text-sm text-muted-foreground">{invoice.clientId.address}</p>}
          </div>

          {invoice.projectId && (
            <p className="text-sm text-muted-foreground mb-4">
              Project: <span className="font-medium text-foreground">{invoice.projectId.name}</span>
            </p>
          )}

          {/* Line Items Table */}
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left p-3 font-medium">Description</th>
                  <th className="text-right p-3 font-medium w-20">Qty</th>
                  <th className="text-right p-3 font-medium w-28">Rate</th>
                  <th className="text-right p-3 font-medium w-32">Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items?.map((item: AnyObj, i: number) => (
                  <tr key={i} className="border-t">
                    <td className="p-3">{item.description}</td>
                    <td className="p-3 text-right">{item.quantity}</td>
                    <td className="p-3 text-right">{invoice.currency} {item.rate?.toLocaleString()}</td>
                    <td className="p-3 text-right">{invoice.currency} {item.amount?.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="mt-6 ml-auto max-w-xs space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{invoice.currency} {invoice.subtotal?.toLocaleString()}</span>
            </div>
            {invoice.tax > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax ({invoice.taxPercent}%)</span>
                <span>{invoice.currency} {invoice.tax?.toLocaleString()}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between font-bold text-lg">
              <span>Total</span>
              <span>{invoice.currency} {invoice.total?.toLocaleString()}</span>
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div className="mt-8 pt-6 border-t">
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Notes</p>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{invoice.notes}</p>
            </div>
          )}

          {/* Payment Details */}
          {invoice.companyId?.paymentDetails && (
            <div className="mt-6 pt-4 border-t">
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Payment Details</p>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{invoice.companyId.paymentDetails}</p>
            </div>
          )}

          {/* Footnote */}
          {invoice.companyId?.footnote && (
            <div className="mt-6 pt-4 border-t text-center">
              <p className="text-xs text-muted-foreground italic">{invoice.companyId.footnote}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Metadata */}
      <Card className="print:hidden">
        <CardContent className="p-4 text-sm text-muted-foreground space-y-1">
          <p>Created: {format(new Date(invoice.createdAt), "MMM d, yyyy HH:mm")}</p>
          {invoice.sentAt && <p>Sent: {format(new Date(invoice.sentAt), "MMM d, yyyy HH:mm")}</p>}
          {invoice.paidAt && <p>Paid: {format(new Date(invoice.paidAt), "MMM d, yyyy HH:mm")}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
