// Adds a "Save to quire" button to the action bar of every post on x.com.
// The button sits next to X's own bookmark button and copies its look.
(() => {
  const ATTR = "data-quire";
  const ACCENT = "rgb(29, 155, 240)";
  const SAVED_KEY = "x-saved";

  // The quire mark: the "q" with the ribbon tail.
  const ICON =
    '<svg viewBox="-100 -100 900 900" aria-hidden="true" style="width:1.25em;height:1.25em;fill:currentColor;display:block">' +
    '<path d="M626 12L626 700L540 632.5L454 700L454 475Q445 492 432 506Q407 533 373.5 547.5Q340 562 301 562Q228 562 177.5 525.5Q127 489 100.5 425Q74 361 74 281Q74 200 100 136.5Q126 73 176 36.5Q226 0 299 0Q360 0 405 31Q438 54 457 91L459 12L626 12ZM353 435Q386 435 408 417.5Q430 400 442 366Q454 332 454 281Q454 230 442 196Q430 162 407.5 144.5Q385 127 353 127Q306 127 278.5 168.5Q251 210 251 281Q251 352 278.5 393.5Q306 435 353 435Z"/></svg>';

  let saved = new Set();
  chrome.storage.local.get(SAVED_KEY).then((r) => {
    saved = new Set(r[SAVED_KEY] ?? []);
    document.querySelectorAll(`[${ATTR}]`).forEach(paint);
  });

  const style = document.createElement("style");
  style.textContent = `
    [${ATTR}] { display:flex; align-items:center; justify-content:flex-start; flex:0 0 auto; }
    [${ATTR}] button { all:unset; position:relative; display:flex; align-items:center; justify-content:center;
      width:34.75px; height:34.75px; margin:-8px 0; border-radius:9999px; cursor:pointer; color:inherit;
      transition:color .2s, background-color .2s, transform .2s; }
    [${ATTR}] button:hover, [${ATTR}][data-state="saved"] button { color:${ACCENT}; }
    [${ATTR}] button:hover { background-color:rgba(29, 155, 240, .1); }
    [${ATTR}] button:focus-visible { box-shadow:0 0 0 2px ${ACCENT}; }
    [${ATTR}] button:active { transform:scale(.9); }
  `;
  (document.head || document.documentElement).appendChild(style);

  function postData(article) {
    const time = article.querySelector('a[href*="/status/"] time');
    const link = time?.closest("a");
    if (!link) return null;
    const url = new URL(link.getAttribute("href"), location.origin);
    url.pathname = url.pathname.replace(/\/(photo|video|analytics)\/.*$/, "");
    url.search = "";
    url.host = "x.com";

    const handle = url.pathname.split("/")[1];
    const text = article.querySelector('[data-testid="tweetText"]')?.innerText.replace(/\s+/g, " ").trim();
    const title = text ? `@${handle}: ${text}`.slice(0, 160) : `Post by @${handle}`;
    const media = article.querySelector('[data-testid="tweetPhoto"] img, video[poster]');
    const image = media?.getAttribute("src")?.startsWith("http")
      ? media.getAttribute("src")
      : media?.getAttribute("poster") || undefined;
    return { url: url.href, title, image };
  }

  function paint(wrap) {
    const on = saved.has(wrap.dataset.url);
    wrap.dataset.state = on ? "saved" : "";
    const label = on ? "Saved to quire" : "Save to quire";
    const btn = wrap.firstElementChild;
    btn.setAttribute("aria-label", label);
    btn.title = label;
  }

  function inject(article) {
    const bar = article.querySelector('[role="group"]');
    if (!bar || bar.querySelector(`[${ATTR}]`)) return;
    const data = postData(article);
    if (!data) return;

    // Sit just before X's own bookmark button and borrow its resting color.
    const anchor = bar.querySelector('[data-testid="bookmark"], [data-testid="removeBookmark"]');
    const slot = anchor?.parentElement;

    const wrap = document.createElement("div");
    wrap.setAttribute(ATTR, "");
    wrap.dataset.url = data.url;
    wrap.innerHTML = `<button type="button">${ICON}</button>`;
    const tint = anchor?.querySelector("svg") ?? bar.querySelector("svg");
    if (tint) wrap.style.color = getComputedStyle(tint).color;
    paint(wrap);

    wrap.firstElementChild.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const fresh = postData(article) ?? data;
      chrome.runtime.sendMessage({ type: "quire:save", ...fresh });
      saved.add(fresh.url);
      chrome.storage.local.set({ [SAVED_KEY]: [...saved].slice(-2000) });
      paint(wrap);
    });

    if (slot && slot !== bar) slot.before(wrap);
    else bar.append(wrap);
  }

  const scan = () => document.querySelectorAll('article[data-testid="tweet"]').forEach(inject);
  let queued = false;
  new MutationObserver(() => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      scan();
    });
  }).observe(document.documentElement, { childList: true, subtree: true });
  scan();
})();
