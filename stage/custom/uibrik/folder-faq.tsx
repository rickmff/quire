import { FolderFaq } from "@/@components/uibrik/folder-faq/folder-faq";

const items = [
  {
    label: "Start",
    question: "What do I get with a free account?",
    answer: "Every component, the source for each one, and updates as new ones land.",
  },
  {
    label: "Install",
    question: "How do I add a component to my project?",
    answer: "Copy the file into your codebase, or run the add command from its page.",
  },
  {
    label: "Theme",
    question: "Does it follow my colours?",
    answer: "Every component reads the shadcn theme tokens, in light and dark.",
  },
  {
    label: "License",
    question: "Can I use it in client work?",
    answer: "Yes. The free components are MIT, so use them anywhere.",
  },
];

export default function FolderFaqDemo() {
  return (
    <div className="w-full max-w-xl">
      <FolderFaq items={items} defaultOpen={0} />
    </div>
  );
}
