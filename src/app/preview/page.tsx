"use client";

import Link from "next/link";
import { ArrowLeft, ImagePlus, Leaf, MessageCircleHeart, Microscope, Send, Sparkles } from "lucide-react";
import { useMemo, useRef, useState } from "react";

const previewTasks = [
  {
    key: "picture-story",
    title: "图片故事一分钟",
    icon: ImagePlus,
    tag: "看图表达",
    instructions: "观察一张图片，写下你看到了什么，再补充一个你想到的小故事。",
    placeholder: "我看到图片里有... 我觉得他们正在... 接下来可能会...",
    sample: "我看到两个同学在操场边看一只小虫子，他们很惊讶。接下来他们可能会找老师一起观察。",
    guidance: "你已经写出人物和场景了。可以再补充一个细节：他们看到小虫子时的心情是什么？"
  },
  {
    key: "science-observation",
    title: "科学观察小记录",
    icon: Microscope,
    tag: "观察猜想",
    instructions: "记录一个生活里的科学现象，写下你观察到的内容和自己的猜想。",
    placeholder: "我观察到... 我猜是因为... 我还可以继续看看...",
    sample: "我看到冰水杯外面出现了小水珠。我猜空气里的水遇到冷杯子就变成了水珠。",
    guidance: "你的观察和猜想都很清楚。可以再补充一个证据：过一会儿水珠会变多还是变少？"
  },
  {
    key: "kind-expression",
    title: "友善表达卡",
    icon: MessageCircleHeart,
    tag: "友善沟通",
    instructions: "描述一个校园情境，练习把感受、原因和希望说清楚。",
    placeholder: "当...的时候，我觉得... 因为... 我希望...",
    sample: "同桌拿走我的橡皮没有说，我有点着急，因为我还要改作业。我希望他下次先问我。",
    guidance: "你把感受、原因和希望都说出来了。可以再想一句更友善的开头，比如“我想和你商量一下”。"
  }
];

export default function PreviewPage() {
  const [activeKey, setActiveKey] = useState(previewTasks[0].key);
  const [text, setText] = useState(previewTasks[0].sample);
  const [imageUrl, setImageUrl] = useState("");
  const [feedback, setFeedback] = useState(previewTasks[0].guidance);
  const stageRef = useRef<HTMLElement | null>(null);
  const activeTask = useMemo(
    () => previewTasks.find((task) => task.key === activeKey) ?? previewTasks[0],
    [activeKey]
  );

  function chooseTask(taskKey: string) {
    const nextTask = previewTasks.find((task) => task.key === taskKey) ?? previewTasks[0];
    setActiveKey(nextTask.key);
    setText(nextTask.sample);
    setImageUrl("");
    setFeedback(nextTask.guidance);
    window.setTimeout(() => {
      if (window.innerWidth <= 900) {
        stageRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 0);
  }

  function generatePreviewFeedback() {
    const hasEnoughText = text.trim().length >= 12;
    setFeedback(
      hasEnoughText
        ? activeTask.guidance
        : "你已经开始了。可以先写一句你看到的、想到的，或者你想表达的感受。"
    );
  }

  const Icon = activeTask.icon;

  return (
    <main className="workspace previewSurface">
      <header className="topNav">
        <div>
          <span className="eyebrow">预览版</span>
          <h1>互动课堂体验</h1>
        </div>
        <nav>
          <Link href="/">
            <ArrowLeft size={18} /> 返回首页
          </Link>
          <Link href="/student">学生端</Link>
          <Link href="/teacher">教师后台</Link>
        </nav>
      </header>

      <section className="previewGrid">
        <aside className="panel compact">
          <h2>选择玩法</h2>
          {previewTasks.map((task) => {
            const TaskIcon = task.icon;
            return (
              <button
                aria-pressed={task.key === activeTask.key}
                className={task.key === activeTask.key ? "previewChoice active" : "previewChoice"}
                key={task.key}
                type="button"
                onClick={() => chooseTask(task.key)}
                onPointerDown={() => chooseTask(task.key)}
              >
                <span>{task.tag}</span>
                <strong>
                  <TaskIcon size={18} /> {task.title}
                </strong>
                <em>点击预览</em>
              </button>
            );
          })}
        </aside>

        <section className="panel previewStage" ref={stageRef}>
          <div className="panelTitle">
            <Icon size={22} />
            <h2>{activeTask.title}</h2>
          </div>
          <p className="taskInstruction">{activeTask.instructions}</p>

          <div className="previewPrompt">
            <Leaf size={18} />
            <span>这个预览不会保存数据，也不会调用真实账号。你可以直接改文字看看反馈样式。</span>
          </div>

          <label>
            我的作品
            <textarea value={text} onChange={(event) => setText(event.target.value)} placeholder={activeTask.placeholder} />
          </label>

          <label>
            图片链接
            <div className="inputWithIcon">
              <ImagePlus size={18} />
              <input
                value={imageUrl}
                onChange={(event) => setImageUrl(event.target.value)}
                type="url"
                placeholder="可以先不填，或粘贴一张图片链接"
              />
            </div>
          </label>

          {imageUrl && (
            <div className="previewImage">
              <img src={imageUrl} alt="预览图片" />
            </div>
          )}

          <button className="button primary" type="button" onClick={generatePreviewFeedback}>
            <Send size={18} /> 生成预览反馈
          </button>

          <div className="feedbackBox previewFeedback">
            <Sparkles size={18} />
            <div>
              <strong>AI 引导反馈</strong>
              <p>{feedback}</p>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
