import { AvatarStack } from "@/@components/uibrik/avatar-stack/avatar-stack";

const face = (bg: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><rect width="80" height="80" fill="${bg}"/><circle cx="40" cy="32" r="14" fill="#fff" fill-opacity=".85"/><path d="M14 78c4-16 14-24 26-24s22 8 26 24z" fill="#fff" fill-opacity=".85"/></svg>`,
  )}`;

const people = [
  { id: 1, name: "Maya Chen", role: "Design lead", src: face("#6366f1") },
  { id: 2, name: "Jonas Weber", role: "Engineering", src: face("#0ea5e9") },
  { id: 3, name: "Priya Patel", role: "Product", src: face("#ec4899") },
  { id: 4, name: "Lukas Novak", role: "Research", src: face("#10b981") },
  { id: 5, name: "Sofia Rossi", role: "Marketing", src: face("#f59e0b") },
  { id: 6, name: "Theo Martin", role: "Support", src: face("#8b5cf6") },
];

export default function AvatarStackDemo() {
  return <AvatarStack people={people} max={4} />;
}
