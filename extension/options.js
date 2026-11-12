const input = document.getElementById("origin");
chrome.storage.sync.get("origin").then(({ origin }) => origin && (input.value = origin));
input.addEventListener("change", () => chrome.storage.sync.set({ origin: input.value.trim() }));
