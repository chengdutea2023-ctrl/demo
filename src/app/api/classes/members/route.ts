import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { z } from "zod";
import { requireSessionUser } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const addClassMemberSchema = z
  .object({
    classExternalId: z.string().min(1),
    studentEmail: z.string().email().optional(),
    studentIds: z.array(z.string().min(1)).optional()
  })
  .refine((input) => input.studentEmail || input.studentIds?.length, {
    message: "请选择学生。"
  });

export async function POST(request: Request) {
  try {
    const session = await requireSessionUser(request);
    if (session.role !== UserRole.TEACHER) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const input = addClassMemberSchema.parse(await request.json());
    const classBinding = await prisma.classBinding.findFirst({
      where: {
        externalClassId: input.classExternalId,
        teacherId: session.id
      }
    });

    if (!classBinding) {
      return NextResponse.json({ error: "CLASS_NOT_FOUND" }, { status: 404 });
    }

    const studentIds = Array.from(new Set(input.studentIds ?? []));
    const students = input.studentEmail
      ? await prisma.user.findMany({
          where: {
            email: input.studentEmail.toLowerCase(),
            role: UserRole.STUDENT,
            status: "ACTIVE"
          },
          select: {
            id: true,
            email: true,
            displayName: true
          }
        })
      : await prisma.user.findMany({
          where: {
            id: { in: studentIds },
            role: UserRole.STUDENT,
            status: "ACTIVE"
          },
          select: {
            id: true,
            email: true,
            displayName: true
          }
        });

    if (students.length === 0) {
      return NextResponse.json({ error: "STUDENT_NOT_FOUND" }, { status: 404 });
    }

    const members = await prisma.$transaction(
      students.map((student) =>
        prisma.classMember.upsert({
          where: {
            classBindingId_userId: {
              classBindingId: classBinding.id,
              userId: student.id
            }
          },
          update: { externalRole: "STUDENT" },
          create: {
            classBindingId: classBinding.id,
            userId: student.id,
            externalRole: "STUDENT"
          }
        })
      )
    );

    return NextResponse.json({
      members,
      students,
      classBinding: {
        id: classBinding.id,
        externalClassId: classBinding.externalClassId,
        name: classBinding.name
      }
    });
  } catch (error) {
    return jsonError(error);
  }
}
