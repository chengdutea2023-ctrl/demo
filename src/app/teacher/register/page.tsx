"use client";

import Link from "next/link";
import { UserPlus } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function TeacherRegisterPage() {
  const router = useRouter();
  const [message, setMessage] = useState("");

  async function submit(formData: FormData) {
    setMessage("正在注册教师账号...");
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: formData.get("email"),
        username: formData.get("username"),
        password: formData.get("password"),
        displayName: formData.get("displayName"),
        role: "TEACHER"
      })
    });
    const data = await response.json();

    if (!response.ok) {
      setMessage(data.message ?? "注册失败，请检查邮箱、用户名或底座配置。");
      return;
    }

    localStorage.setItem("education_agent_token", data.token);
    router.push("/teacher");
  }

  return (
    <main className="authShell">
      <form action={submit} className="authCard">
        <h1>教师注册</h1>
        <label>
          教师姓名
          <input name="displayName" required />
        </label>
        <label>
          用户名
          <input name="username" required minLength={3} />
        </label>
        <label>
          邮箱
          <input name="email" type="email" required />
        </label>
        <label>
          设置密码
          <input name="password" type="password" required minLength={8} />
        </label>
        <button className="button primary full" type="submit">
          <UserPlus size={18} /> 注册教师账号
        </button>
        {message && <p className="formMessage">{message}</p>}
        <Link href="/teacher/login">已有教师账号，去登录</Link>
        <Link href="/student/register">我是学生</Link>
      </form>
    </main>
  );
}
