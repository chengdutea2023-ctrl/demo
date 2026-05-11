"use client";

import Link from "next/link";
import { UserPlus } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function StudentRegisterPage() {
  const router = useRouter();
  const [message, setMessage] = useState("");

  async function submit(formData: FormData) {
    setMessage("正在注册学生账号...");
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: formData.get("email"),
        password: formData.get("password"),
        displayName: formData.get("displayName"),
        ageBand: formData.get("ageBand") || undefined,
        role: "STUDENT"
      })
    });
    const data = await response.json();

    if (!response.ok) {
      setMessage(data.message ?? "注册失败，请检查邮箱或底座配置。");
      return;
    }

    localStorage.setItem("education_agent_token", data.token);
    router.push("/student");
  }

  return (
    <main className="authShell">
      <form action={submit} className="authCard wide">
        <h1>学生注册</h1>
        <div className="formGrid">
          <label>
            学生姓名
            <input name="displayName" required />
          </label>
          <label>
            邮箱
            <input name="email" type="email" required />
          </label>
          <label>
            设置密码
            <input name="password" type="password" required minLength={8} />
          </label>
          <label>
            年龄段
            <select name="ageBand" required defaultValue="6-12岁">
              <option value="6-12岁">6-12岁</option>
              <option value="12-15岁">12-15岁</option>
              <option value="15-20岁">15-20岁</option>
            </select>
          </label>
        </div>
        <button className="button primary full" type="submit">
          <UserPlus size={18} /> 注册学生账号
        </button>
        {message && <p className="formMessage">{message}</p>}
        <Link href="/student/login">已有学生账号，去登录</Link>
        <Link href="/teacher/register">我是教师</Link>
      </form>
    </main>
  );
}
