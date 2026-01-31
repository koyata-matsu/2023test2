import "./styles.css";

const initialStaff = [
  {
    name: "佐藤",
    shiftType: "どちらも",
    ward: "病棟Aのみ",
    availabilityType: "all",
    availableWeekdays: [],
    dayMin: "",
    dayMax: "25",
    nightMin: "",
    nightMax: "11"
  },
  {
    name: "鈴木",
    shiftType: "昼専",
    ward: "病棟B・Cのみ",
    availabilityType: "all",
    availableWeekdays: [],
    dayMin: "",
    dayMax: "25",
    nightMin: "",
    nightMax: "11"
  },
  {
    name: "高橋",
    shiftType: "夜専",
    ward: "",
    availabilityType: "all",
    availableWeekdays: [],
    dayMin: "",
    dayMax: "25",
    nightMin: "",
    nightMax: "11"
  },
  {
    name: "田中",
    shiftType: "昼専",
    ward: "病棟Aのみ",
    availabilityType: "all",
    availableWeekdays: [],
    dayMin: "",
    dayMax: "25",
    nightMin: "",
    nightMax: "11"
  },
  {
    name: "伊藤",
    shiftType: "どちらも",
    ward: "",
    availabilityType: "all",
    availableWeekdays: [],
    dayMin: "",
    dayMax: "25",
    nightMin: "",
    nightMax: "11"
  },
  {
    name: "渡辺",
    shiftType: "どちらも",
    ward: "",
    availabilityType: "all",
    availableWeekdays: [],
    dayMin: "",
    dayMax: "25",
    nightMin: "",
    nightMax: "11"
  },
  {
    name: "山本",
    shiftType: "夜専",
    ward: "病棟B・Cのみ",
    availabilityType: "all",
    availableWeekdays: [],
    dayMin: "",
    dayMax: "25",
    nightMin: "",
    nightMax: "11"
  },
  {
    name: "中村",
    shiftType: "どちらも",
    ward: "",
    availabilityType: "all",
    availableWeekdays: [],
    dayMin: "",
    dayMax: "25",
    nightMin: "",
    nightMax: "11"
  },
  {
    name: "小林",
    shiftType: "どちらも",
    ward: "",
    availabilityType: "all",
    availableWeekdays: [],
    dayMin: "",
    dayMax: "25",
    nightMin: "",
    nightMax: "11"
  },
  {
    name: "加藤",
    shiftType: "どちらも",
    ward: "",
    availabilityType: "all",
    availableWeekdays: [],
    dayMin: "",
    dayMax: "25",
    nightMin: "",
    nightMax: "11"
  }
];

const weekdayLabels = ["日", "月", "火", "水", "木", "金", "土"];
const templateOptions = [
  { value: "病棟看護師", label: "病棟看護師" },
  { value: "外来看護師", label: "外来看護師" },
  { value: "病棟介護士", label: "病棟介護士" },
  { value: "病棟事務", label: "病棟事務" }
];

const app = document.getElementById("app");

const createEmptyStaff = () => ({
  name: "",
  shiftType: "",
  ward: "",
  availabilityType: "all",
  availableWeekdays: [],
  dayMin: "",
  dayMax: "25",
  nightMin: "",
  nightMax: "11"
});

const state = {
  view: "login",
  owner: {
    email: "",
    password: ""
  },
  authToken: "",
  apiStatus: "unknown",
  staff: structuredClone(initialStaff),
  ownerMode: true,
  sheet: null,
  sheets: [],
  groups: [],
  groupDraftName: "",
  currentSheetId: null,
  fixedDays: new Set(),
  fixedCells: new Set(),
  blockedDays: new Set(),
  shiftPreferences: [],
  assignments: [],
  shiftVersions: [],
  warningMessage: "入力内容を確認してください。",
  confirmMessage: "",
  pendingShift: false,
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

const getShortageDays = () => {
  if (!state.sheet) return [];
  const shortages = [];
  state.sheet.days.forEach((day) => {
    const availableDay = [];
    const availableNight = [];
    state.staff.forEach((person, rowIndex) => {
      if (!isStaffAvailableForDay(person, day)) return;
      const pref = state.shiftPreferences?.[rowIndex]?.[day.index] || "";
      if (pref === "off") return;
      availableDay.push(rowIndex);
      availableNight.push(rowIndex);
    });
    if (availableDay.length < day.requiredDay || availableNight.length < day.requiredNight) {
      shortages.push(day.index);
    }
  });
  return shortages;
};

const STORAGE_KEY = "shiftAppData";
const AUTH_TOKEN_KEY = "shiftAuthToken";
const API_BASE = window.SHIFT_API_BASE || "http://localhost:3001";

const setAuthToken = (token) => {
  state.authToken = token || "";
  if (token) {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(AUTH_TOKEN_KEY);
  }
};

const apiRequest = async (path, options = {}) => {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };
  if (state.authToken) {
    headers.Authorization = `Bearer ${state.authToken}`;
  }
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers
  });
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const errorMessage = errorBody.error || "サーバーエラーが発生しました。";
    throw new Error(errorMessage);
  }
  return response.json();
};

const checkApiHealth = async () => {
  try {
    const response = await fetch(`${API_BASE}/api/health`);
    state.apiStatus = response.ok ? "online" : "error";
  } catch (error) {
    state.apiStatus = "offline";
  }
};

const getApiStatusLabel = () => {
  if (state.apiStatus === "online") return "サーバー接続: OK";
  if (state.apiStatus === "offline") return "サーバー接続: 未接続";
  if (state.apiStatus === "error") return "サーバー接続: エラー";
  return "サーバー接続: 確認中";
};

const getApiStatusClass = () => {
  if (state.apiStatus === "online") return "status-pill ok";
  if (state.apiStatus === "offline") return "status-pill offline";
  if (state.apiStatus === "error") return "status-pill error";
  return "status-pill";
};

const getConnectionHelpMessage = () =>
  "サーバーに接続できませんでした。公開サイトではAPIサーバーが必要です。npm run server を実行するか、SHIFT_API_BASE を正しいURLに設定してください。";

const loadPersistedState = () => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  const data = JSON.parse(raw);
  return {
    groups: Array.isArray(data.groups) ? data.groups : [],
    sheets: Array.isArray(data.sheets) ? data.sheets : []
  };
};

const loadRemoteState = async () => {
  if (!state.authToken) return null;
  try {
    return await apiRequest("/api/state");
  } catch (error) {
    state.warningMessage = "サーバーに接続できませんでした。ローカル保存で続行します。";
    openDialog(".warning-dialog");
    return null;
  }
};

const persistState = () => {
  const payload = {
    groups: state.groups,
    sheets: state.sheets
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  if (state.authToken) {
    apiRequest("/api/state", {
      method: "PUT",
      body: JSON.stringify(payload)
    }).catch(() => {
      state.warningMessage = "サーバーへの保存に失敗しました。";
      openDialog(".warning-dialog");
    });
  }
};

const persistedState = loadPersistedState();
const storedToken = localStorage.getItem(AUTH_TOKEN_KEY);
if (storedToken) {
  state.authToken = storedToken;
}

const openShiftVersionWindow = (versionLabel, targetWindow = null) => {
  if (!state.sheet) return;
  const newWindow = targetWindow ?? window.open("", "_blank");
  if (!newWindow) return;
  newWindow.location.href = `about:blank#${versionLabel}`;
  const fixedCells = new Set(state.fixedCells ?? []);
  const requiredDay = state.sheet.days.map((day) => day.requiredDay);
  const requiredNight = state.sheet.days.map((day) => day.requiredNight);
  const dayLabels = state.sheet.days.map((day) => `${day.dateLabel}(${day.weekday})`);
  const dayWeekdays = state.sheet.days.map((day) => day.weekday);
  const staffLimits = state.staff.map((person) => ({
    name: person.name,
    shiftType: person.shiftType,
    dayMin: person.dayMin,
    dayMax: person.dayMax,
    nightMin: person.nightMin,
    nightMax: person.nightMax
  }));
  const staffAvailability = state.staff.map((person) => ({
    availabilityType: person.availabilityType,
    availableWeekdays: person.availableWeekdays
  }));
  const shiftPreferences = state.shiftPreferences;
  const sheetId = state.currentSheetId;
  const rows = state.staff
    .map((person, rowIndex) => {
      const cells = state.sheet.days
        .map((day) => {
          const assignment = state.assignments?.[rowIndex]?.[day.index] || "";
          const off = state.shiftPreferences?.[rowIndex]?.[day.index] === "off";
          const label = off ? "休" : assignment;
          return `
            <td data-row="${rowIndex}" data-col="${day.index}" style="border:1px solid #d1d5db;padding:6px;text-align:center;">
              <div style="display:flex;flex-direction:column;gap:4px;align-items:center;">
                <button class="cell-fix-toggle" data-row="${rowIndex}" data-col="${day.index}">固定</button>
                <select data-action="edit-cell">
                <option value="" ${label === "" ? "selected" : ""}></option>
                <option value="○" ${label === "○" ? "selected" : ""}>○</option>
                <option value="●" ${label === "●" ? "selected" : ""}>●</option>
                <option value="※" ${label === "※" ? "selected" : ""}>※</option>
                <option value="休" ${label === "休" ? "selected" : ""}>休み</option>
                </select>
              </div>
            </td>
          `;
        })
        .join("");
      return `
        <tr>
          <th style="border:1px solid #d1d5db;padding:6px;text-align:left;">${person.name}</th>
          ${cells}
          <td class="summary-col" data-summary="${rowIndex}" style="border:1px solid #d1d5db;padding:6px;text-align:center;">-</td>
        </tr>
      `;
    })
    .join("");
  const headers = state.sheet.days
    .map(
      (day) => {
        return `
          <th data-col="${day.index}" style="border:1px solid #d1d5db;padding:6px;">
            <div class="header-cell">
              <div>
                <div>${day.dateLabel}</div>
                <div class="weekday">${day.weekday}</div>
                <div class="required-counts">日:${day.requiredDay} 夜:${day.requiredNight}</div>
              </div>
              
            </div>
          </th>
        `;
      }
    )
    .join("");
  newWindow.document.write(`
    <html>
      <head>
        <title>シフト結果 ${versionLabel}</title>
        <style>
          body { font-family: "Noto Sans JP", sans-serif; padding: 20px; }
          table { border-collapse: collapse; width: 100%; }
          th { background: #f8fafc; }
          th.shortage-col, td.shortage-col { background: #fee2e2; }
          td.fixed-cell { background: #fef08a; }
          .header-cell { display: flex; flex-direction: column; gap: 6px; }
          .header-cell .weekday { font-size: 12px; color: #64748b; }
          .header-cell .required-counts { font-size: 11px; color: #475569; }
          .cell-fix-toggle {
            border: 1px solid #cbd5f5;
            background: #fff;
            border-radius: 999px;
            font-size: 12px;
            padding: 2px 6px;
            cursor: pointer;
          }
          .cell-fix-toggle.active { background: #f59e0b; color: #1f2937; border-color: #f59e0b; }
          .cell-fix-toggle[disabled] { opacity: 0.6; cursor: not-allowed; }
          .legend { display: flex; gap: 12px; margin: 12px 0; font-size: 12px; }
          .legend-item { display: flex; align-items: center; gap: 6px; }
          .legend-swatch { width: 12px; height: 12px; border-radius: 3px; border: 1px solid #e2e8f0; }
          .legend-fixed { background: #fef08a; }
          .legend-shortage { background: #fee2e2; }
          .shift-result-actions { display: flex; justify-content: flex-end; margin: 8px 0 12px; }
          .shift-result-actions button {
            border: 1px solid #cbd5f5;
            background: #fff;
            border-radius: 8px;
            padding: 6px 12px;
            cursor: pointer;
          }
          select { padding: 4px 6px; border-radius: 6px; border: 1px solid #cbd5f5; }
          .summary-col { background: #f1f5f9; }
          .warning-panel { margin-top: 16px; padding: 12px; border: 1px solid #fca5a5; border-radius: 8px; background: #fef2f2; }
          .warning-panel h2 { margin: 0 0 8px; font-size: 14px; }
          .warning-panel ul { margin: 0; padding-left: 18px; font-size: 13px; }
          .print-modal {
            position: fixed;
            inset: 0;
            background: rgba(15, 23, 42, 0.45);
            display: none;
            align-items: center;
            justify-content: center;
            z-index: 10;
          }
          .print-modal.is-open { display: flex; }
          .print-modal-content {
            background: #fff;
            border-radius: 12px;
            padding: 16px;
            width: min(360px, 90vw);
            box-shadow: 0 12px 30px rgba(15, 23, 42, 0.2);
          }
          .print-modal-actions {
            display: flex;
            justify-content: flex-end;
            gap: 8px;
            margin-top: 12px;
          }
          .print-modal-actions button {
            border: 1px solid #cbd5f5;
            background: #fff;
            border-radius: 8px;
            padding: 6px 12px;
            cursor: pointer;
          }
        </style>
      </head>
      <body>
        <h1>シフト結果 ${versionLabel}</h1>
        <p>${state.sheet.year}年${state.sheet.month}月</p>
        <div class="legend">
          <div class="legend-item"><span class="legend-swatch legend-fixed"></span>黄: このスタッフは固定</div>
          <div class="legend-item"><span class="legend-swatch legend-shortage"></span>赤: これじゃ人が足りない</div>
        </div>
        <div class="shift-result-actions">
          <button id="save-shift">保存する</button>
          <button id="print-shift">印刷する</button>
          <button id="regenerate-shift">作り直す</button>
        </div>
        <table>
          <thead>
            <tr>
              <th style="border:1px solid #d1d5db;padding:6px;text-align:left;">氏名</th>
              ${headers}
              <th class="summary-col" style="border:1px solid #d1d5db;padding:6px;">合計</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
        <section class="warning-panel">
          <h2>エラー/注意</h2>
          <ul id="warning-list"></ul>
        </section>
        <div class="print-modal" id="print-modal">
          <div class="print-modal-content">
            <p>シフトがまだ完成していません。印刷しますか？</p>
            <div class="print-modal-actions">
              <button id="cancel-print">戻る</button>
              <button id="force-print">それでも印刷</button>
            </div>
          </div>
        </div>
        <script>
          const requiredDay = ${JSON.stringify(requiredDay)};
          const requiredNight = ${JSON.stringify(requiredNight)};
          const dayLabels = ${JSON.stringify(dayLabels)};
          const dayWeekdays = ${JSON.stringify(dayWeekdays)};
          const staffLimits = ${JSON.stringify(staffLimits)};
          const staffAvailability = ${JSON.stringify(staffAvailability)};
          const shiftPreferences = ${JSON.stringify(shiftPreferences)};
          const fixedCells = new Set(${JSON.stringify(Array.from(fixedCells))});
          const sheetId = ${JSON.stringify(sheetId)};
          let currentWarnings = [];

          const getNumeric = (value) => {
            if (value === null || value === undefined) return null;
            if (typeof value === 'string' && value.trim() === '') return null;
            const number = Number(value);
            return Number.isFinite(number) && number >= 0 ? number : null;
          };

          const updateColumnClasses = (index, { shortage }) => {
            const header = document.querySelector(\`thead th[data-col="\${index}"]\`);
            const cells = document.querySelectorAll(\`tbody td[data-col="\${index}"]\`);
            const applyClasses = (el) => {
              if (!el) return;
              el.classList.remove('shortage-col');
              if (shortage) el.classList.add('shortage-col');
            };
            applyClasses(header);
            cells.forEach((cell) => applyClasses(cell));
          };

          const cellKey = (rowIndex, colIndex) => \`\${rowIndex}-\${colIndex}\`;

          const updateCellFixedState = (rowIndex, colIndex) => {
            const key = cellKey(rowIndex, colIndex);
            const cell = document.querySelector(\`td[data-row="\${rowIndex}"][data-col="\${colIndex}"]\`);
            if (!cell) return;
            const button = cell.querySelector('.cell-fix-toggle');
            const select = cell.querySelector('select[data-action="edit-cell"]');
            const isFixed = fixedCells.has(key);
            if (button) {
              button.classList.toggle('active', isFixed);
              button.textContent = isFixed ? '固定中' : '固定';
            }
            if (select) {
              select.disabled = isFixed;
            }
            cell.classList.toggle('fixed-cell', isFixed);
          };

          const updateRowSummary = (row) => {
            const selects = row.querySelectorAll('select[data-action="edit-cell"]');
            let dayCount = 0;
            let nightCount = 0;
            selects.forEach((select) => {
              if (select.value === "○") dayCount += 1;
              if (select.value === "●") nightCount += 1;
            });
            const summary = row.querySelector('[data-summary]');
            if (summary) {
              summary.textContent = \`日:\${dayCount} / 夜:\${nightCount}\`;
            }
            return { dayCount, nightCount };
          };

          const collectCounts = () => {
            const rows = document.querySelectorAll('tbody tr');
            const dayCounts = Array(requiredDay.length).fill(0);
            const nightCounts = Array(requiredDay.length).fill(0);
            const rowCounts = [];
            rows.forEach((row, rowIndex) => {
              const rowSummary = updateRowSummary(row);
              rowCounts[rowIndex] = rowSummary;
              const selects = row.querySelectorAll('select[data-action="edit-cell"]');
              selects.forEach((select) => {
                const value = select.value;
                const cell = select.closest('td');
                if (!cell) return;
                const colIndex = Number(cell.dataset.col);
                if (Number.isNaN(colIndex)) return;
                if (value === "○") dayCounts[colIndex] += 1;
                if (value === "●") nightCounts[colIndex] += 1;
              });
            });
            return { dayCounts, nightCounts, rowCounts };
          };

          const applyNightNextDay = (target) => {
            if (target.value !== "●") return;
            const cell = target.closest('td');
            if (!cell) return;
            const row = target.closest('tr');
            if (!row) return;
            const colIndex = Number(cell.dataset.col);
            const nextCell = row.querySelector(\`td[data-col="\${colIndex + 1}"] select[data-action="edit-cell"]\`);
            if (!nextCell || nextCell.disabled) return;
            nextCell.value = "※";
          };

          const isStaffAvailableForDay = (rowIndex, colIndex) => {
            const availability = staffAvailability[rowIndex];
            if (!availability) return true;
            const weekday = dayWeekdays[colIndex];
            if (availability.availabilityType === "weekday") {
              return weekday !== "土" && weekday !== "日";
            }
            if (availability.availabilityType === "specific") {
              return (
                Array.isArray(availability.availableWeekdays) &&
                availability.availableWeekdays.includes(weekday)
              );
            }
            return true;
          };

          const isShiftTypeAllowed = (rowIndex, shift) => {
            const type = staffLimits[rowIndex]?.shiftType;
            if (shift === "day") return type !== "夜専";
            if (shift === "night") return type !== "昼専";
            return true;
          };

          const getCellValue = (rowIndex, colIndex) => {
            const select = document.querySelector(
              'tbody td[data-row="' +
                rowIndex +
                '"][data-col="' +
                colIndex +
                '"] select[data-action="edit-cell"]'
            );
            return select?.value ?? "";
          };

          const buildShortageReasons = (colIndex, rowCounts) => {
            const reasons = {
              day: {
                available: 0,
                off: 0,
                unavailable: 0,
                assigned: 0,
                shiftType: 0,
                maxed: 0
              },
              night: {
                available: 0,
                off: 0,
                unavailable: 0,
                assigned: 0,
                shiftType: 0,
                maxed: 0
              }
            };
            staffAvailability.forEach((_, rowIndex) => {
              const cellValue = getCellValue(rowIndex, colIndex);
              const isOff = shiftPreferences?.[rowIndex]?.[colIndex] === "off";
              if (isOff || cellValue === "休") {
                reasons.day.off += 1;
                reasons.night.off += 1;
                return;
              }
              if (cellValue === "○" || cellValue === "●" || cellValue === "※") {
                reasons.day.assigned += 1;
                reasons.night.assigned += 1;
                return;
              }
              if (!isStaffAvailableForDay(rowIndex, colIndex)) {
                reasons.day.unavailable += 1;
                reasons.night.unavailable += 1;
                return;
              }
              const counts = rowCounts[rowIndex] || { dayCount: 0, nightCount: 0 };
              const dayMax = getNumeric(staffLimits[rowIndex]?.dayMax);
              const nightMax = getNumeric(staffLimits[rowIndex]?.nightMax);

              if (!isShiftTypeAllowed(rowIndex, "day")) {
                reasons.day.shiftType += 1;
              } else if (dayMax !== null && counts.dayCount >= dayMax) {
                reasons.day.maxed += 1;
              } else {
                reasons.day.available += 1;
              }

              if (!isShiftTypeAllowed(rowIndex, "night")) {
                reasons.night.shiftType += 1;
              } else if (nightMax !== null && counts.nightCount >= nightMax) {
                reasons.night.maxed += 1;
              } else {
                reasons.night.available += 1;
              }
            });
            return reasons;
          };

          const updateWarnings = () => {
            const { dayCounts, nightCounts, rowCounts } = collectCounts();
            const warnings = [];
            requiredDay.forEach((required, index) => {
              const shortage =
                (dayCounts[index] < required || nightCounts[index] < requiredNight[index]);
              updateColumnClasses(index, {
                shortage
              });
              if (shortage) {
                const reasons = buildShortageReasons(index, rowCounts);
                warnings.push(\`\${dayLabels[index]}: 日勤 \${dayCounts[index]}/\${required}, 夜勤 \${nightCounts[index]}/\${requiredNight[index]} が不足\`);
                warnings.push(
                  \`理由(日勤): 勤務可能\${reasons.day.available}名 / 休み希望\${reasons.day.off}名 / 曜日不可\${reasons.day.unavailable}名 / 当日割当済み\${reasons.day.assigned}名 / 勤務タイプ不可\${reasons.day.shiftType}名 / 上限到達\${reasons.day.maxed}名\`
                );
                warnings.push(
                  \`理由(夜勤): 勤務可能\${reasons.night.available}名 / 休み希望\${reasons.night.off}名 / 曜日不可\${reasons.night.unavailable}名 / 当日割当済み\${reasons.night.assigned}名 / 勤務タイプ不可\${reasons.night.shiftType}名 / 上限到達\${reasons.night.maxed}名\`
                );
              }
            });
            staffLimits.forEach((limit, index) => {
              const rowSummary = rowCounts[index] || { dayCount: 0, nightCount: 0 };
              const dayMin = getNumeric(limit.dayMin);
              const dayMax = getNumeric(limit.dayMax);
              const nightMin = getNumeric(limit.nightMin);
              const nightMax = getNumeric(limit.nightMax);
              if (dayMin !== null && rowSummary.dayCount < dayMin) {
                warnings.push(\`\${limit.name}: 日勤が少なすぎます (\${rowSummary.dayCount}/\${dayMin})\`);
              }
              if (dayMax !== null && rowSummary.dayCount > dayMax) {
                warnings.push(\`\${limit.name}: 日勤が多すぎます (\${rowSummary.dayCount}/\${dayMax})\`);
              }
              if (nightMin !== null && rowSummary.nightCount < nightMin) {
                warnings.push(\`\${limit.name}: 夜勤が少なすぎます (\${rowSummary.nightCount}/\${nightMin})\`);
              }
              if (nightMax !== null && rowSummary.nightCount > nightMax) {
                warnings.push(\`\${limit.name}: 夜勤が多すぎます (\${rowSummary.nightCount}/\${nightMax})\`);
              }
            });
            const list = document.getElementById('warning-list');
            if (list) {
              list.innerHTML = warnings.length
                ? warnings.map((warning) => \`<li>\${warning}</li>\`).join('')
                : '<li>現在、エラーはありません。</li>';
            }
            currentWarnings = warnings;
          };

          const enforceNightRests = () => {
            const rows = document.querySelectorAll('tbody tr');
            rows.forEach((row) => {
              const cells = row.querySelectorAll('td[data-col] select[data-action="edit-cell"]');
              cells.forEach((select) => {
                if (select.value !== "●") return;
                applyNightNextDay(select);
              });
            });
          };

          document.addEventListener('change', (event) => {
            const target = event.target;
            if (!(target instanceof HTMLSelectElement)) return;
            if (!target.matches('[data-action="edit-cell"]')) return;
            const cell = target.closest('td');
            if (cell) {
              const rowIndex = Number(cell.dataset.row);
              const colIndex = Number(cell.dataset.col);
              if (
                (target.value === "○" || target.value === "●") &&
                !isStaffAvailableForDay(rowIndex, colIndex)
              ) {
                alert("注意！このスタッフはこの曜日に勤務できません。");
                target.value = "";
              }
            }
            applyNightNextDay(target);
            updateWarnings();
          });

          document.addEventListener('click', (event) => {
            const target = event.target;
            if (!(target instanceof HTMLButtonElement)) return;
            if (target.matches('#save-shift')) {
              const opener = window.opener;
              if (!opener || typeof opener.saveShiftResult !== 'function') return;
              const rows = document.querySelectorAll('tbody tr');
              const assignments = Array.from(rows).map((row) => {
                const selects = row.querySelectorAll('select[data-action="edit-cell"]');
                return Array.from(selects).map((select) => select.value);
              });
              opener.saveShiftResult({
                sheetId,
                assignments,
                fixedCells: Array.from(fixedCells),
                requiredDay,
                requiredNight
              });
              if (typeof opener.notifyShiftSaved === 'function') {
                opener.notifyShiftSaved();
              }
              window.close();
              return;
            }
            if (target.matches('#print-shift')) {
              const modal = document.getElementById('print-modal');
              if (currentWarnings.length > 0 && modal) {
                modal.classList.add('is-open');
              } else {
                window.print();
              }
              return;
            }
            if (target.matches('#cancel-print')) {
              const modal = document.getElementById('print-modal');
              if (modal) modal.classList.remove('is-open');
              return;
            }
            if (target.matches('#force-print')) {
              const modal = document.getElementById('print-modal');
              if (modal) modal.classList.remove('is-open');
              window.print();
              return;
            }
            if (target.matches('#regenerate-shift')) {
              const opener = window.opener;
              if (!opener || typeof opener.regenerateShiftVersion !== 'function') return;
              const versionLabel = opener.regenerateShiftVersion();
              if (!versionLabel) return;
              const nextWindow = window.open('', '_blank');
              if (!nextWindow || typeof opener.openShiftVersionWindow !== 'function') return;
              opener.openShiftVersionWindow(versionLabel, nextWindow);
              return;
            }
            if (target.matches('.cell-fix-toggle')) {
              const rowIndex = Number(target.dataset.row);
              const colIndex = Number(target.dataset.col);
              if (Number.isNaN(rowIndex) || Number.isNaN(colIndex)) return;
              const key = cellKey(rowIndex, colIndex);
              if (fixedCells.has(key)) {
                fixedCells.delete(key);
              } else {
                fixedCells.add(key);
              }
              updateCellFixedState(rowIndex, colIndex);
              updateWarnings();
            }
          });

          requiredDay.forEach((_, colIndex) => {
            staffLimits.forEach((_, rowIndex) => {
              updateCellFixedState(rowIndex, colIndex);
            });
          });
          enforceNightRests();
          updateWarnings();
        </script>
      </body>
    </html>
  `);
  newWindow.document.close();
};

window.openShiftVersionWindow = openShiftVersionWindow;

window.regenerateShiftVersion = () => {
  if (!state.sheet) return null;
  state.sheet.generatedAt = new Date();
  applyAssignments({ randomize: true });
  const versionLabel = `ver${state.shiftVersions.length + 1}`;
  state.shiftVersions = [...state.shiftVersions, versionLabel];
  return versionLabel;
};

const renderSidePanel = () => `
  <aside class="side-panel">
    ${
      state.view === "sheet"
        ? `
      <section class="shift-action">
        <h2>シフト作成</h2>
        <button class="ghost" id="reset-sheet" ${
          state.ownerMode ? "" : "disabled"
        }>シフト表をリセット</button>
        <div class="shift-limit-controls">
          <label>
            最大日勤
            <input id="max-day" type="number" min="0" value="${state.sheet?.maxDay ?? 20}" ${
              state.ownerMode ? "" : "disabled"
            } />
          </label>
          <label>
            最大夜勤
            <input id="max-night" type="number" min="0" value="${state.sheet?.maxNight ?? 10}" ${
              state.ownerMode ? "" : "disabled"
            } />
          </label>
        </div>
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
      <span class="${getApiStatusClass()}">${getApiStatusLabel()}</span>
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
        <button class="ghost" id="go-register">新規登録</button>
        <button class="ghost" id="enter-guest">公開モードで閲覧</button>
      </div>
      <p class="helper-text">
        ログインできない場合は公開モードで閲覧できます（編集はできません）。
      </p>
      <p class="helper-text">
        ${state.apiStatus === "offline" ? getConnectionHelpMessage() : ""}
      </p>
      <p class="helper-text">別端末でも使うにはサーバー接続が必要です。</p>
    </section>
  </div>
`;

const renderRegister = () => `
  <div class="page login">
    <header class="app-header">
      <div>
        <p class="eyebrow">バイトシフト調整</p>
        <h1>新規登録</h1>
      </div>
      <div class="header-actions">
        <span class="${getApiStatusClass()}">${getApiStatusLabel()}</span>
        <button class="ghost" id="back-to-login">ログインへ戻る</button>
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
        <button class="primary" id="register-owner">登録する</button>
      </div>
      <p class="helper-text">
        ${state.apiStatus === "offline" ? getConnectionHelpMessage() : ""}
      </p>
      <p class="helper-text">登録後、そのままログインして同期を開始します。</p>
    </section>
  </div>
`;

const renderStaffRows = () => {
  return state.staff
    .map(
      (person, rowIndex) => `
        <tr data-row="${rowIndex}">
          <th class="name-cell">
            <div class="name-block">
              <div class="name-row">
                <div class="name">${person.name}</div>
                <button class="settings-button icon-button" data-row="${rowIndex}" ${
                  state.ownerMode ? "" : "disabled"
                } aria-label="スタッフ設定">⚙</button>
              </div>
              <div class="tags">
                ${person.shiftType ? `<span class="tag">${person.shiftType}</span>` : ""}
                ${person.ward ? `<span class="tag">${person.ward}</span>` : ""}
                ${getAvailabilityTag(person) ? `<span class="tag">${getAvailabilityTag(person)}</span>` : ""}
              </div>
            </div>
          </th>
          ${state.sheet
            ? state.sheet.days
                .map((_, colIndex) => {
                  const preference =
                    state.shiftPreferences?.[rowIndex]?.[colIndex] || "";
                  const assigned = state.assignments?.[rowIndex]?.[colIndex] || "";
                  return `
                    <td class="shift-cell ${preference ? "off" : ""} ${
                      assigned ? "assigned" : ""
                    }" data-row="${rowIndex}" data-col="${colIndex}">
                      <div class="cell-content">
                        <button class="rest-button ${preference ? "active" : ""}" ${
                          state.ownerMode ? "" : "disabled"
                        } aria-pressed="${preference ? "true" : "false"}">休み</button>
                        <div class="assigned-shift" aria-live="polite"></div>
                      </div>
                    </td>
                  `;
                })
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
              <input id="group-name" class="group-name-input" type="text" value="${state.groupDraftName}" list="group-suggestions" required />
            </label>
            <button class="primary" id="save-group" ${
              state.ownerMode ? "" : "disabled"
            }>勤務者登録を保存</button>
            <button class="ghost" id="add-staff" ${
              state.ownerMode ? "" : "disabled"
            }>勤務者を追加</button>
          </div>
          <span class="helper-text">グループ名を決めて勤務者を登録してください。</span>
        </section>

        <section class="sheet">
          <table class="shift-table group-table" aria-label="勤務者登録一覧">
            <thead>
              <tr>
                <th class="corner-cell">氏名</th>
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
                          <div class="row-actions">
                            <button class="icon-button action-button" data-action="move-up" data-row="${rowIndex}" ${
                              state.ownerMode ? "" : "disabled"
                            } aria-label="上へ">▲</button>
                            <button class="icon-button action-button" data-action="move-down" data-row="${rowIndex}" ${
                              state.ownerMode ? "" : "disabled"
                            } aria-label="下へ">▼</button>
                            <button class="icon-button settings-button" data-row="${rowIndex}" ${
                              state.ownerMode ? "" : "disabled"
                            } aria-label="編集">⚙</button>
                          </div>
                        </div>
                      </th>
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

const renderGroupList = () => `
  <div class="page">
    <header class="app-header">
      <div>
        <p class="eyebrow">グループ一覧</p>
        <h1>${state.ownerMode ? state.owner.email || "シフト管理" : "公開モード"}</h1>
      </div>
      <div class="header-actions">
        ${state.ownerMode
          ? `<button class="ghost" id="logout">ログアウト</button>`
          : `<button class="ghost" id="back-to-login">ログインへ戻る</button>`}
        ${!state.ownerMode ? `<span class="mode-pill">閲覧専用</span>` : ""}
      </div>
    </header>

    <div class="layout">
      <div>
        <section class="controls">
          <div class="control-group">
            <button class="primary" id="create-group" ${
              state.ownerMode ? "" : "disabled"
            }>グループを新規作成</button>
            <button class="accent" id="new-sheet" ${
              state.ownerMode ? "" : "disabled"
            }>シフトシートを作成する</button>
          </div>
          <span class="helper-text">${
            state.ownerMode
              ? "グループを選んで編集・シフト作成ができます。"
              : "公開モードでは閲覧のみ可能です。編集にはログインが必要です。"
          }</span>
        </section>

        <section class="sheet-list">
          ${state.groups.length === 0
            ? `<p class="helper-text">まだグループがありません。</p>`
            : state.groups
                .map(
                  (group) => `
                    <div class="sheet-card">
                      <div>
                        <h3>${group.name}</h3>
                        <p class="sheet-meta">登録人数: ${group.staff.length}名</p>
                      </div>
                      <div class="sheet-actions">
                        <button class="ghost" data-action="edit-group" data-name="${
                          group.name
                        }" ${state.ownerMode ? "" : "disabled"}>編集</button>
                      </div>
                    </div>
                  `
                )
                .join("")}
        </section>

        <section class="sheet-list">
          <h3 class="section-title">作成済みシフト</h3>
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

const renderDashboard = () => renderGroupList();

const renderSheet = () => {
  if (!state.sheet) return "";
  const generatedAt = state.sheet.generatedAt
    ? `（更新: ${formatTimestamp(state.sheet.generatedAt)}）`
    : "";
  const headerCells = state.sheet.days
    .map(
      (day) => `
        <th class="day-cell ${
          state.blockedDays.has(day.index) ? "blocked" : state.sheet.warnings?.includes(day.index) ? "warning" : ""
        }" data-col="${day.index}">
          <div class="date-line">
            <div>
              <div class="date">${day.dateLabel}</div>
              <div class="weekday">${day.weekday}</div>
            </div>
            <button class="fix-button icon-button" data-col="${day.index}" ${
              state.ownerMode ? "" : "disabled"
            }>
              ${state.fixedDays.has(day.index) ? "固定" : "固定"}
            </button>
          </div>
        </th>
      `
    )
    .join("");

  const requiredInputs = state.sheet.days
    .map(
      (day) => `
        <th class="required-cell ${
          state.blockedDays.has(day.index) ? "blocked" : state.sheet.warnings?.includes(day.index) ? "warning" : ""
        }">
          <div class="required-row">
            <span class="required-label">日勤</span>
            <input class="required-input" type="number" min="0" value="${
              day.requiredDay
            }" data-col="${day.index}" data-shift="day" ${
              state.ownerMode ? "" : "disabled"
            } />
          </div>
          <div class="required-row">
            <span class="required-label">夜勤</span>
            <input class="required-input" type="number" min="0" value="${
              day.requiredNight
            }" data-col="${day.index}" data-shift="night" ${
              state.ownerMode ? "" : "disabled"
            } />
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
          ${!state.ownerMode ? `<span class="mode-pill">閲覧専用</span>` : ""}
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
        <button type="button" class="ghost" data-action="delete-staff">削除</button>
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

const renderConfirmDialog = () => `
  <dialog class="confirm-dialog">
    <form method="dialog" class="settings-content">
      <header>
        <h2>確認</h2>
        <button type="button" class="close-button" data-action="close">×</button>
      </header>
      <p class="warning-text">${state.confirmMessage}</p>
      <div class="panel-actions">
        <button type="button" class="ghost" data-action="close">戻る</button>
        <button type="submit" class="primary" data-action="confirm-shift">作成する</button>
      </div>
    </form>
  </dialog>
`;

const renderApp = () => {
  let content = "";
  if (state.view === "login") {
    content = renderLogin();
  } else if (state.view === "register") {
    content = renderRegister();
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
    ${renderConfirmDialog()}
  `;
};

const renderAppPreserveScroll = () => {
  const sheet = document.querySelector(".sheet");
  const sheetScrollLeft = sheet ? sheet.scrollLeft : 0;
  const sheetScrollTop = sheet ? sheet.scrollTop : 0;
  const windowScrollX = window.scrollX;
  const windowScrollY = window.scrollY;
  renderApp();
  const nextSheet = document.querySelector(".sheet");
  if (nextSheet) {
    nextSheet.scrollLeft = sheetScrollLeft;
    nextSheet.scrollTop = sheetScrollTop;
  }
  window.scrollTo(windowScrollX, windowScrollY);
};

window.saveShiftResult = ({ sheetId, assignments, fixedCells, requiredDay, requiredNight }) => {
  if (!sheetId) return;
  const sheetIndex = state.sheets.findIndex((item) => item.id === sheetId);
  if (sheetIndex === -1) return;
  const sheet = state.sheets[sheetIndex];
  const updatedSheet = {
    ...sheet,
    savedAssignments: assignments,
    savedFixedCells: fixedCells,
    savedRequiredDay: requiredDay,
    savedRequiredNight: requiredNight,
    generatedAt: new Date()
  };
  state.sheets = [
    ...state.sheets.slice(0, sheetIndex),
    updatedSheet,
    ...state.sheets.slice(sheetIndex + 1)
  ];
  if (state.currentSheetId === sheetId && state.sheet) {
    state.assignments = assignments;
    state.fixedCells = new Set(fixedCells ?? []);
    state.sheet.days.forEach((day, index) => {
      if (Array.isArray(requiredDay) && requiredDay[index] !== undefined) {
        day.requiredDay = requiredDay[index];
      }
      if (Array.isArray(requiredNight) && requiredNight[index] !== undefined) {
        day.requiredNight = requiredNight[index];
      }
    });
    state.sheet.generatedAt = updatedSheet.generatedAt;
  }
  persistState();
  renderApp();
};

window.notifyShiftSaved = () => {
  state.warningMessage = "保存が完了しました。シフト表に戻ります。";
  state.view = "sheet";
  renderApp();
  const dialog = document.querySelector(".warning-dialog");
  if (dialog instanceof HTMLDialogElement) {
    dialog.showModal();
  }
};

const resetSavedSheet = (sheetId) => {
  if (!sheetId) return;
  const sheetIndex = state.sheets.findIndex((item) => item.id === sheetId);
  if (sheetIndex === -1) return;
  const sheet = state.sheets[sheetIndex];
  const updatedSheet = {
    ...sheet,
    savedAssignments: [],
    savedFixedCells: [],
    generatedAt: null
  };
  state.sheets = [
    ...state.sheets.slice(0, sheetIndex),
    updatedSheet,
    ...state.sheets.slice(sheetIndex + 1)
  ];
  if (state.currentSheetId === sheetId && state.sheet) {
    state.assignments = state.staff.map(() =>
      Array(state.sheet.days.length).fill("")
    );
    state.fixedCells = new Set();
    state.fixedDays = new Set();
    state.blockedDays = new Set();
    state.sheet.warnings = [];
    state.sheet.generatedAt = null;
  }
  persistState();
  renderApp();
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
  const persisted = loadPersistedState();
  state.sheets = persisted?.sheets ?? [];
  state.groups = persisted?.groups ?? [];
  state.groupDraftName = "";
  state.currentSheetId = null;
  state.fixedDays = new Set();
  state.fixedCells = new Set();
  state.blockedDays = new Set();
  state.shiftPreferences = [];
  state.assignments = [];
  state.shiftVersions = [];
  state.warningMessage = "入力内容を確認してください。";
  state.confirmMessage = "";
  state.pendingShift = false;
  state.selectedGroup = "";
  renderApp();
};

const moveStaffRow = (rowIndex, direction) => {
  if (!Number.isFinite(rowIndex)) return;
  const targetIndex = rowIndex + direction;
  if (targetIndex < 0 || targetIndex >= state.staff.length) return;
  const nextStaff = [...state.staff];
  const [moved] = nextStaff.splice(rowIndex, 1);
  nextStaff.splice(targetIndex, 0, moved);
  state.staff = nextStaff;
  renderApp();
};

const deleteStaffRow = (rowIndex) => {
  if (!Number.isFinite(rowIndex)) return;
  if (state.staff.length <= 1) {
    state.warningMessage = "勤務者は最低1人必要です。";
    openDialog(".warning-dialog");
    return;
  }
  state.staff = state.staff.filter((_, index) => index !== rowIndex);
  renderApp();
};

const applyAssignments = ({ randomize } = {}) => {
  if (!state.sheet) return;
  const warnings = [];
  const blocked = new Set();
  const cells = Array.from(document.querySelectorAll(".shift-cell"));
  const dayCounts = Array(state.staff.length).fill(0);
  const nightCounts = Array(state.staff.length).fill(0);
  const staffLimits = state.staff.map((person) => ({
    shiftType: person.shiftType,
    dayMin: person.dayMin,
    dayMax: person.dayMax,
    nightMin: person.nightMin,
    nightMax: person.nightMax
  }));

  const parseLimit = (value) => {
    if (value === "" || value === null || value === undefined) return null;
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 ? number : null;
  };

  const meetsLegacyMax = (rowIndex, shift) => {
    const limits = staffLimits[rowIndex];
    if (!limits) return false;
    if (shift === "day") {
      const max = parseLimit(limits.dayMax);
      return max !== null && dayCounts[rowIndex] >= max;
    }
    const max = parseLimit(limits.nightMax);
    return max !== null && nightCounts[rowIndex] >= max;
  };

  const meetsCombinedMax = (rowIndex, shift) => {
    const dayCount = dayCounts[rowIndex];
    const nightCount = nightCounts[rowIndex];
    const maxDay = state.sheet?.maxDay ?? 20;
    const maxNight = state.sheet?.maxNight ?? 10;
    const maxTotal = state.sheet?.maxTotal ?? maxDay;
    const weightedTotal = nightCount * 2 + dayCount;
    if (shift === "night") {
      if (nightCount >= maxNight) return true;
      return weightedTotal + 2 > maxTotal;
    }
    if (dayCount >= maxDay) return true;
    return weightedTotal + 1 > maxTotal;
  };

  const isOverMax = (rowIndex, shift) => {
    return meetsLegacyMax(rowIndex, shift) || meetsCombinedMax(rowIndex, shift);
  };

  const isShiftTypeAllowed = (rowIndex, shift) => {
    const type = staffLimits[rowIndex]?.shiftType;
    if (shift === "day") return type !== "夜専";
    if (shift === "night") return type !== "昼専";
    return true;
  };

  const sortCandidates = (list, shift) => {
    return list.sort((a, b) => {
      const limitsA = staffLimits[a.rowIndex];
      const limitsB = staffLimits[b.rowIndex];
      if (shift === "night") {
        const rankNight = (limits) => {
          if (limits?.shiftType === "夜専") return 0;
          if (limits?.shiftType === "どちらも") return 1;
          return 2;
        };
        const rankA = rankNight(limitsA);
        const rankB = rankNight(limitsB);
        if (rankA !== rankB) return rankA - rankB;
      }
      if (shift === "day") {
        const aDayOnly = limitsA?.shiftType === "昼専";
        const bDayOnly = limitsB?.shiftType === "昼専";
        if (aDayOnly !== bDayOnly) return aDayOnly ? -1 : 1;
      }
      const minA =
        shift === "day" ? parseLimit(limitsA?.dayMin) : parseLimit(limitsA?.nightMin);
      const minB =
        shift === "day" ? parseLimit(limitsB?.dayMin) : parseLimit(limitsB?.nightMin);
      const countA = shift === "day" ? dayCounts[a.rowIndex] : nightCounts[a.rowIndex];
      const countB = shift === "day" ? dayCounts[b.rowIndex] : nightCounts[b.rowIndex];
      const belowMinA = minA !== null && countA < minA;
      const belowMinB = minB !== null && countB < minB;
      if (belowMinA !== belowMinB) return belowMinA ? -1 : 1;
      return countA - countB;
    });
  };

  cells.forEach((cell) => {
    cell.classList.remove("assigned");
    const label = cell.querySelector(".assigned-shift");
    if (label) label.textContent = "";
  });
  state.assignments = state.staff.map(() => Array(state.sheet.days.length).fill(""));

  const buildAvailable = (day) => {
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
      const value = state.shiftPreferences?.[rowIndex]?.[day.index] || "";
      if (value === "off") return;
      if (isShiftTypeAllowed(rowIndex, "day") && !isOverMax(rowIndex, "day")) {
        availableDay.push({ cell, rowIndex });
      }
      if (isShiftTypeAllowed(rowIndex, "night") && !isOverMax(rowIndex, "night")) {
        availableNight.push({ cell, rowIndex });
      }
    });

    if (randomize) {
      availableDay.sort(() => Math.random() - 0.5);
      availableNight.sort(() => Math.random() - 0.5);
    }

    return { availableDay, availableNight };
  };

  const getAssignedNightWards = (dayIndex) => {
    const wards = new Set();
    const columnCells = cells.filter(
      (cell) => Number(cell.dataset.col) === dayIndex
    );
    columnCells.forEach((cell) => {
      const assignedLabel = cell.querySelector(".assigned-shift");
      if (!assignedLabel || assignedLabel.textContent !== "●") return;
      const rowIndex = Number(cell.dataset.row);
      const ward = state.staff[rowIndex]?.ward;
      if (ward) wards.add(ward);
    });
    return wards;
  };

  const assign = (cellsToUse, required, label, shift) => {
    let count = 0;
    const assignedNightWards =
      shift === "night" ? getAssignedNightWards(day.index) : new Set();
    const sortedCandidates = sortCandidates(cellsToUse, shift);
    for (const entry of sortedCandidates) {
      if (count >= required) break;
      if (isOverMax(entry.rowIndex, shift)) continue;
      if (shift === "night") {
        const ward = state.staff[entry.rowIndex]?.ward;
        if (ward && assignedNightWards.has(ward)) continue;
        if (ward) assignedNightWards.add(ward);
      }
      const assignedLabel = entry.cell.querySelector(".assigned-shift");
      if (assignedLabel && assignedLabel.textContent) continue;
      assignedLabel.textContent = label;
      entry.cell.classList.add("assigned");
      const rowIndex = entry.rowIndex;
      if (!Number.isNaN(rowIndex)) {
        state.assignments[rowIndex][day.index] = label;
      }
      if (shift === "day") {
        dayCounts[rowIndex] += 1;
      } else {
        nightCounts[rowIndex] += 1;
      }
      count += 1;
    }
    return count;
  };

  const assignRelaxed = (cellsToUse, required, label, shift) => {
    let count = 0;
    const assignedNightWards =
      shift === "night" ? getAssignedNightWards(day.index) : new Set();
    const sortedCandidates = sortCandidates(cellsToUse, shift);
    for (const entry of sortedCandidates) {
      if (count >= required) break;
      if (shift === "night") {
        const ward = state.staff[entry.rowIndex]?.ward;
        if (ward && assignedNightWards.has(ward)) continue;
        if (ward) assignedNightWards.add(ward);
      }
      const assignedLabel = entry.cell.querySelector(".assigned-shift");
      if (assignedLabel && assignedLabel.textContent) continue;
      assignedLabel.textContent = label;
      entry.cell.classList.add("assigned");
      const rowIndex = entry.rowIndex;
      if (!Number.isNaN(rowIndex)) {
        state.assignments[rowIndex][day.index] = label;
      }
      if (shift === "day") {
        dayCounts[rowIndex] += 1;
      } else {
        nightCounts[rowIndex] += 1;
      }
      count += 1;
    }
    return count;
  };

  const assignExtras = (cellsToUse, label, shift) => {
    const assignedNightWards = new Set();
    const sortedCandidates = sortCandidates(cellsToUse, shift);
    for (const entry of sortedCandidates) {
      if (isOverMax(entry.rowIndex, shift)) continue;
      if (shift === "night") {
        const ward = state.staff[entry.rowIndex]?.ward;
        if (ward && assignedNightWards.has(ward)) continue;
        if (ward) assignedNightWards.add(ward);
      }
      const assignedLabel = entry.cell.querySelector(".assigned-shift");
      if (assignedLabel && assignedLabel.textContent) continue;
      assignedLabel.textContent = label;
      entry.cell.classList.add("assigned");
      const rowIndex = entry.rowIndex;
      if (!Number.isNaN(rowIndex)) {
        state.assignments[rowIndex][day.index] = label;
      }
      if (shift === "day") {
        dayCounts[rowIndex] += 1;
      } else {
        nightCounts[rowIndex] += 1;
      }
    }
  };

  const assignedNights = new Map();

  state.sheet.days.forEach((day) => {
    if (state.fixedDays.has(day.index)) return;
    const { availableNight } = buildAvailable(day);
    let nightCount = assign(availableNight, day.requiredNight, "●", "night");
    if (nightCount < day.requiredNight) {
      const columnCells = cells.filter(
        (cell) => Number(cell.dataset.col) === day.index
      );
      const relaxedNight = [];
      columnCells.forEach((cell) => {
        const rowIndex = Number(cell.dataset.row);
        const person = state.staff[rowIndex];
        if (!person) return;
        if (!isStaffAvailableForDay(person, day)) return;
        const value = state.shiftPreferences?.[rowIndex]?.[day.index] || "";
        if (value === "off") return;
        if (isShiftTypeAllowed(rowIndex, "night")) {
          relaxedNight.push({ cell, rowIndex });
        }
      });
      nightCount += assignRelaxed(
        relaxedNight,
        day.requiredNight - nightCount,
        "●",
        "night"
      );
    }
    assignedNights.set(day.index, nightCount);
  });

  state.sheet.days.forEach((day) => {
    if (state.fixedDays.has(day.index)) return;
    const { availableDay } = buildAvailable(day);
    let dayCount = assign(availableDay, day.requiredDay, "○", "day");
    if (dayCount < day.requiredDay) {
      const columnCells = cells.filter(
        (cell) => Number(cell.dataset.col) === day.index
      );
      const relaxedDay = [];
      columnCells.forEach((cell) => {
        const rowIndex = Number(cell.dataset.row);
        const person = state.staff[rowIndex];
        if (!person) return;
        if (!isStaffAvailableForDay(person, day)) return;
        const value = state.shiftPreferences?.[rowIndex]?.[day.index] || "";
        if (value === "off") return;
        if (isShiftTypeAllowed(rowIndex, "day")) {
          relaxedDay.push({ cell, rowIndex });
        }
      });
      dayCount += assignRelaxed(
        relaxedDay,
        day.requiredDay - dayCount,
        "○",
        "day"
      );
    }
    assignExtras(availableDay, "○", "day");
    const nightCount = assignedNights.get(day.index) ?? 0;
    if (dayCount < day.requiredDay || nightCount < day.requiredNight) {
      warnings.push(day.index);
      blocked.add(day.index);
    }
  });

  state.sheet.warnings = warnings;
  state.blockedDays = blocked;
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

const startGuestSession = () => {
  state.view = "dashboard";
  state.ownerMode = false;
  setAuthToken("");
  state.sheet = null;
  state.currentSheetId = null;
  state.selectedGroup = "";
  const persisted = loadPersistedState();
  state.groups = persisted?.groups ?? [];
  state.sheets = persisted?.sheets ?? [];
  renderApp();
};

const validateOwnerFields = () => {
  const { email, password } = state.owner;
  return email && password;
};

const syncOwnerState = async () => {
  const remote = await loadRemoteState();
  if (remote) {
    state.groups = remote.groups;
    state.sheets = remote.sheets;
    return true;
  }
  if (persistedState) {
    state.groups = persistedState.groups;
    state.sheets = persistedState.sheets;
  }
  return false;
};

const loginOwner = async ({ email, password }) => {
  if (state.apiStatus === "offline") {
    state.warningMessage = getConnectionHelpMessage();
    openDialog(".warning-dialog");
    return;
  }
  try {
    const response = await apiRequest("/api/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });
    setAuthToken(response.token);
    state.owner.email = response.email;
    state.owner.password = "";
    await syncOwnerState();
    startOwnerSession();
  } catch (error) {
    state.warningMessage =
      error instanceof TypeError
        ? getConnectionHelpMessage()
        : error.message || "ログインに失敗しました。";
    openDialog(".warning-dialog");
  }
};

const registerOwner = async ({ email, password }) => {
  if (state.apiStatus === "offline") {
    state.warningMessage = getConnectionHelpMessage();
    openDialog(".warning-dialog");
    return;
  }
  try {
    await apiRequest("/api/register", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });
    await loginOwner({ email, password });
  } catch (error) {
    state.warningMessage =
      error instanceof TypeError
        ? getConnectionHelpMessage()
        : error.message || "登録に失敗しました。";
    openDialog(".warning-dialog");
  }
};

const logoutOwner = async () => {
  if (state.authToken) {
    apiRequest("/api/logout", { method: "POST" }).catch(() => {});
  }
  setAuthToken("");
  resetState();
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
    generatedAt: sheet.generatedAt,
    maxDay: sheet.maxDay ?? 20,
    maxNight: sheet.maxNight ?? 10,
    maxTotal: sheet.maxTotal ?? 20
  };
  if (Array.isArray(sheet.savedRequiredDay)) {
    state.sheet.days.forEach((day, index) => {
      if (sheet.savedRequiredDay[index] !== undefined) {
        day.requiredDay = sheet.savedRequiredDay[index];
      }
    });
  }
  if (Array.isArray(sheet.savedRequiredNight)) {
    state.sheet.days.forEach((day, index) => {
      if (sheet.savedRequiredNight[index] !== undefined) {
        day.requiredNight = sheet.savedRequiredNight[index];
      }
    });
  }
  state.shiftPreferences = state.staff.map(() =>
    Array(state.sheet.days.length).fill("")
  );
  if (Array.isArray(sheet.savedAssignments)) {
    state.assignments = sheet.savedAssignments;
  } else {
    state.assignments = state.staff.map(() =>
      Array(state.sheet.days.length).fill("")
    );
  }
  if (Array.isArray(sheet.savedFixedCells)) {
    state.fixedCells = new Set(sheet.savedFixedCells);
  } else {
    state.fixedCells = new Set();
  }
  state.fixedDays = new Set();
  state.blockedDays = new Set();
  state.view = "sheet";
  renderApp();
};

const initApp = async () => {
  await checkApiHealth();
  if (state.authToken) {
    try {
      const profile = await apiRequest("/api/me");
      state.owner.email = profile.email;
      await syncOwnerState();
      state.view = "dashboard";
    } catch (error) {
      setAuthToken("");
      if (persistedState) {
        state.groups = persistedState.groups;
        state.sheets = persistedState.sheets;
      }
    }
  } else if (persistedState) {
    state.groups = persistedState.groups;
    state.sheets = persistedState.sheets;
  }
  renderApp();
};

void initApp();

document.body.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;

  if (target.id === "go-register") {
    state.view = "register";
    renderApp();
    return;
  }

  if (target.id === "back-to-login") {
    state.view = "login";
    renderApp();
    return;
  }

  if (target.id === "enter-guest") {
    startGuestSession();
    return;
  }

  if (target.id === "login-owner" || target.id === "register-owner") {
    const emailInput = document.getElementById("owner-email");
    const passwordInput = document.getElementById("owner-password");
    if (
      emailInput instanceof HTMLInputElement &&
      passwordInput instanceof HTMLInputElement
    ) {
      const email = emailInput.value.trim();
      const password = passwordInput.value.trim();
      state.owner = { email, password };
      if (!validateOwnerFields()) {
        state.warningMessage = "メールアドレスとパスワードを入力してください。";
        openDialog(".warning-dialog");
        return;
      }
      if (target.id === "register-owner") {
        void registerOwner({ email, password });
      } else {
        void loginOwner({ email, password });
      }
    }
  }

  if (target.id === "create-group") {
    if (!state.ownerMode) return;
    state.groupDraftName = "";
    state.staff = [createEmptyStaff()];
    state.view = "group";
    renderApp();
  }

  if (target.id === "new-sheet") {
    if (!state.ownerMode) return;
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
    if (!state.ownerMode) return;
    state.staff = [...state.staff, createEmptyStaff()];
    renderApp();
  }

  if (target.id === "save-group") {
    if (!state.ownerMode) return;
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
    persistState();
    renderApp();
  }

  if (target.dataset.action === "edit-group") {
    if (!state.ownerMode) return;
    const groupName = target.dataset.name;
    const group = state.groups.find((item) => item.name === groupName);
    if (!group) return;
    state.groupDraftName = group.name;
    state.staff = structuredClone(group.staff);
    state.view = "group";
    renderApp();
  }

  if (target.dataset.action === "move-up") {
    if (!state.ownerMode) return;
    const rowIndex = Number(target.dataset.row);
    moveStaffRow(rowIndex, -1);
  }

  if (target.dataset.action === "move-down") {
    if (!state.ownerMode) return;
    const rowIndex = Number(target.dataset.row);
    moveStaffRow(rowIndex, 1);
  }

  if (target.dataset.action === "delete-staff") {
    if (!state.ownerMode) return;
    const panel = target.closest(".settings-panel");
    const rowIndex = panel ? Number(panel.dataset.row) : Number(target.dataset.row);
    if (Number.isNaN(rowIndex)) return;
    const confirmed = window.confirm("この勤務者を削除しますか？");
    if (!confirmed) return;
    deleteStaffRow(rowIndex);
    closeDialog(".settings-panel");
  }

  if (target.id === "auto-shift" && state.ownerMode) {
    if (!state.sheet) return;
    const shortages = getShortageDays();
    if (shortages.length > 0) {
      const labels = shortages
        .map((index) => state.sheet.days[index]?.dateLabel)
        .filter(Boolean)
        .join("、");
      state.confirmMessage = `${labels} はメンバーが足りませんがそのまま作成しますか？`;
      state.pendingShift = true;
      openDialog(".confirm-dialog");
      return;
    }
    state.sheet.generatedAt = new Date();
    applyAssignments({ randomize: true });
    const versionLabel = `ver${state.shiftVersions.length + 1}`;
    state.shiftVersions = [...state.shiftVersions, versionLabel];
    openShiftVersionWindow(versionLabel);
  }

  if (target.classList.contains("settings-button")) {
    const rowIndex = Number(target.dataset.row);
    openSettingsPanel(rowIndex);
  }

  if (target.classList.contains("fix-button")) {
    if (!state.ownerMode) return;
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
    const rowIndex = Number(cell.dataset.row);
    const colIndex = Number(cell.dataset.col);
    if (!state.shiftPreferences[rowIndex]) {
      state.shiftPreferences[rowIndex] = [];
    }
    state.shiftPreferences[rowIndex][colIndex] =
      state.shiftPreferences[rowIndex][colIndex] === "off" ? "" : "off";
    renderAppPreserveScroll();
  }

  if (target.id === "logout") {
    void logoutOwner();
  }

  if (target.id === "reset-sheet") {
    if (!state.ownerMode) return;
    const sheetId = state.currentSheetId;
    if (!sheetId) return;
    const confirmed = window.confirm("このシフトをリセットして空にしますか？");
    if (!confirmed) return;
    resetSavedSheet(sheetId);
  }

  if (target.dataset.action === "open-sheet") {
    const sheetId = target.dataset.id;
    openSheetFromList(sheetId);
  }

  if (target.dataset.action === "close") {
    closeDialog(".settings-panel");
    closeDialog(".sheet-dialog");
    closeDialog(".warning-dialog");
    closeDialog(".confirm-dialog");
  }

  if (target.dataset.action === "confirm-shift") {
    if (!state.sheet) return;
    state.pendingShift = false;
    state.sheet.generatedAt = new Date();
    applyAssignments({ randomize: true });
    const versionLabel = `ver${state.shiftVersions.length + 1}`;
    state.shiftVersions = [...state.shiftVersions, versionLabel];
    openShiftVersionWindow(versionLabel);
    closeDialog(".confirm-dialog");
  }
});

document.body.addEventListener("change", (event) => {
  const target = event.target;

  if (target instanceof HTMLInputElement && target.classList.contains("required-input")) {
    if (!state.ownerMode) return;
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

  if (target instanceof HTMLInputElement && target.id === "max-day") {
    if (!state.ownerMode) return;
    const value = Number(target.value || 0);
    if (!state.sheet) return;
    state.sheet.maxDay = value;
    state.sheet.maxTotal = value;
    if (state.currentSheetId) {
      const sheetIndex = state.sheets.findIndex((item) => item.id === state.currentSheetId);
      if (sheetIndex !== -1) {
        state.sheets[sheetIndex] = {
          ...state.sheets[sheetIndex],
          maxDay: value,
          maxTotal: value
        };
        persistState();
      }
    }
  }

  if (target instanceof HTMLInputElement && target.id === "max-night") {
    if (!state.ownerMode) return;
    const value = Number(target.value || 0);
    if (!state.sheet) return;
    state.sheet.maxNight = value;
    if (state.currentSheetId) {
      const sheetIndex = state.sheets.findIndex((item) => item.id === state.currentSheetId);
      if (sheetIndex !== -1) {
        state.sheets[sheetIndex] = {
          ...state.sheets[sheetIndex],
          maxNight: value
        };
        persistState();
      }
    }
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
      shiftTypeSelect instanceof HTMLSelectElement &&
      wardSelect instanceof HTMLSelectElement &&
      availabilitySelect instanceof HTMLSelectElement &&
      dayMinInput instanceof HTMLInputElement &&
      dayMaxInput instanceof HTMLInputElement &&
      nightMinInput instanceof HTMLInputElement &&
      nightMaxInput instanceof HTMLInputElement
    ) {
      state.staff[rowIndex].name = nameInput.value.trim();
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
        generatedAt: new Date(),
        savedAssignments: [],
        savedFixedCells: [],
        savedRequiredDay: [],
        savedRequiredNight: [],
        maxDay: 20,
        maxNight: 10,
        maxTotal: 20
      };
      state.sheets = [newSheet, ...state.sheets.filter((item) => item.id !== sheetId)];
      persistState();
      state.currentSheetId = sheetId;
      state.sheet = {
        year,
        month,
        groupName: state.selectedGroup,
        days: buildDays(year, month),
        warnings: [],
        generatedAt: new Date(),
        maxDay: 20,
        maxNight: 10,
        maxTotal: 20
      };
      state.shiftPreferences = state.staff.map(() =>
        Array(state.sheet.days.length).fill("")
      );
      state.fixedDays.clear();
      state.view = "sheet";
      renderApp();
    }
    sheetPanel.close();
  }
});
