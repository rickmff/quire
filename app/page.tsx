import Link from "next/link";
import FocusReveal from "@/components/FocusReveal";
import Quire3D from "@/components/Quire3D";
import Wordmark from "@/components/Wordmark";
import s from "@/components/Landing.module.css";

const REPO = "https://github.com/rickmff/quire";

export default function Landing() {
  return (
    <div className={s.page}>
      <header className={s.bar}>
        <Link href="/" aria-label="quire">
          <Wordmark className={s.wordmark} />
        </Link>
        <a href={REPO}>GitHub</a>
      </header>

      <main className={s.main}>
        <Quire3D />
        <div className={s.copy}>
          <FocusReveal
            parts={[{ text: "Keep every component you find." }, { text: "Hand them to your agent.", muted: true }]}
          />
          <div className={s.cta}>
            <Link href="/app" className={`${s.btn} ${s.solid}`}>
              Start collecting
            </Link>
            <a href={`${REPO}/tree/main/extension`} className={`${s.btn} ${s.ghost}`}>
              Add to Chrome
            </a>
          </div>
        </div>
      </main>

      <footer className={`${s.bar} ${s.foot}`}>
        <span>Free and open source</span>
      </footer>
    </div>
  );
}
