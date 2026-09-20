const SUPABASE_URL = "https://ztlnszexrwximmmomdui.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_aAK8s-mKAmV6JZdTyN_PIg_iifwClYn";
const ADMIN_EMAIL = "cattleya16herculis14@gmail.com";

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

const $ = (id) => document.getElementById(id);

function setMessage(el, message, type = "") {
  if (!el) return;
  el.textContent = message;
  el.className = `form-message ${type}`.trim();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString();
}

// Mobile navigation
const menuBtn = document.querySelector(".menu-btn");
const nav = document.querySelector("nav");
if (menuBtn && nav) {
  menuBtn.addEventListener("click", () => nav.classList.toggle("open"));
  nav.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => nav.classList.remove("open")));
}

// Registration modal
const modal = $("registerModal");
const registerBtn = $("registerBtn");
const closeRegister = $("closeRegister");
if (registerBtn && modal) {
  registerBtn.addEventListener("click", () => {
    modal.setAttribute("aria-hidden", "false");
    modal.classList.add("show");
  });
}
if (closeRegister && modal) {
  closeRegister.addEventListener("click", () => {
    modal.setAttribute("aria-hidden", "true");
    modal.classList.remove("show");
  });
}
if (modal) {
  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.setAttribute("aria-hidden", "true");
      modal.classList.remove("show");
    }
  });
}

// Student registration
const registerForm = $("registerForm");
if (registerForm) {
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const firstName = $("regFirstName").value.trim();
    const lastName = $("regLastName").value.trim();
    const email = $("regEmail").value.trim().toLowerCase();
    const password = $("regPassword").value;
    const msg = $("registerMessage");

    setMessage(msg, "Creating account…");

    const { data, error } = await db.auth.signUp({
      email,
      password,
      options: {
        data: { first_name: firstName, last_name: lastName },
        emailRedirectTo: "https://hanah2026.github.io/"
      }
    });

    if (error) {
      setMessage(msg, error.message, "error");
      return;
    }

    if (data.session) {
      setMessage(msg, "Account created successfully. You can now sign in.", "success");
    } else {
      setMessage(msg, "Account created. Please check your email to confirm the account, then sign in.", "success");
    }
  });
}

// Login
const loginForm = $("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = $("email").value.trim().toLowerCase();
    const password = $("password").value;
    const msg = $("loginMessage");
    setMessage(msg, "Signing in…");

    const { data, error } = await db.auth.signInWithPassword({ email, password });
    if (error) {
      setMessage(msg, error.message, "error");
      return;
    }

    await showPortalForUser(data.user);
  });
}

function ensurePortalMessageArea() {
  let area = $("portalAccountArea");
  if (area) return area;
  const section = $("student-login");
  if (!section) return null;
  const container = section.querySelector(".container");
  area = document.createElement("div");
  area.id = "portalAccountArea";
  area.className = "portal-account-area";
  container.appendChild(area);
  return area;
}

function ensureAdminPanel() {
  let panel = $("adminDashboard");
  if (panel) return panel;
  const section = $("student-login");
  const container = section.querySelector(".container");
  panel = document.createElement("div");
  panel.id = "adminDashboard";
  panel.className = "admin-dashboard";
  panel.innerHTML = `
    <div class="admin-head">
      <div>
        <p class="eyebrow">ACADEMY ADMINISTRATION</p>
        <h2>Academy <span>Admin Dashboard</span></h2>
        <p class="admin-subtitle">Manage student registration and approve new academy members.</p>
      </div>
      <button id="adminRefresh" class="btn outline" type="button">REFRESH</button>
    </div>
    <div class="admin-stats">
      <div><strong id="totalStudents">0</strong><small>Total Students</small></div>
      <div><strong id="pendingStudents">0</strong><small>Pending</small></div>
      <div><strong id="activeStudents">0</strong><small>Active</small></div>
    </div>
    <div class="admin-table-wrap">
      <table class="admin-table">
        <thead><tr><th>Student</th><th>Email</th><th>Belt</th><th>Status</th><th>Date Joined</th><th>Action</th></tr></thead>
        <tbody id="studentRows"><tr><td colspan="6">Loading student records…</td></tr></tbody>
      </table>
    </div>
    <p id="adminMessage" class="form-message"></p>
  `;
  container.appendChild(panel);
  $("adminRefresh").addEventListener("click", loadAdminStudents);
  return panel;
}

function ensureSignOutButton() {
  let btn = $("portalSignOut");
  if (btn) return btn;
  const area = ensurePortalMessageArea();
  btn = document.createElement("button");
  btn.id = "portalSignOut";
  btn.className = "btn outline portal-signout";
  btn.type = "button";
  btn.textContent = "SIGN OUT";
  area.appendChild(btn);
  btn.addEventListener("click", async () => {
    await db.auth.signOut();
    window.location.reload();
  });
  return btn;
}

async function loadStudentProfile(user) {
  const { data, error } = await db
    .from("students")
    .select("id, student_id, first_name, middle_name, last_name, current_belt, status, date_joined")
    .eq("id", user.id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function showStudentPortal(user) {
  const form = $("loginForm");
  const info = document.querySelector(".portal-info");
  const profile = await loadStudentProfile(user);
  const area = ensurePortalMessageArea();
  ensureSignOutButton();

  if (form) form.style.display = "none";
  if (info) info.style.display = "none";

  if (!profile) {
    area.insertAdjacentHTML("afterbegin", `<div class="welcome-card"><h3>ACCOUNT FOUND</h3><p>Your account is active, but your academy profile has not been created yet.</p></div>`);
    return;
  }

  const name = [profile.first_name, profile.middle_name, profile.last_name].filter(Boolean).join(" ");
  area.insertAdjacentHTML("afterbegin", `
    <div class="welcome-card">
      <p class="eyebrow">STUDENT ACCOUNT</p>
      <h3>Welcome, ${escapeHtml(name || user.email)}!</h3>
      <div class="welcome-details">
        <span><b>Status</b>${escapeHtml(profile.status || "Pending")}</span>
        <span><b>Belt</b>${escapeHtml(profile.current_belt || "White Belt")}</span>
        <span><b>Student ID</b>${escapeHtml(profile.student_id || "Pending assignment")}</span>
        <span><b>Date Joined</b>${formatDate(profile.date_joined)}</span>
      </div>
      <p class="portal-note">Your academy account is connected successfully. Additional attendance, promotion and payment features can be added to this portal.</p>
    </div>
  `);
}

async function loadAdminStudents() {
  const rows = $("studentRows");
  const msg = $("adminMessage");
  if (!rows) return;
  rows.innerHTML = `<tr><td colspan="6">Loading student records…</td></tr>`;
  setMessage(msg, "");

  const { data, error } = await db
    .from("students")
    .select("id, student_id, first_name, middle_name, last_name, current_belt, status, date_joined, created_at, auth_user_email")
    .order("created_at", { ascending: false });

  // auth_user_email is not part of the schema; if the select fails, retry with the real columns.
  let students = data;
  if (error) {
    const retry = await db
      .from("students")
      .select("id, student_id, first_name, middle_name, last_name, current_belt, status, date_joined, created_at")
      .order("created_at", { ascending: false });
    if (retry.error) {
      rows.innerHTML = `<tr><td colspan="6">${escapeHtml(retry.error.message)}</td></tr>`;
      setMessage(msg, retry.error.message, "error");
      return;
    }
    students = retry.data || [];
  }

  students = students || [];
  const pending = students.filter(s => (s.status || "Pending").toLowerCase() === "pending").length;
  const active = students.filter(s => (s.status || "").toLowerCase() === "active").length;
  $("totalStudents").textContent = students.length;
  $("pendingStudents").textContent = pending;
  $("activeStudents").textContent = active;

  if (!students.length) {
    rows.innerHTML = `<tr><td colspan="6">No student records found.</td></tr>`;
    return;
  }

  rows.innerHTML = students.map((s) => {
    const name = [s.first_name, s.middle_name, s.last_name].filter(Boolean).join(" ") || "Unnamed Student";
    const status = s.status || "Pending";
    const action = status.toLowerCase() === "active"
      ? `<span class="status-active">ACTIVE</span>`
      : `<button class="approve-btn" data-id="${escapeHtml(s.id)}" type="button">APPROVE</button>`;
    return `<tr>
      <td><strong>${escapeHtml(name)}</strong><small>${escapeHtml(s.student_id || "")}</small></td>
      <td>Student account</td>
      <td>${escapeHtml(s.current_belt || "White Belt")}</td>
      <td><span class="status-${status.toLowerCase()}">${escapeHtml(status.toUpperCase())}</span></td>
      <td>${formatDate(s.date_joined || s.created_at)}</td>
      <td>${action}</td>
    </tr>`;
  }).join("");

  // Use event delegation so the approval button continues to work reliably
  // even when the table is rebuilt after refreshes.
  rows.onclick = async (event) => {
    const btn = event.target.closest(".approve-btn");
    if (!btn) return;
    event.preventDefault();
    event.stopPropagation();
    await approveStudent(btn.dataset.id, btn);
  };
}

async function approveStudent(studentId, button) {
  const msg = $("adminMessage");
  if (!studentId) {
    setMessage(msg, "Unable to approve: student ID is missing.", "error");
    return;
  }

  if (button) {
    button.disabled = true;
    button.textContent = "APPROVING…";
  }
  setMessage(msg, "Approving student…");

  try {
    const { error } = await db
      .from("students")
      .update({ status: "Active" })
      .eq("id", studentId);

    if (error) {
      console.error("Approval update failed:", error);
      setMessage(msg, "Approval failed: " + error.message, "error");
      if (button) { button.disabled = false; button.textContent = "APPROVE"; }
      return;
    }

    setMessage(msg, "Student approved successfully. Refreshing…", "success");
    await loadAdminStudents();
  } catch (err) {
    console.error("Approval exception:", err);
    setMessage(msg, "Approval failed: " + (err.message || String(err)), "error");
    if (button) { button.disabled = false; button.textContent = "APPROVE"; }
  }
}

async function showAdminPortal(user) {
  const form = $("loginForm");
  const info = document.querySelector(".portal-info");
  const panel = ensureAdminPanel();
  const area = ensurePortalMessageArea();
  ensureSignOutButton();

  if (form) form.style.display = "none";
  if (info) info.style.display = "none";
  panel.style.display = "block";
  area.insertAdjacentHTML("afterbegin", `
    <div class="welcome-card admin-welcome">
      <p class="eyebrow">AUTHORIZED ADMINISTRATOR</p>
      <h3>Welcome, Master Reynaldo!</h3>
      <p>Administrator account: ${escapeHtml(user.email)}</p>
    </div>
  `);
  await loadAdminStudents();
}

async function showPortalForUser(user) {
  if (!user) return;
  // Clear previous dynamic portal content before rendering the current account.
  const area = $("portalAccountArea");
  if (area) area.remove();
  const panel = $("adminDashboard");
  if (panel) panel.remove();

  if ((user.email || "").toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
    await showAdminPortal(user);
  } else {
    await showStudentPortal(user);
  }

  document.getElementById("student-login")?.scrollIntoView({ behavior: "smooth", block: "start" });
}



// Password recovery: Supabase redirects to the site with a recovery session.
// Show a password-update form instead of sending the user to the normal login screen.
function showPasswordRecovery() {
  const section = $("student-login");
  if (!section) return;
  const container = section.querySelector(".container");
  if (!container) return;

  const existing = $("passwordRecoveryPanel");
  if (existing) existing.remove();

  const panel = document.createElement("div");
  panel.id = "passwordRecoveryPanel";
  panel.className = "portal-form";
  panel.innerHTML = `
    <h3>RESET PASSWORD</h3>
    <p class="portal-note">Enter a new password for your academy account.</p>
    <label>New password<input type="password" id="newPassword" minlength="6" placeholder="New password" required></label>
    <label>Confirm password<input type="password" id="confirmPassword" minlength="6" placeholder="Confirm password" required></label>
    <button class="btn primary" id="updatePasswordBtn" type="button">UPDATE PASSWORD</button>
    <p id="recoveryMessage" class="form-message"></p>
  `;
  container.appendChild(panel);
  section.scrollIntoView({ behavior: "smooth", block: "start" });

  $("updatePasswordBtn").addEventListener("click", async () => {
    const newPassword = $("newPassword").value;
    const confirmPassword = $("confirmPassword").value;
    const msg = $("recoveryMessage");

    if (newPassword.length < 6) {
      setMessage(msg, "Password must be at least 6 characters.", "error");
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage(msg, "Passwords do not match.", "error");
      return;
    }

    const btn = $("updatePasswordBtn");
    btn.disabled = true;
    btn.textContent = "UPDATING…";
    setMessage(msg, "Updating password…");

    const { error } = await db.auth.updateUser({ password: newPassword });
    if (error) {
      setMessage(msg, "Password update failed: " + error.message, "error");
      btn.disabled = false;
      btn.textContent = "UPDATE PASSWORD";
      return;
    }

    setMessage(msg, "Password updated successfully. You can now sign in with your new password.", "success");
    setTimeout(async () => {
      await db.auth.signOut();
      window.location.hash = "student-login";
      window.location.reload();
    }, 1200);
  });
}

// Handle Supabase recovery links after they redirect back to GitHub Pages.
db.auth.onAuthStateChange((event) => {
  if (event === "PASSWORD_RECOVERY") {
    setTimeout(showPasswordRecovery, 0);
  }
});

// Restore an existing session after refresh.
db.auth.getSession().then(async ({ data }) => {
  if (data.session?.user) {
    try {
      await showPortalForUser(data.session.user);
    } catch (err) {
      console.error(err);
      setMessage($("loginMessage"), err.message || "Unable to load your account.", "error");
    }
  }
});
