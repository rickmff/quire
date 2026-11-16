"use client";

import { useId } from "react";

// The star used to save components (gallery cards) and on the GitHub "Star" link.
const STAR = "M12 3.5l2.6 5.3 5.9.9-4.25 4.1 1 5.8L12 16.9l-5.25 2.7 1-5.8L3.5 9.7l5.9-.9L12 3.5z";

// Filled: a gold star with a soft glow and a glint that sweeps across it.
export default function StarIcon({ filled, className = "size-4" }: { filled: boolean; className?: string }) {
  const id = useId().replace(/:/g, "");
  if (!filled)
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinejoin="round" aria-hidden>
        <path d={STAR} />
      </svg>
    );
  return (
    <svg viewBox="0 0 24 24" className={`star-gold ${className}`} aria-hidden>
      <defs>
        <linearGradient id={`${id}-gold`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFF3B0" />
          <stop offset="0.45" stopColor="#FCC419" />
          <stop offset="1" stopColor="#F08C00" />
        </linearGradient>
        <linearGradient id={`${id}-glint`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.9" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <clipPath id={`${id}-clip`}>
          <path d={STAR} />
        </clipPath>
      </defs>
      <path d={STAR} fill={`url(#${id}-gold)`} stroke="#E8890C" strokeWidth={1.25} strokeLinejoin="round" />
      <g clipPath={`url(#${id}-clip)`}>
        <path d="M8.6 9.2l3.4-4.6 1.2 2.5z" fill="#fff" opacity="0.55" />
        <g transform="rotate(20 12 12)">
          <rect className="star-glint" x="-4" y="-4" width="6" height="32" fill={`url(#${id}-glint)`} />
        </g>
      </g>
    </svg>
  );
}
