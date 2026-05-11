import Link from "next/link";
import { GraduationCap, Tablet } from "lucide-react";

export default function RegisterEntryPage() {
  return (
    <main className="authShell">
      <section className="authCard">
        <h1>选择注册入口</h1>
        <Link className="button primary full" href="/teacher/register">
          <GraduationCap size={18} /> 教师注册
        </Link>
        <Link className="button secondary full" href="/student/register">
          <Tablet size={18} /> 学生注册
        </Link>
      </section>
    </main>
  );
}
