"use client";

import Link from "next/link";
import { ImagePlus, Send, Sparkles, Tablet } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type StudentTask = {
  id: string;
  title: string;
  instructions: string;
  template: { title: string; summary: string };
  classBinding: { name: string };
  submissions: Array<{
    id: string;
    textContent: string;
    imageUrl?: string;
    aiFeedback?: { summary: string; guidance: string } | null;
  }>;
};

export default function StudentPage() {
  const [tasks, setTasks] = useState<StudentTask[]>([]);
  const [activeTaskId, setActiveTaskId] = useState("");
  const [message, setMessage] = useState("");
  const token = useMemo(
    () => (typeof window === "undefined" ? "" : localStorage.getItem("education_agent_token") ?? ""),
    []
  );

  async function load() {
    const response = await fetch("/api/tasks", {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    if (response.status === 401) {
      setMessage("请先登录学生账号。");
      return;
    }
    const data = await response.json();
    const nextTasks = data.tasks ?? [];
    setTasks(nextTasks);
    setActiveTaskId((current) => current || nextTasks[0]?.id || "");
  }

  async function submit(formData: FormData) {
    setMessage("正在提交并生成 AI 反馈...");
    const response = await fetch("/api/submissions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({
        classTaskId: activeTaskId,
        textContent: formData.get("textContent"),
        imageUrl: formData.get("imageUrl") || undefined
      })
    });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.message ?? data.error ?? "提交失败。");
      return;
    }
    setMessage(data.submission.aiFeedback?.guidance ?? "提交成功。");
    await load();
  }

  useEffect(() => {
    load();
  }, []);

  const activeTask = tasks.find((task) => task.id === activeTaskId);

  return (
    <main className="workspace studentSurface">
      <header className="topNav">
        <div>
          <span className="eyebrow">学生 iPad 端</span>
          <h1>我的课堂任务</h1>
        </div>
        <nav>
          <Link href="/student/login">学生登录</Link>
          <Link href="/">首页</Link>
        </nav>
      </header>

      <section className="studentGrid">
        <aside className="panel compact">
          <h2>互动课堂</h2>
          {tasks.length === 0 && (
            <div className="emptyState">
              <Tablet size={28} />
              <strong>等待老师开始</strong>
              <p>老师开始课堂任务，并把你的邮箱加入班级后，这里会出现可以完成的互动任务。</p>
            </div>
          )}
          {tasks.map((task) => (
            <button
              className={task.id === activeTaskId ? "taskPicker active" : "taskPicker"}
              key={task.id}
              type="button"
              onClick={() => setActiveTaskId(task.id)}
            >
              <span>{task.classBinding.name}</span>
              <strong>{task.title}</strong>
              <em>{task.submissions.length ? "已提交" : "待完成"}</em>
            </button>
          ))}
        </aside>

        <section className="panel">
          {activeTask ? (
            <>
              <div className="panelTitle">
                <Sparkles size={20} />
                <h2>{activeTask.title}</h2>
              </div>
              <p className="taskInstruction">{activeTask.instructions}</p>
              <form action={submit} className="studentForm">
                <label>
                  我的观察和想法
                  <textarea
                    name="textContent"
                    placeholder="我看到了... 我想到..."
                    defaultValue={activeTask.submissions[0]?.textContent ?? ""}
                    required
                    minLength={5}
                  />
                </label>
                <label>
                  图片链接
                  <div className="inputWithIcon">
                    <ImagePlus size={18} />
                    <input name="imageUrl" type="url" placeholder="https://example.com/my-picture.jpg" />
                  </div>
                </label>
                <button className="button primary" type="submit">
                  <Send size={18} /> 提交作品
                </button>
              </form>
              {message && <p className="feedbackBox">{message}</p>}
              {activeTask.submissions[0]?.aiFeedback && (
                <div className="feedbackBox">
                  <strong>{activeTask.submissions[0].aiFeedback.summary}</strong>
                  <p>{activeTask.submissions[0].aiFeedback.guidance}</p>
                </div>
              )}
            </>
          ) : (
            <div className="emptyState large">
              <Sparkles size={36} />
              <strong>还没有可进入的互动课堂</strong>
              <p>请先确认已经用学生账号登录。课堂开始后，你可以在这里提交文字和图片作品，并收到 AI 的简短引导反馈。</p>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
