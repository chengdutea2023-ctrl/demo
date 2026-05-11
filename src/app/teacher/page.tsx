"use client";

import Link from "next/link";
import { Eye, KeyRound, MonitorUp, Play, Plus, RefreshCw, Square } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type Template = {
  key: string;
  title: string;
  summary: string;
};

type TeacherTask = {
  id: string;
  title: string;
  instructions: string;
  status: "DRAFT" | "ACTIVE" | "CLOSED";
  displayEnabled: boolean;
  template: { title: string };
  classBinding: { name: string; externalClassId: string };
  submissions: Array<{
    id: string;
    textContent: string;
    imageUrl?: string;
    createdAt: string;
    student: { id: string; displayName: string };
    aiFeedback?: { summary: string; guidance: string } | null;
  }>;
};

export default function TeacherPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [tasks, setTasks] = useState<TeacherTask[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const token = useMemo(
    () => (typeof window === "undefined" ? "" : localStorage.getItem("education_agent_token") ?? ""),
    []
  );

  async function load() {
    setLoading(true);
    const response = await fetch("/api/tasks", {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    if (response.status === 401) {
      setMessage("请先登录教师账号。");
      setLoading(false);
      return;
    }
    const data = await response.json();
    setTemplates(data.templates ?? []);
    setTasks(data.tasks ?? []);
    setLoading(false);
  }

  async function createTask(formData: FormData) {
    setMessage("正在创建任务...");
    const response = await fetch("/api/tasks", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({
        templateKey: formData.get("templateKey"),
        classExternalId: formData.get("classExternalId"),
        className: formData.get("className"),
        externalOrgId: formData.get("externalOrgId") || undefined,
        title: formData.get("title"),
        instructions: formData.get("instructions"),
        displayEnabled: formData.get("displayEnabled") === "on"
      })
    });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.message ?? data.error ?? "创建失败。");
      return;
    }
    setMessage("任务已创建，点击开始后学生端才可以进入。");
    await load();
  }

  async function updateTaskStatus(taskId: string, status: TeacherTask["status"]) {
    setMessage(status === "ACTIVE" ? "正在开始任务..." : "正在结束任务...");
    const response = await fetch("/api/tasks", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ taskId, status })
    });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.message ?? data.error ?? "任务状态更新失败。");
      return;
    }
    setMessage(status === "ACTIVE" ? "任务已开始，学生端可以作答。" : "任务已结束，学生端不能再提交。");
    await load();
  }

  async function updateStudentPassword(formData: FormData) {
    setMessage("正在修改学生密码...");
    const response = await fetch("/api/students/password", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({
        usernameOrEmail: formData.get("usernameOrEmail"),
        password: formData.get("password")
      })
    });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.message ?? data.error ?? "修改密码失败。");
      return;
    }
    setMessage("学生密码已修改。");
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <main className="workspace">
      <header className="topNav">
        <div>
          <span className="eyebrow">教师后台</span>
          <h1>课堂任务管理</h1>
        </div>
        <nav>
          <Link href="/student">学生端</Link>
          <Link href="/">首页</Link>
          <button className="iconButton" aria-label="刷新" onClick={load}>
            <RefreshCw size={18} />
          </button>
        </nav>
      </header>

      <section className="teacherGrid">
        <aside className="sideStack">
          <form action={createTask} className="panel">
            <div className="panelTitle">
              <Plus size={20} />
              <h2>创建白名单任务</h2>
            </div>
            <label>
              任务模板
              <select name="templateKey" required>
                {templates.map((template) => (
                  <option key={template.key} value={template.key}>
                    {template.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              任务标题
              <input name="title" placeholder="观察校园里的一张照片" required />
            </label>
            <label>
              班级 ID
              <input name="classExternalId" placeholder="base-class-id" required />
            </label>
            <label>
              班级名称
              <input name="className" placeholder="三年级 1 班" required />
            </label>
            <label>
              机构 ID
              <input name="externalOrgId" placeholder="可选" />
            </label>
            <label>
              给学生的说明
              <textarea name="instructions" placeholder="请写下你看到了什么，再补充一个你想到的小故事。" required />
            </label>
            <label className="checkRow">
              <input name="displayEnabled" type="checkbox" />
              允许大屏展示
            </label>
            <button className="button primary full" type="submit">
              <Plus size={18} /> 创建任务
            </button>
            {message && <p className="formMessage">{message}</p>}
          </form>

          <form action={updateStudentPassword} className="panel">
            <div className="panelTitle">
              <KeyRound size={20} />
              <h2>修改学生密码</h2>
            </div>
            <label>
              学生邮箱或用户名
              <input name="usernameOrEmail" required placeholder="student@example.com 或 student01" />
            </label>
            <label>
              新密码
              <input name="password" type="password" required minLength={8} />
            </label>
            <button className="button secondary full" type="submit">
              <KeyRound size={18} /> 保存新密码
            </button>
          </form>
        </aside>

        <section className="panel taskList">
          <div className="panelTitle">
            <Eye size={20} />
            <h2>完成情况</h2>
          </div>
          {loading && <p className="muted">正在读取任务...</p>}
          {!loading && tasks.length === 0 && <p className="muted">暂无任务。请先创建课堂任务。</p>}
          {tasks.map((task) => (
            <article className="taskCard" key={task.id}>
              <div className="taskHeader">
                <div>
                  <span>{task.classBinding.name}</span>
                  <h3>{task.title}</h3>
                  <b className={`statusPill status${task.status}`}>{taskStatusText(task.status)}</b>
                </div>
                <div className="taskActions">
                  {task.status === "DRAFT" && (
                    <button
                      className="button primary"
                      type="button"
                      onClick={() => updateTaskStatus(task.id, "ACTIVE")}
                    >
                      <Play size={18} /> 开始
                    </button>
                  )}
                  {task.status === "ACTIVE" && (
                    <button
                      className="button secondary"
                      type="button"
                      onClick={() => updateTaskStatus(task.id, "CLOSED")}
                    >
                      <Square size={18} /> 结束
                    </button>
                  )}
                  {task.displayEnabled && (
                    <Link className="iconButton" aria-label="打开大屏" href={`/display/${task.id}`}>
                      <MonitorUp size={18} />
                    </Link>
                  )}
                </div>
              </div>
              <p>{task.instructions}</p>
              <div className="metricRow">
                <strong>{task.submissions.length}</strong>
                <span>份提交</span>
              </div>
              <div className="submissionList">
                {task.submissions.map((submission) => (
                  <div className="submissionItem" key={submission.id}>
                    <strong>{submission.student.displayName}</strong>
                    <p>{submission.textContent}</p>
                    {submission.aiFeedback && <span>{submission.aiFeedback.guidance}</span>}
                  </div>
                ))}
              </div>
            </article>
          ))}
        </section>
      </section>
    </main>
  );
}

function taskStatusText(status: TeacherTask["status"]) {
  if (status === "DRAFT") return "准备中";
  if (status === "ACTIVE") return "进行中";
  return "已结束";
}
