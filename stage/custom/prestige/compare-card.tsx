import { CompareCard } from "@/components/prestigeui/compare-card";

function Panel({ dark }: { dark?: boolean }) {
  return (
    <div
      className={`flex h-64 w-full flex-col justify-between p-6 ${dark ? "bg-zinc-900 text-white" : "bg-white text-zinc-900"}`}
    >
      <span className="text-xs uppercase tracking-widest opacity-60">Monthly report</span>
      <div>
        <p className="text-4xl font-semibold">$84,210</p>
        <p className="text-sm opacity-60">+12.4% from last month</p>
      </div>
    </div>
  );
}

export default function CompareCardDemo() {
  return (
    <div className="w-full max-w-lg">
      <CompareCard before={<Panel />} after={<Panel dark />} beforeLabel="Light" afterLabel="Dark" />
    </div>
  );
}
