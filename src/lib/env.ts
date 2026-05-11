import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().optional(),
  BASE_API_URL: z.string().url().default("http://meiyu.cdbbox.com"),
  BASE_APP_ID: z.string().default("education-agent-test-1"),
  BASE_APP_SECRET: z.string().default("dev-app-secret"),
  BASE_AGENT_NAME: z.string().default("教育智能体测试1"),
  AI_API_BASE_URL: z.string().url().default("https://api.openai.com/v1"),
  AI_API_KEY: z.string().optional(),
  AI_MODEL: z.string().default("gpt-4o-mini"),
  SESSION_SECRET: z.string().default("dev-session-secret-change-me")
});

export const env = envSchema.parse(process.env);
