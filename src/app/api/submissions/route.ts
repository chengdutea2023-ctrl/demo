import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { z } from "zod";
import { generateAiFeedback } from "@/lib/ai-client";
import { requireSessionUser } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const submissionSchema = z.object({
  classTaskId: z.string().min(1),
  textContent: z.string().min(5).max(1200),
  imageUrl: z.string().url().optional().or(z.literal(""))
});

export async function POST(request: Request) {
  try {
    const session = await requireSessionUser(request);
    if (session.role !== UserRole.STUDENT) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const input = submissionSchema.parse(await request.json());
    const task = await prisma.classTask.findFirst({
      where: { id: input.classTaskId, status: "ACTIVE" },
      include: { template: true, classBinding: true }
    });

    if (!task) return NextResponse.json({ error: "TASK_NOT_FOUND" }, { status: 404 });

    const membership = await prisma.classMember.findFirst({
      where: {
        userId: session.id,
        classBindingId: task.classBindingId
      }
    });

    if (!membership) {
      return NextResponse.json({ error: "NOT_IN_CLASS" }, { status: 403 });
    }

    const aiFeedback = await generateAiFeedback({
      templateTitle: task.template.title,
      templatePromptSeed: task.template.promptSeed,
      safetyGuidelines: task.template.safetyGuidelines,
      taskInstructions: task.instructions,
      studentText: input.textContent
    });
    const feedbackData = {
      summary: aiFeedback.summary,
      guidance: aiFeedback.guidance,
      safetyNotes: aiFeedback.safetyNotes,
      rawProvider: toJsonValue(aiFeedback.rawProvider)
    };

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
        textContent: input.textContent,
        imageUrl: input.imageUrl || undefined,
        aiFeedback: { create: feedbackData }
      },
      update: {
        textContent: input.textContent,
        imageUrl: input.imageUrl || undefined,
        aiFeedback: {
          upsert: {
            create: feedbackData,
            update: feedbackData
          }
        }
      },
      include: { aiFeedback: true }
    });

    return NextResponse.json({ submission }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}

function toJsonValue(value: unknown) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}
