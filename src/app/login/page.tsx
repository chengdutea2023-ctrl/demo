import Link from "next/link";
import { GraduationCap, Tablet } from "lucide-react";

export default function LoginEntryPage() {
  return (
    <main className="authShell">
      <section className="authCard">
        <h1>选择登录入口</h1>
        <Link className="button primary full" href="/teacher/login">
          <GraduationCap size={18} /> 教师登录
        </Link>
        <Link className="button secondary full" href="/student/login">
          <Tablet size={18} /> 学生登录
        </Link>
      </section>
    </main>
  );
}
