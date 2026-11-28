import { useEffect, useState } from "react";
import { StatusBadge } from "@/@components/uibrik/status-badge/status-badge";

const order = ["draft", "review", "building", "live"] as const;

export default function StatusBadgeDemo() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % order.length), 1600);
    return () => clearInterval(t);
  }, []);
  return <StatusBadge status={order[i]} />;
}
