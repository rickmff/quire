import { InstantPhoto } from "@/components/prestigeui/instant-photo";

const photo = (a: string, b: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="800" height="1000" fill="url(#g)"/><circle cx="560" cy="300" r="180" fill="#fff" fill-opacity=".18"/><circle cx="260" cy="720" r="260" fill="#000" fill-opacity=".12"/></svg>`,
  )}`;

export default function InstantPhotoDemo() {
  return (
    <div className="flex gap-6">
      <InstantPhoto
        src={photo("#38bdf8", "#f472b6")}
        alt="Beach at dusk"
        caption="Ericeira"
        date="Aug 2026"
        tilt={-4}
        developMs={2500}
        className="w-56"
      />
      <InstantPhoto
        src={photo("#facc15", "#16a34a")}
        alt="Field in summer"
        caption="Alentejo"
        date="Jul 2026"
        tilt={3}
        developMs={2500}
        delay={0.3}
        className="w-56"
      />
    </div>
  );
}
