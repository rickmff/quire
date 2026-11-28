import { RollingWord } from "@/@components/uibrik/rolling-word/rolling-word";
import { useEffect, useState } from "react";

const usePlay = (ms = 1800) => {
  const [play, setPlay] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setPlay((p) => p + 1), ms);
    return () => clearInterval(t);
  }, [ms]);
  return play;
};

export default function RollingWordDemo() {
  return <RollingWord play={usePlay()} prefix="Build something" words={["calm", "honest", "lasting", "yours"]} />;
}
