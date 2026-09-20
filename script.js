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
  await loadStudentPromotions(user.id);
}


async function generateStudentId() {
  const year = new Date().getFullYear();
  const prefix = `HNT-${year}-`;
  const { data, error } = await db
    .from("students")
    .select("student_id")
    .like("student_id", `${prefix}%`);
  if (error) throw error;

  let max = 0;
  for (const row of (data || [])) {
    const match = String(row.student_id || "").match(new RegExp(`^HNT-${year}-(\\d+)$`));
    if (match) max = Math.max(max, Number(match[1]));
  }
  return `${prefix}${String(max + 1).padStart(4, "0")}`;
}

async function ensureStudentId(studentId) {
  const { data: existing, error: readError } = await db
    .from("students")
    .select("id, student_id")
    .eq("id", studentId)
    .maybeSingle();
  if (readError) throw readError;
  if (!existing) throw new Error("Student record not found.");
  if (existing.student_id) return existing.student_id;

  const newId = await generateStudentId();
  const { error: updateError } = await db
    .from("students")
    .update({ student_id: newId })
    .eq("id", studentId);
  if (updateError) throw updateError;
  return newId;
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

  // Existing active students created before automatic IDs was added get an ID when the admin dashboard loads.
  if (students.length) {
    for (const student of students) {
      if (!student.student_id && String(student.status || "").toLowerCase() === "active") {
        try {
          student.student_id = await ensureStudentId(student.id);
        } catch (err) {
          console.error("Unable to assign Student ID:", err);
        }
      }
    }
  }

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
    const assignedStudentId = await ensureStudentId(studentId);
    const { error } = await db
      .from("students")
      .update({ status: "Active", student_id: assignedStudentId })
      .eq("id", studentId);

    if (error) {
      console.error("Approval update failed:", error);
      setMessage(msg, "Approval failed: " + error.message, "error");
      if (button) { button.disabled = false; button.textContent = "APPROVE"; }
      return;
    }

    setMessage(msg, `Student approved successfully. Student ID: ${assignedStudentId}`, "success");
    await loadAdminStudents();
  } catch (err) {
    console.error("Approval exception:", err);
    setMessage(msg, "Approval failed: " + (err.message || String(err)), "error");
    if (button) { button.disabled = false; button.textContent = "APPROVE"; }
  }
}


// Attendance Management
function ensureAttendancePanel() {
  let panel = $("attendancePanel");
  if (panel) return panel;
  const section = $("student-login");
  const container = section?.querySelector(".container");
  if (!container) return null;

  panel = document.createElement("div");
  panel.id = "attendancePanel";
  panel.className = "admin-dashboard attendance-panel";
  panel.style.display = "block";
  panel.innerHTML = `
    <div class="admin-head">
      <div>
        <p class="eyebrow">ATTENDANCE MANAGEMENT</p>
        <h2>Academy <span>Attendance</span></h2>
        <p class="admin-subtitle">Record and review student attendance.</p>
      </div>
      <button id="attendanceRefresh" class="btn outline" type="button">REFRESH</button>
    </div>
    <div class="attendance-form">
      <select id="attendanceStudent" aria-label="Student"></select>
      <input id="attendanceDate" type="date" aria-label="Attendance date">
      <select id="attendanceStatus" aria-label="Attendance status">
        <option value="Present">Present</option>
        <option value="Absent">Absent</option>
        <option value="Late">Late</option>
        <option value="Excused">Excused</option>
      </select>
      <input id="attendanceRemarks" type="text" placeholder="Remarks (optional)">
      <button id="saveAttendance" class="btn" type="button">SAVE ATTENDANCE</button>
    </div>
    <div class="admin-table-wrap">
      <table class="admin-table">
        <thead><tr><th>Student</th><th>Date</th><th>Status</th><th>Remarks</th></tr></thead>
        <tbody id="attendanceRows"><tr><td colspan="4">Loading attendance…</td></tr></tbody>
      </table>
    </div>
    <p id="attendanceMessage" class="form-message"></p>
  `;
  container.appendChild(panel);

  const date = $("attendanceDate");
  if (date) date.value = new Date().toISOString().slice(0,10);
  $("attendanceRefresh")?.addEventListener("click", loadAdminAttendance);
  $("saveAttendance")?.addEventListener("click", saveAttendanceRecord);
  $("attendanceStudent")?.addEventListener("change", loadAdminAttendance);
  return panel;
}

async function loadAttendanceStudents() {
  const select = $("attendanceStudent");
  if (!select) return;
  const { data, error } = await db
    .from("students")
    .select("id, first_name, middle_name, last_name, student_id")
    .order("last_name", { ascending: true });
  if (error) {
    setMessage($("attendanceMessage"), error.message, "error");
    return;
  }
  select.innerHTML = (data || []).map(s => {
    const name = [s.first_name, s.middle_name, s.last_name].filter(Boolean).join(" ") || "Unnamed Student";
    return `<option value="${escapeHtml(s.id)}">${escapeHtml(name)}${s.student_id ? ` — ${escapeHtml(s.student_id)}` : ""}</option>`;
  }).join("") || `<option value="">No students found</option>`;
}

async function loadAdminAttendance() {
  const rows = $("attendanceRows");
  const studentId = $("attendanceStudent")?.value;
  if (!rows) return;
  rows.innerHTML = `<tr><td colspan="4">Loading attendance…</td></tr>`;
  let query = db.from("attendance")
    .select("id, student_id, attendance_date, status, remarks, created_at")
    .order("attendance_date", { ascending: false })
    .limit(100);
  if (studentId) query = query.eq("student_id", studentId);
  const { data, error } = await query;
  if (error) {
    rows.innerHTML = `<tr><td colspan="4">${escapeHtml(error.message)}</td></tr>`;
    setMessage($("attendanceMessage"), error.message, "error");
    return;
  }
  const studentsRes = await db.from("students").select("id, first_name, middle_name, last_name");
  const studentMap = new Map((studentsRes.data || []).map(s => [s.id, [s.first_name,s.middle_name,s.last_name].filter(Boolean).join(" ")]));
  rows.innerHTML = (data || []).map(r => `
    <tr>
      <td>${escapeHtml(studentMap.get(r.student_id) || "Student")}</td>
      <td>${formatDate(r.attendance_date)}</td>
      <td>${escapeHtml(r.status || "")}</td>
      <td>${escapeHtml(r.remarks || "")}</td>
    </tr>`).join("") || `<tr><td colspan="4">No attendance records yet.</td></tr>`;
}

async function saveAttendanceRecord() {
  const studentId = $("attendanceStudent")?.value;
  const attendanceDate = $("attendanceDate")?.value;
  const status = $("attendanceStatus")?.value;
  const remarks = $("attendanceRemarks")?.value.trim() || null;
  const msg = $("attendanceMessage");
  if (!studentId || !attendanceDate) {
    setMessage(msg, "Please select a student and attendance date.", "error");
    return;
  }
  const btn = $("saveAttendance");
  if (btn) { btn.disabled = true; btn.textContent = "SAVING…"; }
  const { error } = await db.from("attendance").insert({
    student_id: studentId,
    attendance_date: attendanceDate,
    status,
    remarks
  });
  if (error) {
    setMessage(msg, "Unable to save attendance: " + error.message, "error");
  } else {
    setMessage(msg, "Attendance saved successfully.", "success");
    if ($("attendanceRemarks")) $("attendanceRemarks").value = "";
    await loadAdminAttendance();
  }
  if (btn) { btn.disabled = false; btn.textContent = "SAVE ATTENDANCE"; }
}

async function ensureStudentAttendancePanel(user, profile) {
  let panel = $("studentAttendancePanel");
  if (panel) return panel;
  const area = ensurePortalMessageArea();
  panel = document.createElement("div");
  panel.id = "studentAttendancePanel";
  panel.className = "welcome-card";
  panel.innerHTML = `
    <p class="eyebrow">ATTENDANCE</p>
    <h3>Attendance History</h3>
    <div class="admin-table-wrap">
      <table class="admin-table">
        <thead><tr><th>Date</th><th>Status</th><th>Remarks</th></tr></thead>
        <tbody id="studentAttendanceRows"><tr><td colspan="3">Loading attendance…</td></tr></tbody>
      </table>
    </div>
  `;
  area.appendChild(panel);
  const { data, error } = await db.from("attendance")
    .select("attendance_date, status, remarks")
    .eq("student_id", user.id)
    .order("attendance_date", { ascending: false })
    .limit(100);
  const rows = $("studentAttendanceRows");
  if (error) {
    rows.innerHTML = `<tr><td colspan="3">${escapeHtml(error.message)}</td></tr>`;
    return panel;
  }
  rows.innerHTML = (data || []).map(r => `
    <tr><td>${formatDate(r.attendance_date)}</td><td>${escapeHtml(r.status || "")}</td><td>${escapeHtml(r.remarks || "")}</td></tr>
  `).join("") || `<tr><td colspan="3">No attendance records yet.</td></tr>`;
  return panel;
}



function ensurePromotionPanel() {
  let panel = $("promotionPanel");
  if (panel) return panel;
  const section = $("student-login");
  const container = section.querySelector(".container");
  panel = document.createElement("div");
  panel.id = "promotionPanel";
  panel.className = "admin-dashboard";
  panel.innerHTML = `
    <div class="admin-head"><div>
      <p class="eyebrow">PROMOTION MANAGEMENT</p>
      <h2>🥋 Promotion History</h2>
      <p class="admin-subtitle">Record student belt promotions and review promotion history.</p>
    </div><button id="promotionRefresh" class="btn outline" type="button">REFRESH</button></div>
    <div class="admin-form-grid">
      <label>Student<select id="promotionStudent"></select></label>
      <label>Previous Belt<select id="previousBelt"><option>White Belt</option><option>Yellow Belt</option><option>Orange Belt</option><option>Green Belt</option><option>Blue Belt</option><option>Purple Belt</option><option>Brown Belt</option><option>Stripe Brown Belt</option><option>Red Belt</option><option>Stripe Red Belt</option></select></label>
      <label>New Belt<select id="newBelt"><option>Yellow Belt</option><option>Orange Belt</option><option>Green Belt</option><option>Blue Belt</option><option>Purple Belt</option><option>Brown Belt</option><option>Stripe Brown Belt</option><option>Red Belt</option><option>Stripe Red Belt</option><option>1st Poom</option><option>1st Dan</option><option>2nd Dan</option><option>3rd Dan</option></select></label>
      <label>Promotion Date<input id="promotionDate" type="date"></label>
      <label>Examiner<input id="promotionExaminer" type="text" value="Master Reynaldo Tanjuakio Jr."></label>
      <label>Remarks<input id="promotionRemarks" type="text" placeholder="Optional remarks"></label>
    </div>
    <button id="savePromotion" class="btn" type="button">SAVE PROMOTION</button>
    <p id="promotionMessage" class="form-message"></p>
    <div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Student</th><th>Previous Belt</th><th>New Belt</th><th>Date</th><th>Examiner</th><th>Remarks</th></tr></thead><tbody id="promotionRows"><tr><td colspan="6">Loading promotion records…</td></tr></tbody></table></div>`;
  container.appendChild(panel);
  $("promotionDate").value = new Date().toISOString().slice(0,10);
  $("promotionRefresh").addEventListener("click", loadPromotionAdmin);
  $("savePromotion").addEventListener("click", savePromotion);
  return panel;
}

async function loadPromotionAdmin() {
  ensurePromotionPanel();
  const studentSelect=$("promotionStudent"), rows=$("promotionRows");
  const {data:students,error:se}=await db.from("students").select("id,first_name,middle_name,last_name,current_belt,status").order("last_name",{ascending:true});
  if(se){setMessage($("promotionMessage"),se.message,"error");return;}
  studentSelect.innerHTML=(students||[]).map(s=>{const n=[s.first_name,s.middle_name,s.last_name].filter(Boolean).join(" ");return `<option value="${escapeHtml(s.id)}">${escapeHtml(n)} — ${escapeHtml(s.current_belt||"White Belt")}</option>`}).join("");
  const {data:promotions,error}=await db.from("promotions").select("student_id,previous_belt,new_belt,promotion_date,examiner,remarks").order("promotion_date",{ascending:false});
  if(error){rows.innerHTML=`<tr><td colspan="6">${escapeHtml(error.message)}</td></tr>`;setMessage($("promotionMessage"),error.message,"error");return;}
  const names=Object.fromEntries((students||[]).map(s=>[s.id,[s.first_name,s.middle_name,s.last_name].filter(Boolean).join(" ")]));
  rows.innerHTML=(promotions||[]).length?(promotions.map(p=>`<tr><td>${escapeHtml(names[p.student_id]||"Student")}</td><td>${escapeHtml(p.previous_belt||"—")}</td><td>${escapeHtml(p.new_belt||"—")}</td><td>${formatDate(p.promotion_date)}</td><td>${escapeHtml(p.examiner||"—")}</td><td>${escapeHtml(p.remarks||"—")}</td></tr>`).join("")):`<tr><td colspan="6">No promotion records yet.</td></tr>`;
}

async function savePromotion() {
  const studentId=$("promotionStudent")?.value, previousBelt=$("previousBelt")?.value, newBelt=$("newBelt")?.value, promotionDate=$("promotionDate")?.value, examiner=$("promotionExaminer")?.value.trim(), remarks=$("promotionRemarks")?.value.trim(), msg=$("promotionMessage");
  if(!studentId||!newBelt||!promotionDate){setMessage(msg,"Please complete the student, new belt, and promotion date.","error");return;}
  setMessage(msg,"Saving promotion…");
  const {error:pe}=await db.from("promotions").insert({student_id:studentId,previous_belt:previousBelt,new_belt:newBelt,promotion_date:promotionDate,examiner:examiner||"Master Reynaldo Tanjuakio Jr.",remarks:remarks||null});
  if(pe){setMessage(msg,"Promotion failed: "+pe.message,"error");return;}
  const {error:be}=await db.from("students").update({current_belt:newBelt}).eq("id",studentId);
  if(be){setMessage(msg,"Promotion saved, but belt update failed: "+be.message,"error");return;}
  setMessage(msg,`Promotion saved. Current belt: ${newBelt}`,"success"); $("promotionRemarks").value=""; await loadPromotionAdmin(); await loadAdminStudents();
}

async function loadStudentPromotions(userId) {
  const area=$("portalAccountArea"); if(!area)return;
  const {data,error}=await db.from("promotions").select("previous_belt,new_belt,promotion_date,examiner,remarks").eq("student_id",userId).order("promotion_date",{ascending:false});
  const html=error?`<p class="form-message error">${escapeHtml(error.message)}</p>`:`<div class="welcome-card"><p class="eyebrow">🥋 PROMOTION HISTORY</p><h3>Your Belt Promotion History</h3><div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Previous Belt</th><th>New Belt</th><th>Date</th><th>Examiner</th><th>Remarks</th></tr></thead><tbody>${(data||[]).length?data.map(p=>`<tr><td>${escapeHtml(p.previous_belt||"—")}</td><td>${escapeHtml(p.new_belt||"—")}</td><td>${formatDate(p.promotion_date)}</td><td>${escapeHtml(p.examiner||"—")}</td><td>${escapeHtml(p.remarks||"—")}</td></tr>`).join(""):`<tr><td colspan="5">No promotion records yet.</td></tr>`}</tbody></table></div></div>`;
  area.insertAdjacentHTML("beforeend",html);
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
  panel.style.visibility = "visible";
  panel.style.opacity = "1";
  panel.style.position = "relative";

  // Always create the promotion section immediately after the main admin dashboard
  // so it is visible without relying on a later async render or page styling.
  const promotionPanel = ensurePromotionPanel();
  if (promotionPanel) {
    promotionPanel.style.display = "block";
    promotionPanel.style.visibility = "visible";
    promotionPanel.style.opacity = "1";
    promotionPanel.style.position = "relative";
    const attendancePanel = $("attendancePanel");
    if (attendancePanel && attendancePanel.parentNode) {
      attendancePanel.parentNode.insertBefore(promotionPanel, attendancePanel);
    }
  }

  area.insertAdjacentHTML("afterbegin", `
    <div class="welcome-card admin-welcome">
      <p class="eyebrow">AUTHORIZED ADMINISTRATOR</p>
      <h3>Welcome, Master Reynaldo!</h3>
      <p>Administrator account: ${escapeHtml(user.email)}</p>
    </div>
  `);
  await loadAdminStudents();
  ensurePromotionPanel();
  await loadPromotionAdmin();
  ensureAttendancePanel();
  await loadAttendanceStudents();
  await loadAdminAttendance();
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