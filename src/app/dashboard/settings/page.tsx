"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Mail, MessageCircle, Pencil, Plus, RotateCcw, Shield, Search } from "lucide-react";
import { toast } from "sonner";
import { Pagination } from "@/components/ui/pagination";
import { ExportButton } from "@/components/ui/export-button";

interface UserData {
  _id: string;
  name: string;
  email: string;
  whatsappNumber?: string;
  role: string;
  companyId: string;
  permissions: string[];
  isActive: boolean;
  lastLogin?: string;
}

interface CommunicationStatus {
  email: {
    configured: boolean;
    host: string;
    port: number;
    secure: boolean;
  };
  whatsapp: {
    configured: boolean;
    provider: string | null;
    endpoint: string;
  };
  user: {
    hasWhatsappNumber: boolean;
    whatsappNumber: string | null;
  };
}

export default function SettingsPage() {
  const { user: currentUser, hasPermission } = useAuth();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<UserData | null>(null);
  const [communicationStatus, setCommunicationStatus] = useState<CommunicationStatus | null>(null);
  const [resettingUserId, setResettingUserId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [form, setForm] = useState({
    name: "",
    email: "",
    whatsappNumber: "",
    pin: "",
    role: "staff",
    companyId: "",
  });

  const fetchUsers = useCallback(async () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    params.set("page", String(page));
    params.set("limit", "10");
    const res = await fetch(`/api/users?${params}`);
    if (res.ok) {
      const json = await res.json();
      setUsers(json.data || []);
      setTotalPages(json.totalPages || 1);
      setTotal(json.total || 0);
    }
    setLoading(false);
  }, [search, page]);

  const fetchCommunicationStatus = useCallback(async () => {
    const res = await fetch("/api/communications/status");
    if (res.ok) setCommunicationStatus(await res.json());
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers();
    }, 300);
    fetchCommunicationStatus();
    return () => clearTimeout(timer);
  }, [fetchUsers, fetchCommunicationStatus]);

  const openCreate = () => {
    setEditing(null);
    setForm({
      name: "",
      email: "",
      whatsappNumber: "",
      pin: "",
      role: "staff",
      companyId: currentUser?.companyId || "",
    });
    setDialogOpen(true);
  };

  const openEdit = (u: UserData) => {
    setEditing(u);
    setForm({
      name: u.name,
      email: u.email,
      whatsappNumber: u.whatsappNumber || "",
      pin: "",
      role: u.role,
      companyId: u.companyId,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editing ? `/api/users/${editing._id}` : "/api/users";
    const method = editing ? "PUT" : "POST";

    const payload: Record<string, unknown> = { ...form };
    if (editing && !form.pin) delete payload.pin;

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      toast.success(editing ? "User updated" : "User created");
      setDialogOpen(false);
      fetchUsers();
      fetchCommunicationStatus();
    } else {
      const data = await res.json();
      toast.error(data.error || "Failed");
    }
  };

  const toggleActive = async (u: UserData) => {
    await fetch(`/api/users/${u._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !u.isActive }),
    });
    fetchUsers();
  };

  const sendResetPin = async (userId: string) => {
    setResettingUserId(userId);

    const res = await fetch(`/api/users/${userId}/reset-pin`, {
      method: "POST",
    });

    const data = await res.json();

    if (res.ok) {
      toast.success(data.message || "Reset PIN sent");
    } else {
      toast.error(data.error || "Failed to send reset PIN");
    }

    setResettingUserId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-muted-foreground mt-1">{total} user{total !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex items-center gap-2">
          {hasPermission("reports:export") && (
            <ExportButton data={users} columns={[{ key: "name", label: "Name" }, { key: "email", label: "Email" }, { key: "role", label: "Role" }, { key: "isActive", label: "Active" }]} filename="users" />
          )}
        {hasPermission("users:create") && (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger
            render={<Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" /> Add User</Button>}
          />
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit User" : "Add User"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    required
                    disabled={!!editing}
                  />
                </div>
                <div className="space-y-2">
                  <Label>WhatsApp Number</Label>
                  <Input
                    value={form.whatsappNumber}
                    onChange={(e) => setForm({ ...form, whatsappNumber: e.target.value })}
                    placeholder="+919876543210"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>{editing ? "New PIN (leave blank to keep)" : "6-Digit PIN"}</Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    pattern="\d{6}"
                    value={form.pin}
                    onChange={(e) => setForm({ ...form, pin: e.target.value.replace(/\D/g, "") })}
                    placeholder="123456"
                    required={!editing}
                  />
                </div>
                {(currentUser?.role === "super_admin" || currentUser?.role === "manager") && (
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Role</Label>
                    <Select value={form.role} onValueChange={(v) => v && setForm({ ...form, role: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {currentUser?.role === "super_admin" && <SelectItem value="super_admin">Super Admin</SelectItem>}
                        {currentUser?.role === "super_admin" && <SelectItem value="manager">Manager</SelectItem>}
                        <SelectItem value="customer_success">Customer Success</SelectItem>
                        <SelectItem value="staff">Staff</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <Button type="submit" className="w-full">
                {editing ? "Update" : "Create"} User
              </Button>
            </form>
          </DialogContent>
        </Dialog>
        )}
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search users..." className="pl-9" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Mail className="h-4 w-4" /> Email delivery
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>{communicationStatus?.email.configured ? "Configured" : "Not configured"}</p>
            <p>
              {communicationStatus?.email.host}:{communicationStatus?.email.port}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageCircle className="h-4 w-4" /> WhatsApp delivery
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>{communicationStatus?.whatsapp.configured ? "Configured" : "Not configured"}</p>
            <p>{communicationStatus?.whatsapp.provider || "Provider not set"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="h-4 w-4" /> My WhatsApp number
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              {communicationStatus?.user.hasWhatsappNumber
                ? communicationStatus.user.whatsappNumber
                : "Not set for your account"}
            </p>
            <p>This number will be used for PIN reset and task reports.</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" /> Users
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground py-8 text-center">Loading...</p>
          ) : users.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center">No users found</p>
          ) : (
            <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>WhatsApp</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead className="w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u._id}>
                    <TableCell className="font-medium">{u.name}</TableCell>
                    <TableCell className="text-muted-foreground">{u.email}</TableCell>
                    <TableCell>{u.whatsappNumber || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={u.role === "super_admin" ? "default" : "secondary"} className="capitalize">
                        {u.role.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {hasPermission("users:update") ? (
                        <Switch checked={u.isActive} onCheckedChange={() => toggleActive(u)} />
                      ) : (
                        <Badge variant={u.isActive ? "default" : "secondary"}>{u.isActive ? "Yes" : "No"}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : "Never"}
                    </TableCell>
                    <TableCell className="space-x-1">
                      {hasPermission("users:update") && (
                        <>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(u)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => sendResetPin(u._id)}
                          disabled={resettingUserId === u._id}
                          title="Send reset PIN"
                        >
                          <RotateCcw className={`h-4 w-4 ${resettingUserId === u._id ? "animate-spin" : ""}`} />
                        </Button>
                        </>
                      )}
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
