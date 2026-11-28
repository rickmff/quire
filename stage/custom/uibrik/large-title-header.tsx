import { IconChevronLeft, IconEdit } from "@tabler/icons-react";
import { LargeTitleHeader } from "@/@components/uibrik/large-title-header/large-title-header";

const notes = [
  "Groceries",
  "Trip to Lisbon",
  "Book list",
  "Ideas for the talk",
  "Gift ideas",
  "Meeting notes",
  "Recipes",
  "Workout plan",
  "Garden",
  "Reading log",
];

export default function LargeTitleHeaderDemo() {
  return (
    <div className="w-[360px] overflow-hidden rounded-3xl border">
      <LargeTitleHeader
        title="Notes"
        className="h-[520px]"
        leading={
          <button
            type="button"
            className="flex h-10 items-center gap-0.5 rounded-full pl-1.5 pr-3 text-[15px] text-foreground"
          >
            <IconChevronLeft size={20} stroke={1.75} />
            Folders
          </button>
        }
        trailing={
          <button
            type="button"
            aria-label="New note"
            className="grid size-10 place-items-center rounded-full text-foreground"
          >
            <IconEdit size={19} stroke={1.75} />
          </button>
        }
      >
        <ul className="divide-y px-4">
          {notes.map((n) => (
            <li key={n} className="py-3 text-[15px]">
              {n}
            </li>
          ))}
        </ul>
      </LargeTitleHeader>
    </div>
  );
}
