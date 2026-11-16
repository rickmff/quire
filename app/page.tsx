import Link from "next/link";
import Quire3D from "@/components/Quire3D";
import Wordmark from "@/components/Wordmark";
import GitHubMark from "@/components/GitHubMark";
import s from "@/components/Landing.module.css";

const REPO = "https://github.com/rickmff/quire";
const X_URL = "https://x.com/rickmff";

export default function Landing() {
  return (
    <div className={s.page}>
      <header className={s.bar}>
        <Link href="/" aria-label="quire">
          <Wordmark className={s.wordmark} />
        </Link>
        <nav className={s.social}>
          <a href={X_URL} target="_blank" rel="noreferrer" className={s.x} aria-label="Quire's author on X">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </a>
          <a href={REPO} target="_blank" rel="noreferrer" className={s.gh} aria-label="Star Quire on GitHub">
            <span className={s.reveal} aria-hidden="true">
              <span>
                Star
                <svg className={s.star} width="13" height="13" viewBox="0 0 16 16">
                  <defs>
                    <linearGradient id="quire-star" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0" className={s.stopA} />
                      <stop offset="0.5" className={s.stopB} />
                      <stop offset="1" className={s.stopC} />
                    </linearGradient>
                  </defs>
                  <path d="M8 1.2l2.03 4.12 4.55.66-3.29 3.21.78 4.53L8 11.58l-4.07 2.14.78-4.53L1.42 5.98l4.55-.66L8 1.2z" />
                </svg>
              </span>
            </span>
            <GitHubMark size={16} />
          </a>
        </nav>
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
    </div>
  );
}
