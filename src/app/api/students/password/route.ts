import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { z } from "zod";
import { hashPassword, requireSessionUser } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const updatePasswordSchema = z.object({
  usernameOrEmail: z.string().min(1),
  password: z.string().min(8)
});

export async function PATCH(request: Request) {
  try {
    const session = await requireSessionUser(request);
    if (session.role !== UserRole.TEACHER) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const input = updatePasswordSchema.parse(await request.json());
    const student = await prisma.user.findFirst({
      where: {
        role: UserRole.STUDENT,
        OR: [{ email: input.usernameOrEmail }, { username: input.usernameOrEmail }]
      }
    });

    if (!student) {
      return NextResponse.json({ error: "STUDENT_NOT_FOUND" }, { status: 404 });
    }

    const canManage = await prisma.classMember.findFirst({
      where: {
        userId: student.id,
        classBinding: { teacherId: session.id }
      }
    });

    const hasSubmissionInTeacherTask = await prisma.submission.findFirst({
      where: {
        studentId: student.id,
        classTask: { teacherId: session.id }
      }
    });

    if (!canManage && !hasSubmissionInTeacherTask) {
      return NextResponse.json({ error: "STUDENT_NOT_IN_TEACHER_SCOPE" }, { status: 403 });
    }

    await prisma.user.update({
      where: { id: student.id },
      data: { passwordHash: await hashPassword(input.password) }
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
