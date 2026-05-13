import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth";
import { jsonError } from "@/lib/http";

export async function GET(request: Request) {
  try {
    const user = await requireSessionUser(request);
    return NextResponse.json({ user });
  } catch (error) {
    return jsonError(error);
  }
}
