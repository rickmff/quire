import GitHubMark from "@/components/GitHubMark";
import StarIcon from "@/components/StarIcon";
import s from "@/components/SocialLinks.module.css";

export const REPO_URL = "https://github.com/rickmff/quire";
export const X_URL = "https://x.com/rickmff";

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
      <a href={REPO_URL} target="_blank" rel="noreferrer" className={`group ${s.gh}`} aria-label="Star Quire on GitHub">
        <span className={s.reveal} aria-hidden="true">
          <span>
            Star
            <span className={s.star}>
              <StarIcon filled className="size-3.5" />
            </span>
          </span>
        </span>
        <GitHubMark size={16} />
      </a>
    </nav>
  );
}
