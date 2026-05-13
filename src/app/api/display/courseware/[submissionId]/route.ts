import { NextResponse } from "next/server";
import { TaskStatus } from "@prisma/client";
import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const ECO_COURSEWARE_TEMPLATE_KEY = "eco-island-rescue";

export async function GET(
  _request: Request,
  context: { params: Promise<{ submissionId: string }> }
) {
  try {
    const { submissionId } = await context.params;
    const submission = await prisma.submission.findFirst({
      where: {
        id: submissionId,
        classTask: {
          status: { in: [TaskStatus.ACTIVE, TaskStatus.CLOSED] },
          template: { is: { key: ECO_COURSEWARE_TEMPLATE_KEY } }
        }
      },
      include: {
        student: { select: { displayName: true } },
        classTask: {
          include: {
            classBinding: true,
            template: true
          }
        }
      }
    });

    if (!submission) {
      return NextResponse.json({ error: "DISPLAY_NOT_FOUND" }, { status: 404 });
    }

    return NextResponse.json({
      submission: {
        id: submission.id,
        studentName: submission.student.displayName,
        textContent: submission.textContent,
        coursewareState: submission.coursewareState,
        updatedAt: submission.updatedAt,
        task: {
          id: submission.classTask.id,
          title: submission.classTask.title,
          instructions: submission.classTask.instructions,
          className: submission.classTask.classBinding.name,
          templateTitle: submission.classTask.template.title
        }
      }
    });
  } catch (error) {
    return jsonError(error);
  }
}
