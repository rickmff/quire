import { CodeBlock } from "@/@components/uibrik/code-block/code-block";

const code = `import { motion } from "motion/react";

export function Card({ title }: { title: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      {title}
    </motion.div>
  );
}`;

export default function CodeBlockDemo() {
  return (
    <div className="w-full max-w-xl">
      <CodeBlock code={code} lang="tsx" lineNumbers copyable />
    </div>
  );
}
