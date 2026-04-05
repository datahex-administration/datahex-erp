"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
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
import { Plus, Pencil, Building2, Search } from "lucide-react";
import { toast } from "sonner";
import { Pagination } from "@/components/ui/pagination";
import { ExportButton } from "@/components/ui/export-button";

interface Company {
  _id: string;
  name: string;
  code: string;
  address?: string;
  currency: string;
  isActive: boolean;
  createdAt: string;
}

const EXPORT_COLUMNS = [
  { key: "name", label: "Name" },
  { key: "code", label: "Code" },
  { key: "currency", label: "Currency" },
  { key: "address", label: "Address" },
  { key: "isActive", label: "Active" },
];

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Company | null>(null);
  const [form, setForm] = useState({ name: "", code: "", address: "", currency: "INR" });

  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      params.set("page", String(page));
      params.set("limit", "10");
      fetch(`/api/companies?${params}`)
        .then((r) => r.json())
        .then((json) => {
          setCompanies(json.data || []);
          setTotalPages(json.totalPages || 1);
          setTotal(json.total || 0);
        })
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [search, page]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", code: "", address: "", currency: "INR" });
    setDialogOpen(true);
  };

  const openEdit = (company: Company) => {
    setEditing(company);
    setForm({ name: company.name, code: company.code, address: company.address || "", currency: company.currency });
    setDialogOpen(true);
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
    } else {
      const data = await res.json();
      toast.error(data.error || "Failed");
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
          <ExportButton data={companies} columns={EXPORT_COLUMNS} filename="companies" />
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger render={<Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" /> Add Company</Button>} />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editing ? "Edit Company" : "Add Company"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Company Name</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Datahex Technologies" required />
                </div>
                <div className="space-y-2">
                  <Label>Code</Label>
                  <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="DTX" maxLength={10} required disabled={!!editing} />
                </div>
                <div className="space-y-2">
                  <Label>Address</Label>
                  <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Office address" />
                </div>
                <div className="space-y-2">
                  <Label>Default Currency</Label>
                  <Input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })} placeholder="INR" maxLength={5} />
                </div>
                <Button type="submit" className="w-full">{editing ? "Update" : "Create"} Company</Button>
              </form>
            </DialogContent>
          </Dialog>
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
                    <TableHead className="w-[80px]">Actions</TableHead>
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
                        <Button variant="ghost" size="icon" onClick={() => openEdit(company)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
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
