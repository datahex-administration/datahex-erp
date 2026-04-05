"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Eye, Calendar, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { Pagination } from "@/components/ui/pagination";
import { ExportButton } from "@/components/ui/export-button";

interface ProjectData {
  _id: string;
  name: string;
  description?: string;
  status: string;
  startDate?: string;
  deadline?: string;
  budget?: number;
  currency: string;
  clientId?: { _id: string; name: string; company?: string };
  managerId?: { _id: string; name: string; employeeId: string };
  team: Array<{ _id: string; name: string }>;
  updatedAt: string;
}

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  requirement: { label: "Requirement", variant: "outline" },
  proposal: { label: "Proposal", variant: "secondary" },
  in_progress: { label: "In Progress", variant: "default" },
  review: { label: "Review", variant: "secondary" },
  completed: { label: "Completed", variant: "default" },
  maintenance: { label: "Maintenance", variant: "outline" },
};

const KANBAN_COLUMNS = ["requirement", "proposal", "in_progress", "review", "completed", "maintenance"];

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [view, setView] = useState<"list" | "kanban">("list");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchProjects = useCallback(async () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (view === "kanban") {
      params.set("limit", "100");
    } else {
      params.set("page", String(page));
      params.set("limit", "10");
    }
    const res = await fetch(`/api/projects?${params}`);
    if (res.ok) {
      const json = await res.json();
      setProjects(json.data ?? []);
      setTotalPages(json.totalPages ?? 1);
      setTotal(json.total ?? 0);
    }
    setLoading(false);
  }, [page, search, statusFilter, view]);

  useEffect(() => { setPage(1); }, [search, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(fetchProjects, 300);
    return () => clearTimeout(timer);
  }, [fetchProjects]);

  const handleStatusChange = async (projectId: string, newStatus: string) => {
    await fetch(`/api/projects/${projectId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    fetchProjects();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Projects</h1>
          <p className="text-muted-foreground mt-1">
            {total} project{total !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton data={projects} columns={[
            { key: "name", label: "Name" },
            { key: "status", label: "Status" },
            { key: "clientId.name", label: "Client" },
            { key: "managerId.name", label: "Manager" },
            { key: "startDate", label: "Start Date" },
            { key: "deadline", label: "Deadline" },
            { key: "budget", label: "Budget" },
            { key: "currency", label: "Currency" },
          ]} filename="projects" />
          <Link href="/dashboard/projects/new">
            <Button><Plus className="mr-2 h-4 w-4" /> New Project</Button>
          </Link>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search projects..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={(v) => v && setStatusFilter(v)}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
              <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs value={view} onValueChange={(v) => setView(v as "list" | "kanban")}>
        <TabsList>
          <TabsTrigger value="list">List</TabsTrigger>
          <TabsTrigger value="kanban">Kanban</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-4">
          {loading ? (
            <p className="text-muted-foreground py-12 text-center">Loading...</p>
          ) : projects.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">No projects yet. Create your first project.</CardContent></Card>
          ) : (
            <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {projects.map((project) => (
                <Link key={project._id} href={`/dashboard/projects/${project._id}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-base leading-tight">{project.name}</CardTitle>
                        <Badge variant={STATUS_CONFIG[project.status]?.variant || "outline"} className="shrink-0 text-xs">
                          {STATUS_CONFIG[project.status]?.label || project.status}
                        </Badge>
                      </div>
                      {project.clientId && (
                        <p className="text-sm text-muted-foreground">{project.clientId.company || project.clientId.name}</p>
                      )}
                    </CardHeader>
                    <CardContent className="pt-0 space-y-2">
                      {project.description && <p className="text-sm text-muted-foreground line-clamp-2">{project.description}</p>}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        {project.deadline && (
                          <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{format(new Date(project.deadline), "dd MMM yyyy")}</span>
                        )}
                        {project.budget && (
                          <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" />{project.currency} {project.budget.toLocaleString()}</span>
                        )}
                      </div>
                      {project.managerId && <p className="text-xs text-muted-foreground">Manager: {project.managerId.name}</p>}
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
            <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
            </>
          )}
        </TabsContent>

        <TabsContent value="kanban" className="mt-4">
          {loading ? (
            <p className="text-muted-foreground py-12 text-center">Loading...</p>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-4">
              {KANBAN_COLUMNS.map((col) => {
                const colProjects = projects.filter((p) => p.status === col);
                return (
                  <div key={col} className="min-w-[280px] w-[280px] shrink-0">
                    <div className="flex items-center justify-between mb-3 px-1">
                      <h3 className="text-sm font-semibold">{STATUS_CONFIG[col]?.label}</h3>
                      <Badge variant="secondary" className="text-xs">{colProjects.length}</Badge>
                    </div>
                    <div className="space-y-3">
                      {colProjects.length === 0 ? (
                        <div className="border-2 border-dashed rounded-lg p-6 text-center text-xs text-muted-foreground">No projects</div>
                      ) : colProjects.map((project) => (
                        <Card key={project._id} className="hover:shadow-sm transition-shadow">
                          <CardContent className="p-4 space-y-2">
                            <div className="flex items-start justify-between">
                              <Link href={`/dashboard/projects/${project._id}`} className="font-medium text-sm hover:underline flex-1">{project.name}</Link>
                              <Link href={`/dashboard/projects/${project._id}`}>
                                <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0"><Eye className="h-3 w-3" /></Button>
                              </Link>
                            </div>
                            {project.clientId && <p className="text-xs text-muted-foreground">{project.clientId.name}</p>}
                            {project.deadline && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Calendar className="h-3 w-3" />{format(new Date(project.deadline), "dd MMM")}
                              </p>
                            )}
                            <Select value={project.status} onValueChange={(v) => v && handleStatusChange(project._id, v)}>
                              <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                                  <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
