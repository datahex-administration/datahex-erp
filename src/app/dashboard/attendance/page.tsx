"use client";

import { useAuth } from "@/components/providers/auth-provider";
import { AttendanceWidget } from "@/components/dashboard/attendance-widget";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Building2,
  CalendarDays,
  Clock,
  Download,
  Home,
  Users,
} from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { format } from "date-fns";
import { exportToCSV } from "@/lib/export";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyObj = Record<string, any>;

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function AttendancePage() {
  const { user, hasPermission } = useAuth();
  const isManager = user?.role !== "staff";

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [myRecords, setMyRecords] = useState<AnyObj[]>([]);
  const [teamSummary, setTeamSummary] = useState<AnyObj | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [myRes, teamRes] = await Promise.all([
        fetch(`/api/attendance?month=${month}&year=${year}&limit=31`),
        isManager
          ? fetch(`/api/attendance/summary?month=${month}&year=${year}`)
          : Promise.resolve(null),
      ]);

      const myData = await myRes.json();
      setMyRecords(myData.data || []);

      if (teamRes) {
        const tData = await teamRes.json();
        setTeamSummary(tData);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [month, year, isManager]);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshKey]);

  const completedRecords = myRecords.filter((r) => r.status === "completed");
  const totalHours = completedRecords.reduce(
    (sum, r) => sum + (r.totalHours || 0),
    0
  );
  const officeDays = myRecords.filter((r) => r.workMode === "office").length;
  const wfhDays = myRecords.filter((r) => r.workMode === "wfh").length;

  function handleExport() {
    if (!myRecords.length) return;
    exportToCSV(
      myRecords,
      [
        { key: "date", label: "Date" },
        { key: "clockInTime", label: "Clock In" },
        { key: "clockOutTime", label: "Clock Out" },
        { key: "workMode", label: "Work Mode" },
        { key: "totalHours", label: "Hours" },
        { key: "status", label: "Status" },
      ],
      `attendance-${year}-${month}`
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Attendance</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Track your daily clock-in and work mode
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            {MONTHS.map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            {[year - 1, year, year + 1].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          {hasPermission("attendance:read") && (
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
          )}
        </div>
      </div>

      {/* Clock-in Widget */}
      <AttendanceWidget onStatusChange={() => setRefreshKey((k) => k + 1)} />

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-50 p-2 dark:bg-blue-950/50">
                <CalendarDays className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{myRecords.length}</p>
                <p className="text-xs text-muted-foreground">Days Present</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-green-50 p-2 dark:bg-green-950/50">
                <Clock className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalHours.toFixed(1)}</p>
                <p className="text-xs text-muted-foreground">Total Hours</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-purple-50 p-2 dark:bg-purple-950/50">
                <Building2 className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{officeDays}</p>
                <p className="text-xs text-muted-foreground">Office Days</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-orange-50 p-2 dark:bg-orange-950/50">
                <Home className="h-4 w-4 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{wfhDays}</p>
                <p className="text-xs text-muted-foreground">WFH Days</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* My Attendance History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            My Attendance — {MONTHS[month - 1]} {year}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Loading...
            </p>
          ) : !myRecords.length ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No attendance records for this month
            </p>
          ) : (
            <div className="overflow-x-auto -mx-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="px-6 py-2 font-medium">Date</th>
                    <th className="px-6 py-2 font-medium">Clock In</th>
                    <th className="px-6 py-2 font-medium">Clock Out</th>
                    <th className="px-6 py-2 font-medium">Mode</th>
                    <th className="px-6 py-2 font-medium">Hours</th>
                    <th className="px-6 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {myRecords.map((r) => (
                    <tr key={r._id} className="border-b last:border-0">
                      <td className="px-6 py-3 font-medium">
                        {format(new Date(r.date), "EEE, MMM d")}
                      </td>
                      <td className="px-6 py-3">
                        {format(new Date(r.clockInTime), "h:mm a")}
                      </td>
                      <td className="px-6 py-3">
                        {r.clockOutTime
                          ? format(new Date(r.clockOutTime), "h:mm a")
                          : "—"}
                      </td>
                      <td className="px-6 py-3">
                        <Badge variant="outline" className="gap-1 text-xs">
                          {r.workMode === "wfh" ? (
                            <Home className="h-3 w-3" />
                          ) : (
                            <Building2 className="h-3 w-3" />
                          )}
                          {r.workMode === "wfh" ? "WFH" : "Office"}
                        </Badge>
                      </td>
                      <td className="px-6 py-3">
                        {r.totalHours ? `${r.totalHours.toFixed(1)}h` : "—"}
                      </td>
                      <td className="px-6 py-3">
                        <Badge
                          className={
                            r.status === "completed"
                              ? "bg-green-100 text-green-800 border-0"
                              : "bg-blue-100 text-blue-800 border-0"
                          }
                        >
                          {r.status === "completed" ? "Completed" : "Active"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Team Summary (Managers only) */}
      {isManager && teamSummary?.summary && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Team Attendance — {MONTHS[month - 1]} {year}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto -mx-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="px-6 py-2 font-medium">Employee</th>
                    <th className="px-6 py-2 font-medium">Days</th>
                    <th className="px-6 py-2 font-medium">Hours</th>
                    <th className="px-6 py-2 font-medium">Office</th>
                    <th className="px-6 py-2 font-medium">WFH</th>
                    <th className="px-6 py-2 font-medium">Today</th>
                  </tr>
                </thead>
                <tbody>
                  {teamSummary.summary.map((emp: AnyObj) => (
                    <tr key={emp.userId} className="border-b last:border-0">
                      <td className="px-6 py-3">
                        <div>
                          <p className="font-medium">{emp.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {emp.email}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-3">{emp.totalDays}</td>
                      <td className="px-6 py-3">
                        {emp.totalHours.toFixed(1)}h
                      </td>
                      <td className="px-6 py-3">{emp.officeDays}</td>
                      <td className="px-6 py-3">{emp.wfhDays}</td>
                      <td className="px-6 py-3">
                        {emp.todayStatus ? (
                          <Badge
                            className={
                              emp.todayStatus.status === "completed"
                                ? "bg-green-100 text-green-800 border-0"
                                : "bg-blue-100 text-blue-800 border-0"
                            }
                          >
                            {emp.todayStatus.status === "completed"
                              ? "Done"
                              : "Active"}
                            {emp.todayStatus.workMode === "wfh"
                              ? " (WFH)"
                              : " (Office)"}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">
                            Not clocked in
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
