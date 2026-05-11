import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function jsonError(error: unknown) {
  if (error instanceof Response) {
    return new NextResponse(error.body, {
      status: error.status,
      headers: error.headers
    });
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", details: error.flatten() },
      { status: 400 }
    );
  }

  const message = error instanceof Error ? error.message : "Unexpected error";
  if (message.includes("Environment variable not found: DATABASE_URL")) {
    return NextResponse.json(
      {
        error: "DATABASE_NOT_CONFIGURED",
        message: "系统数据库未配置，请先设置 DATABASE_URL 并初始化数据库。"
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ error: "SERVER_ERROR", message }, { status: 500 });
}
