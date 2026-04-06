"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Textarea } from "@/components/ui/textarea";
import { CurrencySelect } from "@/components/forms/currency-select";
import { extractCollectionData, getEntityId, toDateInputValue } from "@/lib/form-options";

interface ClientOption {
  _id: string;
  name: string;
  company?: string;
  contactPersonName?: string;
  isActive?: boolean;
}

interface EmployeeOption {
  _id: string;
  name: string;
  employeeId: string;
  designation?: string;
  type?: string;
  status?: string;
  userId?: string | { _id: string; name?: string; role?: string; isActive?: boolean } | null;
}

interface ProjectManagerEmployeeRef {
  _id: string;
  name?: string;
  employeeId?: string;
  designation?: string;
  userId?: string | { _id: string } | null;
}

interface ProjectDialogData {
  _id?: string;
  name?: string;
  description?: string;
  type?: string;
  status?: string;
  startDate?: string | Date | null;
  deadline?: string | Date | null;
  budget?: number;
  currency?: string;
  clientId?: string | { _id: string } | null;
  managerId?: string | ProjectManagerEmployeeRef | null;
  managerUserId?: string | { _id: string } | null;
  team?: Array<string | { _id: string }>;
}

interface ProjectFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: ProjectDialogData | null;
  onSaved?: (project: Record<string, unknown>) => void;
}

const PROJECT_TYPE_OPTIONS = [
  { value: "web", label: "Web" },
  { value: "mobile", label: "Mobile" },
  { value: "design", label: "Design" },
  { value: "marketing", label: "Marketing" },
  { value: "consulting", label: "Consulting" },
  { value: "other", label: "Other" },
];

const PROJECT_STATUS_OPTIONS = [
  { value: "requirement", label: "Requirement" },
  { value: "proposal", label: "Proposal" },
  { value: "in_progress", label: "In Progress" },
  { value: "review", label: "Review" },
  { value: "completed", label: "Completed" },
  { value: "maintenance", label: "Maintenance" },
];

function getInitialForm(project?: ProjectDialogData | null) {
  return {
    name: project?.name || "",
    clientId: getEntityId(project?.clientId),
    description: project?.description || "",
    type: project?.type || "",
    status: project?.status || "requirement",
    startDate: toDateInputValue(project?.startDate),
    deadline: toDateInputValue(project?.deadline),
    managerId: getEntityId(project?.managerId),
    team: Array.isArray(project?.team)
      ? project.team.map((member) => getEntityId(member)).filter(Boolean)
      : [],
    budget: project?.budget?.toString() || "",
    currency: project?.currency || "INR",
  };
}

export function ProjectFormDialog({
  open,
  onOpenChange,
  project,
  onSaved,
}: ProjectFormDialogProps) {
  const [form, setForm] = useState(getInitialForm(project));
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    setForm(getInitialForm(project));
  }, [open, project]);

  useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled = false;

    const loadOptions = async () => {
      setLoadingOptions(true);

      try {
        const [clientResponse, employeeResponse] = await Promise.all([
          fetch("/api/clients?limit=100"),
          fetch("/api/employees?status=active&limit=100"),
        ]);

        const [clientPayload, employeePayload] = await Promise.all([
          clientResponse.json(),
          employeeResponse.json(),
        ]);

        if (cancelled) {
          return;
        }

        const clientOptions = extractCollectionData<ClientOption>(clientPayload)
          .filter((client) => client.isActive !== false)
          .sort((left, right) => left.name.localeCompare(right.name));
        const employeeOptions = extractCollectionData<EmployeeOption>(employeePayload)
          .filter((employee) => employee.status === "active" || !employee.status)
          .sort((left, right) => {
            const typeRank = getEmployeeTypeRank(left.type) - getEmployeeTypeRank(right.type);

            if (typeRank !== 0) {
              return typeRank;
            }

            return left.name.localeCompare(right.name);
          });

        setClients(clientOptions);
        setEmployees(employeeOptions);

        if (!getEntityId(project?.managerId) && project?.managerUserId) {
          const legacyManagerUserId = getEntityId(project.managerUserId);
          const linkedEmployee = employeeOptions.find(
            (employee) => getEntityId(employee.userId) === legacyManagerUserId
          );

          if (linkedEmployee) {
            setForm((currentForm) => ({
              ...currentForm,
              managerId: linkedEmployee._id,
            }));
          }
        }
      } catch {
        if (!cancelled) {
          toast.error("Failed to load project options");
        }
      } finally {
        if (!cancelled) {
          setLoadingOptions(false);
        }
      }
    };

    loadOptions();

    return () => {
      cancelled = true;
    };
  }, [open, project]);

  const dialogTitle = project?._id ? "Edit Project" : "Add Project";

  const managerOptions = useMemo(
    () => employees.filter((employee) => employee.type !== "intern"),
    [employees]
  );

  const selectedManager = useMemo(
    () => managerOptions.find((employee) => employee._id === form.managerId),
    [managerOptions, form.managerId]
  );

  const toggleTeamMember = (employeeId: string, checked: boolean) => {
    setForm((currentForm) => ({
      ...currentForm,
      team: checked
        ? Array.from(new Set([...currentForm.team, employeeId]))
        : currentForm.team.filter((memberId) => memberId !== employeeId),
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!form.name.trim()) {
      toast.error("Project name is required");
      return;
    }

    if (!form.clientId) {
      toast.error("Select a client");
      return;
    }

    if (form.managerId && !selectedManager) {
      toast.error("Select a valid project manager");
      return;
    }

    setSaving(true);

    try {
      const selectedManagerUserId = getEntityId(selectedManager?.userId);
      const url = project?._id ? `/api/projects/${project._id}` : "/api/projects";
      const method = project?._id ? "PUT" : "POST";
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          clientId: form.clientId,
          description: form.description.trim() || undefined,
          type: form.type || undefined,
          status: form.status,
          startDate: form.startDate || undefined,
          deadline: form.deadline || undefined,
          managerId: form.managerId || null,
          managerUserId: selectedManagerUserId || null,
          team: form.team,
          budget: form.budget ? Number(form.budget) : undefined,
          currency: form.currency,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        toast.error(payload.error || "Failed to save project");
        return;
      }

      toast.success(project?._id ? "Project updated" : "Project created");
      onSaved?.(payload as Record<string, unknown>);
      onOpenChange(false);
    } catch {
      toast.error("Failed to save project");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>
            Pick the client, assign any active staff member as project lead, and keep the team attached from one place.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {loadingOptions ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label>Project Name *</Label>
                  <Input
                    value={form.name}
                    onChange={(event) =>
                      setForm((currentForm) => ({ ...currentForm, name: event.target.value }))
                    }
                    placeholder="Example: Client portal revamp"
                    required
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label>Description</Label>
                  <Textarea
                    value={form.description}
                    onChange={(event) =>
                      setForm((currentForm) => ({ ...currentForm, description: event.target.value }))
                    }
                    rows={3}
                    placeholder="Short project summary"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Client *</Label>
                  <Select
                    value={form.clientId || null}
                    onValueChange={(value) =>
                      setForm((currentForm) => ({ ...currentForm, clientId: value || "" }))
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select client">
                        {(() => { const c = clients.find(x => x._id === form.clientId); return c ? `${c.name}${getClientSecondaryLabel(c) ? ` (${getClientSecondaryLabel(c)})` : ""}` : undefined; })()}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {clients.length === 0 ? (
                        <SelectItem value="__no_clients__" disabled>
                          No active clients available
                        </SelectItem>
                      ) : (
                        clients.map((client) => (
                          <SelectItem key={client._id} value={client._id}>
                            {client.name}
                            {getClientSecondaryLabel(client)
                              ? ` (${getClientSecondaryLabel(client)})`
                              : ""}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {clients.length === 0 ? (
                    <p className="text-xs text-destructive">
                      Add a client first in Clients before creating a project.
                    </p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={form.status}
                    onValueChange={(value) =>
                      value && setForm((currentForm) => ({ ...currentForm, status: value }))
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROJECT_STATUS_OPTIONS.map((statusOption) => (
                        <SelectItem key={statusOption.value} value={statusOption.value}>
                          {statusOption.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={form.type || "__none__"}
                    onValueChange={(value) =>
                      setForm((currentForm) => ({ ...currentForm, type: value === "__none__" ? "" : value || "" }))
            
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">No type</SelectItem>
                      {PROJECT_TYPE_OPTIONS.map((typeOption) => (
                        <SelectItem key={typeOption.value} value={typeOption.value}>
                          {typeOption.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={form.startDate}
                    onChange={(event) =>
                      setForm((currentForm) => ({ ...currentForm, startDate: event.target.value }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Deadline</Label>
                  <Input
                    type="date"
                    value={form.deadline}
                    onChange={(event) =>
                      setForm((currentForm) => ({ ...currentForm, deadline: event.target.value }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Project Manager</Label>
                  <Select
                    value={form.managerId || "__none__"}
                    onValueChange={(value) =>
                      setForm((currentForm) => ({
                        ...currentForm,
                        managerId: value === "__none__" ? "" : value || "",
                      }))
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select project manager">
                        {(() => { if (form.managerId === "" || form.managerId === "__none__") return "No project manager"; const m = managerOptions.find(x => x._id === form.managerId); return m ? `${m.name} (${m.designation || m.employeeId})` : undefined; })()}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">No project manager</SelectItem>
                      {managerOptions.map((manager) => (
                        <SelectItem key={manager._id} value={manager._id}>
                          {manager.name} ({manager.designation || manager.employeeId})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Any active staff or director can manage a project. No separate project manager role is required.
                  </p>
                  {selectedManager ? (
                    <p className="text-xs text-muted-foreground">
                      Selected manager: {selectedManager.name}
                      {selectedManager.designation ? ` • ${selectedManager.designation}` : ""}
                      {getEntityId(selectedManager.userId) ? " • Login linked" : " • No login linked"}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <Label>Budget</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min="0"
                      value={form.budget}
                      onChange={(event) =>
                        setForm((currentForm) => ({ ...currentForm, budget: event.target.value }))
                      }
                      placeholder="0"
                      className="flex-1"
                    />
                    <CurrencySelect
                      value={form.currency}
                      onValueChange={(value) =>
                        setForm((currentForm) => ({ ...currentForm, currency: value }))
                      }
                      triggerClassName="w-[160px]"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Team Members</Label>
                  <span className="text-xs text-muted-foreground">
                    {form.team.length} selected
                  </span>
                </div>
                <div className="grid max-h-52 gap-3 overflow-y-auto rounded-xl border border-border/70 p-3 md:grid-cols-2">
                  {employees.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No active team members available.</p>
                  ) : (
                    employees.map((employee) => (
                      <label
                        key={employee._id}
                        className="flex cursor-pointer items-start gap-3 rounded-lg border border-border/60 px-3 py-2 hover:bg-accent/50"
                      >
                        <Checkbox
                          checked={form.team.includes(employee._id)}
                          onCheckedChange={(checked) => toggleTeamMember(employee._id, checked === true)}
                        />
                        <span className="min-w-0">
                          <span className="block text-sm font-medium">{employee.name}</span>
                          <span className="block text-xs text-muted-foreground">
                            {employee.designation || employee.employeeId}
                          </span>
                        </span>
                      </label>
                    ))
                  )}
                </div>
              </div>
            </>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || loadingOptions}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {project?._id ? "Update Project" : "Create Project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function getEmployeeTypeRank(type?: string) {
  if (type === "director") {
    return 0;
  }

  if (type === "staff") {
    return 1;
  }

  return 2;
}

function getClientSecondaryLabel(client: ClientOption) {
  return client.contactPersonName || client.company || "";
}