import { Dialog } from "@/@components/uibrik/dialog/dialog";

export default function DialogDemo() {
  return (
    <Dialog
      title="Edit profile"
      description="Changes show on your public page."
      trigger={
        <span className="inline-flex h-10 items-center rounded-xl bg-foreground px-4 text-sm font-medium text-background">
          Edit profile
        </span>
      }
    >
      <div className="grid gap-3">
        <input
          className="h-10 rounded-lg border bg-background px-3 text-sm"
          defaultValue="Maya Chen"
          aria-label="Name"
        />
        <input className="h-10 rounded-lg border bg-background px-3 text-sm" defaultValue="@maya" aria-label="Handle" />
      </div>
    </Dialog>
  );
}
