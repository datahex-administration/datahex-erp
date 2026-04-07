"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Building2, Search, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Pagination } from "@/components/ui/pagination";
import { ExportButton } from "@/components/ui/export-button";
import { CurrencySelect } from "@/components/forms/currency-select";

interface Company {
  _id: string;
  name: string;
  code: string;
  address?: string;
  currency: string;
  isActive: boolean;
  createdAt: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyObj = Record<string, any>;

const EXPORT_COLUMNS = [
  { key: "name", label: "Name" },
  { key: "code", label: "Code" },
  { key: "currency", label: "Currency" },
  { key: "address", label: "Address" },
  { key: "isActive", label: "Active" },
];

export default function CompaniesPage() {
  const { user, hasPermission } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Company | null>(null);
  const [form, setForm] = useState({ name: "", code: "", address: "", billingAddress: "", logo: "", gstNumber: "", foreignRegistration: "", footnote: "", paymentDetails: "", currency: "INR" });

  const fetchCompanies = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    params.set("page", String(page));
    params.set("limit", "10");

    return fetch(`/api/companies?${params}`)
      .then((response) => response.json())
      .then((json) => {
        setCompanies(json.data || []);
        setTotalPages(json.totalPages || 1);
        setTotal(json.total || 0);
      })
      .finally(() => setLoading(false));
  }, [page, search]);

  useEffect(() => {
    const timer = setTimeout(fetchCompanies, 300);
    return () => clearTimeout(timer);
  }, [fetchCompanies]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", code: "", address: "", billingAddress: "", logo: "", gstNumber: "", foreignRegistration: "", footnote: "", paymentDetails: "", currency: "INR" });
    setDialogOpen(true);
  };

  const openEdit = (company: Company) => {
    setEditing(company);
    setForm({
      name: company.name,
      code: company.code,
      address: company.address || "",
      billingAddress: (company as AnyObj).billingAddress || "",
      logo: (company as AnyObj).logo || "",
      gstNumber: (company as AnyObj).gstNumber || "",
      foreignRegistration: (company as AnyObj).foreignRegistration || "",
      footnote: (company as AnyObj).footnote || "",
      paymentDetails: (company as AnyObj).paymentDetails || "",
      currency: company.currency,
    });
    setDialogOpen(true);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 512 * 1024) {
      toast.error("Image must be less than 512 KB");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setForm((prev) => ({ ...prev, logo: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editing ? `/api/companies/${editing._id}` : "/api/companies";
    const method = editing ? "PUT" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    if (res.ok) {
      toast.success(editing ? "Company updated" : "Company created");
      setDialogOpen(false);
      setPage(1);
      fetchCompanies();
    } else {
      const data = await res.json();
      toast.error(data.error || "Failed");
    }
  };

  const handleDelete = async (company: Company) => {
    if (!confirm(`Deactivate ${company.name}?`)) {
      return;
    }

    const response = await fetch(`/api/companies/${company._id}`, { method: "DELETE" });

    if (response.ok) {
      toast.success("Company deactivated");
      fetchCompanies();
    } else {
      const payload = await response.json().catch(() => ({ error: "Failed to deactivate company" }));
      toast.error(payload.error || "Failed to deactivate company");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Companies</h1>
          <p className="text-muted-foreground mt-1">Manage your organizations</p>
        </div>
        <div className="flex items-center gap-2">
          {hasPermission("reports:export") && (
            <ExportButton data={companies} columns={EXPORT_COLUMNS} filename="companies" />
          )}
          {hasPermission("companies:create") && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger render={<Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" /> Add Company</Button>} />
            <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editing ? "Edit Company" : "Add Company"}</DialogTitle>
                <DialogDescription>
                  Keep company defaults consistent so downstream forms inherit the right currency.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Company Name</Label>
                    <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Datahex Technologies" required />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Code</Label>
                      <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="DTX" maxLength={10} required disabled={!!editing} />
                    </div>
                    <div className="space-y-2">
                      <Label>Default Currency</Label>
                      <CurrencySelect
                        value={form.currency}
                        onValueChange={(value) => setForm({ ...form, currency: value })}
                        triggerClassName="w-full"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Address</Label>
                    <Textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Office address" rows={2} />
                  </div>
                  <div className="space-y-2">
                    <Label>Billing Address</Label>
                    <Textarea value={form.billingAddress} onChange={(e) => setForm({ ...form, billingAddress: e.target.value })} placeholder="Billing address (shown on invoices)" rows={2} />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Logo</Label>
                    {form.logo ? (
                      <div className="flex items-center gap-3 rounded-md border p-2">
                        <img src={form.logo} alt="Logo preview" className="h-12 w-auto object-contain" />
                        <Button type="button" variant="ghost" size="icon" className="ml-auto" onClick={() => setForm({ ...form, logo: "" })}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed p-3 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                        <Upload className="h-4 w-4" />
                        Upload logo (max 512 KB)
                        <Input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                      </label>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>GST Number</Label>
                    <Input value={form.gstNumber} onChange={(e) => setForm({ ...form, gstNumber: e.target.value })} placeholder="22AAAAA0000A1Z5" />
                  </div>
                  <div className="space-y-2">
                    <Label>Foreign Registration</Label>
                    <Input value={form.foreignRegistration} onChange={(e) => setForm({ ...form, foreignRegistration: e.target.value })} placeholder="Tax ID / VAT number" />
                  </div>
                  <div className="space-y-2">
                    <Label>Payment Details</Label>
                    <Textarea value={form.paymentDetails} onChange={(e) => setForm({ ...form, paymentDetails: e.target.value })} placeholder="Bank name, A/C number, IFSC, UPI ID..." rows={2} />
                  </div>
                  <div className="space-y-2">
                    <Label>Invoice Footnote</Label>
                    <Textarea value={form.footnote} onChange={(e) => setForm({ ...form, footnote: e.target.value })} placeholder="Terms, thank you note, etc." rows={2} />
                  </div>
                </div>
                <DialogFooter className="px-0 pb-0">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button type="submit">{editing ? "Update" : "Create"} Company</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          )}
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search companies..." className="pl-9" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" /> All Companies
            <Badge variant="secondary" className="ml-2">{total}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground py-8 text-center">Loading...</p>
          ) : companies.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center">No companies found</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Currency</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[120px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {companies.map((company) => (
                    <TableRow key={company._id}>
                      <TableCell className="font-medium">{company.name}</TableCell>
                      <TableCell>{company.code}</TableCell>
                      <TableCell>{company.currency}</TableCell>
                      <TableCell>
                        <Badge variant={company.isActive ? "default" : "secondary"}>{company.isActive ? "Active" : "Inactive"}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {hasPermission("companies:update") && (
                          <Button variant="ghost" size="icon" onClick={() => openEdit(company)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          )}
                          {hasPermission("companies:delete") && (
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(company)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
