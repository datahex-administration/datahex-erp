import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { isValidEmailAddress } from "@/lib/email";
import Client from "@/models/Client";
import Project from "@/models/Project";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();

  const { searchParams } = request.nextUrl;
  const search = searchParams.get("search");
  const page = Math.max(Number(searchParams.get("page")) || 1, 1);
  const limit = Math.min(Math.max(Number(searchParams.get("limit")) || 10, 1), 100);

  const filter: Record<string, unknown> =
    session.role === "super_admin" ? {} : { companyId: session.companyId };

  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
      { phone: { $regex: search, $options: "i" } },
      { company: { $regex: search, $options: "i" } },
      { contactPersonName: { $regex: search, $options: "i" } },
      { address: { $regex: search, $options: "i" } },
    ];
  }

  const clients = await Client.find(filter)
    .sort({ name: 1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean()
    .exec();
  const total = await Client.countDocuments(filter).exec();

  const projectCounts =
    clients.length > 0
      ? await Project.aggregate([
          {
            $match: {
              clientId: { $in: clients.map((client) => client._id) },
            },
          },
          {
            $group: {
              _id: "$clientId",
              total: { $sum: 1 },
            },
          },
        ]).exec()
      : [];

  const projectCountMap = new Map(
    projectCounts.map((entry) => [String(entry._id), Number(entry.total) || 0])
  );

  const data = clients.map((client) => ({
    ...client,
    projectCount: projectCountMap.get(String(client._id)) || 0,
  }));

  return NextResponse.json({ data, total, page, totalPages: Math.ceil(total / limit) });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const body = await request.json();
  const {
    name,
    email,
    phone,
    company,
    address,
    contactPersonName,
    additionalDetails,
    companyId: bodyCompanyId,
  } = body;
  const trimmedName = name?.trim();
  const trimmedEmail = email?.trim().toLowerCase();

  if (!trimmedName || !trimmedEmail) {
    return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
  }

  if (!isValidEmailAddress(trimmedEmail)) {
    return NextResponse.json({ error: "Client email address is invalid" }, { status: 400 });
  }

  const targetCompanyId =
    session.role === "super_admin" && bodyCompanyId ? bodyCompanyId : session.companyId;

  const client = await Client.create({
    name: trimmedName,
    email: trimmedEmail,
    phone: phone?.trim() || undefined,
    company: company?.trim() || undefined,
    contactPersonName: contactPersonName?.trim() || undefined,
    address: address?.trim() || undefined,
    additionalDetails: additionalDetails?.trim() || undefined,
    companyId: targetCompanyId,
  });

  return NextResponse.json(client, { status: 201 });
}
