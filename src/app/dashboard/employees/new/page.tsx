"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { EmployeeFormDialog } from "@/components/dashboard/employee-form-dialog";

export default function NewEmployeePage() {
  const router = useRouter();
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (!open) {
      router.replace("/dashboard/employees");
    }
  }, [open, router]);

  return (
    <EmployeeFormDialog
      open={open}
      onOpenChange={setOpen}
      onSaved={(employee) => {
        const employeeId = typeof employee._id === "string" ? employee._id : "";
        router.replace(employeeId ? `/dashboard/employees/${employeeId}` : "/dashboard/employees");
      }}
    />
  );
}
