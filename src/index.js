import "./styles.css";

const staff = [
  "佐藤",
  "鈴木",
  "高橋",
  "田中",
  "伊藤",
  "渡辺",
  "山本",
  "中村",
  "小林",
  "加藤"
];

const weekdayLabels = ["日", "月", "火", "水", "木", "金", "土"];

const preferences = [
  { value: "", label: "空白" },
  { value: "work", label: "出勤希望日" },
  { value: "off", label: "休み希望日" },
  { value: "am_off", label: "午前休" },
  { value: "pm_off", label: "午後休" }
];

const app = document.getElementById("app");

const buildDays = (year, month) => {
  const daysInMonth = new Date(year, month, 0).getDate();
  return Array.from({ length: daysInMonth }, (_, index) => {
    const date = new Date(year, month - 1, index + 1);
    return {
      dateLabel: `${month}/${index + 1}`,
      weekday: weekdayLabels[date.getDay()]
    };
  });
};

const createPreferenceSelect = (rowIndex, colIndex) => {
  const options = preferences
    .map(
      (pref) => `<option value="${pref.value}">${pref.label}</option>`
    )
    .join("");
  return `
    <select class="preference-select" data-row="${rowIndex}" data-col="${colIndex}">
      ${options}
    </select>
  `;
};

const renderTable = (year, month, days) => {
  const headerCells = days
    .map(
      (day, index) => `
        <th class="day-cell" data-col="${index}">
          <div class="date">${day.dateLabel}</div>
          <div class="weekday">${day.weekday}</div>
        </th>
      `
    )
    .join("");

  const requiredInputs = days
    .map(
      (_, index) => `
        <th class="required-cell">
          <div class="required-label">日勤</div>
          <input class="required-input" type="number" min="0" value="2" data-col="${index}" data-shift="day" />
          <div class="required-label">夜勤</div>
          <input class="required-input" type="number" min="0" value="1" data-col="${index}" data-shift="night" />
        </th>
      `
    )
    .join("");

  const rows = staff
    .map(
      (name, rowIndex) => `
        <tr data-row="${rowIndex}">
          <th class="name-cell">${name}</th>
          ${days
            .map(
              (_, colIndex) => `
                <td class="shift-cell" data-row="${rowIndex}" data-col="${colIndex}">
                  <div class="cell-content">
                    ${createPreferenceSelect(rowIndex, colIndex)}
                    <div class="assigned-shift" aria-live="polite"></div>
                  </div>
                </td>
              `
            )
            .join("")}
        </tr>
      `
    )
    .join("");

  app.innerHTML = `
    <div class="page">
      <header class="app-header">
        <div>
          <p class="eyebrow">バイトシフト調整</p>
          <h1>${year}年${month}月 シフト調整表</h1>
        </div>
        <div class="header-note">まず年月を入力してシートを作成</div>
      </header>

      <section class="controls">
        <div class="control-group">
          <label>
            年
            <input id="year-input" type="number" value="${year}" min="2023" />
          </label>
          <label>
            月
            <input id="month-input" type="number" value="${month}" min="1" max="12" />
          </label>
          <button class="primary" id="create-sheet">新規作成</button>
        </div>
        <div class="control-group">
          <button class="accent" id="create-shift">シフトを作成</button>
          <span class="helper-text">最低必要人数と希望を元に自動で割り当て</span>
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
            ${rows}
          </tbody>
        </table>
      </section>
    </div>
  `;
};

const applyAssignments = (days) => {
  const assignments = days.map(() => ({ day: [], night: [] }));
  const tableCells = document.querySelectorAll(".shift-cell");
  tableCells.forEach((cell) => {
    cell.classList.remove("assigned");
    const label = cell.querySelector(".assigned-shift");
    if (label) label.textContent = "";
  });

  const requiredInputs = document.querySelectorAll(".required-input");
  const requiredByCol = days.map(() => ({ day: 0, night: 0 }));
  requiredInputs.forEach((input) => {
    const col = Number(input.dataset.col);
    const shift = input.dataset.shift;
    requiredByCol[col][shift] = Number(input.value || 0);
  });

  days.forEach((_, colIndex) => {
    const columnCells = Array.from(
      document.querySelectorAll(`.shift-cell[data-col="${colIndex}"]`)
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

    const assignShift = (cells, shiftType, label) => {
      const required = requiredByCol[colIndex][shiftType];
      let count = 0;
      for (const cell of cells) {
        if (count >= required) break;
        const assignedLabel = cell.querySelector(".assigned-shift");
        if (assignedLabel && assignedLabel.textContent) continue;
        assignedLabel.textContent = label;
        cell.classList.add("assigned");
        assignments[colIndex][shiftType].push(cell.dataset.row);
        count += 1;
      }
    };

    assignShift(availableDay, "day", "日勤");
    assignShift(availableNight, "night", "夜勤");
  });
};

const initialDate = new Date();
let currentYear = initialDate.getFullYear();
let currentMonth = initialDate.getMonth() + 1;
let currentDays = buildDays(currentYear, currentMonth);

renderTable(currentYear, currentMonth, currentDays);

app.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  if (target.id === "create-sheet") {
    const yearInput = document.getElementById("year-input");
    const monthInput = document.getElementById("month-input");
    if (!(yearInput instanceof HTMLInputElement)) return;
    if (!(monthInput instanceof HTMLInputElement)) return;
    const nextYear = Number(yearInput.value || currentYear);
    const nextMonth = Number(monthInput.value || currentMonth);
    currentYear = nextYear;
    currentMonth = nextMonth;
    currentDays = buildDays(currentYear, currentMonth);
    renderTable(currentYear, currentMonth, currentDays);
  }

  if (target.id === "create-shift") {
    applyAssignments(currentDays);
  }
});
