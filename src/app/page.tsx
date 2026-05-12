import Link from "next/link";
import { ArrowRight, GraduationCap, MonitorUp, Sparkles, Tablet, Trees } from "lucide-react";

export default function HomePage() {
  return (
    <main className="shell">
      <section className="hero">
        <div className="heroText">
          <p className="eyebrow">教育智能体测试1</p>
          <h1>课堂任务站</h1>
          <p>
            教师发布白名单 AI 任务，学生在 iPad 上提交文字和图片作品，后台查看完成情况，大屏展示课堂成果。
          </p>
          <div className="actions">
            <Link className="button primary" href="/teacher">
              教师后台 <ArrowRight size={18} />
            </Link>
            <Link className="button secondary" href="/student">
              学生端 <Tablet size={18} />
            </Link>
            <Link className="button secondary" href="/preview">
              预览互动课堂 <Sparkles size={18} />
            </Link>
            <Link className="button secondary" href="/eco-demo">
              生态探险 Demo <Trees size={18} />
            </Link>
            <Link className="button secondary" href="/teacher/login">
              教师登录
            </Link>
            <Link className="button secondary" href="/student/login">
              学生登录
            </Link>
          </div>
        </div>
        <div className="heroPanel" aria-label="课堂任务概览">
          <div className="deviceFrame">
            <div className="statusBar">
              <span>今日任务</span>
              <strong>3</strong>
            </div>
            <div className="taskPreview accentGreen">
              <GraduationCap size={22} />
              <div>
                <strong>图片故事一分钟</strong>
                <span>写下你看到的内容和一个小故事</span>
              </div>
            </div>
            <div className="taskPreview accentYellow">
              <MonitorUp size={22} />
              <div>
                <strong>大屏展示已开启</strong>
                <span>12 份作品等待分享</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
