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
import { Wallet, Play, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface SalaryProcessingData {
  _id: string;
  month: number;
  year: number;
  employees: Array<{
    employeeId: string;
    employeeName: string;
    baseSalary: number;
    deductions: number;
    bonus: number;
    netSalary: number;
    status: string;
  }>;
  totalAmount: number;
  currency: string;
  processedBy?: { name: string };
  processedAt: string;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function SalaryPage() {
  const [processings, setProcessings] = useState<SalaryProcessingData[]>([]);
  const [loading, setLoading] = useState(true);
  const [processDialogOpen, setProcessDialogOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(String(new Date().getMonth() + 1));
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchProcessings = useCallback(async () => {
    const res = await fetch("/api/salary/process");
    if (res.ok) setProcessings(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchProcessings();
  }, [fetchProcessings]);

  const handleProcess = async () => {
    setProcessing(true);
    const res = await fetch("/api/salary/process", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ month: selectedMonth, year: selectedYear }),
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Salary Management</h1>
          <p className="text-muted-foreground mt-1">Process and track salary payments</p>
        </div>
        <Dialog open={processDialogOpen} onOpenChange={setProcessDialogOpen}>
          <DialogTrigger
            render={<Button><Play className="mr-2 h-4 w-4" /> Process Salary</Button>}
          />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Process Monthly Salary</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
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
                    max={2030}
                  />
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                This will calculate salary for all active employees and create an expense entry.
              </p>
              <Button onClick={handleProcess} className="w-full" disabled={processing}>
                {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Process Salary for {MONTHS[Number(selectedMonth) - 1]} {selectedYear}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
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
            <div className="space-y-4">
              {processings.map((p) => (
                <div key={p._id} className="border rounded-lg">
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-accent/50"
                    onClick={() => setExpandedId(expandedId === p._id ? null : p._id)}
                  >
                    <div>
                      <p className="font-medium">
                        {MONTHS[p.month - 1]} {p.year}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {p.employees.length} employees • Processed {format(new Date(p.processedAt), "dd MMM yyyy")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">
                        {p.currency} {p.totalAmount.toLocaleString()}
                      </p>
                      <Badge variant="default">Processed</Badge>
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
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {p.employees.map((emp) => (
                            <TableRow key={emp.employeeId}>
                              <TableCell>{emp.employeeName}</TableCell>
                              <TableCell className="text-right">{emp.baseSalary.toLocaleString()}</TableCell>
                              <TableCell className="text-right text-destructive">{emp.deductions.toLocaleString()}</TableCell>
                              <TableCell className="text-right text-green-600">{emp.bonus.toLocaleString()}</TableCell>
                              <TableCell className="text-right font-medium">{emp.netSalary.toLocaleString()}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
