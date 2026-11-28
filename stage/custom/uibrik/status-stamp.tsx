import { StatusStamp } from "@/@components/uibrik/status-stamp/status-stamp";
import { useEffect, useState } from "react";

const usePlay = (ms = 1800) => {
  const [play, setPlay] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setPlay((p) => p + 1), ms);
    return () => clearInterval(t);
  }, [ms]);
  return play;
};

export default function StatusStampDemo() {
  return <StatusStamp play={usePlay(2000)} />;
}
