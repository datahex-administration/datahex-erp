"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
import { ArrowLeft, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { CurrencySelect } from "@/components/forms/currency-select";
import { extractCollectionData } from "@/lib/form-options";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyObj = Record<string, any>;

interface LineItem {
  description: string;
  quantity: string;
  rate: string;
}

export default function NewInvoicePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [clients, setClients] = useState<AnyObj[]>([]);
  const [projects, setProjects] = useState<AnyObj[]>([]);

  const [form, setForm] = useState({
    clientId: "",
    projectId: "",
    type: "project",
    taxPercent: "0",
    currency: "INR",
    dueDate: "",
    notes: "",
  });

  const [items, setItems] = useState<LineItem[]>([
    { description: "", quantity: "1", rate: "" },
  ]);

  useEffect(() => {
    Promise.all([
      fetch("/api/clients?limit=100").then((r) => r.json()),
      fetch("/api/projects?limit=100").then((r) => r.json()),
    ]).then(([c, p]) => {
      setClients(extractCollectionData<AnyObj>(c));
      setProjects(extractCollectionData<AnyObj>(p));
    });
  }, []);

  const addItem = () => setItems([...items, { description: "", quantity: "1", rate: "" }]);
  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));
  const updateItem = (idx: number, field: keyof LineItem, value: string) =>
    setItems(items.map((item, i) => (i === idx ? { ...item, [field]: value } : item)));

  const subtotal = items.reduce(
    (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.rate) || 0),
    0
  );
  const taxAmount = Math.round(subtotal * (Number(form.taxPercent) || 0)) / 100;
  const total = subtotal + taxAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validItems = items.filter((i) => i.description.trim() && Number(i.rate) > 0);
    if (!validItems.length) {
      toast.error("Add at least one line item");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        taxPercent: Number(form.taxPercent),
        items: validItems.map((i) => ({
          description: i.description.trim(),
          quantity: Number(i.quantity) || 1,
          rate: Number(i.rate) || 0,
        })),
      }),
    });
    if (res.ok) {
      const invoice = await res.json();
      toast.success(`Invoice ${invoice.invoiceNumber} created`);
      router.push(`/dashboard/invoices/${invoice._id}`);
    } else {
      const data = await res.json();
      toast.error(data.error || "Failed to create invoice");
    }
    setSaving(false);
  };

  // Filter projects by selected client
  const clientProjects = form.clientId
    ? projects.filter((p) => p.clientId === form.clientId || p.clientId?._id === form.clientId)
    : projects;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/invoices">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">New Invoice</h1>
          <p className="text-muted-foreground mt-1">Create a client invoice</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Invoice Details</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Client *</Label>
              <Combobox
                options={clients.map((c) => ({
                  value: c._id,
                  label: c.name + (c.company ? ` (${c.company})` : ""),
                }))}
                value={form.clientId}
                onValueChange={(v) => setForm({ ...form, clientId: v, projectId: "" })}
                placeholder="Select client"
                searchPlaceholder="Search clients..."
              />
            </div>
            <div className="space-y-2">
              <Label>Project (optional)</Label>
              <Combobox
                options={clientProjects.map((p) => ({
                  value: p._id,
                  label: p.name,
                }))}
                value={form.projectId}
                onValueChange={(v) => setForm({ ...form, projectId: v })}
                placeholder="Link to project"
                searchPlaceholder="Search projects..."
                emptyText="No projects found"
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => v && setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="project">Project</SelectItem>
                  <SelectItem value="service">Service</SelectItem>
                  <SelectItem value="advance">Advance</SelectItem>
                  <SelectItem value="recurring">Recurring</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Due Date *</Label>
              <Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Tax %</Label>
              <Input type="number" min="0" max="100" step="0.01" value={form.taxPercent} onChange={(e) => setForm({ ...form, taxPercent: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <CurrencySelect
                value={form.currency}
                onValueChange={(value) => setForm({ ...form, currency: value })}
                triggerClassName="w-full"
              />
            </div>
          </CardContent>
        </Card>

        {/* Line Items */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Line Items</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addItem}>
              <Plus className="h-4 w-4 mr-1" />Add Item
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {/* Header */}
              <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground px-1">
                <div className="col-span-5">Description</div>
                <div className="col-span-2">Qty</div>
                <div className="col-span-2">Rate</div>
                <div className="col-span-2 text-right">Amount</div>
                <div className="col-span-1" />
              </div>
              {items.map((item, idx) => {
                const lineAmount = (Number(item.quantity) || 0) * (Number(item.rate) || 0);
                return (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-5">
                      <Input
                        value={item.description}
                        onChange={(e) => updateItem(idx, "description", e.target.value)}
                        placeholder="Item description"
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(idx, "quantity", e.target.value)}
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number"
                        min="0"
                        value={item.rate}
                        onChange={(e) => updateItem(idx, "rate", e.target.value)}
                        placeholder="0"
                      />
                    </div>
                    <div className="col-span-2 text-right font-medium text-sm">
                      {form.currency} {lineAmount.toLocaleString()}
                    </div>
                    <div className="col-span-1 flex justify-end">
                      {items.length > 1 && (
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeItem(idx)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Totals */}
            <div className="mt-6 border-t pt-4 space-y-2 max-w-xs ml-auto">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{form.currency} {subtotal.toLocaleString()}</span>
              </div>
              {Number(form.taxPercent) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax ({form.taxPercent}%)</span>
                  <span>{form.currency} {taxAmount.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg border-t pt-2">
                <span>Total</span>
                <span>{form.currency} {total.toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <Label>Notes</Label>
            <Textarea
              className="mt-2"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Payment terms, bank details, etc."
              rows={3}
            />
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" disabled={saving} className="flex-1">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Invoice
          </Button>
          <Link href="/dashboard/invoices">
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
