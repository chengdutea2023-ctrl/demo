"use client";

import Link from "next/link";
import { Eye, KeyRound, LogOut, MonitorUp, Play, Plus, RefreshCw, Square, Trees, UserRound, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const ECO_COURSEWARE_TEMPLATE_KEY = "eco-island-rescue";

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
  template: { key: string; title: string };
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

type RegisteredStudent = {
  id: string;
  email: string;
  username: string;
  displayName: string;
  status: "ACTIVE" | "DISABLED";
  ageBand: string;
  createdAt: string;
};

type CurrentTeacher = {
  id: string;
  email: string;
  displayName: string;
  role: "TEACHER" | "STUDENT";
};

export default function TeacherPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [tasks, setTasks] = useState<TeacherTask[]>([]);
  const [students, setStudents] = useState<RegisteredStudent[]>([]);
  const [currentTeacher, setCurrentTeacher] = useState<CurrentTeacher | null>(null);
  const [selectedStudentIdsByTask, setSelectedStudentIdsByTask] = useState<Record<string, string[]>>({});
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(true);

  async function load() {
    setLoading(true);
    const headers = getAuthHeaders();
    const [response, studentsResponse, meResponse] = await Promise.all([
      fetch("/api/tasks", { headers }),
      fetch("/api/students", { headers }),
      fetch("/api/auth/me", { headers })
    ]);
    if (response.status === 401) {
      setMessage("请先登录教师账号。");
      setAuthenticated(false);
      setTemplates([]);
      setTasks([]);
      setStudents([]);
      setCurrentTeacher(null);
      setLoading(false);
      return;
    }
    const data = await response.json();
    const studentData = studentsResponse.ok ? await studentsResponse.json() : { students: [] };
    const meData = meResponse.ok ? await meResponse.json() : { user: null };
    setTemplates(data.templates ?? []);
    setTasks(data.tasks ?? []);
    setStudents(studentData.students ?? []);
    setCurrentTeacher(meData.user ?? null);
    setAuthenticated(true);
    setLoading(false);
  }

  async function createTask(formData: FormData) {
    setMessage("正在创建任务...");
    const response = await fetch("/api/tasks", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders()
      },
      body: JSON.stringify({
        templateKey: formData.get("templateKey"),
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
        ...getAuthHeaders()
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
        ...getAuthHeaders()
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

  function toggleStudentSelection(taskId: string, studentId: string) {
    setSelectedStudentIdsByTask((current) => {
      const selected = current[taskId] ?? [];
      return {
        ...current,
        [taskId]: selected.includes(studentId)
          ? selected.filter((id) => id !== studentId)
          : [...selected, studentId]
      };
    });
  }

  function selectAllStudents(taskId: string) {
    setSelectedStudentIdsByTask((current) => ({
      ...current,
      [taskId]: students.filter((student) => student.status === "ACTIVE").map((student) => student.id)
    }));
  }

  function invertStudentSelection(taskId: string) {
    setSelectedStudentIdsByTask((current) => {
      const selected = current[taskId] ?? [];
      const activeIds = students.filter((student) => student.status === "ACTIVE").map((student) => student.id);
      return {
        ...current,
        [taskId]: activeIds.filter((id) => !selected.includes(id))
      };
    });
  }

  async function addStudentsToClass(task: TeacherTask) {
    const studentIds = selectedStudentIdsByTask[task.id] ?? [];
    if (studentIds.length === 0) {
      setMessage("请先勾选要加入的学生。");
      return;
    }
    setMessage("正在加入学生...");
    const response = await fetch("/api/classes/members", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders()
      },
      body: JSON.stringify({ classExternalId: task.classBinding.externalClassId, studentIds })
    });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.message ?? data.error ?? "加入学生失败。");
      return;
    }
    const names = (data.students ?? []).map((student: { displayName: string }) => student.displayName).join("、");
    setMessage(`${names || `${studentIds.length} 名学生`} 已加入 ${data.classBinding?.name ?? "班级"}。`);
    await load();
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    localStorage.removeItem("education_agent_token");
    setAuthenticated(false);
    setCurrentTeacher(null);
    setTemplates([]);
    setTasks([]);
    setStudents([]);
    setSelectedStudentIdsByTask({});
    setMessage("已退出教师账号。");
    router.push("/teacher/login");
  }

  useEffect(() => {
    load();

    function refreshOnFocus() {
      load();
    }

    function refreshOnVisible() {
      if (document.visibilityState === "visible") load();
    }

    window.addEventListener("focus", refreshOnFocus);
    document.addEventListener("visibilitychange", refreshOnVisible);

    return () => {
      window.removeEventListener("focus", refreshOnFocus);
      document.removeEventListener("visibilitychange", refreshOnVisible);
    };
  }, []);

  return (
    <main className="workspace">
      <header className="topNav">
        <div>
          <span className="eyebrow">教师后台</span>
          <h1>课堂任务管理</h1>
        </div>
        <nav>
          {currentTeacher && (
            <div className="teacherIdentity" aria-label="当前登录教师">
              <span>当前教师</span>
              <strong>{currentTeacher.displayName}</strong>
              <em>{currentTeacher.email}</em>
            </div>
          )}
          <Link href="/student">学生端</Link>
          <Link href="/">首页</Link>
          {authenticated && (
            <button className="button secondary" type="button" onClick={logout}>
              <LogOut size={18} /> 退出登录
            </button>
          )}
          <button className="iconButton" aria-label="刷新" onClick={load}>
            <RefreshCw size={18} />
          </button>
        </nav>
      </header>

      {!authenticated && (
        <section className="panel authNotice">
          <strong>当前还没有登录教师账号</strong>
          <p>登录后才能读取任务模板、任务列表和已注册学生。</p>
          <button className="button primary" type="button" onClick={() => router.push("/teacher/login")}>
            去登录教师后台
          </button>
        </section>
      )}

      {authenticated && <section className="teacherGrid">
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
                    {template.key === ECO_COURSEWARE_TEMPLATE_KEY ? `互动课件｜${template.title}` : template.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              任务标题
              <input name="title" placeholder="AI 生态探险课：拯救小岛生态" required />
            </label>
            <label>
              给学生的说明
              <textarea name="instructions" placeholder="拖动放大镜找证据，排列生态因果链，再把修复工具投放到小岛上。" required />
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

          <section className="panel">
            <div className="panelTitle">
              <UserRound size={20} />
              <h2>已注册学生</h2>
            </div>
            <p className="muted">当前智能体本地已注册 {students.length} 名学生。</p>
            <div className="studentRegistry">
              {students.map((student) => (
                <article className="studentRegistryItem" key={student.id}>
                  <strong>{student.displayName}</strong>
                  <span>{student.ageBand || "未填写年龄段"} · {student.status === "ACTIVE" ? "正常" : "停用"}</span>
                </article>
              ))}
              {!loading && students.length === 0 && <p className="muted">暂无学生注册。</p>}
            </div>
          </section>

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
          {tasks.map((task) => {
            const isCourseware = task.template.key === ECO_COURSEWARE_TEMPLATE_KEY;
            return (
              <article className="taskCard" key={task.id}>
                <div className="taskHeader">
                  <div>
                    <span>{task.classBinding.name}</span>
                    <h3>{task.title}</h3>
                    <b className={`statusPill status${task.status}`}>{taskStatusText(task.status)}</b>
                    {isCourseware && <b className="statusPill coursewarePill">互动课件</b>}
                  </div>
                  <div className="taskActions">
                    {isCourseware && (
                      <Link className="button secondary" href={`/eco-demo?taskId=${task.id}`}>
                        <Trees size={18} /> 预览课件
                      </Link>
                    )}
                    {(task.status === "DRAFT" || task.status === "CLOSED") && (
                      <button
                        className="button primary"
                        type="button"
                        onClick={() => updateTaskStatus(task.id, "ACTIVE")}
                      >
                        <Play size={18} /> {task.status === "CLOSED" ? "重新开始" : "开始"}
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
                <div className="studentPicker">
                  <div className="studentPickerHeader">
                    <strong>添加学生到这个班级</strong>
                    <div>
                      <button className="textButton" type="button" onClick={() => selectAllStudents(task.id)}>
                        全选
                      </button>
                      <button className="textButton" type="button" onClick={() => invertStudentSelection(task.id)}>
                        反选
                      </button>
                    </div>
                  </div>
                  <div className="studentCheckboxGrid">
                    {students.map((student) => {
                      const checked = (selectedStudentIdsByTask[task.id] ?? []).includes(student.id);
                      return (
                        <label className="studentCheck" key={student.id}>
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={student.status !== "ACTIVE"}
                            onChange={() => toggleStudentSelection(task.id, student.id)}
                          />
                          <span>{student.displayName}</span>
                        </label>
                      );
                    })}
                    {!loading && students.length === 0 && <p className="muted">暂无可添加学生。</p>}
                  </div>
                  <button className="button secondary" type="button" onClick={() => addStudentsToClass(task)}>
                    <UserPlus size={18} /> 加入选中学生
                  </button>
                </div>
                <div className="metricRow">
                  <strong>{task.submissions.length}</strong>
                  <span>份提交</span>
                </div>
                <div className="submissionList">
                  {task.submissions.length === 0 && (
                    <p className="muted">暂无学生提交。学生完成课件并点击“提交给老师”后，这里会出现“投屏点评”。</p>
                  )}
                  {task.submissions.map((submission) => (
                    <div className="submissionItem" key={submission.id}>
                      <div className="submissionHeader">
                        <strong>{submission.student.displayName}</strong>
                        {isCourseware && (
                          <Link className="button secondary" href={`/display/courseware/${submission.id}`}>
                            <MonitorUp size={18} /> 投屏点评
                          </Link>
                        )}
                      </div>
                      <p>{submission.textContent}</p>
                      {submission.aiFeedback && <span>{submission.aiFeedback.guidance}</span>}
                    </div>
                  ))}
                </div>
              </article>
            );
          })}
        </section>
      </section>}
    </main>
  );
}

function taskStatusText(status: TeacherTask["status"]) {
  if (status === "DRAFT") return "准备中";
  if (status === "ACTIVE") return "进行中";
  return "已结束";
}

function getAuthHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("education_agent_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}
