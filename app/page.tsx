import Link from "next/link";
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
          <h1 className={s.title}>
            Keep every component you find. <span>Hand them to your agent.</span>
          </h1>
          <div className={s.cta}>
            <Link href="/app" className="btn btn-lg btn-primary">
              Start collecting
              <svg className="btn-arrow" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <path d="M2.5 6h7M6.5 3l3 3-3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
            <a href={`${REPO}/tree/main/extension`} className="btn btn-lg btn-secondary">
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
