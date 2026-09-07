const ownerMap = {
  "Você": range(1, 22),
  Nando: range(23, 34),
  Duda: range(35, 46),
  Michael: [47, 48, 49, 50, 51, 52, 53, 54, 56, 57, 59, 60],
  Renan: [55, 58],
};

const ownerColor = {
  "Você": "#4977e5",
  Nando: "#21a67a",
  Duda: "#ef9b3a",
  Michael: "#8b6fe8",
  Renan: "#d94f80",
};

const storeKey = "panza-shorts-calendar-v2";
let shorts = [];
let done = loadDone();
let activeOwner = "Hoje";
const activityKey = "panza-shorts-activity-v1";
let activity = loadActivity();
let displayedDay = dayKey();
let onlyOpen = false;
let audioContext;
let soundEnabled = true;
try { soundEnabled = localStorage.getItem("panza-sound") !== "off"; } catch {}

async function playFeedback(complete) {
  if (!soundEnabled) return;
  try {
    audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
    await audioContext.resume();
    const start = audioContext.currentTime;
    const notes = complete ? [659.25, 987.77] : [440];
    notes.forEach((frequency, index) => {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      const at = start + index * 0.075;
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, at);
      gain.gain.setValueAtTime(0, at);
      gain.gain.linearRampToValueAtTime(0.045, at + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.22);
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start(at);
      oscillator.stop(at + 0.24);
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
    });
  } catch { /* Audio availability must not prevent a completion from being saved. */ }
}


const calendar = document.querySelector("#calendar");
const people = document.querySelector("#people");
const onlyOpenInput = document.querySelector("#onlyOpen");

function range(start, end) {
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

function pad(num) {
  return String(num).padStart(2, "0");
}

function ownerFor(num) {
  return Object.entries(ownerMap).find(([, nums]) => nums.includes(num))?.[0] || "Sem dono";
}

function loadDone() {
  try {
    return JSON.parse(localStorage.getItem(storeKey)) || {};
  } catch {
    return {};
  }
}

function saveDone() {
  localStorage.setItem(storeKey, JSON.stringify(done));
}

function dayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function loadActivity() {
  try { return JSON.parse(localStorage.getItem(activityKey)) || {}; }
  catch { return {}; }
}

function todayStage(id) {
  return activity[dayKey()]?.[id]?.stage || 0;
}

function recordActivity(id) {
  const day = dayKey();
  activity[day] ||= {};
  // One entry per short per local day prevents draft + posted being counted twice.
  activity[day][id] = { stage: stage(id), at: new Date().toISOString() };
  localStorage.setItem(activityKey, JSON.stringify(activity));
}

function stage(id) {
  return done[id] === 2 ? 2 : done[id] ? 1 : 0;
}

function updateCard(card, id) {
  const value = stage(id);
  card.classList.toggle("draft", value === 1);
  card.classList.toggle("done", value === 2);
  const button = card.querySelector(".check");
  const current = ["A fazer", "Rascunho pronto", "Postado"][value];
  const next = ["Marcar rascunho pronto", "Marcar como postado", "Voltar a fazer"][value];
  button.title = next;
  button.setAttribute("aria-label", `Short ${id}: ${current}. ${next}`);
  card.querySelector(".stage-label").textContent = value ? current : "";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function initials(name) {
  return name === "Você" ? "VC" : name.slice(0, 2).toUpperCase();
}

function ownerAvatar(owner, className) {
  const portraits = { "Você": ["avatar-panza.png", "portrait-panza"], Michael: ["avatar-michael.png", "portrait-michael"] };
  const portrait = portraits[owner];
  const content = portrait ? `<img src="./${portrait[0]}" alt="" draggable="false" />` : initials(owner);
  return `<span class="${className}${portrait ? ` portrait ${portrait[1]}` : ""}" role="img" aria-label="${escapeHtml(owner)}" title="${escapeHtml(owner)}">${content}</span>`;
}

function renderPeople() {
  people.innerHTML = "";
  Object.keys(ownerMap).forEach((owner) => {
    const items = shorts.filter((short) => ownerFor(short.num) === owner);
    const isToday = activeOwner === "Hoje";
    const finished = items.filter((short) => isToday ? todayStage(pad(short.num)) > 0 : stage(pad(short.num)) > 0).length;
    const posted = items.filter((short) => (isToday ? todayStage(pad(short.num)) : stage(pad(short.num))) === 2).length;
    const remaining = items.length - finished;
    const percent = items.length ? Math.round((finished / items.length) * 100) : 0;
    const card = document.createElement("button");
    card.type = "button";
    card.className = `people-card${activeOwner === owner ? " selected" : ""}`;
    card.dataset.owner = owner;
    card.setAttribute("aria-label", `Ver shorts de ${owner}`);
    card.setAttribute("aria-pressed", String(activeOwner === owner));
    card.style.setProperty("--owner-color", ownerColor[owner]);
    card.innerHTML = `
      <span class="people-top">
        ${ownerAvatar(owner, "avatar")}
        <span class="person-name">${escapeHtml(owner)}</span>
        <img class="person-arrow" src="./arrow-up-right.svg" width="14" height="14" alt="" />
      </span>
      <span class="person-result"><strong>${isToday ? finished : `${finished}/${items.length}`}</strong><span>${isToday ? (finished === 1 ? "feito hoje" : "feitos hoje") : "prontos"}</span></span>
      <span class="bar"><i style="width:${percent}%"></i></span>
      <span class="person-detail">${isToday ? `${posted} ${posted === 1 ? "postado" : "postados"}` : `${remaining} faltando`}</span>
    `;
    people.appendChild(card);
  });
}

function filteredShorts() {
  return shorts.filter((short) => {
    const id = pad(short.num);
    const ownerOk = activeOwner === "Hoje" ? todayStage(id) > 0 : ownerFor(short.num) === activeOwner;
    const openOk = !onlyOpen || stage(id) !== 2;
    return ownerOk && openOk;
  });
}

function renderCalendar() {
  const list = filteredShorts();
  renderCollectionCount();
  calendar.innerHTML = "";
  if (!list.length) {
    const message = activeOwner === "Hoje"
      ? (onlyOpen && shorts.some((short) => todayStage(pad(short.num)) > 0) ? "Todos os shorts de hoje foram postados." : "Nenhum short registrado hoje.")
      : "Tudo marcado nesse filtro.";
    calendar.innerHTML = `<div class="empty"><span class="empty-symbol" aria-hidden="true"><img src="./clapperboard.svg" width="32" height="32" alt="" /></span><h3>${message}</h3></div>`;
    return;
  }

  list.forEach((short) => {
    const id = pad(short.num);
    const owner = ownerFor(short.num);
    const card = document.createElement("article");
    card.className = "calendar-card";
    card.style.setProperty("--owner-color", ownerColor[owner] || "#171717");
    card.innerHTML = `
      <div class="card-head">
        <span class="num"><small>SHORT</small>${id}</span>
        <button type="button" class="check" data-id="${id}"><span aria-hidden="true"></span></button>
      </div>
      <span class="owner">${ownerAvatar(owner, "owner-initial")}<span class="stage-label"></span></span>
      <h3>${escapeHtml(short.title)}</h3>
    `;
    calendar.appendChild(card);
    updateCard(card, id);
  });
}

function renderTeamContext() {
  document.querySelector("#teamContext").textContent = activeOwner === "Hoje" ? "Resultado de hoje" : "Progresso geral";
}

function renderCollectionCount() {
  const count = filteredShorts().length;
  document.querySelector("#collectionTitle").textContent = activeOwner === "Hoje" ? "Atividade de hoje" : activeOwner === "Você" ? "Seus shorts" : `Shorts de ${activeOwner}`;
  document.querySelector("#collectionCount").textContent = `${count} ${count === 1 ? "short" : "shorts"}`;
}

function render() {
  renderTeamContext();
  renderPeople();
  renderCalendar();
}

calendar.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-id]");
  const id = button?.dataset.id;
  if (!id) return;
  done[id] = (stage(id) + 1) % 3;
  saveDone();
  recordActivity(id);
  playFeedback(done[id]);
  renderTeamContext();
  renderPeople();
  renderCollectionCount();
  const card = button.closest(".calendar-card");
  updateCard(card, id);
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!reducedMotion) {
    if (done[id]) card.querySelector(".check span").animate([{ transform: "scale(.7)" }, { transform: "scale(1.18)" }, { transform: "scale(1)" }], { duration: 300 });
  }
  const shouldHide = () => (onlyOpen && stage(id) === 2) || (activeOwner === "Hoje" && todayStage(id) === 0);
  if (shouldHide()) {
    const next = card.nextElementSibling || card.previousElementSibling;
    const animation = reducedMotion ? null : card.animate([{ opacity: 1, transform: "scale(1)" }, { opacity: 0, transform: "scale(.96)" }], { duration: 180 });
    const remove = () => {
      if (!card.isConnected || !shouldHide()) return;
      const hadFocus = card.contains(document.activeElement);
      card.remove();
      if (!calendar.children.length) renderCalendar();
      if (hadFocus) (next?.querySelector(".check") || onlyOpenInput).focus({ preventScroll: true });
    };
    if (animation) animation.finished.then(remove); else remove();
  }
});

function selectOwner(owner) {
  activeOwner = owner;
  document.querySelectorAll(".chip").forEach((chip) => {
    const selected = chip.dataset.owner === owner;
    chip.classList.toggle("active", selected);
    chip.setAttribute("aria-pressed", String(selected));
  });
  render();
}

document.querySelectorAll(".chip").forEach((chip) => {
  chip.addEventListener("click", () => selectOwner(chip.dataset.owner));
});
people.addEventListener("click", (event) => {
  const card = event.target.closest(".people-card");
  if (!card) return;
  selectOwner(card.dataset.owner);
  document.querySelector(`.chip[data-owner="${card.dataset.owner}"]`).focus({ preventScroll: true });
});

onlyOpenInput.addEventListener("change", () => {
  onlyOpen = onlyOpenInput.checked;
  renderCalendar();
});

function refreshDay() {
  if (displayedDay === dayKey()) return;
  displayedDay = dayKey();
  render();
}
setInterval(refreshDay, 15000);
document.addEventListener("visibilitychange", () => { if (!document.hidden) refreshDay(); });
window.addEventListener("storage", (event) => {
  if (event.key === storeKey || event.key === activityKey || event.key === null) {
    done = loadDone();
    activity = loadActivity();
    render();
  }
});

fetch("./shorts.json")
  .then((response) => response.json())
  .then((data) => {
    shorts = data.map((item) => ({ ...item, num: Number(item.num) })).filter((item) => item.num <= 60 && item.num !== 6);
    render();
  });
