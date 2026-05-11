import { afterEach, describe, expect, it, vi } from "vitest";
import { BaseAuthAdapter } from "@/lib/base-auth-adapter";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("BaseAuthAdapter", () => {
  it("syncs a local user with app credentials", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ id: "base-user-1" }), { status: 201 })
    );
    vi.stubGlobal("fetch", fetchMock);

    const adapter = new BaseAuthAdapter("http://base.test", "app-1", "secret-1");
    const result = await adapter.syncUser({
      email: "student@example.com",
      externalUserId: "local-user-1",
      username: "student01",
      displayName: "学生一",
      ageBand: "6-12岁",
      agentName: "教育智能体测试1"
    });

    expect(result).toEqual({ id: "base-user-1" });
    const calls = fetchMock.mock.calls as unknown as Array<[URL, RequestInit]>;
    const init = calls[0][1];
    const headers = init.headers as Headers;
    expect(headers.get("X-App-Id")).toBe("app-1");
    expect(headers.get("X-App-Secret")).toBe("secret-1");
    expect(JSON.parse(String(init.body))).toMatchObject({
      email: "student@example.com",
      externalUserId: "local-user-1",
      ageBand: "6-12岁",
      agentName: "教育智能体测试1"
    });
  });

  it("lists synced users for an application and agent name", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ items: [] }), { status: 200 })
    );
    vi.stubGlobal("fetch", fetchMock);

    const adapter = new BaseAuthAdapter("http://base.test", "app-1", "secret-1");
    await expect(adapter.listApplicationUsers("教育智能体测试1")).resolves.toEqual({ items: [] });

    const [url, init] = fetchMock.mock.calls[0] as unknown as [URL, RequestInit];
    expect(String(url)).toBe(
      "http://base.test/api/v1/applications/app-1/users?agentName=%E6%95%99%E8%82%B2%E6%99%BA%E8%83%BD%E4%BD%93%E6%B5%8B%E8%AF%951"
    );
    const headers = init.headers as Headers;
    expect(headers.get("X-App-Id")).toBe("app-1");
    expect(headers.get("X-App-Secret")).toBe("secret-1");
  });

  it("normalizes classes from organization payloads", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            data: [
              {
                id: "org-1",
                classes: [{ id: "class-1", name: "三年级 1 班" }]
              }
            ]
          }),
          { status: 200 }
        )
      )
    );

    const adapter = new BaseAuthAdapter("http://base.test", "app-1", "secret-1");
    await expect(adapter.listClasses()).resolves.toEqual([
      {
        id: "class-1",
        organizationId: "org-1",
        name: "三年级 1 班",
        raw: { id: "class-1", name: "三年级 1 班" }
      }
    ]);
  });
});
