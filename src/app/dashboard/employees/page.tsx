"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/components/providers/auth-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { Plus, Search, Users, Eye, Pencil, Trash2, FileDown } from "lucide-react";
import { format } from "date-fns";
import { Pagination } from "@/components/ui/pagination";
import { ExportButton } from "@/components/ui/export-button";
import { EmployeeFormDialog } from "@/components/dashboard/employee-form-dialog";
import { toast } from "sonner";

interface EmployeeData {
  _id: string;
  employeeId: string;
  name: string;
  email: string;
  designation: string;
  type: string;
  department?: string;
  joiningDate: string;
  salary: number;
  currency: string;
  status: string;
  companyId: { _id: string; name: string; code: string };
}

const statusColors: Record<string, string> = {
  active: "default",
  resigned: "secondary",
  terminated: "destructive",
  intern_completed: "outline",
};

const typeColors: Record<string, string> = {
  director: "default",
  staff: "secondary",
  intern: "outline",
};

export default function EmployeesPage() {
  const { user, hasPermission } = useAuth();
  const [employees, setEmployees] = useState<EmployeeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<EmployeeData | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", "10");
    if (search) params.set("search", search);
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (typeFilter !== "all") params.set("type", typeFilter);

    const res = await fetch(`/api/employees?${params}`);
    if (res.ok) {
      const json = await res.json();
      setEmployees(json.data ?? []);
      setTotalPages(json.totalPages ?? 1);
      setTotal(json.total ?? 0);
    }
    setLoading(false);
  }, [page, search, statusFilter, typeFilter]);

  useEffect(() => { setPage(1); }, [search, statusFilter, typeFilter]);

  useEffect(() => {
    const timer = setTimeout(fetchEmployees, 300);
    return () => clearTimeout(timer);
  }, [fetchEmployees]);

  const openCreateDialog = () => {
    setEditingEmployee(null);
    setDialogOpen(true);
  };

  const openEditDialog = (employee: EmployeeData) => {
    setEditingEmployee(employee);
    setDialogOpen(true);
  };

  const handleDelete = async (employee: EmployeeData) => {
    if (!confirm(`Terminate ${employee.name}?`)) {
      return;
    }

    const response = await fetch(`/api/employees/${employee._id}`, { method: "DELETE" });

    if (response.ok) {
      toast.success("Employee terminated");
      fetchEmployees();
    } else {
      const payload = await response.json().catch(() => ({ error: "Failed to terminate employee" }));
      toast.error(payload.error || "Failed to terminate employee");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Employees</h1>
          <p className="text-muted-foreground mt-1">
            {total} employee{total !== 1 ? "s" : ""} found
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasPermission("reports:export") && (
          <ExportButton data={employees} columns={[
            { key: "employeeId", label: "ID" },
            { key: "name", label: "Name" },
            { key: "email", label: "Email" },
            { key: "designation", label: "Designation" },
            { key: "type", label: "Type" },
            { key: "joiningDate", label: "Joined" },
            { key: "salary", label: "Salary" },
            { key: "currency", label: "Currency" },
            { key: "status", label: "Status" },
          ]} filename="employees" />
          )}
          {hasPermission("employees:create") && (
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" /> Add Employee
            </Button>
          )}
        </div>
      </div>

      <EmployeeFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        employee={editingEmployee}
        onSaved={() => {
          setPage(1);
          fetchEmployees();
        }}
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or ID..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => v && setStatusFilter(v)}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="resigned">Resigned</SelectItem>
            <SelectItem value="terminated">Terminated</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={(v) => v && setTypeFilter(v)}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="director">Director</SelectItem>
            <SelectItem value="staff">Staff</SelectItem>
            <SelectItem value="intern">Intern</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" /> Employee Directory
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground py-8 text-center">Loading...</p>
          ) : employees.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center">No employees found</p>
          ) : (
            <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Designation</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Salary</TableHead>
                    <TableHead>Status</TableHead>
                    {user?.role === "super_admin" && <TableHead>Company</TableHead>}
                    <TableHead className="w-[140px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((emp) => (
                    <TableRow key={emp._id}>
                      <TableCell className="font-mono text-sm">{emp.employeeId}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{emp.name}</p>
                          <p className="text-xs text-muted-foreground">{emp.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>{emp.designation}</TableCell>
                      <TableCell>
                        <Badge variant={typeColors[emp.type] as "default" | "secondary" | "outline" | "destructive"} className="capitalize">
                          {emp.type}
                        </Badge>
                      </TableCell>
                      <TableCell>{format(new Date(emp.joiningDate), "dd MMM yyyy")}</TableCell>
                      <TableCell>
                        {emp.currency} {emp.salary.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusColors[emp.status] as "default" | "secondary" | "outline" | "destructive"} className="capitalize">
                          {emp.status.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      {user?.role === "super_admin" && (
                        <TableCell className="text-sm">{emp.companyId?.code}</TableCell>
                      )}
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Link href={`/dashboard/employees/${emp._id}`}>
                            <Button variant="ghost" size="icon">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Download Certificate"
                            onClick={() => window.open(`/api/employees/${emp._id}/certificate`, "_blank")}
                          >
                            <FileDown className="h-4 w-4" />
                          </Button>
                          {hasPermission("employees:update") && (
                            <Button variant="ghost" size="icon" onClick={() => openEditDialog(emp)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          {hasPermission("employees:delete") && (
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(emp)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
