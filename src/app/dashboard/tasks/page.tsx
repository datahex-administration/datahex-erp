"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Loader2, Mail, MessageCircle, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

interface TaskItem {
  _id: string;
  title: string;
  description?: string;
  status: "planned" | "in_progress" | "completed";
  durationHours?: number;
  workDate: string;
  lastReportedAt?: string;
  createdAt: string;
}

const STATUS_OPTIONS = [
  { value: "planned", label: "Planned" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
];

const STATUS_VARIANTS: Record<TaskItem["status"], "secondary" | "default" | "outline"> = {
  planned: "outline",
  in_progress: "secondary",
  completed: "default",
};

export default function DailyTasksPage() {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [recentTasks, setRecentTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    status: "planned",
    durationHours: "",
  });

  const fetchTasks = useCallback(async () => {
    setLoading(true);

    try {
      const [selectedDayResponse, recentResponse] = await Promise.all([
        fetch(`/api/tasks?date=${encodeURIComponent(selectedDate)}`),
        fetch(`/api/tasks?date=${encodeURIComponent(selectedDate)}&days=7`),
      ]);

      if (selectedDayResponse.ok) {
        const data = await selectedDayResponse.json();
        setTasks(Array.isArray(data) ? data : []);
      } else {
        toast.error("Failed to load daily tasks");
      }

      if (recentResponse.ok) {
        const data = await recentResponse.json();
        setRecentTasks(Array.isArray(data) ? data : []);
      }
    } catch {
      toast.error("Failed to load daily tasks");
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const summary = useMemo(() => {
    const completed = tasks.filter((task) => task.status === "completed").length;
    const inProgress = tasks.filter((task) => task.status === "in_progress").length;
    const totalHours = tasks.reduce((sum, task) => sum + (task.durationHours || 0), 0);

    return {
      total: tasks.length,
      completed,
      inProgress,
      totalHours,
    };
  }, [tasks]);

  const recentDays = useMemo(() => {
    const grouped = new Map<string, { date: string; total: number; completed: number; totalHours: number }>();

    recentTasks.forEach((task) => {
      const dateKey = format(new Date(task.workDate || task.createdAt), "yyyy-MM-dd");
      const current = grouped.get(dateKey) || { date: dateKey, total: 0, completed: 0, totalHours: 0 };
      current.total += 1;
      current.completed += task.status === "completed" ? 1 : 0;
      current.totalHours += task.durationHours || 0;
      grouped.set(dateKey, current);
    });

    return Array.from(grouped.values()).sort((left, right) => right.date.localeCompare(left.date));
  }, [recentTasks]);

  const handleCreateTask = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);

    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        workDate: selectedDate,
        durationHours: form.durationHours ? Number(form.durationHours) : undefined,
      }),
    });

    const data = await res.json();

    if (res.ok) {
      toast.success("Task added to your daily report");
      setForm({ title: "", description: "", status: "planned", durationHours: "" });
      setTasks((currentTasks) => [data, ...currentTasks]);
      setRecentTasks((currentTasks) => [data, ...currentTasks]);
    } else {
      toast.error(data.error || "Failed to create task");
    }

    setSaving(false);
  };

  const updateTask = async (taskId: string, payload: Partial<TaskItem>) => {
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (res.ok) {
      setTasks((currentTasks) =>
        currentTasks.map((task) => (task._id === taskId ? data : task))
      );
      setRecentTasks((currentTasks) =>
        currentTasks.map((task) => (task._id === taskId ? data : task))
      );
      toast.success("Task updated");
    } else {
      toast.error(data.error || "Failed to update task");
    }
  };

  const deleteTask = async (taskId: string) => {
    const res = await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });

    if (res.ok) {
      setTasks((currentTasks) => currentTasks.filter((task) => task._id !== taskId));
      setRecentTasks((currentTasks) => currentTasks.filter((task) => task._id !== taskId));
      toast.success("Task removed");
    } else {
      const data = await res.json();
      toast.error(data.error || "Failed to remove task");
    }
  };

  const sendReport = async (channels: Array<"email" | "whatsapp">, key: string) => {
    setSending(key);

    const res = await fetch("/api/tasks/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: selectedDate,
        channels,
      }),
    });

    const data = await res.json();

    if (res.ok) {
      toast.success(data.message || "Daily task report sent");
      fetchTasks();
    } else {
      toast.error(data.error || "Failed to send daily task report");
    }

    setSending(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Daily Tasks</h1>
          <p className="mt-1 text-muted-foreground">
            Capture today's work and send a summary to email or WhatsApp.
          </p>
        </div>
        <div className="w-full max-w-xs space-y-2">
          <Label htmlFor="task-date">Work date</Label>
          <Input
            id="task-date"
            type="date"
            value={selectedDate}
            onChange={(event) => setSelectedDate(event.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total tasks</CardDescription>
            <CardTitle>{summary.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Completed</CardDescription>
            <CardTitle>{summary.completed}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>In progress</CardDescription>
            <CardTitle>{summary.inProgress}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Tracked hours</CardDescription>
            <CardTitle>{summary.totalHours}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Add task</CardTitle>
            <CardDescription>Build your daily report item by item.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="task-title">Task title</Label>
                <Input
                  id="task-title"
                  value={form.title}
                  onChange={(event) => setForm({ ...form, title: event.target.value })}
                  placeholder="Example: Sent invoice to client"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="task-description">Notes</Label>
                <Textarea
                  id="task-description"
                  value={form.description}
                  onChange={(event) => setForm({ ...form, description: event.target.value })}
                  placeholder="Short summary of what was done"
                  rows={4}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={form.status}
                    onValueChange={(value) => value && setForm({ ...form, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="task-hours">Hours</Label>
                  <Input
                    id="task-hours"
                    type="number"
                    min="0"
                    step="0.5"
                    value={form.durationHours}
                    onChange={(event) =>
                      setForm({ ...form, durationHours: event.target.value })
                    }
                    placeholder="0"
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Add task
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent history</CardTitle>
              <CardDescription>
                Tasks are stored by work date. Jump to any recent day instead of losing older entries.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentDays.length === 0 ? (
                <p className="text-sm text-muted-foreground">No recent task history yet.</p>
              ) : (
                <div className="space-y-2">
                  {recentDays.map((day) => (
                    <button
                      key={day.date}
                      type="button"
                      onClick={() => setSelectedDate(day.date)}
                      className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left transition-colors ${
                        selectedDate === day.date
                          ? "border-primary bg-primary/5"
                          : "border-border/70 hover:bg-accent/40"
                      }`}
                    >
                      <span>
                        <span className="block text-sm font-medium">
                          {format(new Date(day.date), "dd MMM yyyy")}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {day.completed}/{day.total} completed • {day.totalHours}h tracked
                        </span>
                      </span>
                      <Badge variant={selectedDate === day.date ? "default" : "secondary"}>
                        {day.total}
                      </Badge>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle>Send report</CardTitle>
                <CardDescription>
                  Deliver the selected day's summary to your configured channels.
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() => sendReport(["email"], "email")}
                  disabled={sending !== null || tasks.length === 0}
                >
                  {sending === "email" ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Mail className="mr-2 h-4 w-4" />
                  )}
                  Email
                </Button>
                <Button
                  variant="outline"
                  onClick={() => sendReport(["whatsapp"], "whatsapp")}
                  disabled={sending !== null || tasks.length === 0}
                >
                  {sending === "whatsapp" ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <MessageCircle className="mr-2 h-4 w-4" />
                  )}
                  WhatsApp
                </Button>
                <Button
                  onClick={() => sendReport(["email", "whatsapp"], "both")}
                  disabled={sending !== null || tasks.length === 0}
                >
                  {sending === "both" ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <MessageCircle className="mr-2 h-4 w-4" />
                  )}
                  Send both
                </Button>
              </div>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tasks for {format(new Date(selectedDate), "dd MMM yyyy")}</CardTitle>
              <CardDescription>
                Update completion status here before you send the report.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : tasks.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">
                  No tasks added for this date.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Task</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Hours</TableHead>
                      <TableHead>Last report</TableHead>
                      <TableHead className="w-[80px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tasks.map((task) => (
                      <TableRow key={task._id}>
                        <TableCell>
                          <div className="space-y-1">
                            <p className="font-medium">{task.title}</p>
                            {task.description && (
                              <p className="text-sm text-muted-foreground">{task.description}</p>
                            )}
                            <Badge variant={STATUS_VARIANTS[task.status]}>
                              {STATUS_OPTIONS.find((status) => status.value === task.status)?.label}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={task.status}
                            onValueChange={(value) =>
                              value &&
                              updateTask(task._id, {
                                status: value as TaskItem["status"],
                              })
                            }
                          >
                            <SelectTrigger className="w-[160px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {STATUS_OPTIONS.map((status) => (
                                <SelectItem key={status.value} value={status.value}>
                                  {status.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            step="0.5"
                            value={task.durationHours ?? ""}
                            onChange={(event) =>
                              updateTask(task._id, {
                                durationHours: Number(event.target.value || 0),
                              })
                            }
                            className="w-[110px]"
                          />
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {task.lastReportedAt
                            ? format(new Date(task.lastReportedAt), "dd MMM, HH:mm")
                            : "Not sent"}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteTask(task._id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}