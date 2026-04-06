import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import ProjectDetail from "@/models/ProjectDetail";
import { encrypt, decrypt } from "@/lib/encryption";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await connectDB();

  const detail = await ProjectDetail.findOne({ projectId: id }).lean();
  if (!detail) return NextResponse.json(null);

  // Decrypt sensitive fields for display
  const decrypted = { ...detail };
  try {
    if (decrypted.hosting?.credentials) {
      decrypted.hosting = { ...decrypted.hosting, credentials: decrypt(decrypted.hosting.credentials) };
    }
    if (decrypted.database?.credentials) {
      decrypted.database = { ...decrypted.database, credentials: decrypt(decrypted.database.credentials) };
    }
    if (decrypted.envFiles) {
      decrypted.envFiles = decrypt(decrypted.envFiles);
    }
  } catch {
    // If decryption fails, return raw (might be unencrypted old data)
  }

  return NextResponse.json(decrypted);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await connectDB();

  const body = await request.json();

  // Encrypt sensitive fields before saving
  const toSave = { ...body, projectId: id, companyId: body.companyId || session.companyId };

  if (toSave.hosting?.credentials) {
    toSave.hosting.credentials = encrypt(toSave.hosting.credentials);
  }
  if (toSave.database?.credentials) {
    toSave.database.credentials = encrypt(toSave.database.credentials);
  }
  if (toSave.envFiles) {
    toSave.envFiles = encrypt(toSave.envFiles);
  }

  const detail = await ProjectDetail.findOneAndUpdate(
    { projectId: id },
    toSave,
    { new: true, upsert: true }
  );

  return NextResponse.json(detail);
}
