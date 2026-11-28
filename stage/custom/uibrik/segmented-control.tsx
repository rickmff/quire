import { SegmentedControl } from "@/@components/uibrik/segmented-control/segmented-control";

export default function SegmentedControlDemo() {
  return <SegmentedControl options={["Day", "Week", "Month", "Year"]} defaultValue="Week" label="Range" />;
}
