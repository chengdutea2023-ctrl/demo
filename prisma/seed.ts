import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const templates = [
  {
    key: "picture-story",
    title: "图片故事一分钟",
    summary: "学生观察一张图，写出看到的内容和一个小故事。",
    promptSeed: "围绕学生观察到的图片内容，鼓励他补充人物、地点、心情和下一步行动。",
    safetyGuidelines: "只反馈表达是否清楚和可以继续观察的方向，不评价孩子好坏，不生成完整故事替代孩子完成。"
  },
  {
    key: "science-observation",
    title: "科学观察小记录",
    summary: "学生记录一个生活中的科学现象，并写下自己的猜想。",
    promptSeed: "引导学生描述现象、提出猜想、补充一个可观察的证据。",
    safetyGuidelines: "不要求危险实验，不提供火、电、化学品相关操作步骤。"
  },
  {
    key: "kind-expression",
    title: "友善表达卡",
    summary: "学生描述一个校园情境，并练习清楚、友善地表达想法。",
    promptSeed: "帮助学生把感受、原因和希望说清楚，鼓励使用礼貌表达。",
    safetyGuidelines: "不做心理诊断，不贴负面标签，遇到伤害风险提示找老师或家长。"
  }
];

async function main() {
  for (const template of templates) {
    await prisma.taskTemplate.upsert({
      where: { key: template.key },
      update: template,
      create: template
    });
  }
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
