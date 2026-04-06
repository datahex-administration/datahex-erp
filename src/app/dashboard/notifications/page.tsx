"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Combobox } from "@/components/ui/combobox";
import { Bell, Check, Search, Plus, Send, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { Pagination } from "@/components/ui/pagination";
import { ExportButton } from "@/components/ui/export-button";
import { toast } from "sonner";

interface NotificationData {
  _id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyObj = Record<string, any>;

export default function NotificationsPage() {
  const { user } = useAuth();
  const isManager = user?.role !== "staff";
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [users, setUsers] = useState<AnyObj[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({ userId: "all", type: "info", title: "", message: "" });

  const fetchNotifications = useCallback(async () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    params.set("page", String(page));
    params.set("limit", "10");
    const res = await fetch(`/api/notifications?${params}`);
    if (res.ok) {
      const json = await res.json();
      setNotifications(json.data || []);
      setTotalPages(json.totalPages || 1);
      setTotal(json.total || 0);
    }
    setLoading(false);
  }, [search, page]);

  useEffect(() => {
    const timer = setTimeout(fetchNotifications, 300);
    if (isManager) {
      fetch("/api/users?limit=100")
        .then((r) => r.json())
        .then((json) => setUsers(json.data || []))
        .catch(() => {});
    }
    return () => clearTimeout(timer);
  }, [fetchNotifications, isManager]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    const res = await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      const data = await res.json();
      toast.success(`Sent to ${data.count} user(s)`);
      setDialogOpen(false);
      setForm({ userId: "all", type: "info", title: "", message: "" });
      fetchNotifications();
    } else {
      const data = await res.json();
      toast.error(data.error || "Failed");
    }
    setSending(false);
  };

  const markRead = async (id: string) => {
    await fetch(`/api/notifications/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ read: true }),
    });
    fetchNotifications();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-muted-foreground mt-1">{total} notification{total !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton data={notifications} columns={[{ key: "title", label: "Title" }, { key: "message", label: "Message" }, { key: "type", label: "Type" }, { key: "read", label: "Read" }, { key: "createdAt", label: "Date" }]} filename="notifications" />
          {isManager && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger render={<Button><Plus className="mr-2 h-4 w-4" /> Send Notification</Button>} />
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Send Notification</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSend} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Recipient</Label>
                    <Combobox
                      options={[
                        { value: "all", label: "All Users" },
                        ...users.map((u) => ({
                          value: u._id,
                          label: u.name,
                          description: u.email,
                        })),
                      ]}
                      value={form.userId}
                      onValueChange={(v) => setForm({ ...form, userId: v || "all" })}
                      placeholder="Select recipient"
                      searchPlaceholder="Search users..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select value={form.type} onValueChange={(v) => v && setForm({ ...form, type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="info">Info</SelectItem>
                        <SelectItem value="warning">Warning</SelectItem>
                        <SelectItem value="success">Success</SelectItem>
                        <SelectItem value="error">Error</SelectItem>
                        <SelectItem value="reminder">Reminder</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Notification title" required />
                  </div>
                  <div className="space-y-2">
                    <Label>Message</Label>
                    <Textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Notification message..." rows={3} required />
                  </div>
                  <Button type="submit" className="w-full" disabled={sending}>
                    {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                    Send Notification
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search notifications..." className="pl-9" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" /> All Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground py-8 text-center">Loading...</p>
          ) : notifications.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center">No notifications yet</p>
          ) : (
            <>
            <div className="space-y-3">
              {notifications.map((n) => (
                <div
                  key={n._id}
                  className={`flex items-start justify-between p-4 rounded-lg border ${!n.read ? "bg-accent/30" : ""}`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{n.title}</p>
                      {!n.read && <Badge variant="default" className="text-xs">New</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">{n.message}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(n.createdAt), "dd MMM yyyy, hh:mm a")}
                    </p>
                  </div>
                  {!n.read && (
                    <Button variant="ghost" size="icon" onClick={() => markRead(n._id)}>
                      <Check className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
