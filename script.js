const BOOKS = [
  {
    id: "book-1",
    file: "content/book-1-outline.md",
    navLabel: "Book 1",
    runningHead: "SOMI • Flint's World",
  },
  {
    id: "book-2",
    file: "content/book-2-outline.md",
    navLabel: "Book 2",
    runningHead: "SOMI • The Search",
  },
  {
    id: "book-3",
    file: "content/book-3-outline.md",
    navLabel: "Book 3",
    runningHead: "SOMI • The Water Realm",
  },
  {
    id: "book-4",
    file: "content/book-4-outline.md",
    navLabel: "Book 4",
    runningHead: "SOMI • Iselle's Book",
  },
  {
    id: "book-5",
    file: "content/book-5-outline.md",
    navLabel: "Book 5",
    runningHead: "SOMI • The Final Forging",
  },
];

document.addEventListener("DOMContentLoaded", async () => {
  enableProtections();
  renderNav();
  await renderBooks();
});

function enableProtections() {
  document.body.classList.add("protected");

  const blockEvent = (event) => {
    event.preventDefault();
  };

  ["copy", "cut", "contextmenu", "dragstart", "selectstart"].forEach(
    (eventName) => {
      document.addEventListener(eventName, blockEvent);
    }
  );

  document.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();
    const modifierHeld = event.ctrlKey || event.metaKey;
    const blockedKeys = ["a", "c", "p", "s", "u", "x"];

    if ((modifierHeld && blockedKeys.includes(key)) || key === "printscreen") {
      event.preventDefault();
    }
  });

  const syncVisibilityProtection = () => {
    document.body.classList.toggle("blurred", document.hidden);
  };

  syncVisibilityProtection();
  document.addEventListener("visibilitychange", syncVisibilityProtection);
  window.addEventListener("blur", () => document.body.classList.add("blurred"));
  window.addEventListener("focus", () => document.body.classList.remove("blurred"));
}

function renderNav() {
  const nav = document.getElementById("book-nav");

  BOOKS.forEach((book, index) => {
    const link = document.createElement("a");
    link.className = "book-link";
    link.href = `#${book.id}`;
    link.textContent = `${index + 1}. ${book.navLabel}`;
    nav.appendChild(link);
  });
}

async function renderBooks() {
  const folio = document.getElementById("folio");

  try {
    const books = await Promise.all(
      BOOKS.map(async (book, index) => {
        const response = await fetch(book.file, { cache: "no-store" });

        if (!response.ok) {
          throw new Error(`Could not load ${book.file}`);
        }

        const markdown = await response.text();
        return createSheet(book, markdown, index + 1);
      })
    );

    folio.replaceChildren(...books);
  } catch (error) {
    const message = document.createElement("p");
    message.className = "error-message";
    message.textContent =
      "The documents could not be loaded. Please verify the markdown files are present in the content folder.";
    folio.replaceChildren(message);
    console.error(error);
  }
}

function createSheet(book, markdown, pageNumber) {
  const article = document.createElement("article");
  article.className = "sheet";
  article.id = book.id;

  const inner = document.createElement("div");
  inner.className = "sheet-inner";

  const head = document.createElement("header");
  head.className = "running-head";
  head.textContent = book.runningHead;

  const body = document.createElement("div");
  body.className = "sheet-body";
  body.innerHTML = markdownToHtml(markdown);

  const footer = document.createElement("footer");
  footer.className = "page-number";
  footer.textContent = pageNumber;

  inner.append(head, body, footer);
  article.appendChild(inner);
  return article;
}

function markdownToHtml(markdown) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const html = [];
  let inOrderedList = false;
  let inUnorderedList = false;
  let paragraphLines = [];

  const closeParagraph = () => {
    if (!paragraphLines.length) {
      return;
    }

    const text = paragraphLines.join(" ").trim();
    if (text) {
      const normalized = text.replace(/^\*/, "");
      let className = "document-paragraph";

      if (
        text.startsWith("**POV:**") ||
        text.startsWith("**Era:**") ||
        text.startsWith("Era:")
      ) {
        className = "document-meta";
      } else if (normalized.startsWith("Temp outline")) {
        className = "document-note";
      }

      html.push(`<p class="${className}">${formatInlineMarkdown(text)}</p>`);
    }
    paragraphLines = [];
  };

  const closeLists = () => {
    if (inOrderedList) {
      html.push("</ol>");
      inOrderedList = false;
    }
    if (inUnorderedList) {
      html.push("</ul>");
      inUnorderedList = false;
    }
  };

  lines.forEach((rawLine) => {
    const line = rawLine.trim();

    if (!line) {
      closeParagraph();
      closeLists();
      return;
    }

    if (/^---+$/.test(line)) {
      closeParagraph();
      closeLists();
      return;
    }

    if (line.startsWith("# ")) {
      closeParagraph();
      closeLists();
      html.push(
        `<h2 class="document-title">${formatTitle(line.slice(2).trim())}</h2>`
      );
      return;
    }

    if (line.startsWith("## ")) {
      closeParagraph();
      closeLists();
      html.push(
        `<h3 class="document-section">${formatInlineMarkdown(
          line.slice(3).trim()
        )}</h3>`
      );
      return;
    }

    if (line.startsWith("### ")) {
      closeParagraph();
      closeLists();
      html.push(
        `<h4 class="document-subsection">${formatInlineMarkdown(
          line.slice(4).trim()
        )}</h4>`
      );
      return;
    }

    if (/^\d+\.\s+/.test(line)) {
      closeParagraph();
      if (inUnorderedList) {
        html.push("</ul>");
        inUnorderedList = false;
      }
      if (!inOrderedList) {
        html.push('<ol class="outline-list">');
        inOrderedList = true;
      }
      html.push(
        `<li>${formatInlineMarkdown(line.replace(/^\d+\.\s+/, ""))}</li>`
      );
      return;
    }

    if (/^- /.test(line)) {
      closeParagraph();
      if (inOrderedList) {
        html.push("</ol>");
        inOrderedList = false;
      }
      if (!inUnorderedList) {
        html.push('<ul class="detail-list">');
        inUnorderedList = true;
      }
      html.push(`<li>${formatInlineMarkdown(line.slice(2).trim())}</li>`);
      return;
    }

    paragraphLines.push(line);
  });

  closeParagraph();
  closeLists();
  return html.join("");
}

function formatInlineMarkdown(text) {
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>");
}

function formatTitle(text) {
  const match = text.match(/^(BOOK\s+\d+:)\s+(.+)$/i);
  if (!match) {
    return formatInlineMarkdown(toTitleCase(text));
  }

  const prefix = toTitleCase(match[1]);
  const suffix = toTitleCase(match[2]);
  return `${prefix} ${suffix}`;
}

function toTitleCase(text) {
  return text
    .toLowerCase()
    .split(" ")
    .map((word) => {
      if (!word) {
        return word;
      }

      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

function escapeHtml(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
