// Opens quire's /add page for the current tab in a small popup window.
// The page saves the link into the library stored on the quire site.
const DEFAULT_ORIGIN = "https://quire-ten-pi.vercel.app";

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.url || !/^https?:/.test(tab.url)) return;
  const { origin = DEFAULT_ORIGIN } = await chrome.storage.sync.get("origin");
  chrome.windows.create({
    url: `${origin.replace(/\/$/, "")}/add?url=${encodeURIComponent(tab.url)}`,
    type: "popup",
    width: 380,
    height: 240,
  });
});
