const STORAGE_KEY = "drink-less-v1";

const statusLabels = {
  none: "没喝",
  light: "少量",
  heavy: "超量",
};

const exerciseLabels = {
  none: "没运动",
  light: "轻微活动",
  done: "完成运动",
};

const sugarLabels = {
  none: "没吃甜食",
  light: "少量甜食",
  heavy: "甜食偏多",
};

const encouragements = {
  none: "今天让身体好好休息了一天，这一步很实在。",
  light: "能停在少量，本身就是在练习掌控节奏。",
  heavy: "先照顾身体和睡眠，下一次从少一点点开始就行。",
};

const dateFormatter = new Intl.DateTimeFormat("zh-CN", {
  month: "numeric",
  day: "numeric",
});

const weekdayFormatter = new Intl.DateTimeFormat("zh-CN", {
  weekday: "long",
});

const state = loadState();

let selectedStatus = null;
let selectedExercise = null;
let selectedSugar = null;

const elements = {
  weekday: document.querySelector("#weekday"),
  todayDate: document.querySelector("#todayDate"),
  savedState: document.querySelector("#savedState"),
  drinkChoices: [...document.querySelectorAll("[data-status]")],
  exerciseChoices: [...document.querySelectorAll("[data-exercise]")],
  sugarChoices: [...document.querySelectorAll("[data-sugar]")],
  moodSelect: document.querySelector("#moodSelect"),
  triggerSelect: document.querySelector("#triggerSelect"),
  saveCheckin: document.querySelector("#saveCheckin"),
  encouragement: document.querySelector("#encouragement"),
  streakCount: document.querySelector("#streakCount"),
  weekSummary: document.querySelector("#weekSummary"),
  weekInsight: document.querySelector("#weekInsight"),
  exerciseSummary: document.querySelector("#exerciseSummary"),
  sugarSummary: document.querySelector("#sugarSummary"),
  calendar: document.querySelector("#calendar"),
  clearData: document.querySelector("#clearData"),
};

init();

function init() {
  const today = new Date();
  const todayKey = toDateKey(today);
  elements.weekday.textContent = weekdayFormatter.format(today);
  elements.todayDate.textContent = dateFormatter.format(today);

  const todayRecord = state.records[todayKey];
  if (todayRecord) {
    selectedStatus = todayRecord.status;
    selectedExercise = todayRecord.exercise || null;
    selectedSugar = todayRecord.sugar || null;
    elements.moodSelect.value = todayRecord.mood;
    elements.triggerSelect.value = todayRecord.trigger;
  }

  wireEvents();
  render();
}

function wireEvents() {
  elements.drinkChoices.forEach((choice) => {
    choice.addEventListener("click", () => {
      selectedStatus = choice.dataset.status;
      elements.encouragement.textContent = encouragements[selectedStatus];
      renderChoices();
    });
  });

  elements.exerciseChoices.forEach((choice) => {
    choice.addEventListener("click", () => {
      selectedExercise = choice.dataset.exercise;
      elements.encouragement.textContent = buildHabitEncouragement();
      renderChoices();
    });
  });

  elements.sugarChoices.forEach((choice) => {
    choice.addEventListener("click", () => {
      selectedSugar = choice.dataset.sugar;
      elements.encouragement.textContent = buildHabitEncouragement();
      renderChoices();
    });
  });

  elements.saveCheckin.addEventListener("click", saveToday);

  elements.clearData.addEventListener("click", () => {
    const ok = window.confirm("确定清空本机保存的打卡记录吗？");
    if (!ok) return;
    state.records = {};
    selectedStatus = null;
    selectedExercise = null;
    selectedSugar = null;
    elements.moodSelect.value = "平静";
    elements.triggerSelect.value = "没有明显诱因";
    persistState();
    render();
  });
}

function saveToday() {
  if (!selectedStatus) {
    elements.encouragement.textContent = "先选一个今天最接近的饮酒状态，再保存。";
    return;
  }
  if (!selectedExercise) {
    elements.encouragement.textContent = "再选一下今天的运动状态，就能保存了。";
    return;
  }
  if (!selectedSugar) {
    elements.encouragement.textContent = "再选一下今天的甜食状态，就能保存了。";
    return;
  }

  const todayKey = toDateKey(new Date());
  state.records[todayKey] = {
    status: selectedStatus,
    exercise: selectedExercise,
    sugar: selectedSugar,
    mood: elements.moodSelect.value,
    trigger: elements.triggerSelect.value,
    updatedAt: new Date().toISOString(),
  };

  persistState();
  render();
}

function render() {
  renderChoices();
  renderToday();
  renderStats();
  renderCalendar();
}

function renderChoices() {
  elements.drinkChoices.forEach((choice) => {
    const isChecked = choice.dataset.status === selectedStatus;
    choice.setAttribute("aria-checked", String(isChecked));
  });
  elements.exerciseChoices.forEach((choice) => {
    const isChecked = choice.dataset.exercise === selectedExercise;
    choice.setAttribute("aria-checked", String(isChecked));
  });
  elements.sugarChoices.forEach((choice) => {
    const isChecked = choice.dataset.sugar === selectedSugar;
    choice.setAttribute("aria-checked", String(isChecked));
  });
}

function renderToday() {
  const todayRecord = state.records[toDateKey(new Date())];
  if (!todayRecord) {
    elements.savedState.textContent = "未记录";
    elements.savedState.style.background = "#eee8dc";
    return;
  }

  elements.savedState.textContent = statusLabels[todayRecord.status];
  elements.savedState.style.background = pillColor(todayRecord.status);
  elements.encouragement.textContent = encouragements[todayRecord.status];
}

function renderStats() {
  const streak = getImprovementStreak();
  elements.streakCount.textContent = `${streak} 天`;

  const lastSeven = getRecentDates(7).map((dateKey) => state.records[dateKey]).filter(Boolean);
  const heavyCount = lastSeven.filter((record) => record.status === "heavy").length;
  const steadyCount = lastSeven.filter((record) => record.status !== "heavy").length;
  const exerciseCount = lastSeven.filter((record) => record.exercise === "light" || record.exercise === "done").length;
  const sugarSteadyCount = lastSeven.filter((record) => record.sugar === "none" || record.sugar === "light").length;

  elements.weekSummary.textContent = `${lastSeven.length} 次记录`;
  elements.exerciseSummary.textContent = `${exerciseCount} 天`;
  elements.sugarSummary.textContent = `${sugarSteadyCount} 天`;
  if (lastSeven.length === 0) {
    elements.weekInsight.textContent = "开始记录后会看到变化";
  } else if (heavyCount === 0) {
    elements.weekInsight.textContent = "这一周没有超量记录";
  } else {
    elements.weekInsight.textContent = `${steadyCount} 天在减量路上，${heavyCount} 天需要多照顾`;
  }
}

function renderCalendar() {
  elements.calendar.innerHTML = "";
  getRecentDates(30).forEach((dateKey) => {
    const record = state.records[dateKey];
    const day = document.createElement("div");
    const date = parseDateKey(dateKey);
    day.className = `day ${record ? record.status : "blank"}`;
    day.textContent = date.getDate();
    day.title = record
      ? `${dateFormatter.format(date)}：${statusLabels[record.status]}，${record.mood}，${record.trigger}，运动：${getLabel(exerciseLabels, record.exercise)}，甜食：${getLabel(sugarLabels, record.sugar)}`
      : `${dateFormatter.format(date)}：未记录`;
    elements.calendar.appendChild(day);
  });
}

function buildHabitEncouragement() {
  const parts = [];
  if (selectedExercise === "done") parts.push("运动完成了，身体会记住这份努力");
  if (selectedExercise === "light") parts.push("轻微活动也算数");
  if (selectedSugar === "none") parts.push("今天甜食控制得很稳");
  if (selectedSugar === "light") parts.push("甜食能少量停住就是进步");
  if (selectedSugar === "heavy") parts.push("甜食吃多了也不用自责，下一顿清淡一点");
  return parts.length > 0 ? `${parts.join("，")}。` : "选一个最接近今天的状态就好，不需要完美。";
}

function getLabel(labels, value) {
  return value ? labels[value] : "未记录";
}

function getImprovementStreak() {
  let streak = 0;
  const dates = getRecentDates(365).reverse();
  for (const dateKey of dates) {
    const record = state.records[dateKey];
    if (!record) {
      if (streak > 0) break;
      continue;
    }
    if (record.status === "heavy") break;
    streak += 1;
  }
  return streak;
}

function getRecentDates(days) {
  const dates = [];
  const today = new Date();
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(today);
    date.setHours(12, 0, 0, 0);
    date.setDate(today.getDate() - offset);
    dates.push(toDateKey(date));
  }
  return dates;
}

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateKey(dateKey) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day, 12);
}

function pillColor(status) {
  if (status === "none") return "#dbeee4";
  if (status === "light") return "#f4e2c5";
  return "#f1d9d5";
}

function loadState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return {
      records: parsed?.records && typeof parsed.records === "object" ? parsed.records : {},
      reasons: typeof parsed?.reasons === "string" ? parsed.reasons : "",
    };
  } catch {
    return { records: {}, reasons: "" };
  }
}

function persistState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
