"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  LogIn,
  LogOut,
  Building2,
  Home,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AttendanceRecord = Record<string, any>;

interface AttendanceWidgetProps {
  compact?: boolean;
  onStatusChange?: () => void;
}

export function AttendanceWidget({
  compact = false,
  onStatusChange,
}: AttendanceWidgetProps) {
  const [record, setRecord] = useState<AttendanceRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [workMode, setWorkMode] = useState<"office" | "wfh">("office");
  const [elapsed, setElapsed] = useState("");

  const fetchToday = useCallback(async () => {
    try {
      const res = await fetch("/api/attendance/today");
      const data = await res.json();
      setRecord(data);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchToday();
  }, [fetchToday]);

  // Running timer when clocked in
  useEffect(() => {
    if (record?.status !== "clocked_in" || !record?.clockInTime) return;

    function updateElapsed() {
      const diff = Date.now() - new Date(record!.clockInTime).getTime();
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setElapsed(
        `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
      );
    }
    updateElapsed();
    const timer = setInterval(updateElapsed, 1000);
    return () => clearInterval(timer);
  }, [record]);

  async function clockIn() {
    setActing(true);
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workMode }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Failed to clock in");
        return;
      }
      const data = await res.json();
      setRecord(data);
      toast.success("Clocked in successfully");
      onStatusChange?.();
    } catch {
      toast.error("Network error");
    } finally {
      setActing(false);
    }
  }

  async function clockOut() {
    if (!record?._id) return;
    setActing(true);
    try {
      const res = await fetch(`/api/attendance/${record._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Failed to clock out");
        return;
      }
      const data = await res.json();
      setRecord(data);
      toast.success("Clocked out successfully");
      onStatusChange?.();
    } catch {
      toast.error("Network error");
    } finally {
      setActing(false);
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // COMPLETED state
  if (record?.status === "completed") {
    return (
      <Card className="border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/30">
        <CardContent className={compact ? "p-4" : "p-6"}>
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-green-100 p-2.5 dark:bg-green-900/50">
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">Day Complete</p>
              <p className="text-xs text-muted-foreground">
                {format(new Date(record.clockInTime), "h:mm a")} —{" "}
                {format(new Date(record.clockOutTime), "h:mm a")}
                <span className="mx-1.5">·</span>
                {record.totalHours?.toFixed(1)}h
              </p>
            </div>
            <Badge
              variant="outline"
              className="gap-1 text-xs"
            >
              {record.workMode === "wfh" ? (
                <Home className="h-3 w-3" />
              ) : (
                <Building2 className="h-3 w-3" />
              )}
              {record.workMode === "wfh" ? "WFH" : "Office"}
            </Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  // CLOCKED IN state
  if (record?.status === "clocked_in") {
    return (
      <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/30">
        <CardContent className={compact ? "p-4" : "p-6"}>
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-blue-100 p-2.5 dark:bg-blue-900/50">
              <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400 animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-lg tabular-nums">{elapsed}</p>
                <Badge
                  variant="outline"
                  className="gap-1 text-xs"
                >
                  {record.workMode === "wfh" ? (
                    <Home className="h-3 w-3" />
                  ) : (
                    <Building2 className="h-3 w-3" />
                  )}
                  {record.workMode === "wfh" ? "WFH" : "Office"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Clocked in at {format(new Date(record.clockInTime), "h:mm a")}
              </p>
            </div>
            <Button
              variant="destructive"
              size={compact ? "sm" : "default"}
              onClick={clockOut}
              disabled={acting}
              className="gap-1.5"
            >
              {acting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LogOut className="h-4 w-4" />
              )}
              {compact ? "" : "Clock Out"}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // NOT CLOCKED IN state
  return (
    <Card>
      <CardContent className={compact ? "p-4" : "p-6"}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3 flex-1">
            <div className="rounded-full bg-muted p-2.5">
              <Clock className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium text-sm">Not clocked in</p>
              <p className="text-xs text-muted-foreground">
                {format(new Date(), "EEEE, MMM d")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border overflow-hidden">
              <button
                type="button"
                onClick={() => setWorkMode("office")}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm transition-colors ${
                  workMode === "office"
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                }`}
              >
                <Building2 className="h-3.5 w-3.5" />
                Office
              </button>
              <button
                type="button"
                onClick={() => setWorkMode("wfh")}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm transition-colors ${
                  workMode === "wfh"
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                }`}
              >
                <Home className="h-3.5 w-3.5" />
                WFH
              </button>
            </div>

            <Button
              onClick={clockIn}
              disabled={acting}
              className="gap-1.5"
              size={compact ? "sm" : "default"}
            >
              {acting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LogIn className="h-4 w-4" />
              )}
              Clock In
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
