import { NextResponse } from "next/server";
import { z } from "zod";
import { createSessionToken, sessionCookie, verifyPassword } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const loginSchema = z.object({
  usernameOrEmail: z.string().min(1),
  password: z.string().min(1),
  role: z.enum(["TEACHER", "STUDENT"]).optional()
});

export async function POST(request: Request) {
  try {
    const input = loginSchema.parse(await request.json());

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: input.usernameOrEmail }, { username: input.usernameOrEmail }]
      }
    });

    if (!user || user.status !== "ACTIVE" || (input.role && user.role !== input.role)) {
      return NextResponse.json({ error: "INVALID_LOGIN" }, { status: 401 });
    }

    const valid = await verifyPassword(input.password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "INVALID_LOGIN" }, { status: 401 });
    }

    const token = await createSessionToken({
      id: user.id,
      role: user.role,
      email: user.email,
      displayName: user.displayName
    });

    return NextResponse.json(
      {
        token,
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          role: user.role
        }
      },
      {
        headers: {
          "Set-Cookie": sessionCookie(token)
        }
      }
    );
  } catch (error) {
    return jsonError(error);
  }
}
