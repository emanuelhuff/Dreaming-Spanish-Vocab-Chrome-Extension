console.log("Dreaming Spanish vocab content.js loaded");

function findSubtitleUrl() {
  const entries = performance.getEntriesByType("resource");

  const subtitleEntry = entries.find(entry => {
    const url = entry.name.split("?")[0];
    return url.endsWith(".webvtt");
  });

  return subtitleEntry?.name;
}

async function getSubtitles() {
  let subtitleUrl = null;

  for (let i = 0; i < 20; i++) {
    subtitleUrl = findSubtitleUrl();

    if (subtitleUrl) break;

    console.log("Waiting for subtitle file...");
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  if (!subtitleUrl) {
    console.log("No subtitle file found");
    return;
  }

  console.log("Subtitle URL:", subtitleUrl);

  const response = await fetch(subtitleUrl);
  const text = await response.text();

  return text
}

async function main() {
  const subtitles = await getSubtitles();

  if (!subtitles) return [];

  const cleaned = subtitles
    .replace(/WEBVTT/g, "")
    .replace(/Kind: captions/g, "")
    .replace(/Language: es/g, "")
    .replace(/\d{2}:\d{2}:\d{2}\.\d{3} --> .*/g, "")
    .replace(/\d+/g, "")
    .replace(/\n/g, " ");

const words = cleaned
  .toLowerCase()
  .match(/\b[a-záéíóúñü]+\b/gi)
  ?.filter(word =>
    word.length > 1 &&
    !["as", "cu"].includes(word)
  );
  return [...new Set(words)].sort();
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "getWords") {
    main().then(words => {
      sendResponse({ words });
    });

    return true; // important for async response
  }
});
