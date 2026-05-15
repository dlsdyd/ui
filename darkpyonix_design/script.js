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
  const state = cell.querySelector(".cell-state");
  let output = cell.querySelector(".output");

  if (!output) {
    output = createOutput(cell.dataset.type);
    cell.querySelector(".cell-main").insertBefore(output, cell.querySelector(".insert-cell-bar"));
  }

  state.textContent = "Running";
  output.classList.add("is-running");
  output.querySelector(".output-head span:last-child").textContent = "running";

  window.setTimeout(() => {
    executionIndex += 1;
    state.textContent = cell.dataset.type === "markdown" ? "Rendered" : "Complete";
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

function typeOptions(type) {
  const selectedType = defaultCellTypes.includes(type) ? type : "custom";

  return [...defaultCellTypes, "custom"]
    .map((item) => {
      const label = item === "custom" ? "custom" : item;
      return `<option value="${item}" ${item === selectedType ? "selected" : ""}>${label}</option>`;
    })
    .join("");
}

function typeHeader(type) {
  const isDefaultType = defaultCellTypes.includes(type);

  return `
    <span class="cell-header">
      <span># %% [</span>
      <select class="cell-type-select" aria-label="Cell type">${typeOptions(type)}</select>
      <input class="cell-custom-type" aria-label="Custom cell type" placeholder="shell" value="${isDefaultType ? "" : type}" ${isDefaultType ? "hidden" : ""}>
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
  return `<textarea spellcheck="false">${starterCode[type] || `# %% [${type}]\n# custom cell body`}</textarea>`;
}

function insertBar() {
  return `
    <div class="insert-cell-bar" aria-label="Add cell below">
      <span>Add below</span>
      <button class="insert-python" type="button">+ Python</button>
      <button class="insert-markdown" type="button">+ Markdown</button>
      <label>
        <span># %% [</span>
        <input class="insert-custom-type" type="text" placeholder="shell">
        <span>]</span>
      </label>
      <button class="insert-custom" type="button">Add</button>
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
          <span class="cell-state">${type === "markdown" ? "Draft" : "Idle"}</span>
        </div>
        <div class="cell-tools">
          <button title="Move up" aria-label="Move up">↑</button>
          <button title="Move down" aria-label="Move down">↓</button>
          <button title="Delete cell" aria-label="Delete cell" class="delete-cell">×</button>
        </div>
      </div>
      ${type === "markdown" ? markdownBody() : codeBody(type)}
      ${insertBar()}
    </div>
  `;

  return cell;
}

function ensureCellChrome(cell) {
  const type = normalizeType(cell.dataset.type);
  const header = cell.querySelector(".cell-header");

  cell.dataset.type = type;
  if (header) header.outerHTML = typeHeader(type);
  if (!cell.querySelector(".insert-cell-bar")) {
    cell.querySelector(".cell-main").insertAdjacentHTML("beforeend", insertBar());
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
  cell.querySelector(".cell-state").textContent = type === "markdown" ? "Draft" : "Idle";

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
  const customInput = cell.querySelector(".cell-custom-type");

  if (select.value === "custom") {
    customInput.hidden = false;
    customInput.focus();
    setCellType(cell, customInput.value);
    return;
  }

  customInput.hidden = true;
  setCellType(cell, select.value);
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

  if (event.target.closest(".insert-python")) {
    addCellAfter(cell, "python");
  }

  if (event.target.closest(".insert-markdown")) {
    addCellAfter(cell, "markdown");
  }

  if (event.target.closest(".insert-custom")) {
    const customType = cell.querySelector(".insert-custom-type");
    addCellAfter(cell, customType.value);
    customType.value = "";
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
  if (event.target.matches(".cell-type-select")) {
    syncTypeControl(event.target);
  }
});

cellStack.addEventListener("input", (event) => {
  if (event.target.matches(".cell-custom-type")) {
    setCellType(event.target.closest(".cell"), event.target.value);
  }
});

cellStack.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && event.target.matches(".insert-custom-type")) {
    event.preventDefault();
    addCellAfter(event.target.closest(".cell"), event.target.value);
    event.target.value = "";
  }
});

cellStack.addEventListener("focusin", (event) => {
  const cell = event.target.closest(".cell");
  if (cell) setActiveCell(cell);
});

clearOutputBtn.addEventListener("click", () => {
  document.querySelectorAll(".cell .output").forEach((output) => output.remove());
  document.querySelectorAll(".cell-state").forEach((state) => {
    state.textContent = state.closest(".cell").dataset.type === "markdown" ? "Draft" : "Idle";
  });
});

runAllBtn.addEventListener("click", () => {
  document.querySelectorAll(".cell").forEach((cell, index) => {
    window.setTimeout(() => runCell(cell), index * 180);
  });
});
