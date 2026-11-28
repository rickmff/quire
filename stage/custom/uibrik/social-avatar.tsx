import { SocialAvatar } from "@/@components/uibrik/social-avatar/social-avatar";

const photo = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f97316"/><stop offset="1" stop-color="#ec4899"/></linearGradient></defs><rect width="80" height="80" fill="url(#g)"/><circle cx="40" cy="32" r="14" fill="#fff" fill-opacity=".85"/><path d="M14 78c4-16 14-24 26-24s22 8 26 24z" fill="#fff" fill-opacity=".85"/></svg>`,
)}`;

const links = [
  { brand: "x" as const, handle: "@danreyes" },
  { brand: "github" as const, handle: "danreyes" },
  { brand: "dribbble" as const, handle: "danreyes" },
  { brand: "linkedin" as const, handle: "daniel-reyes" },
];

export default function SocialAvatarDemo() {
  return <SocialAvatar name="Daniel Reyes" subtitle="Product designer" src={photo} links={links} />;
}
