import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { baseAuthAdapter } from "@/lib/base-auth-adapter";
import { requireSessionUser } from "@/lib/auth";
import { env } from "@/lib/env";
import { jsonError } from "@/lib/http";

export async function GET(request: Request) {
  try {
    const session = await requireSessionUser(request);
    if (session.role !== UserRole.TEACHER) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const agentName = searchParams.get("agentName") || env.BASE_AGENT_NAME;
    const users = await baseAuthAdapter.listApplicationUsers(agentName);

    return NextResponse.json({ users });
  } catch (error) {
    return jsonError(error);
  }
}
