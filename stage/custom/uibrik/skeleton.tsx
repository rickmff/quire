import { useEffect, useState } from "react";
import { Skeleton } from "@/@components/uibrik/skeleton/skeleton";

export default function SkeletonDemo() {
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const t = setInterval(() => setLoading((l) => !l), 2400);
    return () => clearInterval(t);
  }, []);
  return (
    <Skeleton loading={loading}>
      <div className="flex w-72 items-center gap-3 rounded-2xl border p-4">
        <span className="grid size-11 place-items-center rounded-full bg-foreground text-sm font-medium text-background">
          MC
        </span>
        <div>
          <p className="text-sm font-medium">Maya Chen</p>
          <p className="text-sm text-muted-foreground">Design lead at Northwind</p>
        </div>
      </div>
    </Skeleton>
  );
}
