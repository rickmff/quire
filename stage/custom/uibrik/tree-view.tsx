import { TreeView } from "@/@components/uibrik/tree-view/tree-view";

const data = [
  {
    name: "app",
    children: [
      { name: "dashboard", children: [{ name: "page.tsx" }, { name: "loading.tsx" }] },
      { name: "layout.tsx" },
      { name: "page.tsx" },
      { name: "globals.css" },
    ],
  },
  {
    name: "components",
    children: [{ name: "ui", children: [{ name: "button.tsx" }, { name: "dialog.tsx" }] }, { name: "header.tsx" }],
  },
  { name: "package.json" },
];

export default function TreeViewDemo() {
  return (
    <div className="w-full max-w-xs">
      <TreeView
        data={data}
        defaultExpanded={["app", "app/dashboard"]}
        defaultSelected="app/dashboard/page.tsx"
        label="Files"
      />
    </div>
  );
}
