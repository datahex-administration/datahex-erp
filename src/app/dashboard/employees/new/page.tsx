"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface CompanyOption {
  _id: string;
  name: string;
  code: string;
  currency: string;
}

export default function NewEmployeePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    designation: "",
    type: "staff",
    department: "",
    joiningDate: new Date().toISOString().split("T")[0],
    endDate: "",
    salary: "",
    currency: "INR",
    companyId: "",
    bankName: "",
    accountNumber: "",
    ifsc: "",
    accountHolder: "",
  });

  useEffect(() => {
    fetch("/api/companies")
      .then((r) => r.json())
      .then((data) => {
        setCompanies(data);
        if (data.length === 1) {
          setForm((f) => ({ ...f, companyId: data[0]._id, currency: data[0].currency }));
        }
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const payload = {
      name: form.name,
      email: form.email,
      phone: form.phone || undefined,
      designation: form.designation,
      type: form.type,
      department: form.department || undefined,
      joiningDate: form.joiningDate,
      endDate: form.endDate || undefined,
      salary: Number(form.salary) || 0,
      currency: form.currency,
      companyId: form.companyId || undefined,
      bankDetails: form.bankName
        ? {
            bankName: form.bankName,
            accountNumber: form.accountNumber,
            ifsc: form.ifsc,
            accountHolder: form.accountHolder,
          }
        : undefined,
    };

    const res = await fetch("/api/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      toast.success("Employee added successfully");
      router.push("/dashboard/employees");
    } else {
      const data = await res.json();
      toast.error(data.error || "Failed to add employee");
    }
    setSaving(false);
  };

  const updateForm = (field: string, value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/employees">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Add Employee</h1>
          <p className="text-muted-foreground mt-1">Fill in the employee details</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Full Name *</Label>
              <Input value={form.name} onChange={(e) => updateForm("name", e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input type="email" value={form.email} onChange={(e) => updateForm("email", e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => updateForm("phone", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Designation *</Label>
              <Input value={form.designation} onChange={(e) => updateForm("designation", e.target.value)} required placeholder="e.g., Software Engineer" />
            </div>
            <div className="space-y-2">
              <Label>Type *</Label>
              <Select value={form.type} onValueChange={(v) => v && updateForm("type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="director">Director</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="intern">Intern</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Department</Label>
              <Input value={form.department} onChange={(e) => updateForm("department", e.target.value)} placeholder="e.g., Engineering" />
            </div>
            {user?.role === "super_admin" && companies.length > 1 && (
              <div className="space-y-2">
                <Label>Company *</Label>
                <Select value={form.companyId} onValueChange={(v) => {
                  if (!v) return;
                  const c = companies.find((co) => co._id === v);
                  setForm((f) => ({ ...f, companyId: v, currency: c?.currency || f.currency }));
                }}>
                  <SelectTrigger><SelectValue placeholder="Select company" /></SelectTrigger>
                  <SelectContent>
                    {companies.map((c) => (
                      <SelectItem key={c._id} value={c._id}>{c.name} ({c.code})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dates & Salary */}
        <Card>
          <CardHeader>
            <CardTitle>Employment Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Joining Date *</Label>
              <Input type="date" value={form.joiningDate} onChange={(e) => updateForm("joiningDate", e.target.value)} required />
            </div>
            {form.type === "intern" && (
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input type="date" value={form.endDate} onChange={(e) => updateForm("endDate", e.target.value)} />
              </div>
            )}
            <div className="space-y-2">
              <Label>Monthly Salary</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min="0"
                  value={form.salary}
                  onChange={(e) => updateForm("salary", e.target.value)}
                  placeholder="0"
                  className="flex-1"
                />
                <Input
                  value={form.currency}
                  onChange={(e) => updateForm("currency", e.target.value.toUpperCase())}
                  className="w-20"
                  maxLength={5}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bank Details */}
        <Card>
          <CardHeader>
            <CardTitle>Bank Details (Optional)</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Bank Name</Label>
              <Input value={form.bankName} onChange={(e) => updateForm("bankName", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Account Number</Label>
              <Input value={form.accountNumber} onChange={(e) => updateForm("accountNumber", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>IFSC Code</Label>
              <Input value={form.ifsc} onChange={(e) => updateForm("ifsc", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Account Holder Name</Label>
              <Input value={form.accountHolder} onChange={(e) => updateForm("accountHolder", e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" disabled={saving} className="flex-1">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Add Employee
          </Button>
          <Link href="/dashboard/employees">
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
