import { InteractiveButton } from "@/components/prestigeui/interactive-button";

async function download(progress: (value: number) => void) {
  for (let value = 0; value <= 100; value += 10) {
    progress(value);
    await new Promise((resolve) => setTimeout(resolve, 180));
  }
}

export default function InteractiveButtonDemo() {
  return <InteractiveButton action={download}>Download</InteractiveButton>;
}
