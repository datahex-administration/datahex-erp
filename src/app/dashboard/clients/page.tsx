"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Contact, Eye, FolderKanban, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Pagination } from "@/components/ui/pagination";
import { ExportButton } from "@/components/ui/export-button";

interface ClientData {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  address?: string;
  contactPersonName?: string;
  additionalDetails?: string;
  projectCount?: number;
  isActive: boolean;
}

interface ClientFormState {
  name: string;
  email: string;
  phoneCountryCode: string;
  phoneNumber: string;
  address: string;
  contactPersonName: string;
  additionalDetails: string;
}

const EMPTY_FORM: ClientFormState = {
  name: "",
  email: "",
  phoneCountryCode: "",
  phoneNumber: "",
  address: "",
  contactPersonName: "",
  additionalDetails: "",
};

export default function ClientsPage() {
  const { hasPermission } = useAuth();
  const [clients, setClients] = useState<ClientData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ClientData | null>(null);
  const [form, setForm] = useState<ClientFormState>(EMPTY_FORM);

  const fetchClients = useCallback(async () => {
    setLoading(true);

    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", "10");
    if (search) {
      params.set("search", search);
    }

    const response = await fetch(`/api/clients?${params}`);

    if (response.ok) {
      const payload = await response.json();
      setClients(payload.data ?? []);
      setTotalPages(payload.totalPages ?? 1);
      setTotal(payload.total ?? 0);
    }

    setLoading(false);
  }, [page, search]);

  useEffect(() => {
    const timer = setTimeout(fetchClients, 300);
    return () => clearTimeout(timer);
  }, [fetchClients]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (client: ClientData) => {
    const { countryCode, phoneNumber } = splitPhoneNumber(client.phone);

    setEditing(client);
    setForm({
      name: client.name,
      email: client.email,
      phoneCountryCode: countryCode,
      phoneNumber,
      address: client.address || "",
      contactPersonName: client.contactPersonName || "",
      additionalDetails: client.additionalDetails || "",
    });
    setDialogOpen(true);
  };

  const handleDialogChange = (open: boolean) => {
    setDialogOpen(open);

    if (!open) {
      setEditing(null);
      setForm(EMPTY_FORM);
    }
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const payload = buildClientPayload(form);
    const url = editing ? `/api/clients/${editing._id}` : "/api/clients";
    const method = editing ? "PUT" : "POST";

    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      toast.success(editing ? "Client updated" : "Client added");
      handleDialogChange(false);
      fetchClients();
      return;
    }

    const data = await response.json();
    toast.error(data.error || "Failed to save client");
  };

  const exportRows = clients.map((client) => ({
    ...client,
    contact: client.contactPersonName || client.company || "",
    projectCount: client.projectCount || 0,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Clients</h1>
          <p className="mt-1 text-muted-foreground">
            {total} client{total !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasPermission("reports:export") && (
          <ExportButton
            data={exportRows}
            columns={[
              { key: "name", label: "Name" },
              { key: "contact", label: "Contact Person" },
              { key: "email", label: "Email" },
              { key: "phone", label: "Phone" },
              { key: "address", label: "Address" },
              { key: "projectCount", label: "Projects" },
            ]}
            filename="clients"
          />
          )}
          <Dialog open={dialogOpen} onOpenChange={handleDialogChange}>
            {hasPermission("clients:create") && (
            <DialogTrigger
              render={
                <Button onClick={openCreate}>
                  <Plus className="mr-2 h-4 w-4" /> Add Client
                </Button>
              }
            />
            )}
            <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editing ? "Edit Client" : "Add Client"}</DialogTitle>
                <DialogDescription>
                  Save only the details needed at onboarding. Anything extra can go into additional details.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Client Name *</Label>
                    <Input
                      value={form.name}
                      onChange={(event) =>
                        setForm((currentForm) => ({ ...currentForm, name: event.target.value }))
                      }
                      placeholder="Example: Acme Trading"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Contact Person</Label>
                    <Input
                      value={form.contactPersonName}
                      onChange={(event) =>
                        setForm((currentForm) => ({
                          ...currentForm,
                          contactPersonName: event.target.value,
                        }))
                      }
                      placeholder="Optional"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Email *</Label>
                    <Input
                      type="email"
                      value={form.email}
                      onChange={(event) =>
                        setForm((currentForm) => ({ ...currentForm, email: event.target.value }))
                      }
                      placeholder="client@example.com"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Phone / WhatsApp</Label>
                    <div className="flex gap-2">
                      <Input
                        value={form.phoneCountryCode}
                        onChange={(event) => {
                          let val = event.target.value.replace(/[^\d+]/g, "");
                          if (val && !val.startsWith("+")) val = "+" + val;
                          setForm((currentForm) => ({
                            ...currentForm,
                            phoneCountryCode: val,
                          }));
                        }}
                        placeholder="+91"
                        className="w-24 shrink-0"
                        inputMode="tel"
                      />
                      <Input
                        value={form.phoneNumber}
                        onChange={(event) =>
                          setForm((currentForm) => ({
                            ...currentForm,
                            phoneNumber: event.target.value,
                          }))
                        }
                        placeholder="98765 43210"
                        inputMode="tel"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Add the country code in front so invoices and WhatsApp flows can use the same number.
                    </p>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label>Company Address</Label>
                    <Textarea
                      value={form.address}
                      onChange={(event) =>
                        setForm((currentForm) => ({ ...currentForm, address: event.target.value }))
                      }
                      placeholder="Street, city, state, postal code"
                      rows={4}
                    />
                  </div>
                </div>

                <div className="space-y-2 rounded-xl border border-border/70 p-4">
                  <div>
                    <Label>Additional Details</Label>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Use this only for notes that are not required during the initial create flow.
                    </p>
                  </div>
                  <Textarea
                    value={form.additionalDetails}
                    onChange={(event) =>
                      setForm((currentForm) => ({
                        ...currentForm,
                        additionalDetails: event.target.value,
                      }))
                    }
                    placeholder="Optional notes, communication preference, billing remarks, etc."
                    rows={3}
                  />
                </div>

                <Button type="submit" className="w-full">
                  {editing ? "Update" : "Add"} Client
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search clients..."
          className="pl-9"
          value={search}
          onChange={(event) => handleSearchChange(event.target.value)}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Contact className="h-5 w-5" /> Client Directory
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="py-8 text-center text-muted-foreground">Loading...</p>
          ) : clients.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">No clients yet</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Contact Person</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone / WhatsApp</TableHead>
                    <TableHead>Projects</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[120px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients.map((client) => (
                    <TableRow key={client._id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{client.name}</p>
                          {client.address ? (
                            <p className="line-clamp-1 text-xs text-muted-foreground">{client.address}</p>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>{client.contactPersonName || client.company || "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{client.email}</TableCell>
                      <TableCell>{client.phone || "—"}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="gap-1">
                          <FolderKanban className="h-3 w-3" />
                          {client.projectCount || 0}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={client.isActive ? "default" : "secondary"}>
                          {client.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Link href={`/dashboard/clients/${client._id}`}>
                            <Button variant="ghost" size="icon">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          {hasPermission("clients:update") && (
                            <Button variant="ghost" size="icon" onClick={() => openEdit(client)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          {hasPermission("clients:delete") && (
                            <Button variant="ghost" size="icon" onClick={async () => {
                              if (!confirm(`Deactivate ${client.name}?`)) return;
                              const res = await fetch(`/api/clients/${client._id}`, { method: "DELETE" });
                              if (res.ok) { toast.success("Client deactivated"); fetchClients(); }
                              else { const d = await res.json().catch(() => ({})); toast.error(d.error || "Failed"); }
                            }}>
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

function splitPhoneNumber(phone?: string) {
  const value = phone?.trim() || "";
  const match = value.match(/^(\+\d{1,4})(?:[\s-]*)?(.*)$/);

  if (!match) {
    return {
      countryCode: "",
      phoneNumber: value,
    };
  }

  return {
    countryCode: match[1],
    phoneNumber: match[2] || "",
  };
}

function buildPhoneNumber(countryCode: string, phoneNumber: string) {
  const trimmedCountryCode = countryCode.trim();
  const trimmedPhoneNumber = phoneNumber.trim();

  if (!trimmedCountryCode) {
    return trimmedPhoneNumber;
  }

  if (!trimmedPhoneNumber) {
    return trimmedCountryCode;
  }

  return `${trimmedCountryCode} ${trimmedPhoneNumber}`;
}

function buildClientPayload(form: ClientFormState) {
  return {
    name: form.name.trim(),
    email: form.email.trim().toLowerCase(),
    phone: buildPhoneNumber(form.phoneCountryCode, form.phoneNumber) || undefined,
    address: form.address.trim() || undefined,
    contactPersonName: form.contactPersonName.trim() || undefined,
    additionalDetails: form.additionalDetails.trim() || undefined,
  };
}
