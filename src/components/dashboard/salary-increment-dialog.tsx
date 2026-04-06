"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
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
import { Textarea } from "@/components/ui/textarea";

interface SalaryIncrementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: string;
  currentSalary: number;
  currency: string;
  onSaved?: () => void;
}

export function SalaryIncrementDialog({
  open,
  onOpenChange,
  employeeId,
  currentSalary,
  currency,
  onSaved,
}: SalaryIncrementDialogProps) {
  const [form, setForm] = useState({
    newSalary: currentSalary ? String(currentSalary) : "",
    effectiveDate: new Date().toISOString().split("T")[0],
    reason: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    setForm({
      newSalary: currentSalary ? String(currentSalary) : "",
      effectiveDate: new Date().toISOString().split("T")[0],
      reason: "",
    });
  }, [open, currentSalary]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const newSalary = Number(form.newSalary);

    if (!Number.isFinite(newSalary) || newSalary <= 0) {
      toast.error("Enter a valid new salary");
      return;
    }

    if (!form.effectiveDate) {
      toast.error("Select an effective date");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch("/api/salary/increments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId,
          newSalary,
          effectiveDate: form.effectiveDate,
          reason: form.reason.trim() || undefined,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        toast.error(payload.error || "Failed to update salary");
        return;
      }

      toast.success("Salary updated");
      onSaved?.();
      onOpenChange(false);
    } catch {
      toast.error("Failed to update salary");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record Salary Increment</DialogTitle>
          <DialogDescription>
            Current salary: {currency} {currentSalary.toLocaleString()}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>New Salary</Label>
            <Input
              type="number"
              min="0"
              value={form.newSalary}
              onChange={(event) => setForm((currentForm) => ({ ...currentForm, newSalary: event.target.value }))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Effective Date</Label>
            <Input
              type="date"
              value={form.effectiveDate}
              onChange={(event) =>
                setForm((currentForm) => ({ ...currentForm, effectiveDate: event.target.value }))
              }
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Reason</Label>
            <Textarea
              value={form.reason}
              onChange={(event) => setForm((currentForm) => ({ ...currentForm, reason: event.target.value }))}
              rows={3}
              placeholder="Optional note for the increment"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save Increment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}