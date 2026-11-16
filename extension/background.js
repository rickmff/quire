// Saves pages to quire. Two ways:
//   save   one component page -> quire's /add page in a small popup
//   import a whole component library -> quire's app, which reads every
//          component on the site and sorts them by type
const DEFAULT_ORIGIN = "https://quire.fyi";

async function origin() {
  const { origin = DEFAULT_ORIGIN } = await chrome.storage.sync.get("origin");
  return origin.replace(/\/$/, "");
}

async function openAdd(params, focused = true) {
  const query = new URLSearchParams(Object.entries(params).filter(([, v]) => v));
  chrome.windows.create({ url: `${await origin()}/add?${query}`, type: "popup", width: 380, height: 240, focused });
}

async function importSite(url) {
  chrome.tabs.create({ url: `${await origin()}/app?import=${encodeURIComponent(url)}` });
}

const isWeb = (u) => typeof u === "string" && /^https?:/.test(u);

chrome.action.onClicked.addListener((tab) => {
  if (isWeb(tab.url)) openAdd({ url: tab.url });
});

chrome.commands.onCommand.addListener(async (command, tab) => {
  if (command === "import-site" && isWeb(tab?.url)) importSite(tab.url);
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({ id: "save", title: "Save component to quire", contexts: ["page", "link"] });
  chrome.contextMenus.create({ id: "import", title: "Add this whole library to quire", contexts: ["page", "link"] });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  const url = info.linkUrl || info.pageUrl || tab?.url;
  if (!isWeb(url)) return;
  if (info.menuItemId === "save") openAdd({ url });
  if (info.menuItemId === "import") importSite(url);
});

// Save button injected into posts on x.com (see x.js).
chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type !== "quire:save" || !/^https:\/\/x\.com\//.test(msg.url)) return;
  openAdd({ url: msg.url, title: msg.title, image: msg.image }, false);
});
