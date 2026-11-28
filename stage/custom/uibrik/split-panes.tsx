import { SplitPane, SplitPanes } from "@/@components/uibrik/split-panes/split-panes";

export default function SplitPanesDemo() {
  return (
    <div className="h-[360px] w-[680px] max-w-full overflow-hidden rounded-2xl border">
      <SplitPanes autoCollapse grip>
        <SplitPane id="nav" defaultSize={208} minSize={168} collapsible collapsedSize={60}>
          {({ collapsed }: { collapsed: boolean }) => (
            <nav className="grid gap-1 p-3 text-sm">
              {["Inbox", "Drafts", "Sent", "Archive"].map((n) => (
                <span key={n} className="rounded-lg px-2 py-1.5 hover:bg-muted">
                  {collapsed ? n[0] : n}
                </span>
              ))}
            </nav>
          )}
        </SplitPane>
        <SplitPane id="main">
          <div className="p-6 text-sm text-muted-foreground">Drag the divider to resize.</div>
        </SplitPane>
      </SplitPanes>
    </div>
  );
}
