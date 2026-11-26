import { ProfileCard } from "@/components/prestigeui/profile-card";

const photo = (a: string, b: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="800" height="1000" fill="url(#g)"/><circle cx="560" cy="300" r="180" fill="#fff" fill-opacity=".18"/><circle cx="260" cy="720" r="260" fill="#000" fill-opacity=".12"/></svg>`,
  )}`;

export default function ProfileCardDemo() {
  return (
    <div className="w-72">
      <ProfileCard
        name="Ana Ribeiro"
        role="Product Engineer"
        photo={{ src: photo("#f97316", "#7c3aed"), alt: "Ana Ribeiro" }}
        bio="Builds the parts of the product people touch every day."
        location="Lisbon"
        links={{ x: "https://x.com", github: "https://github.com", email: "ana@example.com" }}
      />
    </div>
  );
}
