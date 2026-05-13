"use client";

import Link from "next/link";
import { ArrowRight, ImagePlus, LogOut, Send, Sparkles, Tablet, Trees } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const ECO_COURSEWARE_TEMPLATE_KEY = "eco-island-rescue";

type StudentTask = {
  id: string;
  title: string;
  instructions: string;
  template: { key: string; title: string; summary: string };
  classBinding: { name: string };
  submissions: Array<{
    id: string;
    textContent: string;
    imageUrl?: string;
    aiFeedback?: { summary: string; guidance: string } | null;
  }>;
};

type CurrentStudent = {
  id: string;
  email: string;
  displayName: string;
  role: "TEACHER" | "STUDENT";
};

export default function StudentPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<StudentTask[]>([]);
  const [activeTaskId, setActiveTaskId] = useState("");
  const [currentStudent, setCurrentStudent] = useState<CurrentStudent | null>(null);
  const [message, setMessage] = useState("");

  async function load() {
    const headers = getAuthHeaders();
    const meResponse = await fetch("/api/auth/me", { headers });
    if (meResponse.status === 401) {
      setCurrentStudent(null);
      setTasks([]);
      setActiveTaskId("");
      setMessage("请先登录学生账号。");
      return;
    }

    const meData = await meResponse.json();
    if (meData.user?.role !== "STUDENT") {
      setCurrentStudent(null);
      setTasks([]);
      setActiveTaskId("");
      setMessage("当前登录的是教师账号，请退出后使用学生账号进入课堂。");
      return;
    }
    setCurrentStudent(meData.user);

    const response = await fetch("/api/tasks", {
      headers
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
        ...getAuthHeaders()
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

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    localStorage.removeItem("education_agent_token");
    setCurrentStudent(null);
    setTasks([]);
    setActiveTaskId("");
    setMessage("已退出学生账号。");
    router.push("/student/login");
  }

  useEffect(() => {
    load();
  }, []);

  const activeTask = tasks.find((task) => task.id === activeTaskId);
  const activeTaskIsCourseware = activeTask?.template.key === ECO_COURSEWARE_TEMPLATE_KEY;

  return (
    <main className="workspace studentSurface">
      <header className="topNav">
        <div>
          <span className="eyebrow">学生 iPad 端</span>
          <h1>我的课堂任务</h1>
        </div>
        <nav>
          {currentStudent ? (
            <div className="teacherIdentity" aria-label="当前登录学生">
              <span>当前学生</span>
              <strong>{currentStudent.displayName}</strong>
              <em>{currentStudent.email}</em>
            </div>
          ) : (
            <Link href="/student/login">学生登录</Link>
          )}
          <Link href="/">首页</Link>
          {currentStudent && (
            <button className="button secondary" type="button" onClick={logout}>
              <LogOut size={18} /> 退出登录
            </button>
          )}
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
                {activeTaskIsCourseware ? <Trees size={20} /> : <Sparkles size={20} />}
                <h2>{activeTask.title}</h2>
              </div>
              <p className="taskInstruction">{activeTask.instructions}</p>
              {activeTaskIsCourseware ? (
                <div className="coursewareLaunch">
                  <Trees size={34} />
                  <div>
                    <strong>老师已经开启互动课件</strong>
                    <p>进入后完成观察、因果连线和修复工具投放。完成结果会同步到教师后台。</p>
                  </div>
                  <Link className="button primary" href={`/eco-demo?taskId=${activeTask.id}`}>
                    进入课件 <ArrowRight size={18} />
                  </Link>
                </div>
              ) : (
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
              )}
              {message && <p className="feedbackBox">{message}</p>}
              {activeTaskIsCourseware && activeTask.submissions[0] && (
                <div className="feedbackBox">
                  <strong>互动课件已完成</strong>
                  <p>{activeTask.submissions[0].textContent}</p>
                </div>
              )}
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

function getAuthHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("education_agent_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}
