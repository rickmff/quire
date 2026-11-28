import { LoadingShimmer } from "@/@components/uibrik/loading-shimmer/loading-shimmer";
import { useEffect, useState } from "react";

const usePlay = (ms = 1800) => {
  const [play, setPlay] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setPlay((p) => p + 1), ms);
    return () => clearInterval(t);
  }, [ms]);
  return play;
};

export default function LoadingShimmerDemo() {
  return <LoadingShimmer play={usePlay(2600)} text="Thinking…" />;
}
