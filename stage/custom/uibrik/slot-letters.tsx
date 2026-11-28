import { SlotLetters } from "@/@components/uibrik/slot-letters/slot-letters";
import { useEffect, useState } from "react";

const usePlay = (ms = 1800) => {
  const [play, setPlay] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setPlay((p) => p + 1), ms);
    return () => clearInterval(t);
  }, [ms]);
  return play;
};

export default function SlotLettersDemo() {
  return <SlotLetters play={usePlay()} words={["ROUND", "ABOUT", "TURNS", "AGAIN"]} />;
}
