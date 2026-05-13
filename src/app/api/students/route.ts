import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { requireSessionUser } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const session = await requireSessionUser(request);
    if (session.role !== UserRole.TEACHER) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const students = await prisma.user.findMany({
      where: {
        role: UserRole.STUDENT
      },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        status: true,
        createdAt: true,
        studentProfile: {
          select: {
            ageBand: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json({
      students: students.map((student) => ({
        id: student.id,
        email: student.email,
        username: student.username,
        displayName: student.displayName,
        status: student.status,
        ageBand: student.studentProfile?.ageBand ?? "",
        createdAt: student.createdAt
      }))
    });
  } catch (error) {
    return jsonError(error);
  }
}
