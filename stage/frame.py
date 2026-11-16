# Frames from measure.json (video.mjs with MEASURE=1): where each demo paints over its clip,
# in both themes. The frame is centered on the demo at rest (before the first interaction)
# and wide enough, on both sides, for everything the demo shows during the clip. Both themes
# share it, so a faint part one theme cannot see still counts. A menu, popover or card that
# opens from a small trigger is centered on everything it shows instead.
# Prints the components whose frame moves off center or cuts content; --write saves their
# frames to frames/<library>.json, which capture.mjs uses (then record them again).
#   python3 frame.py <library> [--write] [--redo name ...]
import json, os, sys
lib = sys.argv[1]; write = "--write" in sys.argv
# Components whose layout changed since their stills (named after --redo) get the new frame anyway.
redo = set(sys.argv[sys.argv.index("--redo") + 1:]) if "--redo" in sys.argv else set()
VW, VH = 1280, 800
poses = json.load(open("poses.json"))
# REPORT: the report to compare with (default: the current one).
rep = json.load(open(os.environ.get("REPORT", f"out/{lib}/report.json")))
mea = json.load(open(f"out/{lib}/measure.json"))
names = sorted({k.split("|")[0] for k in mea})
def union(bs):
    return [min(b[0] for b in bs), min(b[1] for b in bs), max(b[2] for b in bs), max(b[3] for b in bs)] if bs else None
out = {}
for n in names:
    cfg = poses.get(f"{lib}/{n}", {})
    ms = [mea.get(f"{n}|{t}") for t in ("light", "dark")]
    if any(not m or "samples" not in m for m in ms) or cfg.get("keepframe") or cfg.get("fill") or cfg.get("fullFrame") or any(m.get("pageScroll") for m in ms):
        continue
    first = ms[0]["first"]
    full = lambda s: s[3] - s[1] >= VW and s[4] - s[2] >= VH
    # The demo at rest: its last sample in each theme (clips end at rest, so they loop).
    R = union([max((s for s in m["samples"] if not full(s)), key=lambda s: s[0], default=None)[1:] for m in ms if any(not full(s) for s in m["samples"])])
    # What it shows once its entrance is over (the first second, or until the first step):
    # menus, cards and dialogs it opens count; letters or boxes flying in do not.
    E = 1000 if first is None else min(first, 1000)
    A = union([s[1:] for m in ms for s in m["samples"] if s[0] >= E and not full(s)] + ([R] if R else []))
    if not A or not R: continue
    cx, cy = (R[0] + R[2]) / 2, (R[1] + R[3]) / 2
    # center: "layout": the stage's own center, where it lays the demo out, for a demo whose
    # shadow, glow or corner control would pull the frame off the component itself.
    if cfg.get("center") == "layout": cx, cy = VW / 2, VH / 2
    hx = max(cx - A[0], A[2] - cx); hy = max(cy - A[1], A[3] - cy)
    pad = cfg.get("pad", 1.28)
    def size(hx, hy):
        w, h = 2 * hx * pad, 2 * hy * pad
        if w / h > 1.6: h = w / 1.6
        else: w = h * 1.6
        mn = cfg.get("min", 320)
        if w < mn: w, h = mn, mn / 1.6
        if w > VW: w, h = VW, VH
        return w, h
    w, h = size(hx, hy)
    # A menu, popover or card that opens from a small trigger: centered on the rest state, the
    # frame must reach the far edge of the open panel on both sides, so the trigger shrinks to a
    # dot. Center it on everything the clip shows instead, as the still does.
    ax, ay = (A[0] + A[2]) / 2, (A[1] + A[3]) / 2
    wa, ha = size((A[2] - A[0]) / 2, (A[3] - A[1]) / 2)
    overlay = cfg.get("center") != "layout" and wa * 1.35 < w
    if overlay: cx, cy, w, h = ax, ay, wa, ha
    # spill: an effect that spreads over the page (particles, a cursor, a theme change) is not
    # fitted: the frame fits the demo at rest, and the effect runs past its edges.
    spill = bool(cfg.get("spill"))
    if spill: w, h = size(max(cx - R[0], R[2] - cx), max(cy - R[1], R[3] - cy)); A = R
    zoom = rep.get(f"{n}|light", {}).get("zoom", 1)
    f = {"x": max(0, min(VW - w, cx - w / 2)), "y": max(0, min(VH - h, cy - h / 2)), "width": w, "height": h, "content": {"x0": A[0], "y0": A[1], "x1": A[2], "y1": A[3]}, "rest": R, "zoom": zoom, **({"spill": True} if spill else {}), **({"overlay": True} if overlay and not spill else {})}
    out[n] = f
changed = []
for n, f in out.items():
    for t in ("light", "dark"):
        o = rep.get(f"{n}|{t}", {}).get("frame")
        if not o: continue
        # How far the content center sits from the old frame's center, and how the size changed.
        cx, cy = f["x"] + f["width"] / 2, f["y"] + f["height"] / 2
        off = max(abs(cx - (o["x"] + o["width"] / 2)) / o["width"], abs(cy - (o["y"] + o["height"] / 2)) / o["height"])
        A = f["content"]
        clip = max(o["x"] - A["x0"], A["x1"] - o["x"] - o["width"], o["y"] - A["y0"], A["y1"] - o["y"] - o["height"], 0) / o["width"]
        size = f["width"] / o["width"]
        if off > 0.04 or clip > 0.01:
            changed.append((n, t, round(off, 3), round(clip, 3), round(size, 2), "spill" if f.get("spill") else "overlay" if f.get("overlay") else ""))
for c in changed: print(*c)
fix = sorted({c[0] for c in changed} | (redo & set(out)))
print(len(out), "measured;", len(fix), "change:", " ".join(fix))
if write:
    # Added to the frames saved before, so an earlier pass keeps its frames.
    path = f"frames/{lib}.json"
    saved = json.load(open(path)) if os.path.exists(path) else {}
    os.makedirs("frames", exist_ok=True)
    json.dump({**saved, **{n: out[n] for n in fix}}, open(path, "w"), indent=1)
