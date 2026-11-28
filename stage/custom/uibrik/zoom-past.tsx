import { ZoomPast } from "@/@components/uibrik/zoom-past/zoom-past";
import { useEffect, useState } from "react";

const usePlay = (ms = 1800) => {
  const [play, setPlay] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setPlay((p) => p + 1), ms);
    return () => clearInterval(t);
  }, [ms]);
  return play;
};

export default function ZoomPastDemo() {
  return <ZoomPast play={usePlay()} words={["Come closer", "Even closer", "Right here"]} />;
}
