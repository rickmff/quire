// Opens quire's /add page in a small popup window.
// The page saves the link into the library stored on the quire site.
const DEFAULT_ORIGIN = "https://quire-ten-pi.vercel.app";

async function openAdd(params, focused = true) {
  const { origin = DEFAULT_ORIGIN } = await chrome.storage.sync.get("origin");
  const query = new URLSearchParams(Object.entries(params).filter(([, v]) => v));
  chrome.windows.create({
    url: `${origin.replace(/\/$/, "")}/add?${query}`,
    type: "popup",
    width: 380,
    height: 240,
    focused,
  });
}

chrome.action.onClicked.addListener((tab) => {
  if (!tab.url || !/^https?:/.test(tab.url)) return;
  openAdd({ url: tab.url });
});

// Save button injected into posts on x.com (see x.js).
chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type !== "quire:save" || !/^https:\/\/x\.com\//.test(msg.url)) return;
  openAdd({ url: msg.url, title: msg.title, image: msg.image }, false);
});
