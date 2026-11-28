import { ScrambleToWord } from "@/@components/uibrik/scramble-to-word/scramble-to-word";
import { useEffect, useState } from "react";

const usePlay = (ms = 1800) => {
  const [play, setPlay] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setPlay((p) => p + 1), ms);
    return () => clearInterval(t);
  }, [ms]);
  return play;
};

export default function ScrambleToWordDemo() {
  return <ScrambleToWord play={usePlay(2200)} words={["BOARDING", "GATE 21", "ON TIME", "DEPARTED"]} cells={8} />;
}
