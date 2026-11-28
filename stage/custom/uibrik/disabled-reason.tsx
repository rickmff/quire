import { DisabledReason } from "@/@components/uibrik/disabled-reason/disabled-reason";

export default function DisabledReasonDemo() {
  return (
    <DisabledReason reason="Add your email first" disabled>
      Continue
    </DisabledReason>
  );
}
