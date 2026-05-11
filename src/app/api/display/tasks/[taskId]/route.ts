import { NextResponse } from "next/server";
import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  context: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await context.params;
    const task = await prisma.classTask.findFirst({
      where: { id: taskId, displayEnabled: true },
      include: {
        template: true,
        classBinding: true,
        submissions: {
          include: {
            student: { select: { id: true, displayName: true } },
            aiFeedback: true
          },
          orderBy: { createdAt: "asc" }
        }
      }
    });

    if (!task) {
      return NextResponse.json({ error: "DISPLAY_NOT_FOUND" }, { status: 404 });
    }

    return NextResponse.json({
      task: {
        id: task.id,
        title: task.title,
        instructions: task.instructions,
        templateTitle: task.template.title,
        className: task.classBinding.name,
        submissions: task.submissions.map((submission) => ({
          id: submission.id,
          studentName: submission.student.displayName,
          textContent: submission.textContent,
          imageUrl: submission.imageUrl,
          aiFeedback: submission.aiFeedback
            ? {
                summary: submission.aiFeedback.summary,
                guidance: submission.aiFeedback.guidance
              }
            : null,
          createdAt: submission.createdAt
        }))
      }
    });
  } catch (error) {
    return jsonError(error);
  }
}
