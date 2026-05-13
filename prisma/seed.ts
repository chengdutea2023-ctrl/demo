import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const templates = [
  {
    key: "eco-island-rescue",
    title: "AI 生态探险课：拯救小岛生态",
    summary: "学生拖动放大镜观察小岛线索，排列生态因果链，并投放修复工具完成互动探究。",
    promptSeed: "围绕学生收集到的生态证据、因果链和修复方案，追问他为什么这样判断，以及哪个证据最能支持选择。",
    safetyGuidelines: "只做适龄科学探究引导，不提供危险实验，不替学生完成整套推理或评价孩子好坏。"
  }
];

async function main() {
  await prisma.taskTemplate.updateMany({
    where: { key: { notIn: templates.map((template) => template.key) } },
    data: { isActive: false }
  });

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
