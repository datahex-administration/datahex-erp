"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CurrencySelect } from "@/components/forms/currency-select";
import { extractCollectionData, getEntityId, toDateInputValue } from "@/lib/form-options";

interface CompanyOption {
  _id: string;
  name: string;
  code: string;
  currency?: string;
}

interface EmployeeDialogData {
  _id?: string;
  name?: string;
  email?: string;
  phone?: string;
  designation?: string;
  type?: string;
  department?: string;
  joiningDate?: string | Date | null;
  endDate?: string | Date | null;
  salary?: number;
  currency?: string;
  status?: string;
  companyId?: string | CompanyOption | null;
  bankDetails?: {
    bankName?: string;
    accountNumber?: string;
    ifsc?: string;
    accountHolder?: string;
  };
}

interface EmployeeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee?: EmployeeDialogData | null;
  onSaved?: (employee: Record<string, unknown>) => void;
}

function getInitialForm(employee?: EmployeeDialogData | null) {
  return {
    name: employee?.name || "",
    email: employee?.email || "",
    phone: employee?.phone || "",
    designation: employee?.designation || "",
    type: employee?.type || "staff",
    department: employee?.department || "",
    joiningDate: toDateInputValue(employee?.joiningDate) || new Date().toISOString().split("T")[0],
    endDate: toDateInputValue(employee?.endDate),
    salary: employee?.salary?.toString() || "",
    currency: employee?.currency || "INR",
    status: employee?.status || "active",
    companyId: getEntityId(employee?.companyId),
    bankName: employee?.bankDetails?.bankName || "",
    accountNumber: employee?.bankDetails?.accountNumber || "",
    ifsc: employee?.bankDetails?.ifsc || "",
    accountHolder: employee?.bankDetails?.accountHolder || "",
  };
}

export function EmployeeFormDialog({
  open,
  onOpenChange,
  employee,
  onSaved,
}: EmployeeFormDialogProps) {
  const { user } = useAuth();
  const [form, setForm] = useState(getInitialForm(employee));
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [loadingEmployee, setLoadingEmployee] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    setForm(getInitialForm(employee));
  }, [open, employee]);

  useEffect(() => {
    if (!open || !employee?._id) {
      return;
    }

    let cancelled = false;

    const loadEmployee = async () => {
      setLoadingEmployee(true);

      try {
        const response = await fetch(`/api/employees/${employee._id}`);

        if (!response.ok) {
          throw new Error("Failed to load employee");
        }

        const payload = (await response.json()) as EmployeeDialogData;

        if (!cancelled) {
          setForm(getInitialForm(payload));
        }
      } catch {
        if (!cancelled) {
          toast.error("Failed to load employee details");
        }
      } finally {
        if (!cancelled) {
          setLoadingEmployee(false);
        }
      }
    };

    loadEmployee();

    return () => {
      cancelled = true;
    };
  }, [open, employee?._id]);

  useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled = false;

    const loadCompanies = async () => {
      setLoadingOptions(true);

      try {
        const response = await fetch("/api/companies?limit=100");
        const payload = await response.json();

        if (cancelled) {
          return;
        }

        const options = extractCollectionData<CompanyOption>(payload);
        setCompanies(options);

        if (!employee?._id && options.length === 1) {
          setForm((currentForm) => ({
            ...currentForm,
            companyId: currentForm.companyId || options[0]._id,
            currency: currentForm.currency || options[0].currency || "INR",
          }));
        }
      } catch {
        if (!cancelled) {
          toast.error("Failed to load company options");
        }
      } finally {
        if (!cancelled) {
          setLoadingOptions(false);
        }
      }
    };

    loadCompanies();

    return () => {
      cancelled = true;
    };
  }, [open, employee?._id]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!form.name.trim() || !form.email.trim() || !form.designation.trim() || !form.joiningDate) {
      toast.error("Name, email, designation, and joining date are required");
      return;
    }

    if (user?.role === "super_admin" && companies.length > 1 && !form.companyId) {
      toast.error("Select a company");
      return;
    }

    setSaving(true);

    try {
      const url = employee?._id ? `/api/employees/${employee._id}` : "/api/employees";
      const method = employee?._id ? "PUT" : "POST";
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          phone: form.phone.trim() || undefined,
          designation: form.designation.trim(),
          type: form.type,
          department: form.department.trim() || undefined,
          joiningDate: form.joiningDate,
          endDate: form.endDate || undefined,
          salary: form.salary ? Number(form.salary) : 0,
          currency: form.currency,
          status: form.status,
          companyId: form.companyId || undefined,
          bankDetails:
            form.bankName || form.accountNumber || form.ifsc || form.accountHolder
              ? {
                  bankName: form.bankName.trim() || undefined,
                  accountNumber: form.accountNumber.trim() || undefined,
                  ifsc: form.ifsc.trim() || undefined,
                  accountHolder: form.accountHolder.trim() || undefined,
                }
              : undefined,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        toast.error(payload.error || "Failed to save employee");
        return;
      }

      toast.success(employee?._id ? "Employee updated" : "Employee created");
      onSaved?.(payload as Record<string, unknown>);
      onOpenChange(false);
    } catch {
      toast.error("Failed to save employee");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{employee?._id ? "Edit Employee" : "Add Employee"}</DialogTitle>
          <DialogDescription>
            Keep profile, salary, and company mapping in one standard dialog.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {loadingOptions || loadingEmployee ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Full Name *</Label>
                  <Input
                    value={form.name}
                    onChange={(event) => setForm((currentForm) => ({ ...currentForm, name: event.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email *</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(event) => setForm((currentForm) => ({ ...currentForm, email: event.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input
                    value={form.phone}
                    onChange={(event) => setForm((currentForm) => ({ ...currentForm, phone: event.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Designation *</Label>
                  <Input
                    value={form.designation}
                    onChange={(event) =>
                      setForm((currentForm) => ({ ...currentForm, designation: event.target.value }))
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Type *</Label>
                  <Select
                    value={form.type}
                    onValueChange={(value) => value && setForm((currentForm) => ({ ...currentForm, type: value }))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="director">Director</SelectItem>
                      <SelectItem value="staff">Staff</SelectItem>
                      <SelectItem value="intern">Intern</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={form.status}
                    onValueChange={(value) => value && setForm((currentForm) => ({ ...currentForm, status: value }))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="resigned">Resigned</SelectItem>
                      <SelectItem value="terminated">Terminated</SelectItem>
                      <SelectItem value="intern_completed">Intern Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Input
                    value={form.department}
                    onChange={(event) => setForm((currentForm) => ({ ...currentForm, department: event.target.value }))}
                  />
                </div>
                {user?.role === "super_admin" && companies.length > 0 ? (
                  <div className="space-y-2">
                    <Label>Company *</Label>
                    <Select
                      value={form.companyId && companies.some((c) => c._id === form.companyId) ? form.companyId : undefined}
                      onValueChange={(value) => {
                        if (!value) {
                          return;
                        }

                        const selectedCompany = companies.find((company) => company._id === value);
                        setForm((currentForm) => ({
                          ...currentForm,
                          companyId: value,
                          currency: selectedCompany?.currency || currentForm.currency,
                        }));
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select company">
                          {(() => { const c = companies.find(x => x._id === form.companyId); return c ? `${c.name} (${c.code})` : undefined; })()}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {companies.map((company) => (
                          <SelectItem key={company._id} value={company._id}>
                            {company.name} ({company.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}
                <div className="space-y-2">
                  <Label>Joining Date *</Label>
                  <Input
                    type="date"
                    value={form.joiningDate}
                    onChange={(event) => setForm((currentForm) => ({ ...currentForm, joiningDate: event.target.value }))}
                    required
                  />
                </div>
                {form.type === "intern" || form.status !== "active" || form.endDate ? (
                  <div className="space-y-2">
                    <Label>End Date</Label>
                    <Input
                      type="date"
                      value={form.endDate}
                      onChange={(event) => setForm((currentForm) => ({ ...currentForm, endDate: event.target.value }))}
                    />
                  </div>
                ) : null}
                <div className="space-y-2 md:col-span-2">
                  <Label>Monthly Salary</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min="0"
                      value={form.salary}
                      onChange={(event) => setForm((currentForm) => ({ ...currentForm, salary: event.target.value }))}
                      className="flex-1"
                    />
                    <CurrencySelect
                      value={form.currency}
                      onValueChange={(value) => setForm((currentForm) => ({ ...currentForm, currency: value }))}
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Bank Name</Label>
                  <Input
                    value={form.bankName}
                    onChange={(event) => setForm((currentForm) => ({ ...currentForm, bankName: event.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Account Number</Label>
                  <Input
                    value={form.accountNumber}
                    onChange={(event) =>
                      setForm((currentForm) => ({ ...currentForm, accountNumber: event.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>IFSC Code</Label>
                  <Input
                    value={form.ifsc}
                    onChange={(event) => setForm((currentForm) => ({ ...currentForm, ifsc: event.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Account Holder</Label>
                  <Input
                    value={form.accountHolder}
                    onChange={(event) =>
                      setForm((currentForm) => ({ ...currentForm, accountHolder: event.target.value }))
                    }
                  />
                </div>
              </div>
            </>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || loadingOptions || loadingEmployee}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {employee?._id ? "Update Employee" : "Create Employee"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}