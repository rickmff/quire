import { AnagramShuffle } from "@/@components/uibrik/anagram-shuffle/anagram-shuffle";
import { useEffect, useState } from "react";

const usePlay = (ms = 1800) => {
  const [play, setPlay] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setPlay((p) => p + 1), ms);
    return () => clearInterval(t);
  }, [ms]);
  return play;
};

export default function AnagramShuffleDemo() {
  return <AnagramShuffle play={usePlay()} words={["LISTEN", "SILENT", "ENLIST", "TINSEL"]} duration={0.45} />;
}
