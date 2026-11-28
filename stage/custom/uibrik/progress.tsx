import { Progress } from "@/@components/uibrik/progress/progress";

const tasks = [
  { id: "film", label: "Uploading launch-film.mp4", detail: "145 MB of 480 MB · 8s left", value: 30 },
  {
    id: "export",
    label: "Exporting report.pdf",
    value: 72,
    steps: [{ label: "Collect data" }, { label: "Render pages" }, { label: "Compress" }],
    step: 1,
    stepProgress: 0.6,
  },
  { id: "backup", label: "Backing up photos", value: 100, doneLabel: "Done" },
];

export default function ProgressDemo() {
  return (
    <div className="w-full max-w-md">
      <Progress tasks={tasks} title="Activity" />
    </div>
  );
}
