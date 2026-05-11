import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { z } from "zod";
import { createSessionToken, hashPassword, sessionCookie } from "@/lib/auth";
import { baseAuthAdapter } from "@/lib/base-auth-adapter";
import { env } from "@/lib/env";
import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const registerSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(40).optional(),
  password: z.string().min(8),
  displayName: z.string().min(1).max(40),
  role: z.nativeEnum(UserRole),
  ageBand: z.enum(["6-12岁", "12-15岁", "15-20岁"]).optional()
});

export async function POST(request: Request) {
  try {
    const input = registerSchema.parse(await request.json());
    const username = input.username ?? generateUsername(input.email);

    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ email: input.email }, { username }]
      }
    });

    if (existing) {
      return NextResponse.json(
        { error: "USER_EXISTS", message: "邮箱已存在。" },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(input.password);

    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email: input.email,
          username,
          passwordHash,
          displayName: input.displayName,
          role: input.role,
          studentProfile:
            input.role === "STUDENT"
              ? {
                  create: {
                    ageBand: input.ageBand
                  }
                }
              : undefined,
          teacherProfile:
            input.role === "TEACHER"
              ? {
                  create: {}
                }
              : undefined
        }
      });

      const baseContext = await baseAuthAdapter.syncUser({
        email: created.email,
        externalUserId: created.id,
        username: created.username,
        displayName: created.displayName,
        ageBand: input.role === "STUDENT" ? input.ageBand : undefined,
        agentName: env.BASE_AGENT_NAME,
        emailVerified: false
      });

      return tx.user.update({
        where: { id: created.id },
        data: {
          baseUserId: extractBaseUserId(baseContext),
          baseContext: baseContext ?? undefined
        }
      });
    });

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
        status: 201,
        headers: {
          "Set-Cookie": sessionCookie(token)
        }
      }
    );
  } catch (error) {
    return jsonError(error);
  }
}

function generateUsername(email: string) {
  const [localPart] = email.toLowerCase().split("@");
  const safeLocalPart = localPart.replace(/[^a-z0-9_-]/g, "_").slice(0, 24);
  return safeLocalPart || `user_${Date.now()}`;
}

function extractBaseUserId(baseContext: unknown) {
  if (!baseContext || typeof baseContext !== "object") return undefined;
  const record = baseContext as Record<string, unknown>;
  return typeof record.userId === "string"
    ? record.userId
    : typeof record.id === "string"
      ? record.id
      : undefined;
}
