import { env } from "@/lib/env";

export type SyncApplicationUserInput = {
  email: string;
  externalUserId: string;
  username?: string;
  displayName?: string;
  ageBand?: string;
  agentName?: string;
  emailVerified?: boolean;
};

export type BaseClass = {
  id: string;
  organizationId?: string;
  name: string;
  raw: unknown;
};

export type BaseClassMember = {
  id: string;
  classId: string;
  role: "TEACHER" | "STUDENT" | "ASSISTANT" | string;
  displayName?: string;
  email?: string;
  raw: unknown;
};

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH";
  body?: unknown;
  bearerToken?: string;
  appAuth?: boolean;
};

export class BaseAuthAdapter {
  constructor(
    private readonly baseUrl = env.BASE_API_URL,
    private readonly appId = env.BASE_APP_ID,
    private readonly appSecret = env.BASE_APP_SECRET
  ) {}

  async syncUser(input: SyncApplicationUserInput) {
    return this.request("/api/v1/app-auth/users/sync", {
      method: "POST",
      appAuth: true,
      body: input
    });
  }

  async findUserByEmail(email: string) {
    return this.request(`/api/v1/app-auth/users/by-email?email=${encodeURIComponent(email)}`, {
      appAuth: true
    });
  }

  async listApplicationUsers(agentName = env.BASE_AGENT_NAME) {
    const path = `/api/v1/applications/${encodeURIComponent(this.appId)}/users?agentName=${encodeURIComponent(agentName)}`;
    return this.request(path, { appAuth: true });
  }

  async platformLogin(usernameOrEmail: string, password: string) {
    return this.request("/api/v1/auth/login", {
      method: "POST",
      body: { usernameOrEmail, password }
    });
  }

  async refresh(refreshToken: string) {
    return this.request("/api/v1/auth/refresh", {
      method: "POST",
      body: { refreshToken }
    });
  }

  async exchangeCode(code: string, redirectUri: string) {
    return this.request("/api/v1/auth/token", {
      method: "POST",
      body: {
        appId: this.appId,
        appSecret: this.appSecret,
        code,
        redirectUri
      }
    });
  }

  async me(bearerToken: string) {
    return this.request("/api/v1/auth/me", { bearerToken });
  }

  async listClasses(bearerToken?: string): Promise<BaseClass[]> {
    const data = await this.request("/api/v1/organizations", { bearerToken });
    const organizations = Array.isArray(data) ? data : getArray(data, ["items", "data", "organizations"]);

    return organizations.flatMap((organization: Record<string, unknown>) => {
      const classes = getArray(organization, ["classes", "classrooms"]);
      return classes.map((classItem: Record<string, unknown>) => ({
        id: String(classItem.id ?? classItem.classId ?? classItem.code),
        organizationId: String(organization.id ?? organization.organizationId ?? ""),
        name: String(classItem.name ?? classItem.title ?? "未命名班级"),
        raw: classItem
      }));
    });
  }

  async listClassMembers(classId: string, bearerToken?: string): Promise<BaseClassMember[]> {
    const data = await this.request(`/api/v1/organizations/classes/${encodeURIComponent(classId)}/members`, {
      bearerToken
    });
    const members = Array.isArray(data) ? data : getArray(data, ["items", "data", "members"]);

    return members.map((member: Record<string, unknown>) => ({
      id: String(member.userId ?? member.id),
      classId,
      role: String(member.role ?? "STUDENT"),
      displayName: typeof member.displayName === "string" ? member.displayName : undefined,
      email: typeof member.email === "string" ? member.email : undefined,
      raw: member
    }));
  }

  private async request(path: string, options: RequestOptions = {}) {
    const headers = new Headers({
      Accept: "application/json"
    });

    if (options.body) headers.set("Content-Type", "application/json");
    if (options.appAuth) {
      headers.set("X-App-Id", this.appId);
      headers.set("X-App-Secret", this.appSecret);
    }
    if (options.bearerToken) headers.set("Authorization", `Bearer ${options.bearerToken}`);

    const response = await fetch(new URL(path, this.baseUrl), {
      method: options.method ?? "GET",
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
      cache: "no-store"
    });

    const text = await response.text();
    const data = text ? JSON.parse(text) : null;

    if (!response.ok) {
      throw new Error(`Base API ${response.status}: ${text || response.statusText}`);
    }

    return data;
  }
}

function getArray(source: unknown, keys: string[]) {
  if (!source || typeof source !== "object") return [];
  const record = source as Record<string, unknown>;

  for (const key of keys) {
    const value = record[key];
    if (Array.isArray(value)) return value as Record<string, unknown>[];
  }

  return [];
}

export const baseAuthAdapter = new BaseAuthAdapter();
