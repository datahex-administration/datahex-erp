"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ProjectFormDialog } from "@/components/dashboard/project-form-dialog";

export default function NewProjectPage() {
  const router = useRouter();
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (!open) {
      router.replace("/dashboard/projects");
    }
  }, [open, router]);

  return (
    <ProjectFormDialog
      open={open}
      onOpenChange={setOpen}
      onSaved={(project) => {
        const projectId = typeof project._id === "string" ? project._id : "";
        router.replace(projectId ? `/dashboard/projects/${projectId}` : "/dashboard/projects");
      }}
    />
  );
}
