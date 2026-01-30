import "./styles.css";

const initialStaff = [
  {
    name: "佐藤",
    employment: "社員",
    shiftType: "どちらも",
    ward: "病棟Aのみ",
    availabilityType: "all",
    availableWeekdays: [],
    dayMin: "",
    dayMax: "",
    nightMin: "",
    nightMax: ""
  },
  {
    name: "鈴木",
    employment: "パート",
    shiftType: "昼専",
    ward: "病棟B・Cのみ",
    availabilityType: "all",
    availableWeekdays: [],
    dayMin: "",
    dayMax: "",
    nightMin: "",
    nightMax: ""
  },
  {
    name: "高橋",
    employment: "社員",
    shiftType: "夜専",
    ward: "",
    availabilityType: "all",
    availableWeekdays: [],
    dayMin: "",
    dayMax: "",
    nightMin: "",
    nightMax: ""
  },
  {
    name: "田中",
    employment: "パート",
    shiftType: "昼専",
    ward: "病棟Aのみ",
    availabilityType: "all",
    availableWeekdays: [],
    dayMin: "",
    dayMax: "",
    nightMin: "",
    nightMax: ""
  },
  {
    name: "伊藤",
    employment: "社員",
    shiftType: "どちらも",
    ward: "",
    availabilityType: "all",
    availableWeekdays: [],
    dayMin: "",
    dayMax: "",
    nightMin: "",
    nightMax: ""
  },
  {
    name: "渡辺",
    employment: "パート",
    shiftType: "どちらも",
    ward: "",
    availabilityType: "all",
    availableWeekdays: [],
    dayMin: "",
    dayMax: "",
    nightMin: "",
    nightMax: ""
  },
  {
    name: "山本",
    employment: "社員",
    shiftType: "夜専",
    ward: "病棟B・Cのみ",
    availabilityType: "all",
    availableWeekdays: [],
    dayMin: "",
    dayMax: "",
    nightMin: "",
    nightMax: ""
  },
  {
    name: "中村",
    employment: "パート",
    shiftType: "どちらも",
    ward: "",
    availabilityType: "all",
    availableWeekdays: [],
    dayMin: "",
    dayMax: "",
    nightMin: "",
    nightMax: ""
  },
  {
    name: "小林",
    employment: "社員",
    shiftType: "どちらも",
    ward: "",
    availabilityType: "all",
    availableWeekdays: [],
    dayMin: "",
    dayMax: "",
    nightMin: "",
    nightMax: ""
  },
  {
    name: "加藤",
    employment: "パート",
    shiftType: "どちらも",
    ward: "",
    availabilityType: "all",
    availableWeekdays: [],
    dayMin: "",
    dayMax: "",
    nightMin: "",
    nightMax: ""
  }
];

const weekdayLabels = ["日", "月", "火", "水", "木", "金", "土"];
const preferenceOptions = [
  { value: "", label: "空白" },
  { value: "off", label: "休み希望日" }
];

const templateOptions = [
  { value: "病棟看護師", label: "病棟看護師" },
  { value: "外来看護師", label: "外来看護師" },
  { value: "病棟介護士", label: "病棟介護士" },
  { value: "病棟事務", label: "病棟事務" }
];

const app = document.getElementById("app");

const createEmptyStaff = () => ({
  name: "",
  employment: "",
  shiftType: "",
  ward: "",
  availabilityType: "all",
  availableWeekdays: [],
  dayMin: "",
  dayMax: "",
  nightMin: "",
  nightMax: ""
});

const state = {
  view: "login",
  owner: {
    email: "",
    password: ""
  },
  staff: structuredClone(initialStaff),
  ownerMode: true,
  sheet: null,
  sheets: [],
  groups: [],
  groupDraftName: "",
  currentSheetId: null,
  fixedDays: new Set(),
  warningMessage: "入力内容を確認してください。",
  selectedGroup: ""
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
      requiredNight: 2
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

const getAvailabilityTag = (person) => {
  if (person.availabilityType === "weekday") {
    return "平日のみ";
  }
  if (person.availabilityType === "specific") {
    const days =
      person.availableWeekdays && person.availableWeekdays.length > 0
        ? person.availableWeekdays.join("")
        : "曜日指定";
    return `曜日:${days}`;
  }
  return "";
};

const getAvailabilityLabel = (person) => {
  if (person.availabilityType === "weekday") {
    return "平日のみ";
  }
  if (person.availabilityType === "specific") {
    const days =
      person.availableWeekdays && person.availableWeekdays.length > 0
        ? person.availableWeekdays.join("")
        : "未設定";
    return `曜日:${days}`;
  }
  return "全日";
};

const formatShiftLimits = (person) => {
  const day = person.dayMin || person.dayMax ? `${person.dayMin || "-"}〜${person.dayMax || "-"}` : "-";
  const night =
    person.nightMin || person.nightMax ? `${person.nightMin || "-"}〜${person.nightMax || "-"}` : "-";
  return `日:${day} / 夜:${night}`;
};

const isStaffAvailableForDay = (person, day) => {
  if (person.availabilityType === "weekday") {
    return day.weekday !== "土" && day.weekday !== "日";
  }
  if (person.availabilityType === "specific") {
    if (!person.availableWeekdays || person.availableWeekdays.length === 0) {
      return false;
    }
    return person.availableWeekdays.includes(day.weekday);
  }
  return true;
};

const renderSidePanel = () => `
  <aside class="side-panel">
    ${
      state.view === "sheet"
        ? `
      <section class="shift-action">
        <h2>シフト作成</h2>
        <button class="accent" id="auto-shift" ${
          state.ownerMode ? "" : "disabled"
        }>シフトを作成する</button>
        <p class="helper-text">固定した日付は変更されません。</p>
      </section>
    `
        : ""
    }
  </aside>
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
  const canEditPreferences = state.ownerMode;
  return state.staff
    .map(
      (person, rowIndex) => `
        <tr data-row="${rowIndex}">
          <th class="name-cell">
            <div class="name-block">
              <div class="name">${person.name}</div>
              <div class="tags">
                ${person.employment ? `<span class="tag">${person.employment}</span>` : ""}
                ${person.shiftType ? `<span class="tag">${person.shiftType}</span>` : ""}
                ${person.ward ? `<span class="tag">${person.ward}</span>` : ""}
                ${getAvailabilityTag(person) ? `<span class="tag">${getAvailabilityTag(person)}</span>` : ""}
              </div>
            </div>
            <button class="settings-button icon-button" data-row="${rowIndex}" ${
              state.ownerMode ? "" : "disabled"
            } aria-label="スタッフ設定">⚙</button>
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
                        <button class="rest-button" ${
                          state.ownerMode ? "" : "disabled"
                        }>休□</button>
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

const renderGroupCreation = () => `
  <div class="page">
    <header class="app-header">
      <div>
        <p class="eyebrow">グループ作成</p>
        <h1>勤務者登録</h1>
      </div>
      <div class="header-actions">
        <button class="ghost" id="back-to-dashboard">戻る</button>
      </div>
    </header>

    <div class="layout">
      <div>
        <section class="controls">
          <div class="control-group">
            <label>
              グループ名
              <input id="group-name" type="text" value="${state.groupDraftName}" list="group-suggestions" />
            </label>
            <button class="primary" id="save-group">勤務者登録を保存</button>
            <button class="ghost" id="add-staff">勤務者を追加</button>
          </div>
          <span class="helper-text">グループ名を決めて勤務者を登録してください。</span>
        </section>

        <section class="sheet">
          <table class="shift-table group-table" aria-label="勤務者登録一覧">
            <thead>
              <tr>
                <th class="corner-cell">氏名</th>
                <th class="day-cell">雇用</th>
                <th class="day-cell">勤務</th>
                <th class="day-cell">病棟</th>
                <th class="day-cell">曜日指定</th>
                <th class="day-cell">日数</th>
              </tr>
            </thead>
            <tbody>
              ${state.staff
                .map(
                  (person, rowIndex) => `
                    <tr data-row="${rowIndex}">
                      <th class="name-cell">
                        <div class="name-block">
                          <div class="name">${person.name || "（未入力）"}</div>
                          <button class="edit-button" data-row="${rowIndex}">編集</button>
                        </div>
                      </th>
                      <td>${person.employment || "-"}</td>
                      <td>${person.shiftType || "-"}</td>
                      <td>${person.ward || "-"}</td>
                      <td>${getAvailabilityLabel(person)}</td>
                      <td>${formatShiftLimits(person)}</td>
                    </tr>
                  `
                )
                .join("")}
            </tbody>
          </table>
        </section>
      </div>
      ${renderSidePanel()}
    </div>
    <datalist id="group-suggestions">
      ${templateOptions
        .map((option) => `<option value="${option.value}"></option>`)
        .join("")}
    </datalist>
  </div>
`;

const renderDashboard = () => `
  <div class="page">
    <header class="app-header">
      <div>
        <p class="eyebrow">ダッシュボード</p>
        <h1>${state.owner.email}</h1>
      </div>
      <div class="header-actions">
        <button class="ghost" id="logout">ログアウト</button>
      </div>
    </header>

    <div class="layout">
      <div>
        <section class="controls">
          <div class="control-group">
            <button class="primary" id="create-group">グループを作成する</button>
            <button class="accent" id="new-sheet">シフトシートを作成する</button>
          </div>
          <span class="helper-text">グループ作成後にシフトシートを作成できます。</span>
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
                        <p class="sheet-meta">グループ: ${sheet.groupName}</p>
                        <p class="sheet-meta">更新: ${formatTimestamp(sheet.generatedAt)}</p>
                      </div>
                      <div class="sheet-actions">
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
      ${renderSidePanel()}
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
            <button class="fix-button icon-button" data-col="${day.index}">
              ${state.fixedDays.has(day.index) ? "固定" : "固定"}
            </button>
          </div>
          <label class="day-off-toggle">
            <input type="checkbox" class="day-off-checkbox" data-col="${day.index}" />
            □休
          </label>
        </th>
      `
    )
    .join("");

  const requiredInputs = state.sheet.days
    .map(
      (day) => `
        <th class="required-cell ${
          state.sheet.warnings?.includes(day.index) ? "warning" : ""
        }">
          <div class="required-row">
            <span class="required-label">日勤</span>
            <input class="required-input" type="number" min="0" value="${
              day.requiredDay
            }" data-col="${day.index}" data-shift="day" />
          </div>
          <div class="required-row">
            <span class="required-label">夜勤</span>
            <input class="required-input" type="number" min="0" value="${
              day.requiredNight
            }" data-col="${day.index}" data-shift="night" />
          </div>
        </th>
      `
    )
    .join("");

  return `
    <div class="page">
      <header class="app-header">
        <div>
          <p class="eyebrow">シフト表</p>
          <h1>${state.sheet.year}年${state.sheet.month}月 ${generatedAt}</h1>
          <p class="sheet-meta">グループ: ${state.sheet.groupName || "-"}</p>
        </div>
        <div class="header-actions">
          <button class="ghost" id="back-to-dashboard">一覧に戻る</button>
        </div>
      </header>

      <div class="layout">
        <div>
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
        ${renderSidePanel()}
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
        氏名
        <input id="staff-name" type="text" placeholder="氏名を入力" />
      </label>
      <label>
        雇用形態
        <select id="employment-select">
          <option value="">未設定</option>
          <option value="社員">社員</option>
          <option value="パート">パート</option>
        </select>
      </label>
      <label>
        勤務タイプ
        <select id="shift-type-select">
          <option value="">未設定</option>
          <option value="夜専">夜専</option>
          <option value="昼専">昼専</option>
          <option value="どちらも">どちらも</option>
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
      <label>
        勤務可能日
        <select id="availability-select">
          <option value="all">全日</option>
          <option value="weekday">平日のみ</option>
          <option value="specific">曜日指定</option>
        </select>
      </label>
      <div class="weekday-grid">
        ${weekdayLabels
          .map(
            (label) => `
              <label class="weekday-option">
                <input type="checkbox" name="weekday" value="${label}" />
                ${label}
              </label>
            `
          )
          .join("")}
      </div>
      <div class="limit-grid">
        <label>
          昼・最低
          <input id="day-min" type="number" min="0" placeholder="0" />
        </label>
        <label>
          昼・最大
          <input id="day-max" type="number" min="0" placeholder="0" />
        </label>
        <label>
          夜・最低
          <input id="night-min" type="number" min="0" placeholder="0" />
        </label>
        <label>
          夜・最大
          <input id="night-max" type="number" min="0" placeholder="0" />
        </label>
      </div>
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
        グループ
        <select id="group-select" ${state.groups.length === 0 ? "disabled" : ""}>
          ${state.groups.length === 0
            ? `<option value="">勤務者登録が必要です</option>`
            : state.groups
                .map(
                  (group) =>
                    `<option value="${group.name}" ${
                      group.name === state.selectedGroup ? "selected" : ""
                    }>${group.name}</option>`
                )
                .join("")}
        </select>
      </label>
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


const renderApp = () => {
  let content = "";
  if (state.view === "login") {
    content = renderLogin();
  } else if (state.view === "group") {
    content = renderGroupCreation();
  } else if (state.view === "dashboard") {
    content = renderDashboard();
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

const resetState = () => {
  state.view = "login";
  state.owner = { email: "", password: "" };
  state.staff = structuredClone(initialStaff);
  state.ownerMode = true;
  state.sheet = null;
  state.sheets = [];
  state.groups = [];
  state.groupDraftName = "";
  state.currentSheetId = null;
  state.fixedDays = new Set();
  state.warningMessage = "入力内容を確認してください。";
  state.selectedGroup = "";
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
      const rowIndex = Number(cell.dataset.row);
      const person = state.staff[rowIndex];
      if (!person) return;
      if (!isStaffAvailableForDay(person, day)) return;
      const select = cell.querySelector(".preference-select");
      if (!select) return;
      const value = select.value;
      if (value !== "off") {
        availableDay.push(cell);
      }
      if (value !== "off") {
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
  panel.querySelector("#staff-name").value = person.name;
  panel.querySelector("#employment-select").value = person.employment;
  panel.querySelector("#shift-type-select").value = person.shiftType;
  panel.querySelector("#ward-select").value = person.ward;
  panel.querySelector("#availability-select").value = person.availabilityType;
  const weekdayInputs = Array.from(panel.querySelectorAll('input[name="weekday"]'));
  weekdayInputs.forEach((input) => {
    input.checked = person.availableWeekdays.includes(input.value);
    input.disabled = person.availabilityType !== "specific";
  });
  panel.querySelector("#day-min").value = person.dayMin;
  panel.querySelector("#day-max").value = person.dayMax;
  panel.querySelector("#night-min").value = person.nightMin;
  panel.querySelector("#night-max").value = person.nightMax;
  panel.dataset.row = String(rowIndex);
  panel.showModal();
};

const startOwnerSession = () => {
  state.view = "dashboard";
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
  state.selectedGroup = sheet.groupName;
  const group = state.groups.find((item) => item.name === sheet.groupName);
  if (group) {
    state.staff = structuredClone(group.staff);
  }
  state.sheet = {
    year: sheet.year,
    month: sheet.month,
    groupName: sheet.groupName,
    days: buildDays(sheet.year, sheet.month),
    warnings: [],
    generatedAt: sheet.generatedAt
  };
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
      startOwnerSession();
    }
  }

  if (target.id === "create-group") {
    state.groupDraftName = "";
    state.staff = [createEmptyStaff()];
    state.view = "group";
    renderApp();
  }

  if (target.id === "new-sheet") {
    if (state.groups.length === 0) {
      state.groupDraftName = "";
      state.staff = [createEmptyStaff()];
      state.view = "group";
      renderApp();
      return;
    }
    openDialog(".sheet-dialog");
  }

  if (target.id === "back-to-dashboard") {
    state.view = "dashboard";
    renderApp();
  }

  if (target.id === "add-staff") {
    state.staff = [...state.staff, createEmptyStaff()];
    renderApp();
  }

  if (target.id === "save-group") {
    const nameInput = document.getElementById("group-name");
    if (!(nameInput instanceof HTMLInputElement)) return;
    const groupName = nameInput.value.trim();
    if (!groupName) {
      state.warningMessage = "グループ名を入力してください。";
      openDialog(".warning-dialog");
      return;
    }
    const newGroup = {
      name: groupName,
      staff: structuredClone(state.staff)
    };
    state.groups = [newGroup, ...state.groups.filter((group) => group.name !== groupName)];
    state.selectedGroup = groupName;
    state.view = "dashboard";
    renderApp();
  }

  if (target.id === "auto-shift" && state.ownerMode) {
    if (state.sheet) {
      state.sheet.generatedAt = new Date();
    }
    applyAssignments({ randomize: true });
  }

  if (target.classList.contains("settings-button") || target.classList.contains("edit-button")) {
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

  if (target.classList.contains("rest-button")) {
    const cell = target.closest(".shift-cell");
    if (!cell) return;
    const select = cell.querySelector(".preference-select");
    if (!(select instanceof HTMLSelectElement)) return;
    select.value = select.value === "off" ? "" : "off";
  }

  if (target.id === "logout") {
    resetState();
  }

  if (target.dataset.action === "open-sheet") {
    const sheetId = target.dataset.id;
    openSheetFromList(sheetId);
  }

  if (target.dataset.action === "close") {
    closeDialog(".settings-panel");
    closeDialog(".sheet-dialog");
    closeDialog(".warning-dialog");
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

  if (target instanceof HTMLInputElement && target.classList.contains("day-off-checkbox")) {
    const col = Number(target.dataset.col);
    const cells = document.querySelectorAll(`.shift-cell[data-col="${col}"]`);
    cells.forEach((cell) => {
      const select = cell.querySelector(".preference-select");
      if (!(select instanceof HTMLSelectElement)) return;
      select.value = target.checked ? "off" : "";
    });
  }

  if (target instanceof HTMLSelectElement && target.id === "availability-select") {
    const panel = target.closest(".settings-panel");
    if (!panel) return;
    const weekdayInputs = panel.querySelectorAll('input[name="weekday"]');
    weekdayInputs.forEach((input) => {
      input.disabled = target.value !== "specific";
      if (target.value !== "specific") {
        input.checked = false;
      }
    });
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
    const nameInput = panel.querySelector("#staff-name");
    const employmentSelect = panel.querySelector("#employment-select");
    const shiftTypeSelect = panel.querySelector("#shift-type-select");
    const wardSelect = panel.querySelector("#ward-select");
    const availabilitySelect = panel.querySelector("#availability-select");
    const weekdayInputs = Array.from(panel.querySelectorAll('input[name="weekday"]'));
    const dayMinInput = panel.querySelector("#day-min");
    const dayMaxInput = panel.querySelector("#day-max");
    const nightMinInput = panel.querySelector("#night-min");
    const nightMaxInput = panel.querySelector("#night-max");
    if (
      nameInput instanceof HTMLInputElement &&
      employmentSelect instanceof HTMLSelectElement &&
      shiftTypeSelect instanceof HTMLSelectElement &&
      wardSelect instanceof HTMLSelectElement &&
      availabilitySelect instanceof HTMLSelectElement &&
      dayMinInput instanceof HTMLInputElement &&
      dayMaxInput instanceof HTMLInputElement &&
      nightMinInput instanceof HTMLInputElement &&
      nightMaxInput instanceof HTMLInputElement
    ) {
      state.staff[rowIndex].name = nameInput.value.trim();
      state.staff[rowIndex].employment = employmentSelect.value;
      state.staff[rowIndex].shiftType = shiftTypeSelect.value;
      state.staff[rowIndex].ward = wardSelect.value;
      state.staff[rowIndex].availabilityType = availabilitySelect.value;
      state.staff[rowIndex].availableWeekdays =
        availabilitySelect.value === "specific"
          ? weekdayInputs.filter((input) => input.checked).map((input) => input.value)
          : [];
      state.staff[rowIndex].dayMin = dayMinInput.value;
      state.staff[rowIndex].dayMax = dayMaxInput.value;
      state.staff[rowIndex].nightMin = nightMinInput.value;
      state.staff[rowIndex].nightMax = nightMaxInput.value;
      renderApp();
    }
    panel.close();
  }

  if (sheetPanel instanceof HTMLDialogElement) {
    event.preventDefault();
    const yearInput = document.getElementById("sheet-year");
    const monthInput = document.getElementById("sheet-month");
    const groupSelect = document.getElementById("group-select");
    if (
      yearInput instanceof HTMLInputElement &&
      monthInput instanceof HTMLInputElement &&
      groupSelect instanceof HTMLSelectElement
    ) {
      if (!groupSelect.value) {
        state.warningMessage = "勤務者登録が必要です。";
        openDialog(".warning-dialog");
        return;
      }
      const year = Number(yearInput.value || new Date().getFullYear());
      const month = Number(monthInput.value || new Date().getMonth() + 1);
      const sheetId = `${year}-${month}`;
      state.selectedGroup = groupSelect.value;
      const group = state.groups.find((item) => item.name === state.selectedGroup);
      if (group) {
        state.staff = structuredClone(group.staff);
      }
      const newSheet = {
        id: sheetId,
        year,
        month,
        groupName: state.selectedGroup,
        generatedAt: new Date()
      };
      state.sheets = [newSheet, ...state.sheets.filter((item) => item.id !== sheetId)];
      state.currentSheetId = sheetId;
      state.sheet = {
        year,
        month,
        groupName: state.selectedGroup,
        days: buildDays(year, month),
        warnings: [],
        generatedAt: new Date()
      };
      state.fixedDays.clear();
      state.view = "sheet";
      renderApp();
    }
    sheetPanel.close();
  }
});
