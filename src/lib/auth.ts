import bcrypt from "bcryptjs";
import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import type { UserRole } from "@prisma/client";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";

const sessionCookieName = "education_agent_session";
const secret = new TextEncoder().encode(env.SESSION_SECRET);

export type SessionUser = {
  id: string;
  role: UserRole;
  email: string;
  displayName: string;
};

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createSessionToken(user: SessionUser) {
  return new SignJWT(user)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

export async function readSessionToken(request?: Request) {
  const authHeader = request?.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice("Bearer ".length);
  }

  const cookieStore = await cookies();
  return cookieStore.get(sessionCookieName)?.value;
}

export async function getSessionUser(request?: Request): Promise<SessionUser | null> {
  const token = await readSessionToken(request);
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secret);
    return {
      id: String(payload.id),
      role: payload.role as UserRole,
      email: String(payload.email),
      displayName: String(payload.displayName)
    };
  } catch {
    return null;
  }
}

export async function requireSessionUser(request?: Request) {
  const session = await getSessionUser(request);
  if (!session) {
    throw new Response("Unauthorized", { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.id } });
  if (!user || user.status !== "ACTIVE") {
    throw new Response("Unauthorized", { status: 401 });
  }

  return session;
}

export function sessionCookie(token: string) {
  return `${sessionCookieName}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}`;
}

export function clearSessionCookie() {
  return `${sessionCookieName}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}
