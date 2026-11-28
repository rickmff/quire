import { useEffect } from "react";
import { Toaster, toast } from "@/@components/uibrik/toast/toast";

export default function ToastDemo() {
  useEffect(() => {
    const t = setTimeout(
      () => toast.success("Changes saved", { description: "Your profile is up to date.", duration: Infinity }),
      300,
    );
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="grid h-[360px] w-[560px] place-items-center">
      <button
        type="button"
        className="h-10 rounded-xl border bg-background px-4 text-sm font-medium"
        onClick={() => toast("Event created", { description: "Friday, 10:00" })}
      >
        Show a toast
      </button>
      <Toaster />
    </div>
  );
}
