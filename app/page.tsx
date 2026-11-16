import { Fragment, type CSSProperties } from "react";
import Link from "next/link";
import Quire3D from "@/components/Quire3D";
import Wordmark from "@/components/Wordmark";
import SocialLinks from "@/components/SocialLinks";
import s from "@/components/Landing.module.css";

const REPO = "https://github.com/rickmff/quire";

const LEAD = "Keep every component you find.";
const TAIL = "Hand them to your agent.";

// Splits a line into words that fade in one after another, the way a chat
// reply streams in. `from` is the index of the first word, so both halves
// share one running delay.
function Stream({ text, from }: { text: string; from: number }) {
  return text.split(" ").map((w, i) => (
    <Fragment key={i}>
      <span className={s.word} style={{ "--w": from + i } as CSSProperties}>{w}</span>{" "}
    </Fragment>
  ));
}

export default function Landing() {
  return (
    <div className={s.page}>
      <header className={`${s.bar} ${s.enter}`}>
        <Link href="/" aria-label="quire">
          <Wordmark className={s.wordmark} />
        </Link>
        <SocialLinks />
      </header>

      <main className={s.main}>
        <Quire3D />
        <div className={s.copy}>
          <h1 className={s.title} aria-label={`${LEAD} ${TAIL}`}>
            <span aria-hidden="true">
              <Stream text={LEAD} from={0} />
              <span className={s.muted}><Stream text={TAIL} from={LEAD.split(" ").length} /></span>
            </span>
          </h1>
          <div className={`${s.cta} ${s.enter}`} style={{ "--d": "620ms" } as CSSProperties}>
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
