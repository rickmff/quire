import Link from "next/link";
import Quire3D from "@/components/Quire3D";
import Wordmark from "@/components/Wordmark";
import SocialLinks from "@/components/SocialLinks";
import s from "@/components/Landing.module.css";

const REPO = "https://github.com/rickmff/quire";

export default function Landing() {
  return (
    <div className={s.page}>
      <header className={s.bar}>
        <Link href="/" aria-label="quire">
          <Wordmark className={s.wordmark} />
        </Link>
        <SocialLinks />
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
