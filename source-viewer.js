(() => {
  "use strict";

  const cache = new Map();

  const modal = document.getElementById("source-modal");
  const backdrop = document.getElementById("source-backdrop");
  const openBtn = document.getElementById("source-btn");
  const closeBtn = document.getElementById("source-close-btn");
  const copyBtn = document.getElementById("source-copy-btn");
  const codeEl = document.querySelector("#source-code code");
  const errorEl = document.getElementById("source-error");
  const tabs = document.querySelectorAll(".source-tab");

  let activeFile = "game.js";
  let wasPlaying = false;

  const JS_KEYWORDS = new Set([
    "const",
    "let",
    "var",
    "function",
    "return",
    "if",
    "else",
    "for",
    "while",
    "do",
    "switch",
    "case",
    "break",
    "continue",
    "new",
    "delete",
    "typeof",
    "void",
    "null",
    "true",
    "false",
    "class",
    "extends",
    "import",
    "export",
    "from",
    "default",
    "async",
    "await",
    "try",
    "catch",
    "throw",
    "finally",
    "in",
    "of",
    "this",
    "super",
    "static",
    "yield",
  ]);

  const JS_BUILTINS = new Set([
    "document",
    "window",
    "console",
    "Math",
    "Number",
    "String",
    "Array",
    "Object",
    "Date",
    "JSON",
    "localStorage",
    "performance",
    "requestAnimationFrame",
    "ResizeObserver",
    "Image",
    "navigator",
    "setTimeout",
    "clearTimeout",
    "setInterval",
    "clearInterval",
    "Error",
    "Map",
    "Set",
    "Promise",
    "parseInt",
    "parseFloat",
    "isNaN",
    "undefined",
  ]);

  function escapeHtml(text) {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function span(className, text) {
    return `<span class="tok-${className}">${escapeHtml(text)}</span>`;
  }

  function isIdentStart(ch) {
    return /[A-Za-z_$]/.test(ch);
  }

  function isIdentPart(ch) {
    return /[A-Za-z0-9_$]/.test(ch);
  }

  function readIdent(code, i) {
    let j = i + 1;
    while (j < code.length && isIdentPart(code[j])) j++;
    return j;
  }

  function readString(code, i, quote) {
    let j = i + 1;
    while (j < code.length) {
      if (code[j] === "\\") {
        j += 2;
        continue;
      }
      if (code[j] === quote) {
        j++;
        break;
      }
      j++;
    }
    return j;
  }

  function highlightJs(code) {
    const out = [];
    let i = 0;
    let expectFn = false;

    while (i < code.length) {
      const ch = code[i];
      const next2 = code.slice(i, i + 2);

      if (next2 === "//") {
        let j = i + 2;
        while (j < code.length && code[j] !== "\n") j++;
        out.push(span("comment", code.slice(i, j)));
        i = j;
        continue;
      }

      if (next2 === "/*") {
        const end = code.indexOf("*/", i + 2);
        const j = end === -1 ? code.length : end + 2;
        out.push(span("comment", code.slice(i, j)));
        i = j;
        continue;
      }

      if (ch === '"' || ch === "'" || ch === "`") {
        const j = readString(code, i, ch);
        out.push(span("string", code.slice(i, j)));
        i = j;
        expectFn = false;
        continue;
      }

      if (/[0-9]/.test(ch)) {
        let j = i + 1;
        while (j < code.length && /[0-9.xXa-fA-F]/.test(code[j])) j++;
        out.push(span("number", code.slice(i, j)));
        i = j;
        continue;
      }

      if (isIdentStart(ch)) {
        const j = readIdent(code, i);
        const word = code.slice(i, j);

        if (JS_KEYWORDS.has(word)) {
          out.push(span("keyword", word));
          expectFn = word === "function";
        } else if (expectFn) {
          out.push(span("function", word));
          expectFn = false;
        } else if (JS_BUILTINS.has(word)) {
          out.push(span("builtin", word));
        } else if (code[j] === "(") {
          out.push(span("function", word));
        } else {
          out.push(escapeHtml(word));
        }
        i = j;
        continue;
      }

      if (/[=<>!+\-*\/%&|^~?:]/.test(ch)) {
        out.push(span("operator", ch));
        i++;
        continue;
      }

      if (/[{}()[\].,;]/.test(ch)) {
        out.push(span("punct", ch));
        if (ch === "(") expectFn = false;
        i++;
        continue;
      }

      out.push(escapeHtml(ch));
      i++;
    }

    return out.join("");
  }

  function highlightCss(code) {
    const out = [];
    let i = 0;
    let inBlock = false;
    let afterColon = false;

    while (i < code.length) {
      const ch = code[i];
      const next2 = code.slice(i, i + 2);

      if (next2 === "/*") {
        const end = code.indexOf("*/", i + 2);
        const j = end === -1 ? code.length : end + 2;
        out.push(span("comment", code.slice(i, j)));
        i = j;
        continue;
      }

      if (ch === '"' || ch === "'") {
        const j = readString(code, i, ch);
        out.push(span("string", code.slice(i, j)));
        i = j;
        continue;
      }

      if (ch === "{") {
        inBlock = true;
        afterColon = false;
        out.push(span("punct", ch));
        i++;
        continue;
      }

      if (ch === "}") {
        inBlock = false;
        afterColon = false;
        out.push(span("punct", ch));
        i++;
        continue;
      }

      if (inBlock && ch === ":" && !afterColon) {
        afterColon = true;
        out.push(span("operator", ch));
        i++;
        continue;
      }

      if (inBlock && (ch === ";" || ch === "\n")) {
        afterColon = false;
        if (ch === ";") out.push(span("punct", ch));
        else out.push(escapeHtml(ch));
        i++;
        continue;
      }

      if (ch === "@") {
        const j = readIdent(code, i);
        out.push(span("keyword", code.slice(i, j)));
        i = j;
        continue;
      }

      if (isIdentStart(ch) || ch === "#" || ch === ".") {
        let j = i;
        if (ch === "#" || ch === ".") j++;
        if (j < code.length && isIdentStart(code[j])) {
          j = readIdent(code, j);
        } else if (ch === "#" || ch === ".") {
          j = i + 1;
        }

        const word = code.slice(i, j);
        if (inBlock && !afterColon) {
          out.push(span("property", word));
        } else if (!inBlock) {
          out.push(span("selector", word));
        } else {
          out.push(span("value", word));
        }
        i = j;
        continue;
      }

      if (/[0-9]/.test(ch)) {
        let j = i + 1;
        while (j < code.length && /[0-9.%]/.test(code[j])) j++;
        out.push(span("number", code.slice(i, j)));
        i = j;
        continue;
      }

      if (/[=<>!+\-*\/%]/.test(ch)) {
        out.push(span("operator", ch));
        i++;
        continue;
      }

      out.push(escapeHtml(ch));
      i++;
    }

    return out.join("");
  }

  function highlightHtmlTag(tagStr) {
    const out = [];
    let i = 0;

    if (tagStr[i] === "<") {
      out.push(span("punct", "<"));
      i++;
    }
    if (tagStr[i] === "/") {
      out.push(span("punct", "/"));
      i++;
    }

    if (isIdentStart(tagStr[i])) {
      const nameStart = i;
      i = readIdent(tagStr, i);
      out.push(span("tag", tagStr.slice(nameStart, i)));
    }

    while (i < tagStr.length) {
      const ch = tagStr[i];
      if (/\s/.test(ch)) {
        out.push(ch);
        i++;
        continue;
      }
      if (ch === ">") {
        out.push(span("punct", ch));
        i++;
        continue;
      }

      const attrStart = i;
      while (i < tagStr.length && /[a-zA-Z0-9_:$.-]/.test(tagStr[i])) i++;
      if (i > attrStart) {
        out.push(span("attr", tagStr.slice(attrStart, i)));
      } else {
        out.push(span("punct", tagStr[i]));
        i++;
        continue;
      }

      if (tagStr[i] === "=") {
        out.push(span("operator", "="));
        i++;
        const quote = tagStr[i];
        if (quote === '"' || quote === "'") {
          const end = readString(tagStr, i, quote);
          out.push(span("string", tagStr.slice(i, end)));
          i = end;
        }
      }
    }

    return out.join("");
  }

  function highlightHtml(code) {
    const out = [];
    let i = 0;

    while (i < code.length) {
      if (code.slice(i, i + 4) === "<!--") {
        const end = code.indexOf("-->", i + 4);
        const j = end === -1 ? code.length : end + 3;
        out.push(span("comment", code.slice(i, j)));
        i = j;
        continue;
      }

      if (code[i] === "<") {
        const close = code.indexOf(">", i);
        const j = close === -1 ? code.length : close + 1;
        out.push(highlightHtmlTag(code.slice(i, j)));
        i = j;
        continue;
      }

      out.push(escapeHtml(code[i]));
      i++;
    }

    return out.join("");
  }

  function highlight(code, file) {
    if (file.endsWith(".html")) return highlightHtml(code);
    if (file.endsWith(".css")) return highlightCss(code);
    return highlightJs(code);
  }

  async function loadFile(file) {
    if (cache.has(file)) return cache.get(file);

    const res = await fetch(file, { cache: "no-store" });
    if (!res.ok) throw new Error(`Could not load ${file} (${res.status})`);
    const text = await res.text();
    cache.set(file, text);
    return text;
  }

  async function showFile(file) {
    activeFile = file;
    errorEl.hidden = true;
    codeEl.parentElement.hidden = false;
    codeEl.textContent = "Loading…";

    tabs.forEach((tab) => {
      const isActive = tab.dataset.file === file;
      tab.classList.toggle("is-active", isActive);
      tab.setAttribute("aria-selected", isActive ? "true" : "false");
    });

    try {
      const text = await loadFile(file);
      codeEl.innerHTML = highlight(text, file);
      codeEl.parentElement.scrollTop = 0;
    } catch (err) {
      codeEl.parentElement.hidden = true;
      errorEl.hidden = false;
      errorEl.textContent =
        err.message +
        ". Serve this folder with a local server (see README) instead of opening index.html directly.";
    }
  }

  function pauseGameIfNeeded() {
    wasPlaying = false;
    if (typeof window.pauseForSource === "function") {
      wasPlaying = window.pauseForSource();
    }
  }

  function resumeGameIfNeeded() {
    if (wasPlaying && typeof window.resumeFromSource === "function") {
      window.resumeFromSource();
    }
    wasPlaying = false;
  }

  function openModal() {
    pauseGameIfNeeded();
    modal.hidden = false;
    document.body.classList.add("source-open");
    showFile(activeFile);
    closeBtn.focus();
  }

  function closeModal() {
    modal.hidden = true;
    document.body.classList.remove("source-open");
    resumeGameIfNeeded();
    openBtn.focus();
  }

  openBtn.addEventListener("click", openModal);
  closeBtn.addEventListener("click", closeModal);
  backdrop.addEventListener("click", closeModal);

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => showFile(tab.dataset.file));
  });

  copyBtn.addEventListener("click", async () => {
    try {
      const text = cache.get(activeFile) ?? (await loadFile(activeFile));
      await navigator.clipboard.writeText(text);
      const prev = copyBtn.textContent;
      copyBtn.textContent = "Copied!";
      setTimeout(() => {
        copyBtn.textContent = prev;
      }, 1200);
    } catch {
      copyBtn.textContent = "Failed";
      setTimeout(() => {
        copyBtn.textContent = "Copy";
      }, 1200);
    }
  });

  document.addEventListener("keydown", (e) => {
    if (modal.hidden) return;
    if (e.key === "Escape") {
      e.preventDefault();
      closeModal();
    }
  });
})();
