import { CheckboxGroup } from "@/@components/uibrik/checkbox/checkbox";

const options = [
  { value: "comments", label: "Comments", description: "Replies to your posts and threads." },
  { value: "mentions", label: "Mentions", description: "When someone tags you by name." },
  { value: "follows", label: "Follows", description: "New people who follow you." },
  { value: "digest", label: "Weekly digest", description: "A summary every Monday." },
];

export default function CheckboxDemo() {
  return (
    <div className="w-full max-w-sm">
      <CheckboxGroup
        options={options}
        defaultValue={["comments", "mentions"]}
        selectAll="Email notifications"
        label="Email notifications"
      />
    </div>
  );
}
