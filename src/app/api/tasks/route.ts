import { NextResponse } from "next/server";
import { TaskStatus, UserRole } from "@prisma/client";
import { z } from "zod";
import { requireSessionUser } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const createTaskSchema = z.object({
  templateKey: z.string().min(1),
  classExternalId: z.string().min(1),
  className: z.string().min(1),
  externalOrgId: z.string().optional(),
  title: z.string().min(1).max(80),
  instructions: z.string().min(1).max(600),
  displayEnabled: z.boolean().default(false)
});

const updateTaskStatusSchema = z.object({
  taskId: z.string().min(1),
  status: z.nativeEnum(TaskStatus)
});

export async function GET(request: Request) {
  try {
    const session = await requireSessionUser(request);

    if (session.role === UserRole.TEACHER) {
      const [templates, tasks] = await Promise.all([
        prisma.taskTemplate.findMany({ where: { isActive: true }, orderBy: { createdAt: "asc" } }),
        prisma.classTask.findMany({
          where: { teacherId: session.id },
          include: {
            template: true,
            classBinding: true,
            submissions: {
              include: {
                student: { select: { id: true, displayName: true } },
                aiFeedback: true
              },
              orderBy: { createdAt: "desc" }
            }
          },
          orderBy: { createdAt: "desc" }
        })
      ]);

      return NextResponse.json({ templates, tasks });
    }

    const memberships = await prisma.classMember.findMany({
      where: { userId: session.id },
      select: { classBindingId: true }
    });

    const tasks = await prisma.classTask.findMany({
      where: {
        classBindingId: { in: memberships.map((membership) => membership.classBindingId) },
        status: "ACTIVE"
      },
      include: {
        template: true,
        classBinding: true,
        submissions: {
          where: { studentId: session.id },
          include: { aiFeedback: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json({ tasks });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSessionUser(request);
    if (session.role !== UserRole.TEACHER) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const input = createTaskSchema.parse(await request.json());

    const template = await prisma.taskTemplate.findFirst({
      where: { key: input.templateKey, isActive: true }
    });
    if (!template) {
      return NextResponse.json({ error: "TEMPLATE_NOT_ALLOWED" }, { status: 400 });
    }

    const classBinding = await prisma.classBinding.upsert({
      where: { externalClassId: input.classExternalId },
      update: {
        name: input.className,
        externalOrgId: input.externalOrgId,
        teacherId: session.id
      },
      create: {
        externalClassId: input.classExternalId,
        externalOrgId: input.externalOrgId,
        name: input.className,
        teacherId: session.id
      }
    });

    const task = await prisma.classTask.create({
      data: {
        templateId: template.id,
        classBindingId: classBinding.id,
        teacherId: session.id,
        title: input.title,
        instructions: input.instructions,
        status: TaskStatus.DRAFT,
        displayEnabled: input.displayEnabled
      },
      include: { template: true, classBinding: true }
    });

    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requireSessionUser(request);
    if (session.role !== UserRole.TEACHER) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const input = updateTaskStatusSchema.parse(await request.json());
    const task = await prisma.classTask.findFirst({
      where: {
        id: input.taskId,
        teacherId: session.id
      }
    });

    if (!task) {
      return NextResponse.json({ error: "TASK_NOT_FOUND" }, { status: 404 });
    }

    if (!canTransitionTask(task.status, input.status)) {
      return NextResponse.json({ error: "INVALID_TASK_STATUS_TRANSITION" }, { status: 400 });
    }

    const updated = await prisma.classTask.update({
      where: { id: task.id },
      data: { status: input.status },
      include: { template: true, classBinding: true }
    });

    return NextResponse.json({ task: updated });
  } catch (error) {
    return jsonError(error);
  }
}

function canTransitionTask(current: TaskStatus, next: TaskStatus) {
  if (current === next) return true;
  if (current === TaskStatus.DRAFT && next === TaskStatus.ACTIVE) return true;
  if (current === TaskStatus.ACTIVE && next === TaskStatus.CLOSED) return true;
  return false;
}
