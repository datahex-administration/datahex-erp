"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ClientOption { _id: string; name: string; company?: string }
interface EmployeeOption { _id: string; name: string; employeeId: string; designation: string }

export default function NewProjectPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [form, setForm] = useState({
    name: "",
    clientId: "",
    description: "",
    status: "requirement",
    startDate: "",
    deadline: "",
    managerId: "",
    budget: "",
    currency: "INR",
  });

  useEffect(() => {
    Promise.all([
      fetch("/api/clients").then((r) => r.json()),
      fetch("/api/employees?status=active").then((r) => r.json()),
    ]).then(([c, e]) => {
      setClients(Array.isArray(c) ? c : []);
      setEmployees(Array.isArray(e) ? e : []);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        budget: form.budget ? Number(form.budget) : undefined,
        managerId: form.managerId || undefined,
      }),
    });

    if (res.ok) {
      const project = await res.json();
      toast.success("Project created");
      router.push(`/dashboard/projects/${project._id}`);
    } else {
      const data = await res.json();
      toast.error(data.error || "Failed to create project");
    }
    setSaving(false);
  };

  const updateForm = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/projects">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">New Project</h1>
          <p className="text-muted-foreground mt-1">Set up a new project</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Project Details</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Project Name *</Label>
              <Input value={form.name} onChange={(e) => updateForm("name", e.target.value)} required placeholder="e.g., E-commerce Platform" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => updateForm("description", e.target.value)} placeholder="Brief project description..." rows={3} />
            </div>
            <div className="space-y-2">
              <Label>Client *</Label>
              <Select value={form.clientId} onValueChange={(v) => v && updateForm("clientId", v)}>
                <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c._id} value={c._id}>{c.name}{c.company ? ` (${c.company})` : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => v && updateForm("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="requirement">Requirement</SelectItem>
                  <SelectItem value="proposal">Proposal</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="review">Review</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input type="date" value={form.startDate} onChange={(e) => updateForm("startDate", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Deadline</Label>
              <Input type="date" value={form.deadline} onChange={(e) => updateForm("deadline", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Project Manager</Label>
              <Select value={form.managerId} onValueChange={(v) => v && updateForm("managerId", v)}>
                <SelectTrigger><SelectValue placeholder="Assign manager" /></SelectTrigger>
                <SelectContent>
                  {employees.map((e) => (
                    <SelectItem key={e._id} value={e._id}>{e.name} ({e.employeeId})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Budget</Label>
              <div className="flex gap-2">
                <Input type="number" min="0" value={form.budget} onChange={(e) => updateForm("budget", e.target.value)} placeholder="0" className="flex-1" />
                <Input value={form.currency} onChange={(e) => updateForm("currency", e.target.value.toUpperCase())} className="w-20" maxLength={5} />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" disabled={saving} className="flex-1">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Project
          </Button>
          <Link href="/dashboard/projects">
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
