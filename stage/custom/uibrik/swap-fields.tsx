import { SwapFieldInput, SwapFields } from "@/@components/uibrik/swap-fields/swap-fields";

export default function SwapFieldsDemo() {
  return (
    <div className="w-80">
      <SwapFields labels={["From", "To"]}>
        {[<SwapFieldInput key="a" defaultValue="London" />, <SwapFieldInput key="b" defaultValue="Paris" />]}
      </SwapFields>
    </div>
  );
}
