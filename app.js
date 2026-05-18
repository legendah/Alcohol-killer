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

const supportActions = {
  none: "可以和他一起肯定这一天的努力，简单说一句“今天身体轻松一点就好”。",
  light: "可以准备水或清淡食物，陪他把今晚平稳过完。",
  heavy: "先关心身体和情绪，再讨论下一步；今晚避免责备，明天一起想一个少一点的办法。",
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
  familyMessage: document.querySelector("#familyMessage"),
  copyMessage: document.querySelector("#copyMessage"),
  shareMessage: document.querySelector("#shareMessage"),
  saveScreenshot: document.querySelector("#saveScreenshot"),
  copyStatus: document.querySelector("#copyStatus"),
  streakCount: document.querySelector("#streakCount"),
  weekSummary: document.querySelector("#weekSummary"),
  weekInsight: document.querySelector("#weekInsight"),
  exerciseSummary: document.querySelector("#exerciseSummary"),
  sugarSummary: document.querySelector("#sugarSummary"),
  calendar: document.querySelector("#calendar"),
  supportList: document.querySelector("#supportList"),
  supportFeedback: document.querySelector("#supportFeedback"),
  reasonsInput: document.querySelector("#reasonsInput"),
  saveReasons: document.querySelector("#saveReasons"),
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

  elements.reasonsInput.value = state.reasons || "";
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
  elements.copyMessage.addEventListener("click", copyReminder);
  elements.shareMessage.addEventListener("click", shareReminder);
  elements.saveScreenshot.addEventListener("click", saveCheckinImage);

  elements.supportList.addEventListener("click", (event) => {
    if (event.target.tagName !== "BUTTON") return;
    elements.supportFeedback.textContent = `好，就先做这件事：${event.target.textContent}。`;
  });

  elements.saveReasons.addEventListener("click", () => {
    state.reasons = elements.reasonsInput.value.trim();
    persistState();
    elements.supportFeedback.textContent = "理由已保存，想喝时可以回来看看。";
  });

  elements.clearData.addEventListener("click", () => {
    const ok = window.confirm("确定清空本机保存的打卡和理由吗？");
    if (!ok) return;
    state.records = {};
    state.reasons = "";
    selectedStatus = null;
    selectedExercise = null;
    selectedSugar = null;
    elements.reasonsInput.value = "";
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
    elements.familyMessage.textContent = "保存今天后，这里会生成一段可以复制或分享给家人的温和提醒。";
    elements.saveScreenshot.disabled = true;
    return;
  }

  elements.savedState.textContent = statusLabels[todayRecord.status];
  elements.savedState.style.background = pillColor(todayRecord.status);
  elements.encouragement.textContent = encouragements[todayRecord.status];
  elements.familyMessage.textContent = buildFamilyMessage(todayRecord);
  elements.saveScreenshot.disabled = false;
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

function buildFamilyMessage(record) {
  const statusText = statusLabels[record.status];
  const exerciseText = record.exercise ? exerciseLabels[record.exercise] : "未记录运动";
  const sugarText = record.sugar ? sugarLabels[record.sugar] : "未记录甜食";
  const reasonText = state.reasons ? `他想少喝的理由是：${state.reasons}` : "今晚先把身体照顾好。";
  const habitText = `运动：${exerciseText}；甜食：${sugarText}。`;

  return [
    `今天已记录：${statusText}。`,
    habitText,
    `今天的心情是${record.mood}，主要诱因是${record.trigger}。`,
    supportActions[record.status],
    reasonText,
  ].join("\n");
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

async function copyReminder() {
  const text = elements.familyMessage.textContent.trim();
  if (!text || text.startsWith("保存今天后")) {
    elements.copyStatus.textContent = "先保存今天，再复制提醒。";
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
    elements.copyStatus.textContent = "已复制，可以发给家人。";
  } catch {
    elements.copyStatus.textContent = "浏览器不允许自动复制，可以长按文字手动复制。";
  }
}

async function shareReminder() {
  const text = elements.familyMessage.textContent.trim();
  if (!text || text.startsWith("保存今天后")) {
    elements.copyStatus.textContent = "先保存今天，再分享提醒。";
    return;
  }

  if (navigator.share) {
    try {
      await navigator.share({ title: "今日健康打卡", text });
      elements.copyStatus.textContent = "已打开系统分享。";
    } catch {
      elements.copyStatus.textContent = "分享已取消。";
    }
    return;
  }

  await copyReminder();
}

function saveCheckinImage() {
  const todayRecord = state.records[toDateKey(new Date())];
  if (!todayRecord) {
    elements.copyStatus.textContent = "先保存今天，再保存截图。";
    return;
  }

  const canvas = document.createElement("canvas");
  const scale = Math.max(2, Math.floor(window.devicePixelRatio || 1));
  const width = 760;
  const padding = 48;
  const imageRows = [
    { text: "今日健康打卡", type: "title" },
    { text: `${weekdayFormatter.format(new Date())} ${dateFormatter.format(new Date())}`, type: "meta" },
    { text: `饮酒：${statusLabels[todayRecord.status]}`, type: getDrinkTone(todayRecord.status) },
    { text: `运动：${getLabel(exerciseLabels, todayRecord.exercise)}`, type: getExerciseTone(todayRecord.exercise) },
    { text: `甜食：${getLabel(sugarLabels, todayRecord.sugar)}`, type: getSugarTone(todayRecord.sugar) },
    { text: `心情：${todayRecord.mood}`, type: "meta" },
    { text: `诱因：${todayRecord.trigger}`, type: "meta" },
    { text: "", type: "spacer" },
    ...buildFamilyMessage(todayRecord).split("\n").map((text) => ({ text, type: "body" })),
  ];

  const ctx = canvas.getContext("2d");
  ctx.font = "30px sans-serif";
  const wrappedRows = imageRows.flatMap((row) => {
    if (row.type === "title" || row.type === "spacer") return [row];
    return wrapCanvasText(ctx, row.text, width - padding * 2).map((text) => ({ text, type: row.type }));
  });

  const height = padding * 2 + 72 + wrappedRows.length * 44;
  canvas.width = width * scale;
  canvas.height = height * scale;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.scale(scale, scale);

  ctx.fillStyle = "#f7f3ea";
  ctx.fillRect(0, 0, width, height);
  roundRect(ctx, 24, 24, width - 48, height - 48, 18, "#fffdf8", "#ded7ca");

  let y = 78;
  wrappedRows.forEach((row) => {
    if (row.type === "title") {
      ctx.fillStyle = getImageRowColor(row.type);
      ctx.font = "700 42px sans-serif";
      ctx.fillText(row.text, padding, y);
      y += 54;
      return;
    }
    if (row.type === "spacer") {
      y += 18;
      return;
    }
    ctx.fillStyle = getImageRowColor(row.type);
    ctx.font = row.type === "body" ? "28px sans-serif" : "700 30px sans-serif";
    ctx.fillText(row.text, padding, y);
    y += 44;
  });

  const link = document.createElement("a");
  link.download = `今日健康打卡-${toDateKey(new Date())}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
  elements.copyStatus.textContent = "截图已生成并保存到下载目录。";
}

function getDrinkTone(status) {
  if (status === "none") return "positive";
  return "negative";
}

function getExerciseTone(exercise) {
  if (exercise === "done" || exercise === "light") return "positive";
  if (exercise === "none") return "negative";
  return "meta";
}

function getSugarTone(sugar) {
  if (sugar === "none" || sugar === "light") return "positive";
  if (sugar === "heavy") return "negative";
  return "meta";
}

function getImageRowColor(type) {
  if (type === "positive") return "#2f7a58";
  if (type === "negative") return "#a84f42";
  if (type === "meta") return "#3b6a8f";
  if (type === "body") return "#39342e";
  return "#232323";
}

function wrapCanvasText(ctx, text, maxWidth) {
  const lines = [];
  let current = "";
  for (const char of text) {
    const next = current + char;
    if (ctx.measureText(next).width > maxWidth && current) {
      lines.push(current);
      current = char;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function roundRect(ctx, x, y, width, height, radius, fill, stroke) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 2;
  ctx.stroke();
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
