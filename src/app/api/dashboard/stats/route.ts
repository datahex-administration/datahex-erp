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

export const dynamic = "force-dynamic";

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
    Employee.countDocuments({ ...companyFilter, status: "active" }).exec(),
    Project.countDocuments(companyFilter).exec(),
    Project.countDocuments({ ...companyFilter, status: "in_progress" }).exec(),
    Client.countDocuments(companyFilter).exec(),
    Invoice.aggregate([
      { $match: { ...companyFilter } },
      { $group: { _id: null, total: { $sum: "$total" } } },
    ]).exec(),
    Invoice.aggregate([
      { $match: { ...companyFilter, status: "paid" } },
      { $group: { _id: null, total: { $sum: "$total" } } },
    ]).exec(),
    Invoice.aggregate([
      { $match: { ...companyFilter, status: { $in: ["sent", "overdue"] } } },
      { $group: { _id: null, total: { $sum: "$total" } } },
    ]).exec(),
    Expense.aggregate([
      {
        $match: {
          ...companyFilter,
          status: "approved",
          date: { $gte: startOfMonth, $lte: endOfMonth },
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]).exec(),
    Leave.countDocuments({ ...companyFilter, status: "pending" }).exec(),
    session.role === "super_admin"
      ? Company.countDocuments({ isActive: true }).exec()
      : Promise.resolve(1),
    Subscription.countDocuments({
      ...companyFilter,
      status: "active",
      renewalDate: { $lte: next30, $gte: now },
    }).exec(),
    Invoice.find(companyFilter)
      .populate("clientId", "name company")
      .sort({ createdAt: -1 })
      .limit(5)
      .lean()
      .exec(),
    Project.find(companyFilter)
      .populate("clientId", "name")
      .sort({ updatedAt: -1 })
      .limit(5)
      .lean()
      .exec(),
    Invoice.countDocuments({
      ...companyFilter,
      status: "sent",
      dueDate: { $lt: now },
    }).exec(),
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
  ]).exec();

  // Expense breakdown by category
  const expensesByCategory = await Expense.aggregate([
    { $match: { ...companyFilter, status: "approved" } },
    { $group: { _id: "$category", total: { $sum: "$amount" } } },
    { $sort: { total: -1 } },
    { $limit: 6 },
  ]).exec();

  // Project status distribution
  const projectsByStatus = await Project.aggregate([
    { $match: companyFilter },
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]).exec();

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
