// =========================
// KONFIGURASI FIREBASE (PROJECT: akar-literasi-navigator-weekly)
// =========================

const firebaseConfig = {
  apiKey: "AIzaSyBwdtgYHvSMqz6jXUisc7djvJ7ixkfK6yY",
  authDomain: "akar-literasi-navigator-weekly.firebaseapp.com",
  databaseURL: "https://akar-literasi-navigator-weekly-default-rtdb.firebaseio.com",
  projectId: "akar-literasi-navigator-weekly",
  storageBucket: "akar-literasi-navigator-weekly.appspot.com",
  messagingSenderId: "755822522562",
  appId: "1:755822522562:web:ff2fc9baa0995d79cdcb5b",
  measurementId: "G-P3S98D4WPW"
};

firebase.initializeApp(firebaseConfig);

// Realtime Database & Auth
const db = firebase.database();
const auth = firebase.auth();

// =========================
// KONSTANTA
// =========================

// Nilai kategori mengikuti value <option> di index.html
const CATEGORIES = [
  "Penting & Mendesak",           // Prioritas
  "Penting tapi Tidak Mendesak",  // Investasi
  "Tidak Penting tapi Mendesak",  // Kegiatan Tak Terduga
  "Tidak Penting & Tidak Mendesak"// Refreshing
];

const TIMES_OF_DAY = ["Pagi", "Siang", "Sore", "Malam"];
const DAYS_OF_WEEK = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];

// Mapping kategori → id container di HTML
const categoryToContainerId = {
  "Penting & Mendesak": "kuadran1-list",
  "Penting tapi Tidak Mendesak": "kuadran2-list",
  "Tidak Penting tapi Mendesak": "kuadran3-list",
  "Tidak Penting & Tidak Mendesak": "kuadran4-list"
};

// Mapping nama kategori untuk tampilan (label baru)
const CATEGORY_LABELS = {
  "Penting & Mendesak": "Prioritas",
  "Penting tapi Tidak Mendesak": "Investasi",
  "Tidak Penting tapi Mendesak": "Kegiatan Tak Terduga",
  "Tidak Penting & Tidak Mendesak": "Refreshing"
};

function getCategoryLabel(raw) {
  return CATEGORY_LABELS[raw] || raw;
}

// State di memori
let currentTasks = [];
let currentSchedule = [];
let tasksUnsubscribe = null;
let scheduleUnsubscribe = null;

// =========================
// HELPER REF REALTIME DATABASE
// =========================
function userBaseRef(uid) {
  return db.ref("users/" + uid);
}

function userTasksRef(uid) {
  return db.ref("users/" + uid + "/tasks");
}

function userScheduleRef(uid) {
  return db.ref("users/" + uid + "/schedule");
}

// =========================
// INISIALISASI
// =========================
document.addEventListener("DOMContentLoaded", () => {
  initTabs();
  initHeroButtonJump();
  initTaskForm();
  initScheduleForm();
  initAuthUI();
  renderEmptyScheduleGrid();

  // Dengarkan perubahan login
  auth.onAuthStateChanged(handleAuthStateChanged);
});

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
      const targetSection = document.getElementById(targetId);
      if (targetSection) {
        targetSection.classList.add("active");
      }
    });
  });
}

function initHeroButtonJump() {
  document.querySelectorAll("[data-tab-jump]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetTab = btn.dataset.tabJump;
      const navButton = document.querySelector(
        `.nav-link[data-tab="${targetTab}"]`
      );
      if (navButton) navButton.click();
    });
  });
}

// =========================
// AUTH UI
// =========================
function initAuthUI() {
  const modal = document.getElementById("auth-modal");
  const openBtn = document.getElementById("btn-login-open");
  const closeBtn = document.getElementById("auth-close");
  const logoutBtn = document.getElementById("btn-logout");

  const authTabs = document.querySelectorAll(".auth-tab");
  const forms = document.querySelectorAll(".auth-form");

  const loginForm = document.getElementById("login-form");
  const registerForm = document.getElementById("register-form");

  // Buka modal
  if (openBtn && modal) {
    openBtn.addEventListener("click", () => {
      modal.classList.remove("hidden");
    });
  }

  // Tutup modal via tombol X
  if (closeBtn && modal) {
    closeBtn.addEventListener("click", () => {
      modal.classList.add("hidden");
    });
  }

  // Tutup modal jika klik area gelap
  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.classList.add("hidden");
    });
  }

  // Tab Masuk / Daftar
  authTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const target = tab.dataset.authTab;

      authTabs.forEach((t) => t.classList.remove("active"));
      forms.forEach((f) => f.classList.remove("active"));

      tab.classList.add("active");
      const targetForm = document.getElementById(`${target}-form`);
      if (targetForm) targetForm.classList.add("active");
    });
  });

  // Form login
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("login-email").value.trim();
      const password = document.getElementById("login-password").value.trim();

      try {
        await auth.signInWithEmailAndPassword(email, password);
        modal.classList.add("hidden");
        loginForm.reset();
      } catch (error) {
        console.error("Gagal login:", error);
        alert(error.message || "Gagal login.");
      }
    });
  }

  // Form daftar
  if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("register-email").value.trim();
      const password = document
        .getElementById("register-password")
        .value.trim();

      try {
        const cred = await auth.createUserWithEmailAndPassword(
          email,
          password
        );

        // Simpan profil user sederhana di Realtime Database
        await userBaseRef(cred.user.uid).child("profile").set({
          email,
          createdAt: Date.now()
        });

        modal.classList.add("hidden");
        registerForm.reset();
        alert("Akun berhasil dibuat. Kamu sudah login.");
      } catch (error) {
        console.error("Gagal daftar:", error);
        alert(error.message || "Gagal mendaftar.");
      }
    });
  }

  // Logout
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      try {
        await auth.signOut();
      } catch (error) {
        console.error("Gagal logout:", error);
      }
    });
  }
}

// =========================
// AUTH STATE HANDLER
// =========================
function handleAuthStateChanged(user) {
  const emailLabel = document.getElementById("user-email-label");
  const loginBtn = document.getElementById("btn-login-open");
  const logoutBtn = document.getElementById("btn-logout");

  // Matikan listener lama dulu
  if (tasksUnsubscribe) {
    tasksUnsubscribe();
    tasksUnsubscribe = null;
  }
  if (scheduleUnsubscribe) {
    scheduleUnsubscribe();
    scheduleUnsubscribe = null;
  }

  if (user) {
    // Sudah login
    if (emailLabel) emailLabel.textContent = user.email || "User tanpa email";
    if (loginBtn) loginBtn.style.display = "inline-flex";
    if (logoutBtn) logoutBtn.style.display = "inline-flex";
    if (loginBtn) loginBtn.style.display = "none";

    // Listener data per user
    subscribeToTasksForUser(user.uid);
    subscribeToScheduleForUser(user.uid);
  } else {
    // Belum login
    if (emailLabel) emailLabel.textContent = "Belum login";
    if (loginBtn) loginBtn.style.display = "inline-flex";
    if (logoutBtn) logoutBtn.style.display = "none";

    currentTasks = [];
    currentSchedule = [];
    renderTasks();
    renderTaskSelectOptions();
    renderDashboard();
    renderEmptyScheduleGrid();
  }
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
    const title = titleInput.value.trim();
    const category = categorySelect.value;

    if (!auth.currentUser) {
      alert("Silakan login terlebih dahulu sebelum menambahkan task.");
      return;
    }

    if (!title || !category) {
      alert("Isi nama task dan pilih kuadran dulu ya.");
      return;
    }

    const tasksRef = userTasksRef(auth.currentUser.uid);

    try {
      const newTaskRef = tasksRef.push();
      await newTaskRef.set({
        title,
        category,
        status: "pending",
        createdAt: Date.now()
      });

      form.reset();
    } catch (error) {
      console.error("Gagal menambahkan task:", error);
      alert("Gagal menyimpan task ke Realtime Database.");
    }
  });
}

// =========================
// REALTIME LISTENER: TASKS
// =========================
function subscribeToTasksForUser(uid) {
  const ref = userTasksRef(uid);

  // Simpan fungsi unsubscribe
  tasksUnsubscribe = () => ref.off();

  ref.on(
    "value",
    (snapshot) => {
      const data = snapshot.val() || {};
      currentTasks = [];

      Object.keys(data).forEach((key) => {
        currentTasks.push({ id: key, ...data[key] });
      });

      // Urutkan berdasarkan createdAt
      currentTasks.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

      renderTasks();
      renderTaskSelectOptions();
      renderDashboard();
    },
    (error) => {
      console.error("Error mengambil tasks:", error);
    }
  );
}

// RENDER TASK KE KOLUMNYA
function renderTasks() {
  // Kosongkan semua list
  Object.values(categoryToContainerId).forEach((id) => {
    const container = document.getElementById(id);
    if (container) container.innerHTML = "";
  });

  // Render per task
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

  // Event listener untuk tombol (toggle & delete)
  document.querySelectorAll(".task-actions button").forEach((btn) => {
    btn.onclick = async () => {
      const id = btn.dataset.id;
      const action = btn.dataset.action;
      const task = currentTasks.find((t) => t.id === id);
      if (!task) return;

      const user = auth.currentUser;
      if (!user) {
        alert("Silakan login terlebih dahulu.");
        return;
      }

      const tasksRef = userTasksRef(user.uid);
      const scheduleRef = userScheduleRef(user.uid);

      if (action === "toggle") {
        try {
          const newStatus = task.status === "done" ? "pending" : "done";
          await tasksRef.child(id).update({ status: newStatus });
        } catch (error) {
          console.error("Gagal mengubah status task:", error);
        }
      } else if (action === "delete") {
        const sure = confirm(
          "Yakin ingin menghapus task ini? Task juga akan dihapus dari jadwal."
        );
        if (!sure) return;

        try {
          // Hapus semua schedule yang pakai taskId ini
          const snap = await scheduleRef
            .orderByChild("taskId")
            .equalTo(id)
            .once("value");

          const updates = {};
          snap.forEach((child) => {
            updates[child.key] = null;
          });

          if (Object.keys(updates).length > 0) {
            await scheduleRef.update(updates);
          }

          await tasksRef.child(id).remove();
        } catch (error) {
          console.error("Gagal menghapus task:", error);
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
    opt.textContent = `[${getCategoryLabel(task.category)}] ${task.title}`;
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

    const user = auth.currentUser;
    if (!user) {
      alert("Silakan login terlebih dahulu sebelum mengatur jadwal.");
      return;
    }

    const day = daySelect.value;
    const time = timeSelect.value;
    const taskId = taskSelect.value;

    if (!day || !time || !taskId) {
      alert("Pilih hari, waktu, dan task dulu.");
      return;
    }

    const task = currentTasks.find((t) => t.id === taskId);
    if (!task) {
      alert("Task tidak ditemukan. Coba muat ulang halaman.");
      return;
    }

    const schedRef = userScheduleRef(user.uid);

    try {
      const newScheduleRef = schedRef.push();
      await newScheduleRef.set({
        day,
        time,
        taskId,
        taskTitle: task.title,
        category: task.category,
        createdAt: Date.now()
      });

      timeSelect.value = "";
      taskSelect.value = "";
    } catch (error) {
      console.error("Gagal menyimpan jadwal:", error);
      alert("Gagal menyimpan jadwal ke Realtime Database.");
    }
  });
}

// =========================
// REALTIME LISTENER: SCHEDULE
// =========================
function subscribeToScheduleForUser(uid) {
  const ref = userScheduleRef(uid);

  scheduleUnsubscribe = () => ref.off();

  ref.on(
    "value",
    (snapshot) => {
      const data = snapshot.val() || {};
      currentSchedule = [];

      Object.keys(data).forEach((key) => {
        currentSchedule.push({ id: key, ...data[key] });
      });

      currentSchedule.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

      renderScheduleTable();
    },
    (error) => {
      console.error("Error mengambil schedule:", error);
    }
  );
}

// Buat grid kosong
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

// Isi grid dengan data schedule
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

  // Tombol hapus di setiap item jadwal
  tbody.querySelectorAll(".schedule-item .btn-icon").forEach((btn) => {
    btn.onclick = async () => {
      const user = auth.currentUser;
      if (!user) {
        alert("Silakan login terlebih dahulu.");
        return;
      }

      const id = btn.dataset.id;
      const schedRef = userScheduleRef(user.uid);

      try {
        await schedRef.child(id).remove();
      } catch (error) {
        console.error("Gagal menghapus jadwal:", error);
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

    const statusClass =
      task.status === "done" ? "badge-success" : "badge-warning";
    const statusText = task.status === "done" ? "Selesai" : "Belum";

    li.innerHTML = `
      <span>[${getCategoryLabel(task.category)}] ${escapeHtml(
      task.title
    )}</span>
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
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
