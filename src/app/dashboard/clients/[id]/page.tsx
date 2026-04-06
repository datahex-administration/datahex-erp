"use client";

import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import {
  ArrowLeft,
  Calendar,
  Contact,
  FolderKanban,
  Loader2,
  Mail,
  MapPin,
  Phone,
  User,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ClientDetail {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  address?: string;
  contactPersonName?: string;
  additionalDetails?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface ProjectData {
  _id: string;
  name: string;
  description?: string;
  status: string;
  deadline?: string;
  updatedAt: string;
  managerId?: { _id: string; name: string; employeeId?: string; designation?: string };
  managerUserId?: { _id: string; name: string; role?: string };
}

const STATUS_CONFIG: Record<
  string,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  requirement: { label: "Requirement", variant: "outline" },
  proposal: { label: "Proposal", variant: "secondary" },
  in_progress: { label: "In Progress", variant: "default" },
  review: { label: "Review", variant: "secondary" },
  completed: { label: "Completed", variant: "default" },
  maintenance: { label: "Maintenance", variant: "outline" },
};

export default function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    Promise.all([fetch(`/api/clients/${id}`), fetch(`/api/projects?clientId=${id}&limit=100`)])
      .then(async ([clientResponse, projectResponse]) => {
        if (!clientResponse.ok) {
          throw new Error("Failed to load client");
        }

        const [clientPayload, projectPayload] = await Promise.all([
          clientResponse.json(),
          projectResponse.json(),
        ]);

        if (cancelled) {
          return;
        }

        setClient(clientPayload as ClientDetail);
        setProjects(Array.isArray(projectPayload?.data) ? projectPayload.data : []);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) {
          return;
        }

        setClient(null);
        setProjects([]);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  const openProjects = useMemo(
    () => projects.filter((project) => project.status !== "completed"),
    [projects]
  );

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="py-16 text-center">
        <h2 className="text-xl font-semibold">Client not found</h2>
        <Link href="/dashboard/clients">
          <Button className="mt-4">Back to Clients</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/clients">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{client.name}</h1>
              <Badge variant={client.isActive ? "default" : "secondary"}>
                {client.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
            <p className="mt-1 text-muted-foreground">
              {projects.length} project{projects.length !== 1 ? "s" : ""} linked to this client
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Contact className="h-5 w-5" /> Client Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <InfoRow icon={<Mail className="h-4 w-4" />} label="Email" value={client.email} />
              <InfoRow icon={<Phone className="h-4 w-4" />} label="Phone" value={client.phone || "—"} />
              <InfoRow
                icon={<User className="h-4 w-4" />}
                label="Contact Person"
                value={client.contactPersonName || client.company || "—"}
              />
              <InfoRow
                icon={<FolderKanban className="h-4 w-4" />}
                label="Projects"
                value={String(projects.length)}
              />
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Company Address</p>
              <div className="rounded-xl border border-border/70 bg-muted/30 p-4 text-sm text-muted-foreground">
                {client.address ? (
                  <p className="whitespace-pre-line">{client.address}</p>
                ) : (
                  <p>No address added yet.</p>
                )}
              </div>
            </div>

            {client.additionalDetails ? (
              <div className="space-y-2">
                <p className="text-sm font-medium">Additional Details</p>
                <div className="rounded-xl border border-border/70 bg-muted/30 p-4 text-sm text-muted-foreground">
                  <p className="whitespace-pre-line">{client.additionalDetails}</p>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Project Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="rounded-xl border border-border/70 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Open Projects</p>
              <p className="mt-1 text-2xl font-semibold">{openProjects.length}</p>
            </div>
            <div className="rounded-xl border border-border/70 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Completed</p>
              <p className="mt-1 text-2xl font-semibold">{projects.length - openProjects.length}</p>
            </div>
            <div className="rounded-xl border border-border/70 p-4 text-muted-foreground">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span>Relationship view stays here on the client side.</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Client Projects</CardTitle>
        </CardHeader>
        <CardContent>
          {projects.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">No projects linked to this client yet.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {projects.map((project) => (
                <Link key={project._id} href={`/dashboard/projects/${project._id}`}>
                  <Card className="h-full cursor-pointer border-border/70 transition-shadow hover:shadow-md">
                    <CardContent className="space-y-3 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium leading-tight">{project.name}</p>
                          {project.description ? (
                            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                              {project.description}
                            </p>
                          ) : null}
                        </div>
                        <Badge variant={STATUS_CONFIG[project.status]?.variant || "outline"}>
                          {STATUS_CONFIG[project.status]?.label || project.status}
                        </Badge>
                      </div>

                      <div className="space-y-2 text-xs text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <User className="h-3.5 w-3.5" />
                          <span>
                            {project.managerUserId?.name || project.managerId?.name || "No manager assigned"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>
                            {project.deadline
                              ? `Deadline ${format(new Date(project.deadline), "dd MMM yyyy")}`
                              : `Updated ${format(new Date(project.updatedAt), "dd MMM yyyy")}`}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-border/70 p-3 text-sm">
      <span className="text-muted-foreground">{icon}</span>
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="font-medium">{value}</p>
      </div>
    </div>
  );
}