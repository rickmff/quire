import { PaymentButton } from "@/components/prestigeui/payment-button";

const pay = () => new Promise<void>((resolve) => setTimeout(resolve, 1600));

export default function PaymentButtonDemo() {
  return <PaymentButton amount="$48.00" action={pay} />;
}
