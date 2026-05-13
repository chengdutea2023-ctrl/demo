"use client";

import { MonitorUp, RefreshCw, Sparkles } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type CoursewareState = {
  observed?: string[];
  causeChain?: string[];
  appliedActions?: string[];
  hypothesis?: string;
  studentReason?: string;
  restorationScore?: number;
};

type CoursewareSubmission = {
  studentName: string;
  textContent: string;
  coursewareState?: CoursewareState | null;
  updatedAt: string;
  task: {
    title: string;
    instructions: string;
    className: string;
    templateTitle: string;
  };
};

export default function CoursewareDisplayPage() {
  const params = useParams<{ submissionId: string }>();
  const [submission, setSubmission] = useState<CoursewareSubmission | null>(null);
  const [message, setMessage] = useState("");

  async function load() {
    const response = await fetch(`/api/display/courseware/${params.submissionId}`, { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) {
      setMessage("没有找到可投屏的学生提交。");
      return;
    }
    setSubmission(data.submission);
  }

  useEffect(() => {
    load();
    const timer = window.setInterval(load, 10000);
    return () => window.clearInterval(timer);
  }, []);

  const state = submission?.coursewareState;
  const score = typeof state?.restorationScore === "number" ? state.restorationScore : 0;
  const updatedAt = useMemo(
    () => (submission ? new Date(submission.updatedAt).toLocaleString("zh-CN", { hour12: false }) : ""),
    [submission]
  );

  return (
    <main className="coursewareDisplayWall">
      <header>
        <div>
          <span><MonitorUp size={20} /> 课堂点评大屏</span>
          <h1>{submission?.task.title ?? "学生课件提交"}</h1>
          {submission && <p>{submission.task.className} · {submission.studentName} · {updatedAt}</p>}
        </div>
        <button className="iconButton light" aria-label="刷新" onClick={load}>
          <RefreshCw size={22} />
        </button>
      </header>

      {!submission && (
        <section className="emptyDisplay">
          <MonitorUp size={48} />
          <p>{message || "正在读取学生提交..."}</p>
        </section>
      )}

      {submission && (
        <section className="coursewareDisplayGrid">
          <article className="coursewareScorePanel">
            <span><Sparkles size={20} /> 生态恢复进度</span>
            <strong>{score}%</strong>
            <div>
              <i style={{ width: `${score}%` }} />
            </div>
            <p>{state?.studentReason || getReasonFromText(submission.textContent)}</p>
          </article>

          <DisplayGroup title="观察证据" items={state?.observed} fallback="暂无观察记录" />
          <DisplayGroup title="因果链" items={state?.causeChain} fallback="暂无因果链" ordered />
          <DisplayGroup title="修复行动" items={state?.appliedActions} fallback="暂无修复行动" />

          <article className="coursewareDisplayCard wide">
            <span>学生判断</span>
            <strong>{state?.hypothesis || "暂未选择"}</strong>
            <p>{submission.textContent}</p>
          </article>
        </section>
      )}
    </main>
  );
}

function DisplayGroup({
  title,
  items,
  fallback,
  ordered = false
}: {
  title: string;
  items?: string[];
  fallback: string;
  ordered?: boolean;
}) {
  const list = items?.length ? items : [fallback];
  return (
    <article className="coursewareDisplayCard">
      <span>{title}</span>
      <div>
        {list.map((item, index) => (
          <strong key={`${item}-${index}`}>
            {ordered && items?.length ? `${index + 1}. ` : ""}
            {item}
          </strong>
        ))}
      </div>
    </article>
  );
}

function getReasonFromText(text: string) {
  const match = text.match(/我的解释：(.+)/);
  return match?.[1] ?? text;
}
