import "./styles.css";

const initialStaff = [
  { name: "佐藤", role: "社員", limit: "週3まで", ward: "病棟Aのみ" },
  { name: "鈴木", role: "パート", limit: "", ward: "病棟B・Cのみ" },
  { name: "高橋", role: "夜専", limit: "週3まで", ward: "" },
  { name: "田中", role: "日専", limit: "", ward: "病棟Aのみ" },
  { name: "伊藤", role: "社員", limit: "", ward: "" },
  { name: "渡辺", role: "パート", limit: "", ward: "" },
  { name: "山本", role: "夜専", limit: "週3まで", ward: "病棟B・Cのみ" },
  { name: "中村", role: "日専", limit: "", ward: "" },
  { name: "小林", role: "社員", limit: "週3まで", ward: "" },
  { name: "加藤", role: "パート", limit: "", ward: "" }
];

const weekdayLabels = ["日", "月", "火", "水", "木", "金", "土"];
const preferenceOptions = [
  { value: "", label: "空白" },
  { value: "work", label: "出勤希望日" },
  { value: "off", label: "休み希望日" },
  { value: "am_off", label: "午前休" },
  { value: "pm_off", label: "午後休" }
];

const app = document.getElementById("app");

const state = {
  view: "login",
  ownerName: "",
  staff: structuredClone(initialStaff),
  ownerMode: true,
  templateReady: false,
  sheet: null,
  published: false,
  fixedDays: new Set()
};

const buildDays = (year, month) => {
  const daysInMonth = new Date(year, month, 0).getDate();
  return Array.from({ length: daysInMonth }, (_, index) => {
    const date = new Date(year, month - 1, index + 1);
    return {
      index,
      dateLabel: `${month}/${index + 1}`,
      weekday: weekdayLabels[date.getDay()],
      requiredDay: 2,
      requiredNight: 1
    };
  });
};

const getSheetUrl = () => {
  if (!state.sheet) return "";
  return `https://shift.local/${state.ownerName}/${state.sheet.year}-${String(
    state.sheet.month
  ).padStart(2, "0")}`;
};

const renderLogin = () => `
  <div class="page login">
    <header class="app-header">
      <div>
        <p class="eyebrow">バイトシフト調整</p>
        <h1>ログイン / オーナー登録</h1>
      </div>
    </header>
    <section class="card">
      <label>
        オーナー名
        <input id="owner-name" type="text" placeholder="例: 山田オーナー" value="${
          state.ownerName
        }" />
      </label>
      <button class="primary" id="create-owner">アカウントを作成</button>
      <p class="helper-text">オーナーはテンプレートを作成してからシフト表を作成します。</p>
    </section>
  </div>
`;

const renderStaffRows = () => {
  const canEditPreferences = state.ownerMode || state.published;
  return state.staff
    .map(
      (person, rowIndex) => `
        <tr data-row="${rowIndex}">
          <th class="name-cell">
            <div class="name-block">
              <div class="name">${person.name}</div>
              <div class="tags">
                ${person.role ? `<span class="tag">${person.role}</span>` : ""}
                ${person.limit ? `<span class="tag">${person.limit}</span>` : ""}
                ${person.ward ? `<span class="tag">${person.ward}</span>` : ""}
              </div>
            </div>
            <button class="settings-button" data-row="${rowIndex}" ${
              state.ownerMode ? "" : "disabled"
            }>設定</button>
          </th>
          ${state.sheet
            ? state.sheet.days
                .map(
                  (_, colIndex) => `
                    <td class="shift-cell" data-row="${rowIndex}" data-col="${colIndex}">
                      <div class="cell-content">
                        <select class="preference-select" data-row="${rowIndex}" data-col="${colIndex}" ${
                          canEditPreferences ? "" : "disabled"
                        }>
                          ${preferenceOptions
                            .map(
                              (pref) =>
                                `<option value="${pref.value}">${pref.label}</option>`
                            )
                            .join("")}
                        </select>
                        <input class="manual-input" placeholder="手動入力" ${
                          state.ownerMode ? "" : "disabled"
                        } />
                        <div class="assigned-shift" aria-live="polite"></div>
                      </div>
                    </td>
                  `
                )
                .join("")
            : ""}
        </tr>
      `
    )
    .join("");
};

const renderTemplate = () => `
  <div class="page">
    <header class="app-header">
      <div>
        <p class="eyebrow">テンプレート作成</p>
        <h1>${state.ownerName} のシフトテンプレート</h1>
      </div>
      <div class="header-note">スタッフ情報を登録してテンプレート化</div>
    </header>

    <section class="controls">
      <div class="control-group">
        <button class="primary" id="save-template">テンプレートを保存</button>
      </div>
      <div class="control-group">
        <button class="accent" id="go-sheet" ${
          state.templateReady ? "" : "disabled"
        }>新規シートへ</button>
        <span class="helper-text">テンプレート保存後にシート作成へ</span>
      </div>
    </section>

    <section class="sheet">
      <table class="shift-table" aria-label="テンプレートスタッフ一覧">
        <thead>
          <tr>
            <th class="corner-cell">氏名</th>
            <th class="day-cell">スタッフ設定</th>
          </tr>
        </thead>
        <tbody>
          ${state.staff
            .map(
              (person, rowIndex) => `
                <tr data-row="${rowIndex}">
                  <th class="name-cell">
                    <div class="name-block">
                      <div class="name">${person.name}</div>
                      <div class="tags">
                        ${person.role ? `<span class="tag">${person.role}</span>` : ""}
                        ${person.limit ? `<span class="tag">${person.limit}</span>` : ""}
                        ${person.ward ? `<span class="tag">${person.ward}</span>` : ""}
                      </div>
                    </div>
                  </th>
                  <td class="template-cell">
                    <button class="settings-button" data-row="${rowIndex}">設定</button>
                  </td>
                </tr>
              `
            )
            .join("")}
        </tbody>
      </table>
    </section>
  </div>
`;

const renderSheet = () => {
  if (!state.sheet) return "";
  const headerCells = state.sheet.days
    .map(
      (day) => `
        <th class="day-cell ${
          state.sheet.warnings?.includes(day.index) ? "warning" : ""
        }" data-col="${day.index}">
          <div class="date-line">
            <div>
              <div class="date">${day.dateLabel}</div>
              <div class="weekday">${day.weekday}</div>
            </div>
            <button class="fix-button" data-col="${day.index}">
              ${state.fixedDays.has(day.index) ? "固定済" : "固定"}
            </button>
          </div>
        </th>
      `
    )
    .join("");

  const requiredInputs = state.sheet.days
    .map(
      (day) => `
        <th class="required-cell">
          <div class="required-label">日勤</div>
          <input class="required-input" type="number" min="0" value="${
            day.requiredDay
          }" data-col="${day.index}" data-shift="day" />
          <div class="required-label">夜勤</div>
          <input class="required-input" type="number" min="0" value="${
            day.requiredNight
          }" data-col="${day.index}" data-shift="night" />
        </th>
      `
    )
    .join("");

  return `
    <div class="page">
      <header class="app-header">
        <div>
          <p class="eyebrow">公開前シート</p>
          <h1>${state.ownerName} / ${state.sheet.year}年${state.sheet.month}月</h1>
        </div>
        <div class="header-note">URLを公開すると希望入力が可能</div>
      </header>

      <section class="controls">
        <div class="control-group">
          <button class="primary" id="new-sheet">新規作成</button>
          <button class="ghost" id="publish-sheet">${
            state.published ? "公開中" : "公開する"
          }</button>
        </div>
        <div class="control-group">
          <span class="url-label">URL</span>
          <span class="url-value">${getSheetUrl()}</span>
        </div>
        <div class="control-group">
          <label class="owner-toggle">
            <input id="owner-toggle" type="checkbox" ${
              state.ownerMode ? "checked" : ""
            } />
            オーナーとして編集する
          </label>
        </div>
      </section>

      <section class="controls">
        <div class="control-group">
          <button class="accent" id="auto-shift">シフトを自動作成</button>
          <button class="ghost" id="regenerate">作り変える</button>
        </div>
        <div class="control-group">
          <span class="helper-text">固定した日付は変更されません。</span>
        </div>
      </section>

      <section class="sheet">
        <table class="shift-table" aria-label="シフト調整表">
          <thead>
            <tr>
              <th class="corner-cell">氏名</th>
              ${headerCells}
            </tr>
            <tr>
              <th class="corner-cell sub">最低必要人数</th>
              ${requiredInputs}
            </tr>
          </thead>
          <tbody>
            ${renderStaffRows()}
          </tbody>
        </table>
      </section>
    </div>
  `;
};

const renderSettingsDialog = () => `
  <dialog class="settings-panel">
    <form method="dialog" class="settings-content">
      <header>
        <h2><span class="settings-name"></span> の設定</h2>
        <button type="button" class="close-button" data-action="close">×</button>
      </header>
      <label>
        区分
        <select id="role-select">
          <option value="">未設定</option>
          <option value="社員">社員</option>
          <option value="パート">パート</option>
          <option value="夜専">夜専</option>
          <option value="日専">日専</option>
        </select>
      </label>
      <label>
        稼働上限
        <select id="limit-select">
          <option value="">指定なし</option>
          <option value="週3まで">週3まで</option>
        </select>
      </label>
      <label>
        病棟条件
        <select id="ward-select">
          <option value="">指定なし</option>
          <option value="病棟Aのみ">病棟Aのみ</option>
          <option value="病棟B・Cのみ">病棟B・Cのみ</option>
        </select>
      </label>
      <div class="panel-actions">
        <button type="button" class="ghost" data-action="close">キャンセル</button>
        <button type="submit" class="primary" data-action="save">保存</button>
      </div>
    </form>
  </dialog>
`;

const renderSheetDialog = () => `
  <dialog class="sheet-dialog">
    <form method="dialog" class="settings-content">
      <header>
        <h2>新規シート作成</h2>
        <button type="button" class="close-button" data-action="close">×</button>
      </header>
      <label>
        年
        <input id="sheet-year" type="number" min="2023" value="${
          state.sheet?.year || new Date().getFullYear()
        }" />
      </label>
      <label>
        月
        <input id="sheet-month" type="number" min="1" max="12" value="${
          state.sheet?.month || new Date().getMonth() + 1
        }" />
      </label>
      <div class="panel-actions">
        <button type="button" class="ghost" data-action="close">キャンセル</button>
        <button type="submit" class="primary" data-action="create">作成</button>
      </div>
    </form>
  </dialog>
`;

const renderWarningDialog = () => `
  <dialog class="warning-dialog">
    <form method="dialog" class="settings-content">
      <header>
        <h2>注意</h2>
        <button type="button" class="close-button" data-action="close">×</button>
      </header>
      <p class="warning-text">希望日でない出勤が含まれています。よろしいですか？</p>
      <div class="panel-actions">
        <button type="button" class="ghost" data-action="close">戻る</button>
        <button type="submit" class="primary" data-action="confirm">OK</button>
      </div>
    </form>
  </dialog>
`;

const renderApp = () => {
  let content = "";
  if (state.view === "login") {
    content = renderLogin();
  } else if (state.view === "template") {
    content = renderTemplate();
  } else if (state.view === "sheet") {
    content = renderSheet();
  }

  app.innerHTML = `
    ${content}
    ${renderSettingsDialog()}
    ${renderSheetDialog()}
    ${renderWarningDialog()}
  `;
};

const openDialog = (selector) => {
  const dialog = document.querySelector(selector);
  if (dialog instanceof HTMLDialogElement) {
    dialog.showModal();
  }
};

const closeDialog = (selector) => {
  const dialog = document.querySelector(selector);
  if (dialog instanceof HTMLDialogElement) {
    dialog.close();
  }
};

const applyAssignments = ({ randomize } = {}) => {
  if (!state.sheet) return;
  const warnings = [];
  const cells = Array.from(document.querySelectorAll(".shift-cell"));
  cells.forEach((cell) => {
    cell.classList.remove("assigned");
    const label = cell.querySelector(".assigned-shift");
    if (label) label.textContent = "";
  });

  state.sheet.days.forEach((day) => {
    if (state.fixedDays.has(day.index)) return;
    const columnCells = cells.filter(
      (cell) => Number(cell.dataset.col) === day.index
    );
    const availableDay = [];
    const availableNight = [];
    columnCells.forEach((cell) => {
      const select = cell.querySelector(".preference-select");
      if (!select) return;
      const value = select.value;
      if (value === "work" || value === "pm_off") {
        availableDay.push(cell);
      }
      if (value === "work" || value === "am_off") {
        availableNight.push(cell);
      }
    });

    if (randomize) {
      availableDay.sort(() => Math.random() - 0.5);
      availableNight.sort(() => Math.random() - 0.5);
    }

    const assign = (cellsToUse, required, label) => {
      let count = 0;
      for (const cell of cellsToUse) {
        if (count >= required) break;
        const assignedLabel = cell.querySelector(".assigned-shift");
        if (assignedLabel && assignedLabel.textContent) continue;
        assignedLabel.textContent = label;
        cell.classList.add("assigned");
        count += 1;
      }
      return count;
    };

    const dayCount = assign(availableDay, day.requiredDay, "日勤");
    const nightCount = assign(availableNight, day.requiredNight, "夜勤");
    if (dayCount < day.requiredDay || nightCount < day.requiredNight) {
      warnings.push(day.index);
    }
  });

  state.sheet.warnings = warnings;
  renderApp();
};

const openSettingsPanel = (rowIndex) => {
  if (!state.ownerMode) return;
  const person = state.staff[rowIndex];
  if (!person) return;
  const panel = document.querySelector(".settings-panel");
  if (!(panel instanceof HTMLDialogElement)) return;
  panel.querySelector(".settings-name").textContent = person.name;
  panel.querySelector("#role-select").value = person.role;
  panel.querySelector("#limit-select").value = person.limit;
  panel.querySelector("#ward-select").value = person.ward;
  panel.dataset.row = String(rowIndex);
  panel.showModal();
};

const openWarningDialog = () => {
  if (!state.ownerMode) return;
  openDialog(".warning-dialog");
};

renderApp();

document.body.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;

  if (target.id === "create-owner") {
    const input = document.getElementById("owner-name");
    if (input instanceof HTMLInputElement && input.value.trim()) {
      state.ownerName = input.value.trim();
      state.view = "template";
      renderApp();
    }
  }

  if (target.id === "save-template") {
    state.templateReady = true;
    renderApp();
  }

  if (target.id === "go-sheet") {
    state.view = "sheet";
    state.sheet = {
      year: new Date().getFullYear(),
      month: new Date().getMonth() + 1,
      days: buildDays(new Date().getFullYear(), new Date().getMonth() + 1),
      warnings: []
    };
    renderApp();
  }

  if (target.id === "new-sheet") {
    openDialog(".sheet-dialog");
  }

  if (target.id === "publish-sheet") {
    state.published = !state.published;
    renderApp();
  }

  if (target.id === "auto-shift") {
    applyAssignments({ randomize: false });
  }

  if (target.id === "regenerate") {
    applyAssignments({ randomize: true });
  }

  if (target.classList.contains("settings-button")) {
    const rowIndex = Number(target.dataset.row);
    openSettingsPanel(rowIndex);
  }

  if (target.classList.contains("fix-button")) {
    const index = Number(target.dataset.col);
    if (state.fixedDays.has(index)) {
      state.fixedDays.delete(index);
    } else {
      state.fixedDays.add(index);
    }
    renderApp();
  }

  if (target.dataset.action === "close") {
    closeDialog(".settings-panel");
    closeDialog(".sheet-dialog");
    closeDialog(".warning-dialog");
  }
});

document.body.addEventListener("change", (event) => {
  const target = event.target;
  if (target instanceof HTMLInputElement && target.id === "owner-toggle") {
    state.ownerMode = target.checked;
    renderApp();
  }

  if (target instanceof HTMLInputElement && target.classList.contains("required-input")) {
    const col = Number(target.dataset.col);
    const shift = target.dataset.shift;
    const day = state.sheet?.days[col];
    if (!day) return;
    if (shift === "day") {
      day.requiredDay = Number(target.value || 0);
    } else {
      day.requiredNight = Number(target.value || 0);
    }
  }

  if (target instanceof HTMLInputElement && target.classList.contains("manual-input")) {
    const cell = target.closest(".shift-cell");
    if (!cell) return;
    const select = cell.querySelector(".preference-select");
    if (!(select instanceof HTMLSelectElement)) return;
    if (select.value && select.value !== "work") {
      openWarningDialog();
    }
  }
});

document.body.addEventListener("submit", (event) => {
  const form = event.target;
  if (!(form instanceof HTMLFormElement)) return;
  const panel = form.closest(".settings-panel");
  const sheetPanel = form.closest(".sheet-dialog");

  if (panel instanceof HTMLDialogElement) {
    event.preventDefault();
    const rowIndex = Number(panel.dataset.row);
    const roleSelect = panel.querySelector("#role-select");
    const limitSelect = panel.querySelector("#limit-select");
    const wardSelect = panel.querySelector("#ward-select");
    if (
      roleSelect instanceof HTMLSelectElement &&
      limitSelect instanceof HTMLSelectElement &&
      wardSelect instanceof HTMLSelectElement
    ) {
      state.staff[rowIndex].role = roleSelect.value;
      state.staff[rowIndex].limit = limitSelect.value;
      state.staff[rowIndex].ward = wardSelect.value;
      renderApp();
    }
    panel.close();
  }

  if (sheetPanel instanceof HTMLDialogElement) {
    event.preventDefault();
    const yearInput = document.getElementById("sheet-year");
    const monthInput = document.getElementById("sheet-month");
    if (yearInput instanceof HTMLInputElement && monthInput instanceof HTMLInputElement) {
      const year = Number(yearInput.value || new Date().getFullYear());
      const month = Number(monthInput.value || new Date().getMonth() + 1);
      state.sheet = {
        year,
        month,
        days: buildDays(year, month),
        warnings: []
      };
      state.fixedDays.clear();
      state.published = false;
      renderApp();
    }
    sheetPanel.close();
  }
});
