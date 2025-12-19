// =========================
// FIREBASE (MODULAR CDN) + AUTH + REALTIME DATABASE
// =========================
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-analytics.js";

import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

import {
  getDatabase,
  ref,
  push,
  set,
  onValue,
  off,
  update,
  remove,
  query,
  orderByChild,
  equalTo,
  get,
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-database.js";

// =========================
// KONFIGURASI FIREBASE (PUNYA KAMU)
// =========================
const firebaseConfig = {
  apiKey: "AIzaSyBwdtgYHvSMqz6jXUisc7djvJ7ixkfK6yY",
  authDomain: "akar-literasi-navigator-weekly.firebaseapp.com",
  databaseURL: "https://akar-literasi-navigator-weekly-default-rtdb.firebaseio.com",
  projectId: "akar-literasi-navigator-weekly",
  storageBucket: "akar-literasi-navigator-weekly.firebasestorage.app",
  messagingSenderId: "755822522562",
  appId: "1:755822522562:web:ff2fc9baa0995d79cdcb5b",
  measurementId: "G-P3S98D4WPW",
};

// Init Firebase
const app = initializeApp(firebaseConfig);
try {
  getAnalytics(app);
} catch (_) {
  // analytics opsional (kadang error kalau environment tertentu)
}

const auth = getAuth(app);
const db = getDatabase(app);

// =========================
// KONSTAN
// =========================
const TIMES_OF_DAY = ["Pagi", "Siang", "Sore", "Malam"];
const DAYS_OF_WEEK = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];

const categoryToContainerId = {
  Primary: "primary-list",
  Academy: "academy-list",
  Development: "development-list",
  Socio: "socio-list",
};

// =========================
// STATE
// =========================
let currentUser = null;
let currentTasks = [];
let currentSchedule = [];

// refs + listener handlers (buat detach)
let tasksRef = null;
let scheduleRef = null;
let tasksHandler = null;
let scheduleHandler = null;

// =========================
// PATH PER USER
// =========================
function tasksPath(uid) {
  return `users/${uid}/tasks`;
}
function schedulePath(uid) {
  return `users/${uid}/schedule`;
}

// =========================
// INIT UI
// =========================
document.addEventListener("DOMContentLoaded", () => {
  initTabs();
  initHeroButtonJump();
  initAuthUI();

  initTaskForm();
  initScheduleForm();
  renderEmptyScheduleGrid();
  renderDashboard();

  // Auth state
  onAuthStateChanged(auth, (user) => {
    currentUser = user || null;
    syncAuthButtons();

    if (currentUser) {
      attachDbListeners(currentUser.uid);
    } else {
      detachDbListeners();
      resetUIWhenLoggedOut();
    }
  });
});

// =========================
// AUTH UI (LOGIN ONLY)
// =========================
function initAuthUI() {
  const modal = document.getElementById("auth-modal");
  const openBtn = document.getElementById("btn-login-open");
  const closeBtn = document.getElementById("auth-close");
  const logoutBtn = document.getElementById("btn-logout");
  const loginForm = document.getElementById("login-form");

  openBtn?.addEventListener("click", () => modal?.classList.remove("hidden"));
  closeBtn?.addEventListener("click", () => modal?.classList.add("hidden"));

  modal?.addEventListener("click", (e) => {
    if (e.target === modal) modal.classList.add("hidden");
  });

  loginForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = (document.getElementById("login-email")?.value || "").trim();
    const password = (document.getElementById("login-password")?.value || "").trim();

    try {
      await signInWithEmailAndPassword(auth, email, password);
      modal?.classList.add("hidden");
      loginForm.reset();
    } catch (err) {
      console.error("Gagal login:", err);
      alert(err?.message || "Gagal login.");
    }
  });

  logoutBtn?.addEventListener("click", async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Gagal logout:", err);
      alert(err?.message || "Gagal logout.");
    }
  });
}

function syncAuthButtons() {
  const btnLoginOpen = document.getElementById("btn-login-open");
  const btnLogout = document.getElementById("btn-logout");

  if (currentUser) {
    btnLoginOpen?.classList.add("hidden");
    btnLogout?.classList.remove("hidden");
  } else {
    btnLoginOpen?.classList.remove("hidden");
    btnLogout?.classList.add("hidden");
  }
}

function requireLoginOrOpenModal() {
  if (currentUser) return true;
  alert("Silakan login dulu ya.");
  document.getElementById("auth-modal")?.classList.remove("hidden");
  return false;
}

// =========================
// NAVIGASI TAB
// =========================
function initTabs() {
  const navButtons = document.querySelectorAll(".nav-link");
  const sections = document.querySelectorAll(".tab-content");

  navButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetId = btn.dataset.tab;

      navButtons.forEach((b) => b.classList.remove("active"));
      sections.forEach((sec) => sec.classList.remove("active"));

      btn.classList.add("active");
      document.getElementById(targetId)?.classList.add("active");
    });
  });
}

function initHeroButtonJump() {
  document.querySelectorAll("[data-tab-jump]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetTab = btn.dataset.tabJump;
      document.querySelector(`.nav-link[data-tab="${targetTab}"]`)?.click();
    });
  });
}

// =========================
// DB LISTENERS (PER USER)
// =========================
function attachDbListeners(uid) {
  detachDbListeners();

  tasksRef = ref(db, tasksPath(uid));
  scheduleRef = ref(db, schedulePath(uid));

  tasksHandler = (snapshot) => {
    const data = snapshot.val() || {};
    currentTasks = Object.keys(data).map((id) => ({ id, ...data[id] }));
    currentTasks.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

    renderTasks();
    renderTaskSelectOptions();
    renderDashboard();
  };

  scheduleHandler = (snapshot) => {
    const data = snapshot.val() || {};
    currentSchedule = Object.keys(data).map((id) => ({ id, ...data[id] }));
    currentSchedule.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
    renderScheduleTable();
  };

  onValue(tasksRef, tasksHandler, (err) => console.error("Error tasks:", err));
  onValue(scheduleRef, scheduleHandler, (err) => console.error("Error schedule:", err));
}

function detachDbListeners() {
  if (tasksRef && tasksHandler) off(tasksRef, "value", tasksHandler);
  if (scheduleRef && scheduleHandler) off(scheduleRef, "value", scheduleHandler);

  tasksRef = null;
  scheduleRef = null;
  tasksHandler = null;
  scheduleHandler = null;

  currentTasks = [];
  currentSchedule = [];
}

function resetUIWhenLoggedOut() {
  Object.values(categoryToContainerId).forEach((id) => {
    const container = document.getElementById(id);
    if (container) container.innerHTML = "";
  });

  const select = document.getElementById("schedule-task");
  if (select) select.innerHTML = `<option value="">-- Pilih Task dari Daftar --</option>`;

  renderEmptyScheduleGrid();
  renderDashboard();
}

// =========================
// FORM TASK
// =========================
function initTaskForm() {
  const form = document.getElementById("task-form");
  const titleInput = document.getElementById("task-title");
  const categorySelect = document.getElementById("task-category");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!requireLoginOrOpenModal()) return;

    const title = (titleInput?.value || "").trim();
    const category = categorySelect?.value;

    if (!title || !category) {
      alert("Isi nama task dan pilih kategori dulu ya.");
      return;
    }

    try {
      const newRef = push(ref(db, tasksPath(currentUser.uid)));
      await set(newRef, {
        title,
        category,
        status: "pending",
        createdAt: Date.now(),
      });
      form.reset();
    } catch (err) {
      console.error("Gagal menambahkan task:", err);
      alert("Gagal menyimpan task ke Realtime Database.");
    }
  });
}

// =========================
// RENDER TASKS
// =========================
function renderTasks() {
  Object.values(categoryToContainerId).forEach((id) => {
    const container = document.getElementById(id);
    if (container) container.innerHTML = "";
  });

  currentTasks.forEach((task) => {
    const containerId = categoryToContainerId[task.category];
    const container = document.getElementById(containerId);
    if (!container) return;

    const card = document.createElement("div");
    card.className = "task-card";
    if (task.status === "done") card.classList.add("done");

    card.innerHTML = `
      <div class="task-title">${escapeHtml(task.title)}</div>
      <div class="task-actions">
        <button class="btn-small btn-outline" data-action="toggle" data-id="${task.id}">
          ${task.status === "done" ? "Ulangi" : "Selesai"}
        </button>
        <button class="btn-small btn-danger" data-action="delete" data-id="${task.id}">
          Hapus
        </button>
      </div>
    `;

    container.appendChild(card);
  });

  document.querySelectorAll(".task-actions button").forEach((btn) => {
    btn.onclick = async () => {
      if (!requireLoginOrOpenModal()) return;

      const id = btn.dataset.id;
      const action = btn.dataset.action;
      const task = currentTasks.find((t) => t.id === id);
      if (!task) return;

      if (action === "toggle") {
        try {
          const newStatus = task.status === "done" ? "pending" : "done";
          await update(ref(db, `${tasksPath(currentUser.uid)}/${id}`), { status: newStatus });
        } catch (err) {
          console.error("Gagal mengubah status task:", err);
        }
      }

      if (action === "delete") {
        const sure = confirm("Yakin ingin menghapus task ini? Task juga akan dihapus dari jadwal.");
        if (!sure) return;

        try {
          // hapus semua schedule yang pakai taskId ini
          const sBase = ref(db, schedulePath(currentUser.uid));
          const q = query(sBase, orderByChild("taskId"), equalTo(id));
          const snap = await get(q);

          const updatesMap = {};
          snap.forEach((child) => {
            updatesMap[child.key] = null;
          });

          if (Object.keys(updatesMap).length > 0) {
            await update(sBase, updatesMap);
          }

          await remove(ref(db, `${tasksPath(currentUser.uid)}/${id}`));
        } catch (err) {
          console.error("Gagal menghapus task:", err);
        }
      }
    };
  });
}

// =========================
// SELECT TASK UNTUK WEEKLY TRACKER
// =========================
function renderTaskSelectOptions() {
  const select = document.getElementById("schedule-task");
  if (!select) return;

  select.innerHTML = `<option value="">-- Pilih Task dari Daftar --</option>`;
  currentTasks.forEach((task) => {
    const opt = document.createElement("option");
    opt.value = task.id;
    opt.textContent = `[${task.category}] ${task.title}`;
    select.appendChild(opt);
  });
}

// =========================
// FORM SCHEDULE
// =========================
function initScheduleForm() {
  const form = document.getElementById("schedule-form");
  if (!form) return;

  const daySelect = document.getElementById("schedule-day");
  const timeSelect = document.getElementById("schedule-time");
  const taskSelect = document.getElementById("schedule-task");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!requireLoginOrOpenModal()) return;

    const day = daySelect?.value;
    const time = timeSelect?.value;
    const taskId = taskSelect?.value;

    if (!day || !time || !taskId) {
      alert("Pilih hari, waktu, dan task dulu ya.");
      return;
    }

    const task = currentTasks.find((t) => t.id === taskId);
    if (!task) {
      alert("Task tidak ditemukan. Coba muat ulang halaman.");
      return;
    }

    try {
      const newRef = push(ref(db, schedulePath(currentUser.uid)));
      await set(newRef, {
        day,
        time,
        taskId,
        taskTitle: task.title,
        category: task.category,
        createdAt: Date.now(),
      });

      if (timeSelect) timeSelect.value = "";
      if (taskSelect) taskSelect.value = "";
    } catch (err) {
      console.error("Gagal menyimpan jadwal:", err);
      alert("Gagal menyimpan ke Realtime Database.");
    }
  });
}

// =========================
// SCHEDULE TABLE
// =========================
function renderEmptyScheduleGrid() {
  const tbody = document.getElementById("schedule-body");
  if (!tbody) return;

  tbody.innerHTML = "";

  TIMES_OF_DAY.forEach((time) => {
    const tr = document.createElement("tr");

    const th = document.createElement("th");
    th.textContent = time;
    tr.appendChild(th);

    DAYS_OF_WEEK.forEach((day) => {
      const td = document.createElement("td");
      td.dataset.day = day;
      td.dataset.time = time;
      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });
}

function renderScheduleTable() {
  renderEmptyScheduleGrid();
  const tbody = document.getElementById("schedule-body");
  if (!tbody) return;

  currentSchedule.forEach((entry) => {
    const selector = `td[data-day="${entry.day}"][data-time="${entry.time}"]`;
    const cell = tbody.querySelector(selector);
    if (!cell) return;

    const item = document.createElement("div");
    item.className = "schedule-item";
    item.innerHTML = `
      <span class="schedule-task-title">${escapeHtml(entry.taskTitle)}</span>
      <button class="btn-icon" data-id="${entry.id}" title="Hapus dari jadwal">✕</button>
    `;
    cell.appendChild(item);
  });

  tbody.querySelectorAll(".schedule-item .btn-icon").forEach((btn) => {
    btn.onclick = async () => {
      if (!requireLoginOrOpenModal()) return;

      const id = btn.dataset.id;
      try {
        await remove(ref(db, `${schedulePath(currentUser.uid)}/${id}`));
      } catch (err) {
        console.error("Gagal menghapus jadwal:", err);
      }
    };
  });
}

// =========================
// DASHBOARD
// =========================
function renderDashboard() {
  const total = currentTasks.length;
  const done = currentTasks.filter((t) => t.status === "done").length;
  const pending = total - done;

  const totalEl = document.getElementById("stat-total");
  const doneEl = document.getElementById("stat-done");
  const pendingEl = document.getElementById("stat-pending");

  if (totalEl) totalEl.textContent = total;
  if (doneEl) doneEl.textContent = done;
  if (pendingEl) pendingEl.textContent = pending;

  const list = document.getElementById("dashboard-task-list");
  if (!list) return;
  list.innerHTML = "";

  currentTasks.forEach((task) => {
    const li = document.createElement("li");
    li.className = "dashboard-task-item";
    if (task.status === "done") li.classList.add("done");

    const statusClass = task.status === "done" ? "badge-success" : "badge-warning";
    const statusText = task.status === "done" ? "Selesai" : "Belum";

    li.innerHTML = `
      <span>[${task.category}] ${escapeHtml(task.title)}</span>
      <span class="badge ${statusClass}">${statusText}</span>
    `;
    list.appendChild(li);
  });
}

// =========================
// UTIL
// =========================
function escapeHtml(text) {
  if (!text) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
