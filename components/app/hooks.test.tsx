import { act, cleanup, renderHook } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useGridKeys } from "@/components/app/useGridKeys";
import { useLibraryActions } from "@/components/app/useLibraryActions";
import { useShortcuts } from "@/components/app/useShortcuts";
import { useToast } from "@/components/app/useToast";
import { useIntro } from "@/lib/useIntro";
import type { Bookmark, Library } from "@/lib/store";
import type { ClientCatalog, GalleryItem } from "@/lib/useCatalog";
import type { View } from "@/lib/view";

const mark = (id: string): Bookmark => ({
  id,
  url: `https://x.dev/${id}`,
  title: id,
  library: "mine",
  tags: [],
  collectionId: null,
  createdAt: 0,
});

const press = (key: string, init: KeyboardEventInit = {}, target: EventTarget = window) =>
  act(() => {
    target.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, ...init }));
  });

const motion = (reduce: boolean) =>
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({ matches: reduce, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
  );

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
});

describe("useToast", () => {
  it("hides a message after 1.6 s, or after 4 s when it offers Undo", () => {
    const { result } = renderHook(() => useToast());
    act(() => result.current.flash("Starred"));
    expect(result.current.toast?.msg).toBe("Starred");
    act(() => vi.advanceTimersByTime(1600));
    expect(result.current.toast).toBeNull();

    act(() => result.current.flash("Removed", () => {}));
    act(() => vi.advanceTimersByTime(3999));
    expect(result.current.toast?.msg).toBe("Removed");
    act(() => vi.advanceTimersByTime(1));
    expect(result.current.toast).toBeNull();
  });

  it("restarts the clock for a new message and closes on dismiss", () => {
    const { result } = renderHook(() => useToast());
    act(() => result.current.flash("One"));
    act(() => vi.advanceTimersByTime(1000));
    act(() => result.current.flash("Two"));
    act(() => vi.advanceTimersByTime(1000));
    expect(result.current.toast?.msg).toBe("Two");
    act(() => result.current.dismiss());
    expect(result.current.toast).toBeNull();
  });
});

describe("useGridKeys", () => {
  const cards = ["a", "b", "c", "d", "e"].map(mark);
  beforeEach(() => {
    document.body.innerHTML = `<div data-grid></div>${cards
      .map((c) => `<article data-card="${c.id}"><button data-star></button><button data-copy></button></article>`)
      .join("")}`;
    Object.defineProperty(document.querySelector("[data-grid]"), "clientWidth", { value: 680 });
    Element.prototype.scrollIntoView = vi.fn();
  });

  it("moves by one across and by a row down and up, within the grid", () => {
    const { result } = renderHook(() => useGridKeys(cards, { paused: false, resetOn: "v" }));
    press("ArrowRight");
    expect(result.current).toBe(0);
    press("l");
    expect(result.current).toBe(1);
    press("ArrowDown");
    expect(result.current).toBe(3);
    press("j");
    expect(result.current).toBe(4);
    press("ArrowUp");
    expect(result.current).toBe(2);
    press("Escape");
    expect(result.current).toBe(-1);
  });

  it("stars and copies the selected card, and ignores keys while typing or paused", () => {
    const star = vi.fn();
    document.querySelector('[data-card="a"] [data-star]')!.addEventListener("click", star);
    const { result, rerender } = renderHook(({ paused }) => useGridKeys(cards, { paused, resetOn: "v" }), {
      initialProps: { paused: false },
    });
    press("ArrowRight");
    press("Delete");
    expect(star).toHaveBeenCalledTimes(1);

    const input = document.body.appendChild(document.createElement("input"));
    press("ArrowRight", {}, input);
    expect(result.current).toBe(0);
    rerender({ paused: true });
    press("ArrowRight");
    expect(result.current).toBe(0);
  });

  it("clears the selection when the view changes", () => {
    const { result, rerender } = renderHook(({ v }) => useGridKeys(cards, { paused: false, resetOn: v }), {
      initialProps: { v: "one" },
    });
    press("ArrowRight");
    expect(result.current).toBe(0);
    rerender({ v: "two" });
    expect(result.current).toBe(-1);
  });
});

describe("useShortcuts", () => {
  it("toggles the command menu on ⌘K and Ctrl+K, and focuses search on /", () => {
    const togglePalette = vi.fn();
    const focusBar = vi.fn();
    renderHook(() => useShortcuts({ togglePalette, focusBar, addLink: vi.fn() }));
    press("k", { metaKey: true });
    press("K", { ctrlKey: true });
    expect(togglePalette).toHaveBeenCalledTimes(2);
    press("/");
    expect(focusBar).toHaveBeenCalledWith("search");
  });

  it("leaves / to a field being typed in, and blurs it on Escape", () => {
    const focusBar = vi.fn();
    renderHook(() => useShortcuts({ togglePalette: vi.fn(), focusBar, addLink: vi.fn() }));
    const input = document.body.appendChild(document.createElement("input"));
    input.focus();
    press("/", {}, input);
    expect(focusBar).not.toHaveBeenCalled();
    press("Escape", {}, input);
    expect(document.activeElement).not.toBe(input);
  });
});

describe("useIntro", () => {
  it("skips the entrance under reduced motion", () => {
    motion(true);
    const { result } = renderHook(() => useIntro({ nothingToDeal: false }));
    expect(result.current.phase).toBe("done");
  });

  it("deals, shows the chrome and ends", () => {
    motion(false);
    const { result } = renderHook(() => useIntro({ nothingToDeal: false }));
    expect(result.current.phase).toBe("wait");
    act(() => result.current.dealt(500));
    expect(result.current.phase).toBe("deal");
    act(() => vi.advanceTimersByTime(500));
    expect(result.current.phase).toBe("show");
    act(() => vi.advanceTimersByTime(900));
    expect(result.current.phase).toBe("done");
  });

  it("shows the chrome at once when there is nothing to deal, and gives up waiting after 1.6 s", () => {
    motion(false);
    expect(renderHook(() => useIntro({ nothingToDeal: true })).result.current.phase).toBe("show");
    const { result } = renderHook(() => useIntro({ nothingToDeal: false }));
    act(() => vi.advanceTimersByTime(1600));
    expect(result.current.phase).toBe("show");
  });
});

describe("useLibraryActions", () => {
  const item = {
    id: "magicui/marquee",
    library: "magicui",
    name: "marquee",
    title: "Marquee",
    type: "carousel",
    triggers: [],
    tech: [],
    docs: "https://magicui.design/docs/components/marquee",
  } as unknown as GalleryItem;
  const catalog = {
    generatedAt: "",
    libraries: [{ id: "magicui", name: "Magic UI", url: "", count: 1 }],
    components: [item],
  } as unknown as ClientCatalog;

  const setup = (start: Library = { version: 1, bookmarks: [], collections: [] }) => {
    const flash = vi.fn();
    const setView = vi.fn();
    const hook = renderHook(() => {
      const [lib, setLib] = useState(start);
      const [view] = useState<View>("starred");
      const actions = useLibraryActions({
        lib,
        update: (fn) => setLib(fn),
        catalog,
        byDocs: new Map(),
        followed: new Set(["magicui"]),
        galleryItems: [item],
        view,
        setView,
        flash,
        dismissToast: vi.fn(),
      });
      return { lib, actions };
    });
    return { ...hook, flash, setView };
  };

  it("stars a catalog card once, with its library name, and unstars it with Undo", () => {
    const { result, flash } = setup();
    act(() => result.current.actions.toggleStar(item));
    expect(result.current.lib.bookmarks).toHaveLength(1);
    expect(result.current.lib.bookmarks[0]).toMatchObject({ ref: item.id, library: "Magic UI", url: item.docs });
    expect(flash).toHaveBeenLastCalledWith("Starred");

    act(() => result.current.actions.toggleStar(item));
    expect(result.current.lib.bookmarks).toHaveLength(0);
    const undo = flash.mock.calls.at(-1)![1] as () => void;
    act(() => undo());
    expect(result.current.lib.bookmarks).toHaveLength(1);
    act(() => undo());
    expect(result.current.lib.bookmarks).toHaveLength(1);
  });

  it("creates, renames and deletes a collection, and Undo puts its cards back", () => {
    const { result, flash, setView } = setup({ version: 1, bookmarks: [mark("a")], collections: [] });
    act(() => result.current.actions.createCollection("  "));
    expect(result.current.lib.collections).toHaveLength(0);
    act(() => result.current.actions.createCollection(" Buttons "));
    const id = result.current.lib.collections[0].id;
    expect(result.current.lib.collections[0].name).toBe("Buttons");
    expect(setView).toHaveBeenCalledWith(id);

    act(() => result.current.actions.renameCollection(id, "CTAs"));
    act(() => result.current.actions.moveTo("a", id));
    expect(result.current.lib.bookmarks[0].collectionId).toBe(id);

    act(() => result.current.actions.deleteCollection(id));
    expect(result.current.lib.collections).toHaveLength(0);
    expect(result.current.lib.bookmarks[0].collectionId).toBeNull();
    expect(flash).toHaveBeenLastCalledWith("Removed “CTAs”", expect.any(Function));
    act(() => (flash.mock.calls.at(-1)![1] as () => void)());
    expect(result.current.lib.collections.map((c) => c.name)).toEqual(["CTAs"]);
    expect(result.current.lib.bookmarks[0].collectionId).toBe(id);
  });

  it("sets the type and the note of a bookmark", () => {
    const { result } = setup({ version: 1, bookmarks: [mark("a")], collections: [] });
    act(() => result.current.actions.setType("a", "button"));
    act(() => result.current.actions.setNote("a", "for the hero"));
    expect(result.current.lib.bookmarks[0]).toMatchObject({ type: "button", note: "for the hero" });
  });

  it("follows the libraries it is given", () => {
    const { result } = setup();
    act(() => result.current.actions.setFollowed(new Set(["animate-ui"])));
    expect(result.current.lib.sources).toEqual(["animate-ui"]);
  });
});
