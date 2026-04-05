"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
import { CalendarDays, Plus, Check, X, Loader2, Heart, Coffee, Award, Search } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Pagination } from "@/components/ui/pagination";
import { ExportButton } from "@/components/ui/export-button";

interface LeaveData {
  _id: string;
  employeeId: { _id: string; name: string; employeeId: string };
  type: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: string;
  approvedBy?: { name: string };
  createdAt: string;
}

interface EmployeeOption {
  _id: string;
  name: string;
  employeeId: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyObj = Record<string, any>;

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  approved: "default",
  rejected: "destructive",
};

export default function LeavesPage() {
  const { hasPermission } = useAuth();
  const [leaves, setLeaves] = useState<LeaveData[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [balances, setBalances] = useState<AnyObj[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState("all");
  const [selectedEmployee, setSelectedEmployee] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [form, setForm] = useState({
    employeeId: "",
    type: "casual",
    startDate: "",
    endDate: "",
    reason: "",
  });

  const fetchLeaves = useCallback(async () => {
    const params = new URLSearchParams();
    if (filter !== "all") params.set("status", filter);
    if (selectedEmployee !== "all") params.set("employeeId", selectedEmployee);
    if (search) params.set("search", search);
    params.set("page", String(page));
    params.set("limit", "10");
    const res = await fetch(`/api/leaves?${params}`);
    if (res.ok) {
      const json = await res.json();
      setLeaves(json.data || []);
      setTotalPages(json.totalPages || 1);
      setTotal(json.total || 0);
    }
    setLoading(false);
  }, [filter, selectedEmployee, search, page]);

  const fetchBalances = useCallback(async () => {
    const year = new Date().getFullYear();
    const res = await fetch(`/api/leave-balances?year=${year}`);
    if (res.ok) setBalances(await res.json());
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLeaves();
    }, 300);
    fetchBalances();
    fetch("/api/employees?status=active&limit=100")
      .then((r) => r.json())
      .then((json) => setEmployees(json.data || []));
    return () => clearTimeout(timer);
  }, [fetchLeaves, fetchBalances]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const res = await fetch("/api/leaves", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      toast.success("Leave application submitted");
      setDialogOpen(false);
      setForm({ employeeId: "", type: "casual", startDate: "", endDate: "", reason: "" });
      fetchLeaves();
      fetchBalances();
    } else {
      const data = await res.json();
      toast.error(data.error || "Failed");
    }
    setSaving(false);
  };

  const handleAction = async (id: string, status: "approved" | "rejected") => {
    const res = await fetch(`/api/leaves/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });

    if (res.ok) {
      toast.success(`Leave ${status}`);
      fetchLeaves();
      fetchBalances();
    } else {
      const data = await res.json();
      toast.error(data.error || "Failed");
    }
  };

  // Get balance for selected employee in the form
  const selectedBalance = balances.find(
    (b) => b.employeeId?._id === form.employeeId || b.employeeId === form.employeeId
  );

  // Aggregate balances for summary cards
  const totalSickUsed = balances.reduce((s, b) => s + (b.balances?.sick?.used || 0), 0);
  const totalCasualUsed = balances.reduce((s, b) => s + (b.balances?.casual?.used || 0), 0);
  const totalEarnedUsed = balances.reduce((s, b) => s + (b.balances?.earned?.used || 0), 0);
  const pendingCount = leaves.filter((l) => l.status === "pending").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Leave Management</h1>
          <p className="text-muted-foreground mt-1">Manage employee leaves and balances</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger
            render={<Button><Plus className="mr-2 h-4 w-4" /> Apply Leave</Button>}
          />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Apply for Leave</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Employee</Label>
                <Select value={form.employeeId} onValueChange={(v) => v && setForm({ ...form, employeeId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                  <SelectContent>
                    {employees.map((e) => (
                      <SelectItem key={e._id} value={e._id}>
                        {e.name} ({e.employeeId})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Show balance for selected employee */}
              {selectedBalance && form.type !== "unpaid" && (
                <div className="bg-muted rounded-lg p-3 text-sm">
                  <p className="font-medium mb-1">Leave Balance ({new Date().getFullYear()})</p>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-xs text-muted-foreground">Sick</p>
                      <p className="font-bold">{selectedBalance.balances?.sick?.remaining ?? 12}/{selectedBalance.balances?.sick?.total ?? 12}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Casual</p>
                      <p className="font-bold">{selectedBalance.balances?.casual?.remaining ?? 12}/{selectedBalance.balances?.casual?.total ?? 12}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Earned</p>
                      <p className="font-bold">{selectedBalance.balances?.earned?.remaining ?? 15}/{selectedBalance.balances?.earned?.total ?? 15}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Leave Type</Label>
                <Select value={form.type} onValueChange={(v) => v && setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sick">Sick Leave</SelectItem>
                    <SelectItem value="casual">Casual Leave</SelectItem>
                    <SelectItem value="earned">Earned Leave</SelectItem>
                    <SelectItem value="unpaid">Unpaid Leave</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} required />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Reason</Label>
                <Textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} required />
              </div>
              <Button type="submit" className="w-full" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit Application
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-100"><CalendarDays className="h-5 w-5 text-yellow-600" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Pending</p>
                <p className="text-lg font-bold">{pendingCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100"><Heart className="h-5 w-5 text-red-600" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Sick Used</p>
                <p className="text-lg font-bold">{totalSickUsed} days</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100"><Coffee className="h-5 w-5 text-blue-600" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Casual Used</p>
                <p className="text-lg font-bold">{totalCasualUsed} days</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100"><Award className="h-5 w-5 text-green-600" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Earned Used</p>
                <p className="text-lg font-bold">{totalEarnedUsed} days</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Leave Balances Table */}
      {balances.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Employee Leave Balances — {new Date().getFullYear()}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead className="text-center">Sick (Used/Total)</TableHead>
                  <TableHead className="text-center">Casual (Used/Total)</TableHead>
                  <TableHead className="text-center">Earned (Used/Total)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {balances.map((b) => (
                  <TableRow key={b._id}>
                    <TableCell>
                      <p className="font-medium">{b.employeeId?.name || "—"}</p>
                      <p className="text-xs text-muted-foreground">{b.employeeId?.employeeId || ""}</p>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={b.balances?.sick?.remaining <= 2 ? "text-red-600 font-bold" : ""}>
                        {b.balances?.sick?.used || 0}/{b.balances?.sick?.total || 12}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={b.balances?.casual?.remaining <= 2 ? "text-red-600 font-bold" : ""}>
                        {b.balances?.casual?.used || 0}/{b.balances?.casual?.total || 12}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={b.balances?.earned?.remaining <= 2 ? "text-red-600 font-bold" : ""}>
                        {b.balances?.earned?.used || 0}/{b.balances?.earned?.total || 15}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search leaves..." className="pl-9" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        {["all", "pending", "approved", "rejected"].map((s) => (
          <Button
            key={s}
            variant={filter === s ? "default" : "outline"}
            size="sm"
            onClick={() => { setFilter(s); setPage(1); }}
            className="capitalize"
          >
            {s}
          </Button>
        ))}
        <Select value={selectedEmployee} onValueChange={(v) => { if (v) { setSelectedEmployee(v); setPage(1); } }}>
          <SelectTrigger className="w-[200px] ml-auto"><SelectValue placeholder="All employees" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Employees</SelectItem>
            {employees.map((e) => (
              <SelectItem key={e._id} value={e._id}>{e.name} ({e.employeeId})</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <ExportButton data={leaves} columns={[{ key: "employeeId.name", label: "Employee" }, { key: "type", label: "Type" }, { key: "startDate", label: "Start" }, { key: "endDate", label: "End" }, { key: "days", label: "Days" }, { key: "reason", label: "Reason" }, { key: "status", label: "Status" }]} filename="leaves" />
      </div>

      {/* Leave Applications Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" /> Leave Applications
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground py-8 text-center">Loading...</p>
          ) : leaves.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center">No leave applications</p>
          ) : (
            <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Days</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaves.map((leave) => (
                  <TableRow key={leave._id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{leave.employeeId?.name}</p>
                        <p className="text-xs text-muted-foreground">{leave.employeeId?.employeeId}</p>
                      </div>
                    </TableCell>
                    <TableCell className="capitalize">{leave.type}</TableCell>
                    <TableCell>{format(new Date(leave.startDate), "dd MMM")}</TableCell>
                    <TableCell>{format(new Date(leave.endDate), "dd MMM")}</TableCell>
                    <TableCell>{leave.days}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{leave.reason}</TableCell>
                    <TableCell>
                      <Badge variant={statusColors[leave.status]} className="capitalize">
                        {leave.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {leave.status === "pending" && hasPermission("leaves:approve") && (
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600" onClick={() => handleAction(leave._id, "approved")}>
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => handleAction(leave._id, "rejected")}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
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
