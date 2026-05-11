import { describe, expect, it, vi } from "vitest";

describe("generateAiFeedback", () => {
  it("uses a child-safe fallback when no API key is configured", async () => {
    vi.stubEnv("AI_API_KEY", "");
    const { generateAiFeedback } = await import("@/lib/ai-client");

    const feedback = await generateAiFeedback({
      templateTitle: "图片故事一分钟",
      templatePromptSeed: "鼓励观察和补充细节",
      safetyGuidelines: "不替孩子完成作品",
      taskInstructions: "写下你看到了什么",
      studentText: "我看到操场上有同学在合作完成一个小实验。"
    });

    expect(feedback.guidance).toContain("补充一个细节");
    expect(feedback.safetyNotes).toContain("白名单任务");
  });
});
