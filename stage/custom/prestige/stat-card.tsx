import { StatCard } from "@/components/prestigeui/stat-card";

const values = [42, 45, 44, 48, 51, 49, 53, 57, 55, 60, 63, 61, 66, 70];
const data = values.map((value, i) => ({ label: `Nov ${i + 1}`, value: value * 120 }));

export default function StatCardDemo() {
  return (
    <div className="w-80">
      <StatCard
        label="Revenue"
        data={data}
        format={{ style: "currency", currency: "USD", maximumFractionDigits: 0 }}
        period="Last 14 days"
      />
    </div>
  );
}
