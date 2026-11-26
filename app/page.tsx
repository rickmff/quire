import { Fragment, type CSSProperties } from "react";
import Link from "next/link";
import Hero3D from "@/components/Hero3D";
import Wordmark from "@/components/Wordmark";
import SocialLinks from "@/components/SocialLinks";
import StartLink from "@/components/StartLink";
import s from "@/components/Landing.module.css";
import type { Metadata } from "next";
import { DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/seo";

const REPO = "https://github.com/rickmff/quire";

export const metadata: Metadata = { alternates: { canonical: "/" } };

const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "WebSite", "@id": `${SITE_URL}/#website`, url: SITE_URL, name: SITE_NAME, description: DESCRIPTION },
    {
      "@type": "WebApplication",
      "@id": `${SITE_URL}/#app`,
      name: SITE_NAME,
      url: `${SITE_URL}/app`,
      description: DESCRIPTION,
      applicationCategory: "DeveloperApplication",
      operatingSystem: "Any",
      browserRequirements: "Requires JavaScript",
      image: `${SITE_URL}/og.png`,
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      author: { "@type": "Person", name: "Henrique Matos", url: "https://github.com/rickmff" },
      sameAs: [REPO],
    },
  ],
};

const LEAD = "Keep every component you find.";
const TAIL = "Hand them to your agent.";

function Stream({ text, from }: { text: string; from: number }) {
  return text.split(" ").map((w, i) => (
    <Fragment key={i}>
      <span className={s.word} style={{ "--w": from + i } as CSSProperties}>
        {w}
      </span>{" "}
    </Fragment>
  ));
}

export default function Landing() {
  return (
    <div className={s.page}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD).replace(/</g, "\\u003c") }}
      />
      <header className={`${s.bar} ${s.enter}`}>
        <Link href="/" aria-label="quire">
          <Wordmark className={s.wordmark} />
        </Link>
        <SocialLinks />
      </header>

      <main id="main" tabIndex={-1} className={s.main}>
        <Hero3D />
        <div className={s.copy}>
          <h1 className={s.title} aria-label={`${LEAD} ${TAIL}`}>
            <span aria-hidden="true">
              <Stream text={LEAD} from={0} />
              <span className={s.muted}>
                <Stream text={TAIL} from={LEAD.split(" ").length} />
              </span>
            </span>
          </h1>
          <div className={`${s.cta} ${s.enter}`} style={{ "--d": "620ms" } as CSSProperties}>
            <StartLink className="btn btn-lg btn-primary">Start collecting</StartLink>
            <a href={`${REPO}/tree/main/extension`} className="btn btn-lg btn-secondary">
              Add to Chrome
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
