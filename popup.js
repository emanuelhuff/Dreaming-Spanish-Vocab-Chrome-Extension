const currentOutput = document.getElementById("current");
const learningOutput = document.getElementById("learning");
const knownOutput = document.getElementById("known");
const trashOutput = document.getElementById("trash");

const learningCount = document.getElementById("learningCount");
const knownCount = document.getElementById("knownCount");
const trashCount = document.getElementById("trashCount");
const currentCount = document.getElementById("currentCount");
const exportLearningButton = document.getElementById("exportLearning");
const exportStatus = document.getElementById("exportStatus");

loadLearningWords();
loadKnownWords();
loadTrashWords();

document.querySelectorAll(".tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));

    tab.classList.add("active");
    document.getElementById(tab.dataset.tab).classList.add("active");
  });
});

chrome.storage.local.get(["savedWords"], result => {
  if (result.savedWords) {
    renderWords(result.savedWords);
  }
});


exportLearningButton.addEventListener("click", () => {
  chrome.storage.local.get(["learningWords"], result => {
    const words = [...new Set(result.learningWords || [])]
      .sort((a, b) => a.localeCompare(b));

    if (words.length === 0) {
      showExportStatus("Add words to Learning before exporting.");
      return;
    }

    const rows = [
      ["Spanish", "English"],
      ...words.map(word => [word, ""])
    ];

    const csv = "\uFEFF" + rows
      .map(row => row.map(escapeCsvField).join(","))
      .join("\r\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const date = new Date().toISOString().slice(0, 10);

    link.href = downloadUrl;
    link.download = `dreaming-spanish-learning-${date}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(downloadUrl);

    showExportStatus(`Exported ${words.length} learning word${words.length === 1 ? "" : "s"}.`);
  });
});

function escapeCsvField(value) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function showExportStatus(message) {
  exportStatus.textContent = message;
}

document.getElementById("getWords").addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true
  });

  chrome.tabs.sendMessage(tab.id, { action: "getWords" }, response => {
    if (chrome.runtime.lastError) {
      console.error(chrome.runtime.lastError.message);
      return;
    }

    const words = response?.words || [];

    chrome.storage.local.get(
      ["learningWords", "knownWords", "trashWords"],
      result => {
        const learningWords = result.learningWords || [];
        const knownWords = result.knownWords || [];
        const trashWords = result.trashWords || [];

        const hiddenWords = new Set([
          ...learningWords,
          ...knownWords,
          ...trashWords
        ]);

        const filteredWords = words.filter(
          word => !hiddenWords.has(word)
        );

        chrome.storage.local.set({
          savedWords: filteredWords
        });

        renderWords(filteredWords);
      }
    );
  });
});

function renderWords(words) {
  currentCount.textContent = words.length;

  renderWordList(words, currentOutput, "current");
}

function renderWordList(words, container, currentList = null) {
  container.innerHTML = "";

  words = [...words].sort((a, b) => a.localeCompare(b));

  for (const word of words) {
    const span = document.createElement("span");
    span.className = "word";

    const wordText = document.createElement("span");
    wordText.textContent = word;

    wordText.addEventListener("click", () => {
      const url =
        "https://translate.google.com/?sl=es&tl=en&text=" +
        encodeURIComponent(word) +
        "&op=translate";

      chrome.tabs.create({ url });
    });

    span.appendChild(wordText);

    const actions = document.createElement("div");
    actions.className = "actions";

    if (currentList !== "learningWords") {
      const learningBtn = document.createElement("button");
      learningBtn.className = "action-btn learning";
      learningBtn.textContent = "L";

      learningBtn.addEventListener("click", e => {
        e.stopPropagation();
        moveWord(word, "learningWords");
      });

      actions.appendChild(learningBtn);
    }

    if (currentList !== "knownWords") {
      const knownBtn = document.createElement("button");
      knownBtn.className = "action-btn green";
      knownBtn.textContent = "K";

      knownBtn.addEventListener("click", e => {
        e.stopPropagation();
        moveWord(word, "knownWords");
      });

      actions.appendChild(knownBtn);
    }

    if (currentList !== "trashWords") {
      const trashBtn = document.createElement("button");
      trashBtn.className = "action-btn red";
      trashBtn.textContent = "T";

      trashBtn.addEventListener("click", e => {
        e.stopPropagation();
        moveWord(word, "trashWords");
      });

      actions.appendChild(trashBtn);
    }

    span.appendChild(actions);
    container.appendChild(span);
  }
}

function moveWord(word, targetList) {
  chrome.storage.local.get(
    ["learningWords", "knownWords", "trashWords", "savedWords"],
    result => {
      let learningWords = result.learningWords || [];
      let knownWords = result.knownWords || [];
      let trashWords = result.trashWords || [];
      let savedWords = result.savedWords || [];

      learningWords = learningWords.filter(w => w !== word);
      knownWords = knownWords.filter(w => w !== word);
      trashWords = trashWords.filter(w => w !== word);
      savedWords = savedWords.filter(w => w !== word);

      if (targetList === "learningWords") {
        learningWords.push(word);
      }

      if (targetList === "knownWords") {
        knownWords.push(word);
      }

      if (targetList === "trashWords") {
        trashWords.push(word);
      }

      chrome.storage.local.set({
        learningWords,
        knownWords,
        trashWords,
        savedWords
      }, () => {
        renderWords(savedWords);
        loadLearningWords();
        loadKnownWords();
        loadTrashWords();
      });
    }
  );
}

function loadLearningWords() {
  chrome.storage.local.get(["learningWords"], result => {
    const words = result.learningWords || [];
    learningCount.textContent = words.length;
    exportLearningButton.disabled = words.length === 0;

    renderWordList(words, learningOutput, "learningWords");
  });
}

function loadKnownWords() {
  chrome.storage.local.get(["knownWords"], result => {
    const words = result.knownWords || [];
    knownCount.textContent = words.length;

    renderWordList(words, knownOutput, "knownWords");
  });
}

function loadTrashWords() {
  chrome.storage.local.get(["trashWords"], result => {
    const words = result.trashWords || [];
    trashCount.textContent = words.length;

    renderWordList(words, trashOutput, "trashWords");
  });
}