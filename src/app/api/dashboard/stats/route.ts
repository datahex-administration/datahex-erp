import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Employee from "@/models/Employee";
import Project from "@/models/Project";
import Invoice from "@/models/Invoice";
import Expense from "@/models/Expense";
import Leave from "@/models/Leave";
import Company from "@/models/Company";
import Subscription from "@/models/Subscription";
import Client from "@/models/Client";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const companyFilter =
    session.role === "super_admin" ? {} : { companyId: session.companyId };

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const next30 = new Date();
  next30.setDate(next30.getDate() + 30);

  const [
    employees,
    projects,
    activeProjects,
    clients,
    totalInvoiced,
    totalPaid,
    totalPending,
    monthlyExpenses,
    pendingLeaves,
    companies,
    upcomingRenewals,
    recentInvoices,
    recentProjects,
    overdueInvoices,
  ] = await Promise.all([
    Employee.countDocuments({ ...companyFilter, status: "active" }),
    Project.countDocuments(companyFilter),
    Project.countDocuments({ ...companyFilter, status: "in_progress" }),
    Client.countDocuments(companyFilter),
    Invoice.aggregate([
      { $match: { ...companyFilter } },
      { $group: { _id: null, total: { $sum: "$total" } } },
    ]),
    Invoice.aggregate([
      { $match: { ...companyFilter, status: "paid" } },
      { $group: { _id: null, total: { $sum: "$total" } } },
    ]),
    Invoice.aggregate([
      { $match: { ...companyFilter, status: { $in: ["sent", "overdue"] } } },
      { $group: { _id: null, total: { $sum: "$total" } } },
    ]),
    Expense.aggregate([
      {
        $match: {
          ...companyFilter,
          status: "approved",
          date: { $gte: startOfMonth, $lte: endOfMonth },
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    Leave.countDocuments({ ...companyFilter, status: "pending" }),
    session.role === "super_admin"
      ? Company.countDocuments({ isActive: true })
      : Promise.resolve(1),
    Subscription.countDocuments({
      ...companyFilter,
      status: "active",
      renewalDate: { $lte: next30, $gte: now },
    }),
    Invoice.find(companyFilter)
      .populate("clientId", "name company")
      .sort({ createdAt: -1 })
      .limit(5)
      .lean(),
    Project.find(companyFilter)
      .populate("clientId", "name")
      .sort({ updatedAt: -1 })
      .limit(5)
      .lean(),
    Invoice.countDocuments({
      ...companyFilter,
      status: "sent",
      dueDate: { $lt: now },
    }),
  ]);

  // Monthly revenue for last 6 months
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const monthlyRevenue = await Invoice.aggregate([
    {
      $match: {
        ...companyFilter,
        status: "paid",
        paidAt: { $gte: sixMonthsAgo },
      },
    },
    {
      $group: {
        _id: { year: { $year: "$paidAt" }, month: { $month: "$paidAt" } },
        total: { $sum: "$total" },
      },
    },
    { $sort: { "_id.year": 1, "_id.month": 1 } },
  ]);

  // Expense breakdown by category
  const expensesByCategory = await Expense.aggregate([
    { $match: { ...companyFilter, status: "approved" } },
    { $group: { _id: "$category", total: { $sum: "$amount" } } },
    { $sort: { total: -1 } },
    { $limit: 6 },
  ]);

  // Project status distribution
  const projectsByStatus = await Project.aggregate([
    { $match: companyFilter },
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);

  return NextResponse.json({
    employees,
    projects,
    activeProjects,
    clients,
    totalInvoiced: totalInvoiced[0]?.total || 0,
    totalPaid: totalPaid[0]?.total || 0,
    totalPending: totalPending[0]?.total || 0,
    monthlyExpenses: monthlyExpenses[0]?.total || 0,
    pendingLeaves,
    companies,
    upcomingRenewals,
    overdueInvoices,
    recentInvoices,
    recentProjects,
    monthlyRevenue,
    expensesByCategory,
    projectsByStatus,
  });
}
