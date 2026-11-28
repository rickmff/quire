import { TagInput } from "@/@components/uibrik/tag-input/tag-input";

export default function TagInputDemo() {
  return (
    <div className="w-80">
      <TagInput defaultValue={["Design", "Motion", "React"]} label="Tags" placeholder="Add a tag" />
    </div>
  );
}
