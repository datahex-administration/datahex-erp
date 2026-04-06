"use client";

import { useState, useEffect, use, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Pencil,
  Mail,
  Phone,
  Building2,
  Calendar,
  Wallet,
  Banknote,
  User,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { EmployeeFormDialog } from "@/components/dashboard/employee-form-dialog";
import { SalaryIncrementDialog } from "@/components/dashboard/salary-increment-dialog";

interface EmployeeDetail {
  _id: string;
  employeeId: string;
  name: string;
  email: string;
  phone?: string;
  designation: string;
  type: string;
  department?: string;
  joiningDate: string;
  endDate?: string;
  salary: number;
  currency: string;
  status: string;
  bankDetails?: {
    bankName?: string;
    accountNumber?: string;
    ifsc?: string;
    accountHolder?: string;
  };
  documents: Array<{ name: string; url: string; uploadedAt: string }>;
  companyId: { _id: string; name: string; code: string; currency: string };
  createdAt: string;
}

interface SalaryIncrement {
  _id: string;
  previousSalary: number;
  newSalary: number;
  effectiveDate: string;
  reason?: string;
}

export default function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [employee, setEmployee] = useState<EmployeeDetail | null>(null);
  const [increments, setIncrements] = useState<SalaryIncrement[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [incrementDialogOpen, setIncrementDialogOpen] = useState(false);

  const loadEmployeeData = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch(`/api/employees/${id}`).then((r) => r.json()),
      fetch(`/api/salary/increments?employeeId=${id}`).then((r) => r.ok ? r.json() : []),
    ]).then(([emp, inc]) => {
      setEmployee(emp);
      setIncrements(Array.isArray(inc) ? inc : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    loadEmployeeData();
  }, [loadEmployeeData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Employee not found</p>
        <Link href="/dashboard/employees">
          <Button variant="link" className="mt-2">Back to employees</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{employee.name}</h1>
              <Badge className="capitalize">{employee.type}</Badge>
              <Badge variant={employee.status === "active" ? "default" : "secondary"} className="capitalize">
                {employee.status.replace("_", " ")}
              </Badge>
            </div>
            <p className="text-muted-foreground mt-1 font-mono">{employee.employeeId}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setIncrementDialogOpen(true)}>
            <Wallet className="mr-2 h-4 w-4" /> Update Salary
          </Button>
          <Button variant="outline" onClick={() => setEditDialogOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" /> Edit
          </Button>
        </div>
      </div>

      <EmployeeFormDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        employee={employee}
        onSaved={loadEmployeeData}
      />

      <SalaryIncrementDialog
        open={incrementDialogOpen}
        onOpenChange={setIncrementDialogOpen}
        employeeId={employee._id}
        currentSalary={employee.salary}
        currency={employee.currency}
        onSaved={loadEmployeeData}
      />

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="salary">Salary History</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-4">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Personal Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <User className="h-4 w-4" /> Personal Info
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <InfoRow icon={<Mail className="h-4 w-4" />} label="Email" value={employee.email} />
                <InfoRow icon={<Phone className="h-4 w-4" />} label="Phone" value={employee.phone || "—"} />
                <InfoRow icon={<Building2 className="h-4 w-4" />} label="Company" value={employee.companyId?.name || "—"} />
                <InfoRow icon={<User className="h-4 w-4" />} label="Designation" value={employee.designation} />
                {employee.department && (
                  <InfoRow icon={<Building2 className="h-4 w-4" />} label="Department" value={employee.department} />
                )}
              </CardContent>
            </Card>

            {/* Employment Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Calendar className="h-4 w-4" /> Employment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <InfoRow icon={<Calendar className="h-4 w-4" />} label="Joined" value={format(new Date(employee.joiningDate), "dd MMM yyyy")} />
                {employee.endDate && (
                  <InfoRow icon={<Calendar className="h-4 w-4" />} label="End Date" value={format(new Date(employee.endDate), "dd MMM yyyy")} />
                )}
                <Separator />
                <InfoRow icon={<Wallet className="h-4 w-4" />} label="Salary" value={`${employee.currency} ${employee.salary.toLocaleString()}`} />
              </CardContent>
            </Card>

            {/* Bank Details */}
            {employee.bankDetails?.bankName && (
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Banknote className="h-4 w-4" /> Bank Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2">
                  <InfoRow label="Bank" value={employee.bankDetails.bankName || "—"} />
                  <InfoRow label="Account" value={employee.bankDetails.accountNumber || "—"} />
                  <InfoRow label="IFSC" value={employee.bankDetails.ifsc || "—"} />
                  <InfoRow label="Holder" value={employee.bankDetails.accountHolder || "—"} />
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="salary" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <CardTitle>Salary Increment History</CardTitle>
              <Button variant="outline" size="sm" onClick={() => setIncrementDialogOpen(true)}>
                <Wallet className="mr-2 h-4 w-4" /> Add Increment
              </Button>
            </CardHeader>
            <CardContent>
              {increments.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No salary increments recorded</p>
              ) : (
                <div className="space-y-4">
                  {increments.map((inc) => (
                    <div key={inc._id} className="flex items-center justify-between p-4 rounded-lg border">
                      <div>
                        <p className="font-medium">
                          {employee.currency} {inc.previousSalary.toLocaleString()} → {employee.currency} {inc.newSalary.toLocaleString()}
                        </p>
                        {inc.reason && <p className="text-sm text-muted-foreground">{inc.reason}</p>}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(inc.effectiveDate), "dd MMM yyyy")}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Documents</CardTitle>
            </CardHeader>
            <CardContent>
              {employee.documents.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No documents uploaded</p>
              ) : (
                <div className="space-y-2">
                  {employee.documents.map((doc, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg border">
                      <span className="font-medium">{doc.name}</span>
                      <a href={doc.url} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm">Download</Button>
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-sm text-muted-foreground">
        {icon} {label}
      </span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}
