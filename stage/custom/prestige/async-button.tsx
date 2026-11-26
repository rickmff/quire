import { AsyncButton } from "@/components/prestigeui/async-button";

const wait = () => new Promise<void>((resolve) => setTimeout(resolve, 1500));

export default function AsyncButtonDemo() {
  return <AsyncButton action={wait}>Save changes</AsyncButton>;
}
