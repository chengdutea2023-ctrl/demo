"use client";

import Link from "next/link";
import { LogIn } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function StudentLoginPage() {
  const router = useRouter();
  const [message, setMessage] = useState("");

  async function submit(formData: FormData) {
    setMessage("正在登录...");
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        usernameOrEmail: formData.get("usernameOrEmail"),
        password: formData.get("password"),
        role: "STUDENT"
      })
    });

    const data = await response.json();
    if (!response.ok) {
      setMessage("学生账号或密码不正确。");
      return;
    }

    localStorage.setItem("education_agent_token", data.token);
    router.push("/student");
  }

  return (
    <main className="authShell">
      <form action={submit} className="authCard">
        <h1>学生登录</h1>
        <label>
          邮箱或用户名
          <input name="usernameOrEmail" autoComplete="username" required />
        </label>
        <label>
          密码
          <input name="password" type="password" autoComplete="current-password" required />
        </label>
        <button className="button primary full" type="submit">
          <LogIn size={18} /> 登录学生端
        </button>
        {message && <p className="formMessage">{message}</p>}
        <Link href="/student/register">还没有学生账号，去注册</Link>
        <Link href="/teacher/login">我是教师</Link>
      </form>
    </main>
  );
}
