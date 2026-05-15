const cellStack = document.querySelector("#cellStack");
const clearOutputBtn = document.querySelector("#clearOutputBtn");
const runAllBtn = document.querySelector("#runAllBtn");

let executionIndex = 3;

const defaultCellTypes = ["python", "markdown"];
const starterCode = {
  python: `# Python cell
message = "Hello Python!"
print(message)`,
  markdown: {
    title: "새 Markdown 셀",
    body: "분석 흐름을 정리한다.",
  },
  shell: `darkpyonix.run_command("""echo "Hello from the shell!" """)`,
  js: `darkpyonix.run_js("""
console.log(pyodide.globals.get("message"));
""")`,
  parallel: `darkpyonix.run_parallel(
    await darkpyonix.markdown("""
## 수평 레이아웃
여기에 수평 레이아웃에 대한 설명을 추가할 수 있습니다.
"""),
    await darkpyonix.run_python("""
a = 1
""")
)`,
  argparse: `model_id = darkpyonix.params.get(
    "model_id",
    default=0,
    choices=["default_model", "swin_t", "resnet", "vi-t"],
)`,
};

function normalizeType(type) {
  return type && type.trim() ? type.trim().toLowerCase() : "python";
}

function renumberCells() {
  document.querySelectorAll(".cell").forEach((cell, index) => {
    const count = cell.querySelector(".execution-count");
    if (count) count.textContent = `[${index + 1}]`;
  });
}

function setActiveCell(cell) {
  document.querySelectorAll(".cell").forEach((item) => item.classList.remove("is-active"));
  cell.classList.add("is-active");
}

function createOutput(type) {
  const output = document.createElement("div");
  output.className = "output";
  output.innerHTML = `
    <div class="output-head">
      <span>${type === "markdown" ? "Rendered" : "Output"}</span>
      <span>${type === "markdown" ? "now" : "waiting"}</span>
    </div>
  `;
  return output;
}

function runCell(cell) {
  setActiveCell(cell);
  let output = cell.querySelector(".output");

  if (!output) {
    output = createOutput(cell.dataset.type);
    cell.querySelector(".cell-main").append(output);
  }

  output.classList.add("is-running");
  output.querySelector(".output-head span:last-child").textContent = "running";

  window.setTimeout(() => {
    executionIndex += 1;
    output.classList.remove("is-running");
    output.querySelector(".output-head span:last-child").textContent = `${36 + executionIndex * 7} ms`;

    if (cell.dataset.type !== "markdown" && !output.querySelector(".run-result")) {
      const result = document.createElement("div");
      result.className = "run-result";
      result.textContent = `✓ ${cell.dataset.type} cell finished`;
      output.append(result);
    }
  }, 620);
}

function typeHeader(type) {
  type = normalizeType(type);

  return `
    <span class="cell-header">
      <span># %% [</span>
      <input class="cell-type-input" aria-label="Cell type" value="${type}" size="${Math.max(type.length, 4)}">
      <span>]</span>
    </span>
  `;
}

function markdownBody() {
  return `<div class="markdown-preview" contenteditable="true">
              <h2>${starterCode.markdown.title}</h2>
              <p>${starterCode.markdown.body}</p>
            </div>`;
}

function codeBody(type) {
  return `<textarea spellcheck="false">${starterCode[type] || `# %% [${type}]\n# cell body`}</textarea>`;
}

function insertBar() {
  return `
    <div class="insert-cell-bar" aria-label="Add cell below">
      <span class="insert-line" aria-hidden="true"></span>
      <div class="insert-actions">
        <button class="insert-cell" type="button" data-cell-type="python" title="Add code cell" aria-label="Add code cell below">
          <span aria-hidden="true">+</span>
          Code
        </button>
        <button class="insert-cell" type="button" data-cell-type="markdown" title="Add markdown cell" aria-label="Add markdown cell below">
          <span aria-hidden="true">+</span>
          Markdown
        </button>
      </div>
    </div>
  `;
}

function buildCell(type) {
  type = normalizeType(type);
  const cell = document.createElement("article");
  cell.className = `cell ${type === "markdown" ? "markdown-cell" : ""}`;
  cell.dataset.type = type;

  cell.innerHTML = `
    <div class="cell-rail">
      <button class="run-button" title="${type === "markdown" ? "Render markdown" : "Run cell"}" aria-label="${type === "markdown" ? "Render markdown" : "Run cell"}">▶</button>
      <span class="execution-count">[0]</span>
    </div>
    <div class="cell-main">
      <div class="cell-toolbar">
        <div>
          ${typeHeader(type)}
        </div>
        <div class="cell-tools">
          <button title="Move up" aria-label="Move up">↑</button>
          <button title="Move down" aria-label="Move down">↓</button>
          <button title="Delete cell" aria-label="Delete cell" class="delete-cell">×</button>
        </div>
      </div>
      ${type === "markdown" ? markdownBody() : codeBody(type)}
    </div>
    ${insertBar()}
  `;

  return cell;
}

function ensureCellChrome(cell) {
  const type = normalizeType(cell.dataset.type);
  const header = cell.querySelector(".cell-header");

  cell.dataset.type = type;
  if (header) header.outerHTML = typeHeader(type);
  if (!cell.querySelector(".insert-cell-bar")) {
    cell.insertAdjacentHTML("beforeend", insertBar());
  }
}

function setCellType(cell, type) {
  type = normalizeType(type);
  const previousType = cell.dataset.type;
  const body = cell.querySelector("textarea, .markdown-preview");

  cell.dataset.type = type;
  cell.classList.toggle("markdown-cell", type === "markdown");
  cell.querySelector(".run-button").title = type === "markdown" ? "Render markdown" : "Run cell";
  cell.querySelector(".run-button").setAttribute("aria-label", type === "markdown" ? "Render markdown" : "Run cell");

  if (previousType === "markdown" && type !== "markdown") {
    body.outerHTML = codeBody(type);
  }

  if (previousType !== "markdown" && type === "markdown") {
    body.outerHTML = markdownBody();
  }

  cell.querySelector(".output")?.remove();
}

function addCellAfter(anchorCell, type) {
  const cell = buildCell(type);
  anchorCell.after(cell);
  renumberCells();
  setActiveCell(cell);
  cell.scrollIntoView({ behavior: "smooth", block: "center" });
  window.setTimeout(() => {
    const editable = cell.querySelector("textarea, .markdown-preview");
    editable?.focus();
  }, 260);
}

function moveCell(cell, direction) {
  if (direction === "up" && cell.previousElementSibling) {
    cellStack.insertBefore(cell, cell.previousElementSibling);
  }

  if (direction === "down" && cell.nextElementSibling) {
    cellStack.insertBefore(cell.nextElementSibling, cell);
  }

  renumberCells();
}

function syncTypeControl(select) {
  const cell = select.closest(".cell");
  const type = normalizeType(select.value);

  select.value = type;
  select.size = Math.max(type.length, 4);
  setCellType(cell, type);
}

document.querySelectorAll(".cell").forEach(ensureCellChrome);
renumberCells();

cellStack.addEventListener("click", (event) => {
  const cell = event.target.closest(".cell");
  if (!cell) return;

  setActiveCell(cell);

  if (event.target.closest(".run-button")) {
    runCell(cell);
  }

  if (event.target.closest(".delete-cell")) {
    if (document.querySelectorAll(".cell").length === 1) return;
    cell.remove();
    renumberCells();
    const next = document.querySelector(".cell");
    if (next) setActiveCell(next);
  }

  const insertButton = event.target.closest(".insert-cell");
  if (insertButton) {
    addCellAfter(cell, insertButton.dataset.cellType || "python");
  }

  const toolButton = event.target.closest(".cell-tools button");
  if (toolButton && toolButton.title === "Move up") {
    moveCell(cell, "up");
  }

  if (toolButton && toolButton.title === "Move down") {
    moveCell(cell, "down");
  }
});

cellStack.addEventListener("change", (event) => {
  if (event.target.matches(".cell-type-input")) {
    syncTypeControl(event.target);
  }
});

cellStack.addEventListener("input", (event) => {
  if (event.target.matches(".cell-type-input")) {
    event.target.size = Math.max(event.target.value.length, 4);
  }
});

cellStack.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && event.target.matches(".cell-type-input")) {
    event.preventDefault();
    syncTypeControl(event.target);
    event.target.blur();
  }
});

cellStack.addEventListener("focusin", (event) => {
  const cell = event.target.closest(".cell");
  if (cell) setActiveCell(cell);
});

clearOutputBtn.addEventListener("click", () => {
  document.querySelectorAll(".cell .output").forEach((output) => output.remove());
});

runAllBtn.addEventListener("click", () => {
  document.querySelectorAll(".cell").forEach((cell, index) => {
    window.setTimeout(() => runCell(cell), index * 180);
  });
});
