import { NextResponse } from "next/server";
import { baseAuthAdapter } from "@/lib/base-auth-adapter";
import { getSessionUser } from "@/lib/auth";
import { jsonError } from "@/lib/http";

export async function GET(request: Request) {
  try {
    const session = await getSessionUser(request);
    if (!session) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

    const authHeader = request.headers.get("authorization");
    const platformToken = authHeader?.startsWith("PlatformBearer ")
      ? authHeader.slice("PlatformBearer ".length)
      : undefined;

    const classes = await baseAuthAdapter.listClasses(platformToken);
    return NextResponse.json({ classes });
  } catch (error) {
    return jsonError(error);
  }
}
