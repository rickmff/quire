import GitHubMark from "@/components/GitHubMark";
import s from "@/components/SocialLinks.module.css";

export const REPO_URL = "https://github.com/rickmff/quire";
// Author's X profile.
export const X_URL = "https://x.com/rickmff";

// X and GitHub links, top right of the landing and the app. On hover the X
// mark shows the handle and the GitHub mark opens into a "Star" pill.
export default function SocialLinks({ className = "" }: { className?: string }) {
  return (
    <nav className={`${s.social} ${className}`} aria-label="Elsewhere">
      <a href={X_URL} target="_blank" rel="noreferrer" className={`${s.gh} ${s.x}`} aria-label="@rickmff on X">
        <span className={s.reveal} aria-hidden="true">
          <span>@rickmff</span>
        </span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      </a>
      <a href={REPO_URL} target="_blank" rel="noreferrer" className={s.gh} aria-label="Star Quire on GitHub">
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
  );
}
