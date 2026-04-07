"use client";

import { useState, useEffect, useCallback } from "react";
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
import { Wallet, Play, Loader2, FileDown } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Pagination } from "@/components/ui/pagination";
import { ExportButton } from "@/components/ui/export-button";
import { useAuth } from "@/components/providers/auth-provider";

interface EmployeePreview {
  _id: string;
  name: string;
  salary: number;
  currency: string;
  designation: string;
}

interface SalaryProcessingData {
  _id: string;
  month: number;
  year: number;
  paymentType?: "full" | "partial";
  employees: Array<{
    employeeId: string;
    employeeName: string;
    baseSalary: number;
    deductions: number;
    bonus: number;
    netSalary: number;
    paidAmount?: number;
    remainingAmount?: number;
    status: string;
  }>;
  totalAmount: number;
  totalPaid?: number;
  currency: string;
  processedBy?: { name: string };
  processedAt: string;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function SalaryPage() {
  const { hasPermission } = useAuth();
  const [processings, setProcessings] = useState<SalaryProcessingData[]>([]);
  const [loading, setLoading] = useState(true);
  const [processDialogOpen, setProcessDialogOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(String(new Date().getMonth() + 1));
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Partial salary state
  const [paymentType, setPaymentType] = useState<"full" | "partial">("full");
  const [employees, setEmployees] = useState<EmployeePreview[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [adjustments, setAdjustments] = useState<Record<string, { deductions: string; bonus: string }>>({});
  const [partialAmounts, setPartialAmounts] = useState<Record<string, string>>({});

  const fetchProcessings = useCallback(async () => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", "10");
    const res = await fetch(`/api/salary/process?${params}`);
    if (res.ok) {
      const json = await res.json();
      setProcessings(json.data || []);
      setTotalPages(json.totalPages || 1);
      setTotal(json.total || 0);
    }
    setLoading(false);
  }, [page]);

  useEffect(() => {
    fetchProcessings();
  }, [fetchProcessings]);

  // Fetch employees when dialog opens
  const fetchEmployees = async () => {
    setLoadingEmployees(true);
    try {
      const res = await fetch("/api/employees?limit=200&status=active");
      if (res.ok) {
        const json = await res.json();
        const data = json.data ?? (Array.isArray(json) ? json : []);
        setEmployees(data);
        const adj: Record<string, { deductions: string; bonus: string }> = {};
        const partial: Record<string, string> = {};
        data.forEach((emp: EmployeePreview) => {
          adj[emp._id] = { deductions: "0", bonus: "0" };
          partial[emp._id] = String(emp.salary);
        });
        setAdjustments(adj);
        setPartialAmounts(partial);
      }
    } catch {
      toast.error("Failed to load employees");
    }
    setLoadingEmployees(false);
  };

  const handleDialogOpen = (open: boolean) => {
    setProcessDialogOpen(open);
    if (open) {
      setPaymentType("full");
      fetchEmployees();
    }
  };

  const getNetSalary = (emp: EmployeePreview) => {
    const adj = adjustments[emp._id] || { deductions: "0", bonus: "0" };
    return emp.salary - (Number(adj.deductions) || 0) + (Number(adj.bonus) || 0);
  };

  const getTotalNet = () => employees.reduce((sum, emp) => sum + getNetSalary(emp), 0);

  const getTotalPaying = () => {
    if (paymentType === "full") return getTotalNet();
    return employees.reduce((sum, emp) => {
      const net = getNetSalary(emp);
      const paying = Math.min(Number(partialAmounts[emp._id]) || 0, net);
      return sum + paying;
    }, 0);
  };

  const handleProcess = async () => {
    setProcessing(true);
    const body: Record<string, unknown> = {
      month: selectedMonth,
      year: selectedYear,
      paymentType,
      adjustments: Object.fromEntries(
        Object.entries(adjustments).map(([id, adj]) => [
          id,
          { deductions: Number(adj.deductions) || 0, bonus: Number(adj.bonus) || 0 },
        ])
      ),
    };

    if (paymentType === "partial") {
      body.partialAmounts = Object.fromEntries(
        Object.entries(partialAmounts).map(([id, amount]) => [id, Number(amount) || 0])
      );
    }

    const res = await fetch("/api/salary/process", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      toast.success("Salary processed successfully");
      setProcessDialogOpen(false);
      fetchProcessings();
    } else {
      const data = await res.json();
      toast.error(data.error || "Failed to process salary");
    }
    setProcessing(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-green-100 text-green-800 border-0">Paid</Badge>;
      case "partially_paid":
        return <Badge className="bg-yellow-100 text-yellow-800 border-0">Partial</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 border-0">Pending</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Salary Management</h1>
          <p className="text-muted-foreground mt-1">{total} record{total !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex items-center gap-2">
          {hasPermission("reports:export") && (
          <ExportButton
            data={processings.flatMap((p) =>
              p.employees.map((emp) => ({
                month: `${MONTHS[p.month - 1]} ${p.year}`,
                ...emp,
                paidAmount: emp.paidAmount ?? emp.netSalary,
                remainingAmount: emp.remainingAmount ?? 0,
                currency: p.currency,
              }))
            )}
            columns={[
              { key: "month", label: "Month" },
              { key: "employeeName", label: "Employee" },
              { key: "baseSalary", label: "Base" },
              { key: "deductions", label: "Deductions" },
              { key: "bonus", label: "Bonus" },
              { key: "netSalary", label: "Net" },
              { key: "paidAmount", label: "Paid" },
              { key: "remainingAmount", label: "Remaining" },
              { key: "currency", label: "Currency" },
              { key: "status", label: "Status" },
            ]}
            filename="salary"
          />
          )}
          {hasPermission("salary:create") && (
          <Dialog open={processDialogOpen} onOpenChange={handleDialogOpen}>
            <DialogTrigger
              render={<Button><Play className="mr-2 h-4 w-4" /> Process Salary</Button>}
            />
            <DialogContent className="sm:max-w-3xl">
              <DialogHeader>
                <DialogTitle>Process Monthly Salary</DialogTitle>
              </DialogHeader>
              <div className="space-y-5">
                {/* Month, Year, Payment Type */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Month</Label>
                    <Select value={selectedMonth} onValueChange={(v) => v && setSelectedMonth(v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {MONTHS.map((m, i) => (
                          <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Year</Label>
                    <Input
                      type="number"
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(e.target.value)}
                      min={2020}
                      max={2035}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Payment Type</Label>
                    <Select value={paymentType} onValueChange={(v) => v && setPaymentType(v as "full" | "partial")}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="full">Full Salary</SelectItem>
                        <SelectItem value="partial">Partial Salary</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Employee breakdown with deductions */}
                {loadingEmployees ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : employees.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No active employees found</p>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Employee</TableHead>
                          <TableHead className="text-right">Base Salary</TableHead>
                          <TableHead className="text-right w-[100px]">Deductions</TableHead>
                          <TableHead className="text-right w-[100px]">Bonus</TableHead>
                          <TableHead className="text-right">Net</TableHead>
                          {paymentType === "partial" && (
                            <TableHead className="text-right w-[120px]">Pay Now</TableHead>
                          )}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {employees.map((emp) => {
                          const adj = adjustments[emp._id] || { deductions: "0", bonus: "0" };
                          const net = getNetSalary(emp);
                          return (
                            <TableRow key={emp._id}>
                              <TableCell>
                                <div>
                                  <p className="font-medium text-sm">{emp.name}</p>
                                  <p className="text-xs text-muted-foreground">{emp.designation}</p>
                                </div>
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {emp.salary.toLocaleString()}
                              </TableCell>
                              <TableCell className="text-right">
                                <Input
                                  type="text"
                                  inputMode="numeric"
                                  value={adj.deductions}
                                  onChange={(e) => {
                                    const v = e.target.value.replace(/[^0-9.]/g, "");
                                    setAdjustments((prev) => ({
                                      ...prev,
                                      [emp._id]: { ...prev[emp._id], deductions: v },
                                    }));
                                  }}
                                  className="h-8 w-[90px] text-right text-sm ml-auto"
                                />
                              </TableCell>
                              <TableCell className="text-right">
                                <Input
                                  type="text"
                                  inputMode="numeric"
                                  value={adj.bonus}
                                  onChange={(e) => {
                                    const v = e.target.value.replace(/[^0-9.]/g, "");
                                    setAdjustments((prev) => ({
                                      ...prev,
                                      [emp._id]: { ...prev[emp._id], bonus: v },
                                    }));
                                  }}
                                  className="h-8 w-[90px] text-right text-sm ml-auto"
                                />
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {net.toLocaleString()}
                              </TableCell>
                              {paymentType === "partial" && (
                                <TableCell className="text-right">
                                  <Input
                                    type="text"
                                    inputMode="numeric"
                                    value={partialAmounts[emp._id] || ""}
                                    onChange={(e) => {
                                      const v = e.target.value.replace(/[^0-9.]/g, "");
                                      setPartialAmounts((prev) => ({
                                        ...prev,
                                        [emp._id]: v,
                                      }));
                                    }}
                                    className="h-8 w-[110px] text-right text-sm ml-auto"
                                  />
                                </TableCell>
                              )}
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {/* Summary */}
                {employees.length > 0 && (
                  <div className="flex items-center justify-between rounded-lg bg-accent/50 p-4">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">
                        {employees.length} employee{employees.length !== 1 ? "s" : ""}
                      </p>
                      <p className="text-sm">
                        Total Net: <span className="font-bold">{getTotalNet().toLocaleString()}</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">
                        {paymentType === "partial" ? "Paying Now" : "Total"}
                      </p>
                      <p className="text-xl font-bold">{getTotalPaying().toLocaleString()}</p>
                      {paymentType === "partial" && getTotalNet() > getTotalPaying() && (
                        <p className="text-xs text-muted-foreground">
                          Remaining: {(getTotalNet() - getTotalPaying()).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <Button onClick={handleProcess} className="w-full" disabled={processing || employees.length === 0}>
                  {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Process {paymentType === "partial" ? "Partial " : ""}Salary for {MONTHS[Number(selectedMonth) - 1]} {selectedYear}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" /> Salary History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground py-8 text-center">Loading...</p>
          ) : processings.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center">No salary processed yet</p>
          ) : (
            <>
              <div className="space-y-4">
                {processings.map((p) => (
                  <div key={p._id} className="border rounded-lg">
                    <div
                      className="flex items-center justify-between p-4 cursor-pointer hover:bg-accent/50"
                      onClick={() => setExpandedId(expandedId === p._id ? null : p._id)}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{MONTHS[p.month - 1]} {p.year}</p>
                          {p.paymentType === "partial" && (
                            <Badge className="bg-yellow-100 text-yellow-800 border-0 text-xs">Partial</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {p.employees.length} employees • Processed {format(new Date(p.processedAt), "dd MMM yyyy")}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">
                          {p.currency} {(p.totalPaid ?? p.totalAmount).toLocaleString()}
                        </p>
                        {p.paymentType === "partial" && p.totalPaid !== undefined && p.totalPaid < p.totalAmount && (
                          <p className="text-xs text-muted-foreground">of {p.totalAmount.toLocaleString()} total</p>
                        )}
                      </div>
                    </div>
                    {expandedId === p._id && (
                      <div className="border-t px-4 pb-4">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Employee</TableHead>
                              <TableHead className="text-right">Base</TableHead>
                              <TableHead className="text-right">Deductions</TableHead>
                              <TableHead className="text-right">Bonus</TableHead>
                              <TableHead className="text-right">Net</TableHead>
                              <TableHead className="text-right">Paid</TableHead>
                              <TableHead className="text-right">Status</TableHead>
                              <TableHead className="w-[60px]"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {p.employees.map((emp) => (
                              <TableRow key={emp.employeeId}>
                                <TableCell>{emp.employeeName}</TableCell>
                                <TableCell className="text-right">{emp.baseSalary.toLocaleString()}</TableCell>
                                <TableCell className="text-right text-destructive">
                                  {emp.deductions > 0 ? `-${emp.deductions.toLocaleString()}` : "0"}
                                </TableCell>
                                <TableCell className="text-right text-green-600">
                                  {emp.bonus > 0 ? `+${emp.bonus.toLocaleString()}` : "0"}
                                </TableCell>
                                <TableCell className="text-right font-medium">{emp.netSalary.toLocaleString()}</TableCell>
                                <TableCell className="text-right font-medium">
                                  {(emp.paidAmount ?? emp.netSalary).toLocaleString()}
                                </TableCell>
                                <TableCell className="text-right">{getStatusBadge(emp.status)}</TableCell>
                                <TableCell>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    title="Download Salary Slip"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      window.open(`/api/salary/process/${p._id}/slip?employeeId=${emp.employeeId}`, "_blank");
                                    }}
                                  >
                                    <FileDown className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
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
