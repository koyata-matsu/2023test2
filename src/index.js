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

const steps = [
  { key: "template", label: "1.テンプレートを作成する" },
  { key: "sheet", label: "2.年月を選びシートを作成" },
  { key: "settings", label: "3.設定を調整する" },
  { key: "published", label: "4.公開する" },
  { key: "shifted", label: "5.シフト作成をする" }
];

const stepHints = {
  template: "テンプレートを保存して新規シフト表を作成します。",
  sheet: "年月を選んで新規シフト表を作成してください。",
  settings: "名前横の設定ボタンでスタッフ条件を調整します。",
  published: "公開するボタンを押すと希望入力ができます。",
  shifted: "シフトを自動作成を押して最終案を作ります。"
};

const app = document.getElementById("app");

const createOnboardingState = () => ({
  template: false,
  sheet: false,
  settings: false,
  published: false,
  shifted: false
});

const state = {
  view: "login",
  owner: {
    email: "",
    password: ""
  },
  staff: structuredClone(initialStaff),
  ownerMode: true,
  templateReady: false,
  sheet: null,
  sheets: [],
  currentSheetId: null,
  published: false,
  fixedDays: new Set(),
  onboarding: createOnboardingState(),
  warningMessage: "入力内容を確認してください。",
  publishMessage: ""
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

const formatTimestamp = (date) => {
  if (!(date instanceof Date)) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}/${month}/${day} ${hours}:${minutes}`;
};

const getSheetUrl = (sheet) => {
  if (!sheet || !state.owner.email) return "";
  const safeEmail = state.owner.email.replace(/[@.]/g, "_");
  return `https://shift.local/${safeEmail}/${sheet.year}-${String(sheet.month).padStart(
    2,
    "0"
  )}`;
};

const getNextStepKey = () => steps.find((step) => !state.onboarding[step.key])?.key;

const renderTodoList = () => `
  <section class="todo">
    <h2>やることリスト</h2>
    <ul>
      ${steps
        .map((step) => {
          const done = state.onboarding[step.key];
          const active = step.key === getNextStepKey();
          return `<li class="${done ? "done" : ""} ${active ? "active" : ""}">
            <span class="check">${done ? "✓" : active ? "▶" : ""}</span>
            <span>${step.label}</span>
          </li>`;
        })
        .join("")}
    </ul>
  </section>
`;

const renderSteps = () => `
  <section class="steps">
    ${steps
      .map((step) => {
        const done = state.onboarding[step.key];
        const active = step.key === getNextStepKey();
        return `<div class="step ${done ? "done" : ""} ${
          active ? "active" : ""
        }">
          <span class="step-indicator">${done ? "✓" : active ? "▶" : ""}</span>
          <span class="step-label">${step.label}</span>
        </div>`;
      })
      .join("")}
  </section>
`;

const renderLogin = () => `
  <div class="page login">
    <header class="app-header">
      <div>
        <p class="eyebrow">バイトシフト調整</p>
        <h1>ログイン</h1>
      </div>
    </header>
    <section class="card">
      <label>
        メールアドレス
        <input id="owner-email" type="email" placeholder="owner@example.com" value="${
          state.owner.email
        }" />
      </label>
      <label>
        パスワード
        <input id="owner-password" type="password" placeholder="8文字以上" value="${
          state.owner.password
        }" />
      </label>
      <div class="button-row">
        <button class="primary" id="login-owner">ログイン</button>
      </div>
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
        <h1>${state.owner.email}</h1>
      </div>
      <div class="header-actions">
        <button class="ghost" id="logout">ログアウト</button>
      </div>
    </header>

    <div class="layout">
      <div>
        ${renderSteps()}
        <section class="controls">
          <div class="control-group">
            <button class="primary" id="save-template">テンプレートを保存</button>
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
      ${renderTodoList()}
    </div>
  </div>
`;

const renderSheetList = () => `
  <div class="page">
    <header class="app-header">
      <div>
        <p class="eyebrow">シフト表一覧</p>
        <h1>${state.owner.email} のシフト表一覧</h1>
      </div>
      <div class="header-actions">
        <button class="ghost" id="logout">ログアウト</button>
      </div>
    </header>

    <div class="layout">
      <div>
        ${renderSteps()}
        <section class="controls">
          <div class="control-group">
            <button class="primary" id="new-sheet">新規作成</button>
          </div>
          <span class="helper-text">新規作成は一覧画面からのみ行えます。</span>
        </section>

        <section class="sheet-list">
          ${state.sheets.length === 0
            ? `<p class="helper-text">まだシフト表がありません。</p>`
            : state.sheets
                .map(
                  (sheet) => `
                    <div class="sheet-card">
                      <div>
                        <h3>${sheet.year}年${sheet.month}月</h3>
                        <p class="sheet-meta">更新: ${formatTimestamp(sheet.generatedAt)}</p>
                      </div>
                      <div class="sheet-actions">
                        <span class="publish-status ${
                          sheet.published ? "published" : "draft"
                        }">
                          ${sheet.published ? "公開中" : "非公開"}
                        </span>
                        <button class="ghost" data-action="open-sheet" data-id="${
                          sheet.id
                        }">開く</button>
                      </div>
                    </div>
                  `
                )
                .join("")}
        </section>
      </div>
      ${renderTodoList()}
    </div>
  </div>
`;

const renderSheet = () => {
  if (!state.sheet) return "";
  const generatedAt = state.sheet.generatedAt
    ? `（更新: ${formatTimestamp(state.sheet.generatedAt)}）`
    : "";
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
          <h1>${state.sheet.year}年${state.sheet.month}月 ${generatedAt}</h1>
        </div>
        <div class="header-actions">
          <div class="header-note">URLを公開すると希望入力が可能</div>
          <span class="publish-status ${state.published ? "published" : "draft"}">
            ${state.published ? "公開中" : "非公開"}
          </span>
          <button class="ghost" id="back-to-list">一覧に戻る</button>
        </div>
      </header>

      <div class="layout">
        <div>
          ${renderSteps()}

          <section class="controls">
            <div class="control-group">
              <button class="ghost" id="publish-sheet" ${
                state.ownerMode ? "" : "disabled"
              }>${state.published ? "公開を解除" : "公開する"}</button>
            </div>
            ${
              state.published
                ? `
            <div class="control-group">
              <span class="url-label">URL</span>
              <span class="url-value">${getSheetUrl(state.sheet)}</span>
            </div>
            `
                : ""
            }
          </section>

          <section class="controls">
            <div class="control-group">
              <button class="accent" id="auto-shift" ${
                state.ownerMode && state.published ? "" : "disabled"
              }>シフトを自動作成</button>
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
        ${renderTodoList()}
      </div>
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
        <h2>新規シフト表を作成</h2>
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
        <button type="submit" class="primary" data-action="create">
          〇〇年◯月の新規シフト表を作成
        </button>
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
      <p class="warning-text">${state.warningMessage}</p>
      <div class="panel-actions">
        <button type="button" class="ghost" data-action="close">戻る</button>
        <button type="submit" class="primary" data-action="confirm">OK</button>
      </div>
    </form>
  </dialog>
`;

const renderPublishDialog = () => `
  <dialog class="publish-dialog">
    <form method="dialog" class="settings-content">
      <header>
        <h2>公開情報</h2>
        <button type="button" class="close-button" data-action="close">×</button>
      </header>
      <p>${state.publishMessage}</p>
      ${
        state.published && state.sheet
          ? `<div class="url-block">
              <span class="url-label">URL</span>
              <span class="url-value">${getSheetUrl(state.sheet)}</span>
            </div>`
          : ""
      }
      <div class="panel-actions">
        <button type="submit" class="primary" data-action="close">OK</button>
      </div>
    </form>
  </dialog>
`;

const renderGuideDialog = () => {
  const stepKey = getNextStepKey();
  if (!stepKey) return "";
  const text = stepHints[stepKey];
  return `
    <dialog class="guide-dialog" data-step="${stepKey}">
      <form method="dialog" class="settings-content">
        <header>
          <h2>次にやること</h2>
          <button type="button" class="close-button" data-action="close">×</button>
        </header>
        <p>${text}</p>
        <div class="panel-actions">
          <button type="submit" class="primary" data-action="guide-ok">OK</button>
        </div>
      </form>
    </dialog>
  `;
};

const renderApp = () => {
  let content = "";
  if (state.view === "login") {
    content = renderLogin();
  } else if (state.view === "template") {
    content = renderTemplate();
  } else if (state.view === "list") {
    content = renderSheetList();
  } else if (state.view === "sheet") {
    content = renderSheet();
  }

  app.innerHTML = `
    ${content}
    ${renderSettingsDialog()}
    ${renderSheetDialog()}
    ${renderWarningDialog()}
    ${renderPublishDialog()}
    ${renderGuideDialog()}
  `;

  const guideDialog = document.querySelector(".guide-dialog");
  if (
    guideDialog instanceof HTMLDialogElement &&
    state.view !== "login" &&
    !guideDialog.open
  ) {
    guideDialog.showModal();
  }
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

const resetState = () => {
  state.view = "login";
  state.owner = { email: "", password: "" };
  state.staff = structuredClone(initialStaff);
  state.ownerMode = true;
  state.templateReady = false;
  state.sheet = null;
  state.sheets = [];
  state.currentSheetId = null;
  state.published = false;
  state.fixedDays = new Set();
  state.onboarding = createOnboardingState();
  state.warningMessage = "入力内容を確認してください。";
  state.publishMessage = "";
  renderApp();
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
  state.onboarding.shifted = true;
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

const openPublishDialog = () => {
  openDialog(".publish-dialog");
};

const startOwnerSession = () => {
  state.view = "template";
  state.ownerMode = true;
  renderApp();
};

const validateOwnerFields = () => {
  const { email, password } = state.owner;
  return email && password;
};

const openSheetFromList = (sheetId) => {
  const sheet = state.sheets.find((item) => item.id === sheetId);
  if (!sheet) return;
  state.currentSheetId = sheetId;
  state.sheet = {
    year: sheet.year,
    month: sheet.month,
    days: buildDays(sheet.year, sheet.month),
    warnings: [],
    generatedAt: sheet.generatedAt
  };
  state.published = sheet.published;
  state.view = "sheet";
  renderApp();
};

renderApp();

document.body.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;

  if (target.id === "login-owner") {
    const emailInput = document.getElementById("owner-email");
    const passwordInput = document.getElementById("owner-password");
    if (
      emailInput instanceof HTMLInputElement &&
      passwordInput instanceof HTMLInputElement
    ) {
      state.owner = {
        email: emailInput.value.trim(),
        password: passwordInput.value.trim()
      };
      if (!validateOwnerFields()) {
        state.warningMessage = "メールアドレスとパスワードを入力してください。";
        openDialog(".warning-dialog");
        return;
      }
      state.onboarding = createOnboardingState();
      state.templateReady = false;
      startOwnerSession();
    }
  }

  if (target.id === "save-template") {
    state.templateReady = true;
    state.onboarding.template = true;
    renderApp();
    openDialog(".sheet-dialog");
  }

  if (target.id === "new-sheet") {
    openDialog(".sheet-dialog");
  }

  if (target.id === "publish-sheet" && state.ownerMode) {
    state.published = !state.published;
    state.onboarding.published = state.published;
    const sheetIndex = state.sheets.findIndex(
      (sheet) => sheet.id === state.currentSheetId
    );
    if (sheetIndex !== -1) {
      state.sheets[sheetIndex].published = state.published;
      state.sheets[sheetIndex].generatedAt = new Date();
    }
    state.publishMessage = state.published
      ? "公開しました。URLを共有してください。"
      : "非公開にしました。";
    renderApp();
    openPublishDialog();
  }

  if (target.id === "auto-shift" && state.ownerMode) {
    if (!state.published) {
      state.warningMessage = "公開後にシフトを自動作成できます。";
      openDialog(".warning-dialog");
      return;
    }
    if (state.sheet) {
      state.sheet.generatedAt = new Date();
    }
    applyAssignments({ randomize: false });
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

  if (target.id === "logout") {
    resetState();
  }

  if (target.id === "back-to-list") {
    state.view = "list";
    renderApp();
  }

  if (target.dataset.action === "open-sheet") {
    const sheetId = target.dataset.id;
    openSheetFromList(sheetId);
  }

  if (target.dataset.action === "close") {
    closeDialog(".settings-panel");
    closeDialog(".sheet-dialog");
    closeDialog(".warning-dialog");
    closeDialog(".guide-dialog");
    closeDialog(".publish-dialog");
  }

  if (target.dataset.action === "guide-ok") {
    closeDialog(".guide-dialog");
  }
});

document.body.addEventListener("change", (event) => {
  const target = event.target;

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
      state.warningMessage = "希望日ではない出勤が含まれています。よろしいですか？";
      openWarningDialog();
    }
  }
});

document.body.addEventListener("submit", (event) => {
  const form = event.target;
  if (!(form instanceof HTMLFormElement)) return;
  const panel = form.closest(".settings-panel");
  const sheetPanel = form.closest(".sheet-dialog");
  const guidePanel = form.closest(".guide-dialog");

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
      state.onboarding.settings = true;
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
      const sheetId = `${year}-${month}`;
      const newSheet = {
        id: sheetId,
        year,
        month,
        published: false,
        generatedAt: new Date()
      };
      state.sheets = [newSheet, ...state.sheets.filter((item) => item.id !== sheetId)];
      state.currentSheetId = sheetId;
      state.sheet = {
        year,
        month,
        days: buildDays(year, month),
        warnings: [],
        generatedAt: new Date()
      };
      state.fixedDays.clear();
      state.published = false;
      state.view = "sheet";
      state.onboarding.sheet = true;
      renderApp();
    }
    sheetPanel.close();
  }

  if (guidePanel instanceof HTMLDialogElement) {
    event.preventDefault();
    guidePanel.close();
  }
});
