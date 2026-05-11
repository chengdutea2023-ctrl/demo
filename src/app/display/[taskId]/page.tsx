"use client";

import { MonitorUp, RefreshCw } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

type DisplayTask = {
  title: string;
  instructions: string;
  templateTitle: string;
  className: string;
  submissions: Array<{
    id: string;
    studentName: string;
    textContent: string;
    imageUrl?: string;
    aiFeedback?: { summary: string; guidance: string } | null;
  }>;
};

export default function DisplayPage() {
  const params = useParams<{ taskId: string }>();
  const [task, setTask] = useState<DisplayTask | null>(null);
  const [message, setMessage] = useState("");

  async function load() {
    const response = await fetch(`/api/display/tasks/${params.taskId}`, { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) {
      setMessage("这个任务尚未开启大屏展示。");
      return;
    }
    setTask(data.task);
  }

  useEffect(() => {
    load();
    const timer = window.setInterval(load, 10000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <main className="displayWall">
      <header>
        <div>
          <span>{task?.className ?? "课堂展示"}</span>
          <h1>{task?.title ?? "大屏展示"}</h1>
          {task && <p>{task.instructions}</p>}
        </div>
        <button className="iconButton light" aria-label="刷新" onClick={load}>
          <RefreshCw size={22} />
        </button>
      </header>

      {!task && (
        <div className="emptyDisplay">
          <MonitorUp size={48} />
          <p>{message || "正在读取展示内容..."}</p>
        </div>
      )}

      {task && (
        <section className="wallGrid">
          {task.submissions.map((submission) => (
            <article className="wallItem" key={submission.id}>
              {submission.imageUrl && <img src={submission.imageUrl} alt={`${submission.studentName} 的作品`} />}
              <div>
                <span>{submission.studentName}</span>
                <p>{submission.textContent}</p>
                {submission.aiFeedback && <strong>{submission.aiFeedback.summary}</strong>}
              </div>
            </article>
          ))}
          {task.submissions.length === 0 && <p className="emptyDisplay">等待学生提交作品...</p>}
        </section>
      )}
    </main>
  );
}
