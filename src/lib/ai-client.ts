import { env } from "@/lib/env";

export type AiFeedbackInput = {
  templateTitle: string;
  templatePromptSeed: string;
  safetyGuidelines: string;
  taskInstructions: string;
  studentText: string;
};

export type AiFeedbackResult = {
  summary: string;
  guidance: string;
  safetyNotes: string;
  rawProvider?: unknown;
};

export async function generateAiFeedback(input: AiFeedbackInput): Promise<AiFeedbackResult> {
  if (!env.AI_API_KEY) {
    return fallbackFeedback(input);
  }

  const response = await fetch(new URL("/chat/completions", env.AI_API_BASE_URL), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.AI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: env.AI_MODEL,
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content:
            "你是面向7-10岁儿童的课堂任务反馈助手。只围绕教师任务给简短、友善、适龄的引导；不要替孩子完成作品；不要自由聊天；不要提供危险实验或成人内容。"
        },
        {
          role: "user",
          content: JSON.stringify({
            task: input.templateTitle,
            teacherInstructions: input.taskInstructions,
            promptSeed: input.templatePromptSeed,
            safetyGuidelines: input.safetyGuidelines,
            studentText: input.studentText,
            outputFormat: {
              summary: "一句话概括孩子已经完成的内容",
              guidance: "一句鼓励 + 一个可继续补充的问题",
              safetyNotes: "是否符合儿童安全边界"
            }
          })
        }
      ],
      response_format: { type: "json_object" }
    })
  });

  const raw = await response.json();
  if (!response.ok) {
    throw new Error(`AI provider ${response.status}: ${JSON.stringify(raw)}`);
  }

  const content = raw?.choices?.[0]?.message?.content;
  if (typeof content !== "string") return fallbackFeedback(input, raw);

  try {
    const parsed = JSON.parse(content);
    return {
      summary: String(parsed.summary ?? "已经收到你的作品。"),
      guidance: String(parsed.guidance ?? "你可以再补充一个观察到的小细节。"),
      safetyNotes: String(parsed.safetyNotes ?? "已按白名单任务反馈。"),
      rawProvider: raw
    };
  } catch {
    return fallbackFeedback(input, raw);
  }
}

function fallbackFeedback(input: AiFeedbackInput, rawProvider?: unknown): AiFeedbackResult {
  const shortText = input.studentText.trim().slice(0, 32);

  return {
    summary: shortText ? `你已经写下了「${shortText}${input.studentText.length > 32 ? "..." : ""}」。` : "你已经开始完成这个任务。",
    guidance: `做得很清楚。你可以再补充一个细节：谁、在哪里、接下来会发生什么？`,
    safetyNotes: "使用本地兜底反馈，限定在教师白名单任务内。",
    rawProvider
  };
}
