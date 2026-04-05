"use client";

import { useState, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import {
  ArrowLeft,
  Loader2,
  Save,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Calendar,
  User,
  Users,
  DollarSign,
  Server,
  Database,
  GitBranch,
  FileText,
  Clock,
  Edit,
  Send,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

type Tab = "overview" | "technical" | "proposals" | "stages";

const STATUS_LABELS: Record<string, string> = {
  requirement: "Requirement",
  proposal: "Proposal",
  in_progress: "In Progress",
  review: "Review",
  completed: "Completed",
  maintenance: "Maintenance",
};

const STATUS_COLORS: Record<string, string> = {
  requirement: "bg-blue-100 text-blue-800",
  proposal: "bg-purple-100 text-purple-800",
  in_progress: "bg-yellow-100 text-yellow-800",
  review: "bg-orange-100 text-orange-800",
  completed: "bg-green-100 text-green-800",
  maintenance: "bg-gray-100 text-gray-800",
};

const PROPOSAL_STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800",
  sent: "bg-blue-100 text-blue-800",
  accepted: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyObj = Record<string, any>;

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("overview");
  const [project, setProject] = useState<AnyObj | null>(null);
  const [details, setDetails] = useState<AnyObj | null>(null);
  const [proposals, setProposals] = useState<AnyObj[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    const [pRes, dRes, prRes] = await Promise.all([
      fetch(`/api/projects/${id}`),
      fetch(`/api/projects/${id}/details`),
      fetch(`/api/proposals?projectId=${id}`),
    ]);
    const p = await pRes.json();
    const d = await dRes.json();
    const pr = await prRes.json();
    setProject(p);
    setDetails(d);
    setProposals(Array.isArray(pr) ? pr : []);
    setLoading(false);
  }, [id]);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-16">
        <h2 className="text-xl font-semibold">Project not found</h2>
        <Link href="/dashboard/projects"><Button className="mt-4">Back to Projects</Button></Link>
      </div>
    );
  }

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "overview", label: "Overview", icon: <FileText className="h-4 w-4" /> },
    { key: "technical", label: "Technical Details", icon: <Server className="h-4 w-4" /> },
    { key: "proposals", label: `Proposals (${proposals.length})`, icon: <Send className="h-4 w-4" /> },
    { key: "stages", label: "Stages", icon: <Clock className="h-4 w-4" /> },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/projects">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{project.name}</h1>
              <Badge className={`${STATUS_COLORS[project.status] || ""} border-0`}>
                {STATUS_LABELS[project.status] || project.status}
              </Badge>
            </div>
            {project.clientId && (
              <p className="text-muted-foreground mt-1">
                Client: {project.clientId.name}
                {project.clientId.company ? ` — ${project.clientId.company}` : ""}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === "overview" && (
        <OverviewTab project={project} setProject={setProject} id={id} />
      )}
      {tab === "technical" && (
        <TechnicalTab details={details} setDetails={setDetails} id={id} companyId={project.companyId?._id || project.companyId} />
      )}
      {tab === "proposals" && (
        <ProposalsTab
          proposals={proposals}
          project={project}
          onRefresh={loadData}
        />
      )}
      {tab === "stages" && (
        <StagesTab project={project} setProject={setProject} id={id} />
      )}
    </div>
  );
}

/* ────────── OVERVIEW TAB ────────── */
function OverviewTab({ project, setProject, id }: { project: AnyObj; setProject: (p: AnyObj) => void; id: string }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: project.name,
    description: project.description || "",
    status: project.status,
    budget: project.budget?.toString() || "",
    currency: project.currency || "INR",
    startDate: project.startDate ? format(new Date(project.startDate), "yyyy-MM-dd") : "",
    deadline: project.deadline ? format(new Date(project.deadline), "yyyy-MM-dd") : "",
  });

  const handleSave = async () => {
    setSaving(true);
    const res = await fetch(`/api/projects/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        budget: form.budget ? Number(form.budget) : undefined,
      }),
    });
    if (res.ok) {
      const updated = await res.json();
      setProject(updated);
      setEditing(false);
      toast.success("Project updated");
    } else {
      toast.error("Failed to update project");
    }
    setSaving(false);
  };

  const stagesCompleted = project.stages?.filter((s: AnyObj) => s.status === "completed").length || 0;
  const totalStages = project.stages?.length || 0;

  return (
    <div className="grid gap-6 md:grid-cols-3">
      <div className="md:col-span-2 space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Project Info</CardTitle>
            <Button variant="outline" size="sm" onClick={() => setEditing(!editing)}>
              <Edit className="h-4 w-4 mr-1" />
              {editing ? "Cancel" : "Edit"}
            </Button>
          </CardHeader>
          <CardContent>
            {editing ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label>Name</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Description</Label>
                  <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={(v) => v && setForm({ ...form, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUS_LABELS).map(([k, l]) => (
                        <SelectItem key={k} value={k}>{l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Budget</Label>
                  <div className="flex gap-2">
                    <Input type="number" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} className="flex-1" />
                    <Input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })} className="w-20" maxLength={5} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Deadline</Label>
                  <Input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
                </div>
                <div className="sm:col-span-2 flex justify-end">
                  <Button onClick={handleSave} disabled={saving}>
                    {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    <Save className="h-4 w-4 mr-1" />Save
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {project.description && (
                  <p className="text-sm text-muted-foreground">{project.description}</p>
                )}
                <div className="grid gap-3 sm:grid-cols-2">
                  <InfoRow icon={<Calendar className="h-4 w-4" />} label="Start Date" value={project.startDate ? format(new Date(project.startDate), "MMM d, yyyy") : "—"} />
                  <InfoRow icon={<Calendar className="h-4 w-4" />} label="Deadline" value={project.deadline ? format(new Date(project.deadline), "MMM d, yyyy") : "—"} />
                  <InfoRow icon={<DollarSign className="h-4 w-4" />} label="Budget" value={project.budget ? `${project.currency} ${project.budget.toLocaleString()}` : "—"} />
                  <InfoRow icon={<Clock className="h-4 w-4" />} label="Progress" value={`${stagesCompleted}/${totalStages} stages`} />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Client</CardTitle></CardHeader>
          <CardContent>
            {project.clientId ? (
              <div className="space-y-1 text-sm">
                <p className="font-medium">{project.clientId.name}</p>
                {project.clientId.company && <p className="text-muted-foreground">{project.clientId.company}</p>}
                {project.clientId.email && <p className="text-muted-foreground">{project.clientId.email}</p>}
                {project.clientId.phone && <p className="text-muted-foreground">{project.clientId.phone}</p>}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No client assigned</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Team</CardTitle></CardHeader>
          <CardContent>
            {project.managerId && (
              <div className="flex items-center gap-2 mb-3 pb-3 border-b text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">{project.managerId.name}</p>
                  <p className="text-xs text-muted-foreground">Manager — {project.managerId.designation}</p>
                </div>
              </div>
            )}
            {project.team?.length > 0 ? (
              <div className="space-y-2">
                {project.team.map((m: AnyObj) => (
                  <div key={m._id} className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{m.name}</p>
                      <p className="text-xs text-muted-foreground">{m.designation}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No team members</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Timeline</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-1">
            <p>Created: {format(new Date(project.createdAt), "MMM d, yyyy")}</p>
            <p>Updated: {format(new Date(project.updatedAt), "MMM d, yyyy")}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

/* ────────── TECHNICAL DETAILS TAB ────────── */
function TechnicalTab({
  details,
  setDetails,
  id,
  companyId,
}: {
  details: AnyObj | null;
  setDetails: (d: AnyObj) => void;
  id: string;
  companyId: string;
}) {
  const [saving, setSaving] = useState(false);
  const [showCreds, setShowCreds] = useState(false);
  const [form, setForm] = useState({
    hostingProvider: details?.hosting?.provider || "",
    hostingUrl: details?.hosting?.url || "",
    hostingCredentials: details?.hosting?.credentials || "",
    dbType: details?.database?.type || "",
    dbHost: details?.database?.host || "",
    dbCredentials: details?.database?.credentials || "",
    gitUrls: details?.gitUrls?.join("\n") || "",
    envFiles: details?.envFiles || "",
    serverCostAmount: details?.serverCost?.amount?.toString() || "",
    serverCostCurrency: details?.serverCost?.currency || "USD",
    serverCostFrequency: details?.serverCost?.frequency || "monthly",
    notes: details?.notes || "",
  });

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      companyId,
      hosting: form.hostingProvider || form.hostingUrl ? {
        provider: form.hostingProvider,
        url: form.hostingUrl,
        credentials: form.hostingCredentials,
      } : undefined,
      database: form.dbType || form.dbHost ? {
        type: form.dbType,
        host: form.dbHost,
        credentials: form.dbCredentials,
      } : undefined,
      gitUrls: form.gitUrls.split("\n").map((u: string) => u.trim()).filter(Boolean),
      envFiles: form.envFiles || undefined,
      serverCost: form.serverCostAmount ? {
        amount: Number(form.serverCostAmount),
        currency: form.serverCostCurrency,
        frequency: form.serverCostFrequency,
      } : undefined,
      notes: form.notes || undefined,
    };
    const res = await fetch(`/api/projects/${id}/details`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const updated = await res.json();
      setDetails(updated);
      toast.success("Technical details saved (credentials encrypted)");
    } else {
      toast.error("Failed to save details");
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Technical Details</h2>
          <p className="text-sm text-muted-foreground">Hosting, database, git, and credentials (encrypted at rest)</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowCreds(!showCreds)}>
          {showCreds ? <EyeOff className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
          {showCreds ? "Hide" : "Show"} Secrets
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Server className="h-5 w-5" />Hosting</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Provider</Label>
            <Input value={form.hostingProvider} onChange={(e) => setForm({ ...form, hostingProvider: e.target.value })} placeholder="e.g., AWS, Vercel, DigitalOcean" />
          </div>
          <div className="space-y-2">
            <Label>URL</Label>
            <Input value={form.hostingUrl} onChange={(e) => setForm({ ...form, hostingUrl: e.target.value })} placeholder="https://..." />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Credentials</Label>
            <Textarea
              value={form.hostingCredentials}
              onChange={(e) => setForm({ ...form, hostingCredentials: e.target.value })}
              className={showCreds ? "" : "text-security-disc"}
              style={showCreds ? {} : { WebkitTextSecurity: "disc" } as React.CSSProperties}
              placeholder="SSH keys, login details, etc."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Database className="h-5 w-5" />Database</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Type</Label>
            <Input value={form.dbType} onChange={(e) => setForm({ ...form, dbType: e.target.value })} placeholder="e.g., MongoDB, PostgreSQL, MySQL" />
          </div>
          <div className="space-y-2">
            <Label>Host / Connection String</Label>
            <Input value={form.dbHost} onChange={(e) => setForm({ ...form, dbHost: e.target.value })} placeholder="mongodb+srv://..." />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Credentials</Label>
            <Textarea
              value={form.dbCredentials}
              onChange={(e) => setForm({ ...form, dbCredentials: e.target.value })}
              style={showCreds ? {} : { WebkitTextSecurity: "disc" } as React.CSSProperties}
              placeholder="Username, password, etc."
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><GitBranch className="h-5 w-5" />Git Repositories</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label>Repository URLs (one per line)</Label>
            <Textarea value={form.gitUrls} onChange={(e) => setForm({ ...form, gitUrls: e.target.value })} placeholder="https://github.com/org/repo&#10;https://github.com/org/repo-backend" rows={3} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" />ENV Files</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label>Environment Variables (encrypted at rest)</Label>
            <Textarea
              value={form.envFiles}
              onChange={(e) => setForm({ ...form, envFiles: e.target.value })}
              style={showCreds ? {} : { WebkitTextSecurity: "disc" } as React.CSSProperties}
              placeholder="DB_URL=mongodb+srv://...&#10;JWT_SECRET=abc123"
              rows={6}
              className="font-mono text-sm"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5" />Server Cost</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label>Amount</Label>
            <Input type="number" min="0" value={form.serverCostAmount} onChange={(e) => setForm({ ...form, serverCostAmount: e.target.value })} placeholder="0" />
          </div>
          <div className="space-y-2">
            <Label>Currency</Label>
            <Input value={form.serverCostCurrency} onChange={(e) => setForm({ ...form, serverCostCurrency: e.target.value.toUpperCase() })} maxLength={5} />
          </div>
          <div className="space-y-2">
            <Label>Frequency</Label>
            <Select value={form.serverCostFrequency} onValueChange={(v) => v && setForm({ ...form, serverCostFrequency: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
        <CardContent>
          <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Additional technical notes..." rows={3} />
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} className="w-full">
        {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        <Save className="h-4 w-4 mr-1" />Save Technical Details
      </Button>
    </div>
  );
}

/* ────────── PROPOSALS TAB ────────── */
function ProposalsTab({
  proposals,
  project,
  onRefresh,
}: {
  proposals: AnyObj[];
  project: AnyObj;
  onRefresh: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    content: "",
    amount: "",
    currency: project.currency || "INR",
    validUntil: "",
    notes: "",
    sections: [{ heading: "", body: "", order: 0 }],
  });

  const addSection = () =>
    setForm({ ...form, sections: [...form.sections, { heading: "", body: "", order: form.sections.length }] });

  const removeSection = (idx: number) =>
    setForm({ ...form, sections: form.sections.filter((_, i) => i !== idx) });

  const updateSection = (idx: number, field: string, value: string) =>
    setForm({
      ...form,
      sections: form.sections.map((s, i) => (i === idx ? { ...s, [field]: value } : s)),
    });

  const handleCreate = async () => {
    setSaving(true);
    const res = await fetch("/api/proposals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: project._id,
        clientId: project.clientId?._id || project.clientId,
        title: form.title,
        content: form.content,
        sections: form.sections.filter((s) => s.heading.trim()),
        amount: Number(form.amount),
        currency: form.currency,
        validUntil: form.validUntil || undefined,
        notes: form.notes || undefined,
      }),
    });
    if (res.ok) {
      setOpen(false);
      setForm({ title: "", content: "", amount: "", currency: project.currency || "INR", validUntil: "", notes: "", sections: [{ heading: "", body: "", order: 0 }] });
      toast.success("Proposal created");
      onRefresh();
    } else {
      const data = await res.json();
      toast.error(data.error || "Failed to create proposal");
    }
    setSaving(false);
  };

  const updateStatus = async (proposalId: string, status: string) => {
    const res = await fetch(`/api/proposals/${proposalId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status,
        ...(status === "sent" ? { sentAt: new Date() } : {}),
        ...(status === "accepted" || status === "rejected" ? { respondedAt: new Date() } : {}),
      }),
    });
    if (res.ok) {
      toast.success(`Proposal marked as ${status}`);
      onRefresh();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Proposals</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button size="sm"><Plus className="h-4 w-4 mr-1" />New Proposal</Button>} />
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Proposal</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label>Title *</Label>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Proposal title" />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Summary</Label>
                  <Textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="Executive summary..." rows={3} />
                </div>
                <div className="space-y-2">
                  <Label>Amount *</Label>
                  <div className="flex gap-2">
                    <Input type="number" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="flex-1" />
                    <Input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })} className="w-20" maxLength={5} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Valid Until</Label>
                  <Input type="date" value={form.validUntil} onChange={(e) => setForm({ ...form, validUntil: e.target.value })} />
                </div>
              </div>

              {/* Sections */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base">Sections</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addSection}>
                    <Plus className="h-3 w-3 mr-1" />Add
                  </Button>
                </div>
                {form.sections.map((s, i) => (
                  <div key={i} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Input
                        value={s.heading}
                        onChange={(e) => updateSection(i, "heading", e.target.value)}
                        placeholder={`Section ${i + 1} heading`}
                        className="flex-1"
                      />
                      {form.sections.length > 1 && (
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeSection(i)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                    <Textarea
                      value={s.body}
                      onChange={(e) => updateSection(i, "body", e.target.value)}
                      placeholder="Section content..."
                      rows={3}
                    />
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <Label>Internal Notes</Label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Internal notes (not shared with client)" rows={2} />
              </div>

              <Button onClick={handleCreate} disabled={saving || !form.title || !form.amount} className="w-full">
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Proposal
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {proposals.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">No proposals yet</p>
            <p className="text-sm text-muted-foreground">Create one to start tracking</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {proposals.map((p) => (
            <Card key={p._id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold truncate">{p.title}</h3>
                      <Badge className={`${PROPOSAL_STATUS_COLORS[p.status] || ""} border-0 shrink-0`}>
                        {p.status}
                      </Badge>
                    </div>
                    {p.content && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{p.content}</p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">
                        {p.currency} {p.amount?.toLocaleString()}
                      </span>
                      {p.validUntil && (
                        <span>Valid until {format(new Date(p.validUntil), "MMM d, yyyy")}</span>
                      )}
                      {p.sections?.length > 0 && (
                        <span>{p.sections.length} section{p.sections.length > 1 ? "s" : ""}</span>
                      )}
                      <span>{format(new Date(p.createdAt), "MMM d, yyyy")}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {p.status === "draft" && (
                      <Button variant="outline" size="sm" onClick={() => updateStatus(p._id, "sent")}>
                        <Send className="h-3 w-3 mr-1" />Send
                      </Button>
                    )}
                    {p.status === "sent" && (
                      <>
                        <Button variant="outline" size="sm" onClick={() => updateStatus(p._id, "accepted")} className="text-green-600">
                          <CheckCircle className="h-3 w-3 mr-1" />Accept
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => updateStatus(p._id, "rejected")} className="text-red-600">
                          <XCircle className="h-3 w-3 mr-1" />Reject
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* ────────── STAGES TAB ────────── */
function StagesTab({ project, setProject, id }: { project: AnyObj; setProject: (p: AnyObj) => void; id: string }) {
  const stages: AnyObj[] = project.stages || [];
  const [saving, setSaving] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newStage, setNewStage] = useState("");

  const updateStageStatus = async (index: number, status: string) => {
    const updatedStages = stages.map((s, i) =>
      i === index
        ? {
            ...s,
            status,
            ...(status === "in_progress" && !s.startDate ? { startDate: new Date() } : {}),
            ...(status === "completed" ? { endDate: new Date() } : {}),
          }
        : s
    );
    setSaving(true);
    const res = await fetch(`/api/projects/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stages: updatedStages }),
    });
    if (res.ok) {
      const updated = await res.json();
      setProject(updated);
      toast.success("Stage updated");
    }
    setSaving(false);
  };

  const addStage = async () => {
    if (!newStage.trim()) return;
    const updatedStages = [...stages, { name: newStage.trim(), status: "pending" }];
    setSaving(true);
    const res = await fetch(`/api/projects/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stages: updatedStages }),
    });
    if (res.ok) {
      const updated = await res.json();
      setProject(updated);
      setNewStage("");
      setShowAdd(false);
      toast.success("Stage added");
    }
    setSaving(false);
  };

  const removeStage = async (index: number) => {
    const updatedStages = stages.filter((_, i) => i !== index);
    setSaving(true);
    const res = await fetch(`/api/projects/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stages: updatedStages }),
    });
    if (res.ok) {
      const updated = await res.json();
      setProject(updated);
      toast.success("Stage removed");
    }
    setSaving(false);
  };

  const updateStageNotes = async (index: number, notes: string) => {
    const updatedStages = stages.map((s, i) => (i === index ? { ...s, notes } : s));
    const res = await fetch(`/api/projects/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stages: updatedStages }),
    });
    if (res.ok) {
      const updated = await res.json();
      setProject(updated);
    }
  };

  const stageStatusIcon = (status: string) => {
    switch (status) {
      case "completed": return <CheckCircle className="h-5 w-5 text-green-600" />;
      case "in_progress": return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      default: return <Clock className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const completed = stages.filter((s) => s.status === "completed").length;
  const progress = stages.length > 0 ? Math.round((completed / stages.length) * 100) : 0;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Project Stages</h2>
          <p className="text-sm text-muted-foreground">{completed}/{stages.length} completed — {progress}%</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => setShowAdd(!showAdd)}>
          <Plus className="h-4 w-4 mr-1" />Add Stage
        </Button>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-muted rounded-full h-2.5">
        <div
          className="bg-primary h-2.5 rounded-full transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>

      {showAdd && (
        <Card>
          <CardContent className="p-4">
            <div className="flex gap-2">
              <Input
                value={newStage}
                onChange={(e) => setNewStage(e.target.value)}
                placeholder="Stage name..."
                onKeyDown={(e) => e.key === "Enter" && addStage()}
              />
              <Button onClick={addStage} disabled={saving || !newStage.trim()}>Add</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {stages.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Clock className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">No stages defined</p>
            <p className="text-sm text-muted-foreground">Stages are auto-created when a project is created</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {stages.map((stage, i) => (
            <Card key={i} className={stage.status === "completed" ? "opacity-70" : ""}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="pt-0.5">{stageStatusIcon(stage.status)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h3 className={`font-medium ${stage.status === "completed" ? "line-through" : ""}`}>
                        {stage.name}
                      </h3>
                      <div className="flex items-center gap-1 shrink-0">
                        <Select value={stage.status} onValueChange={(v) => v && updateStageStatus(i, v)}>
                          <SelectTrigger className="h-7 text-xs w-[120px]"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeStage(i)}>
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex gap-4 text-xs text-muted-foreground mb-2">
                      {stage.startDate && <span>Started: {format(new Date(stage.startDate), "MMM d, yyyy")}</span>}
                      {stage.endDate && <span>Ended: {format(new Date(stage.endDate), "MMM d, yyyy")}</span>}
                    </div>
                    <Input
                      className="text-sm h-8"
                      placeholder="Notes..."
                      defaultValue={stage.notes || ""}
                      onBlur={(e) => {
                        if (e.target.value !== (stage.notes || "")) {
                          updateStageNotes(i, e.target.value);
                        }
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
