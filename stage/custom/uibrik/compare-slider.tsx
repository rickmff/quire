import { CompareSlider } from "@/@components/uibrik/compare-slider/compare-slider";

const scene = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500"><defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f59e0b"/><stop offset=".55" stop-color="#fb7185"/><stop offset="1" stop-color="#1e3a8a"/></linearGradient></defs><rect width="800" height="500" fill="url(#s)"/><circle cx="560" cy="210" r="70" fill="#fde68a"/><path d="M0 330 L160 210 L300 320 L460 180 L640 330 L800 250 V500 H0z" fill="#1f2937"/><path d="M0 400 L220 300 L420 410 L620 320 L800 400 V500 H0z" fill="#0f172a"/></svg>`,
)}`;

export default function CompareSliderDemo() {
  return (
    <div className="w-[640px] max-w-full">
      <CompareSlider
        before={
          <img
            src={scene}
            alt=""
            draggable={false}
            style={{ filter: "saturate(0.2) contrast(0.85) brightness(1.08)" }}
          />
        }
        after={<img src={scene} alt="Mountains at sunset" draggable={false} />}
        beforeLabel="Raw"
        afterLabel="Graded"
      />
    </div>
  );
}
