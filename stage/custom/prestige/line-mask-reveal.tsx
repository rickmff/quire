import { LineMaskReveal } from "@/components/prestigeui/line-mask-reveal";

export default function LineMaskRevealDemo() {
  return (
    <LineMaskReveal
      trigger="mount"
      text="Every line rises from behind its own mask, exactly where the browser wraps it."
      className="max-w-2xl text-center text-4xl font-semibold tracking-tight"
    />
  );
}
