import { RadioGroup } from "@/@components/uibrik/radio-group/radio-group";

const options = [
  { value: "standard", label: "Standard", description: "4–6 business days", meta: "Free" },
  { value: "express", label: "Express", description: "2–3 business days", meta: "$9" },
  { value: "overnight", label: "Overnight", description: "Next business day", meta: "$24" },
];

export default function RadioGroupDemo() {
  return (
    <div className="w-full max-w-sm">
      <RadioGroup options={options} defaultValue="express" label="Shipping" />
    </div>
  );
}
