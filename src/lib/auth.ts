import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "fallback-secret");
const COOKIE_NAME = "datahex-session";
const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
const useSecureCookies =
  process.env.NODE_ENV === "production" &&
  !appUrl.startsWith("http://localhost") &&
  !appUrl.startsWith("http://127.0.0.1");

export interface SessionPayload {
  userId: string;
  role: string;
  companyId: string;
  permissions: string[];
}

export async function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, 12);
}

export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pin, hash);
}

export async function createSession(payload: SessionPayload): Promise<string> {
  // Serialize permissions array to JSON string — JWT claims must be primitives
  const claims: Record<string, string> = {
    userId: payload.userId,
    role: payload.role,
    companyId: payload.companyId,
    permissions: JSON.stringify(payload.permissions),
  };
  const token = await new SignJWT(claims)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: useSecureCookies,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  });

  return token;
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return {
      userId: payload.userId as string,
      role: payload.role as string,
      companyId: payload.companyId as string,
      permissions: JSON.parse((payload.permissions as string) || "[]"),
    };
  } catch {
    return null;
  }
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export function hasPermission(
  userPermissions: string[],
  required: string
): boolean {
  if (userPermissions.includes("*")) return true;
  return userPermissions.includes(required);
}
