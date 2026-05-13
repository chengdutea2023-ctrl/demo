import { NextResponse } from "next/server";
import { TaskStatus, UserRole } from "@prisma/client";
import { z } from "zod";
import { requireSessionUser } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const ECO_COURSEWARE_TEMPLATE_KEY = "eco-island-rescue";

const completionSchema = z.object({
  observed: z.array(z.string()).max(5),
  causeChain: z.array(z.string()).max(4),
  appliedActions: z.array(z.string()).max(4),
  hypothesis: z.string().min(1),
  studentReason: z.string().max(600),
  restorationScore: z.number().min(0).max(100)
});

export async function GET(
  request: Request,
  context: { params: Promise<{ taskId: string }> }
) {
  try {
    const session = await requireSessionUser(request);
    const { taskId } = await context.params;
    const task = await findEcoTask(taskId);

    if (!task) {
      return NextResponse.json({ error: "COURSEWARE_NOT_FOUND" }, { status: 404 });
    }

    if (session.role === UserRole.TEACHER) {
      if (task.teacherId !== session.id) {
        return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
      }

      return NextResponse.json({
        task: toCoursewareTask(task),
        role: session.role
      });
    }

    if (task.status !== TaskStatus.ACTIVE) {
      return NextResponse.json({ error: "COURSEWARE_NOT_ACTIVE" }, { status: 403 });
    }

    const membership = await prisma.classMember.findFirst({
      where: {
        userId: session.id,
        classBindingId: task.classBindingId
      }
    });

    if (!membership) {
      return NextResponse.json({ error: "NOT_IN_CLASS" }, { status: 403 });
    }

    const submission = await prisma.submission.findUnique({
      where: {
        classTaskId_studentId: {
          classTaskId: task.id,
          studentId: session.id
        }
      },
      select: { id: true, textContent: true, coursewareState: true, updatedAt: true }
    });

    return NextResponse.json({
      task: toCoursewareTask(task),
      role: session.role,
      submission
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ taskId: string }> }
) {
  try {
    const session = await requireSessionUser(request);
    if (session.role !== UserRole.STUDENT) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const { taskId } = await context.params;
    const task = await findEcoTask(taskId);
    if (!task || task.status !== TaskStatus.ACTIVE) {
      return NextResponse.json({ error: "COURSEWARE_NOT_ACTIVE" }, { status: 404 });
    }

    const membership = await prisma.classMember.findFirst({
      where: {
        userId: session.id,
        classBindingId: task.classBindingId
      }
    });

    if (!membership) {
      return NextResponse.json({ error: "NOT_IN_CLASS" }, { status: 403 });
    }

    const input = completionSchema.parse(await request.json());
    const textContent = buildCompletionText(input);
    const coursewareState = toJsonValue(input);

    const submission = await prisma.submission.upsert({
      where: {
        classTaskId_studentId: {
          classTaskId: task.id,
          studentId: session.id
        }
      },
      create: {
        classTaskId: task.id,
        studentId: session.id,
        textContent,
        coursewareState
      },
      update: {
        textContent,
        coursewareState
      },
      select: {
        id: true,
        textContent: true,
        coursewareState: true,
        updatedAt: true
      }
    });

    return NextResponse.json({ submission }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}

function toJsonValue(value: unknown) {
  return JSON.parse(JSON.stringify(value));
}

async function findEcoTask(taskId: string) {
  return prisma.classTask.findFirst({
    where: {
      id: taskId,
      template: { is: { key: ECO_COURSEWARE_TEMPLATE_KEY } }
    },
    include: {
      classBinding: true,
      template: true
    }
  });
}

type EcoTask = NonNullable<Awaited<ReturnType<typeof findEcoTask>>>;

function toCoursewareTask(task: EcoTask) {
  return {
    id: task.id,
    title: task.title,
    instructions: task.instructions,
    status: task.status,
    className: task.classBinding.name,
    templateTitle: task.template.title
  };
}

function buildCompletionText(input: z.infer<typeof completionSchema>) {
  const observed = input.observed.length ? input.observed.join("、") : "未记录";
  const causeChain = input.causeChain.length ? input.causeChain.join(" → ") : "未完成";
  const appliedActions = input.appliedActions.length ? input.appliedActions.join("、") : "未投放";
  const reason = input.studentReason.trim() || "学生暂未填写解释。";

  return [
    `完成《AI 生态探险课：拯救小岛生态》，生态恢复进度 ${input.restorationScore}%。`,
    `观察证据：${observed}。`,
    `因果链：${causeChain}。`,
    `修复行动：${appliedActions}。`,
    `我的解释：${reason}`
  ].join("\n");
}
