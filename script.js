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

    try {
      const { data, error } = await db.auth.signInWithPassword({ email, password });
      if (error) {
        setMessage(msg, error.message, "error");
        return;
      }
      await showPortalForUser(data.user);
      setMessage(msg, "", "");
    } catch (err) {
      console.error("Student portal load failed:", err);
      setMessage(msg, "Login succeeded, but the Student Portal could not load: " + (err?.message || String(err)), "error");
    }
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

async function loadPublicGallery() {
  const photosContainer = $("publicGalleryPhotos");
  const videosContainer = $("publicGalleryVideos");
  if (!photosContainer && !videosContainer) return;

  const { data, error } = await db.from("gallery_highlights")
    .select("id,title,description,media_type,file_path,created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.warn("Gallery could not be loaded:", error.message);
    return;
  }

  const photos = (data || []).filter(item => item.media_type === "image");
  const videos = (data || []).filter(item => item.media_type === "video");

  if (photosContainer) {
    photosContainer.innerHTML = photos.length
      ? photos.map(item => {
          const url = db.storage.from("gallery-media").getPublicUrl(item.file_path).data.publicUrl;
          return `<div class="gallery-item" style="overflow:hidden;">
            <img src="${escapeHtml(url)}" alt="${escapeHtml(item.title)}" style="width:100%;height:220px;object-fit:cover;border-radius:10px;">
            <strong style="display:block;margin-top:10px;">${escapeHtml(item.title)}</strong>
            ${item.description ? `<small>${escapeHtml(item.description)}</small>` : ""}
          </div>`;
        }).join("")
      : `<div><span style="font-size:32px;">📷</span><small>No photos uploaded yet</small></div>`;
  }

  if (videosContainer) {
    videosContainer.innerHTML = videos.length
      ? videos.map(item => {
          const url = db.storage.from("gallery-media").getPublicUrl(item.file_path).data.publicUrl;
          return `<div class="gallery-item" style="overflow:hidden;">
            <video src="${escapeHtml(url)}" controls preload="metadata" style="width:100%;height:220px;object-fit:cover;border-radius:10px;"></video>
            <strong style="display:block;margin-top:10px;">${escapeHtml(item.title)}</strong>
            ${item.description ? `<small>${escapeHtml(item.description)}</small>` : ""}
          </div>`;
        }).join("")
      : `<div><span style="font-size:32px;">🎥</span><small>No videos uploaded yet</small></div>`;
  }
}

async function ensureGalleryAdminPanel() {
  const panel = $("galleryAdminPanel");
  if (!panel) return null;
  panel.style.display = "block";
  await loadGalleryAdminList();
  return panel;
}

async function loadGalleryAdminList() {
  const box = $("galleryAdminList");
  if (!box) return;
  const { data, error } = await db.from("gallery_highlights")
    .select("id,title,description,media_type,file_path,created_at")
    .order("created_at", { ascending: false });
  if (error) { box.innerHTML = `<p class="form-message error">${escapeHtml(error.message)}</p>`; return; }
  box.innerHTML = (data || []).map(item => `
    <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;border-top:1px solid #ddd;padding:10px 0;">
      <span><strong>${escapeHtml(item.title)}</strong> — ${item.media_type === "video" ? "Video" : "Photo"}</span>
      <button class="danger-btn gallery-delete-btn" data-id="${escapeHtml(item.id)}" type="button">DELETE</button>
    </div>`).join("") || "<p>No gallery uploads yet.</p>";
  box.onclick = async e => {
    const b = e.target.closest(".gallery-delete-btn");
    if (!b) return;
    await deleteGalleryItem(b.dataset.id);
  };
}

async function uploadGalleryMedia() {
  const input = $("galleryFile");
  const files = Array.from(input?.files || []);
  const title = $("galleryTitle")?.value.trim();
  const description = $("galleryDescription")?.value.trim() || null;
  const mediaType = $("galleryMediaType")?.value;
  const msg = $("galleryAdminMessage");

  if (!files.length || !title) {
    setMessage(msg, "Enter a title and choose one or more files.", "error");
    return;
  }

  for (const file of files) {
    const ok = mediaType === "image" ? file.type.startsWith("image/") : file.type.startsWith("video/");
    const limit = mediaType === "image" ? 15 * 1024 * 1024 : 50 * 1024 * 1024;
    if (!ok) {
      setMessage(msg, "Please select only " + (mediaType === "image" ? "photos." : "videos."), "error");
      return;
    }
    if (file.size > limit) {
      setMessage(msg, file.name + " is too large. Maximum is " + (mediaType === "image" ? "15 MB" : "50 MB") + ".", "error");
      return;
    }
  }

  let uploaded = 0;
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    setMessage(msg, "Uploading " + (i + 1) + " of " + files.length + "…");

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = "highlights/" + Date.now() + "_" + i + "_" + safeName;

    const { error: uploadError } = await db.storage.from("gallery-media").upload(path, file, {
      upsert: false,
      contentType: file.type,
      cacheControl: "3600"
    });

    if (uploadError) {
      setMessage(msg, "Upload failed: " + uploadError.message, "error");
      return;
    }

    const { error: dbError } = await db.from("gallery_highlights").insert({
      title: title + (files.length > 1 ? " (" + (i + 1) + ")" : ""),
      description,
      media_type: mediaType,
      file_path: path
    });

    if (dbError) {
      await db.storage.from("gallery-media").remove([path]);
      setMessage(msg, "Gallery record failed: " + dbError.message, "error");
      return;
    }

    uploaded++;
  }

  input.value = "";
  setMessage(msg, uploaded + " " + (mediaType === "video" ? "videos" : "photos") + " uploaded successfully.", "success");
  await loadGalleryAdminList();
  await loadPublicGallery();
}

async function deleteGalleryItem(id) {
  if (!id || !confirm("Delete this gallery highlight? This cannot be undone.")) return;
  const { data, error } = await db.from("gallery_highlights").select("file_path").eq("id", id).maybeSingle();
  if (error || !data) { setMessage($("galleryAdminMessage"), "Unable to find gallery item.", "error"); return; }
  const { error: storageError } = await db.storage.from("gallery-media").remove([data.file_path]);
  if (storageError) { setMessage($("galleryAdminMessage"), "File delete failed: " + storageError.message, "error"); return; }
  const { error: deleteError } = await db.from("gallery_highlights").delete().eq("id", id);
  if (deleteError) { setMessage($("galleryAdminMessage"), "Record delete failed: " + deleteError.message, "error"); return; }
  setMessage($("galleryAdminMessage"), "Gallery highlight deleted.", "success");
  await loadGalleryAdminList();
  await loadPublicGallery();
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
  const columns = "id, student_id, first_name, middle_name, last_name, birth_date, gender, phone, address, emergency_contact_name, emergency_contact_phone, current_belt, status, date_joined, created_at, photo_path";
  let { data, error } = await db
    .from("students")
    .select(columns)
    .eq("id", user.id)
    .maybeSingle();

  // photo_path is an optional upgrade. If the column has not been added yet,
  // retry with the original student columns so login is never blocked.
  if (error && /photo_path|column/i.test(error.message || "")) {
    const retry = await db
      .from("students")
      .select("id, student_id, first_name, middle_name, last_name, birth_date, gender, phone, address, emergency_contact_name, emergency_contact_phone, current_belt, status, date_joined, created_at")
      .eq("id", user.id)
      .maybeSingle();
    data = retry.data;
    error = retry.error;
  }
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

  const name = [profile.first_name, profile.middle_name, profile.last_name].filter(Boolean).join(" ") || user.email;
  const { data: latestPromotion } = await db.from("promotions")
    .select("new_belt,promotion_date")
    .eq("student_id", user.id)
    .order("promotion_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  const effectiveBelt = latestPromotion?.new_belt || profile.current_belt || "White Belt";

  let photoUrl = "";
  if (profile.photo_path) {
    const { data } = db.storage.from("student-photos").getPublicUrl(profile.photo_path);
    photoUrl = data?.publicUrl || "";
  }

  area.insertAdjacentHTML("afterbegin", `
    <div class="welcome-card student-portal-dashboard">
      <p class="eyebrow">STUDENT ACCOUNT</p>
      <div class="student-portal-top">
        <div class="student-portal-photo-wrap">
          ${photoUrl
          ? `<img class="student-portal-photo" src="${escapeHtml(photoUrl)}" alt="Student photo" style="width:140px;height:170px;object-fit:cover;border-radius:12px;border:3px solid #b40000;display:block;background:#fff;" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';"><div class="student-portal-photo placeholder" style="width:140px;height:170px;display:none;align-items:center;justify-content:center;border-radius:12px;border:2px dashed #bbb;background:#f5f5f5;">PHOTO</div>`
          : `<div class="student-portal-photo placeholder" style="width:140px;height:170px;display:flex;align-items:center;justify-content:center;border-radius:12px;border:2px dashed #bbb;background:#f5f5f5;">PHOTO</div>`}
        </div>
        <div class="student-portal-main">
          <h3>Welcome, ${escapeHtml(name)}!</h3>
          <div class="welcome-details">
            <span><b>Status</b>${escapeHtml(profile.status || "Pending")}</span>
            <span><b>Belt</b>${escapeHtml(effectiveBelt)}</span>
            <span><b>Student ID</b>${escapeHtml(profile.student_id || "Pending assignment")}</span>
            <span><b>Date Joined</b>${formatDate(profile.date_joined || profile.created_at)}</span>
          </div>
        </div>
      </div>
      <p class="portal-note">Your private academy account. You can view only your own profile, attendance, promotions, payments, and certificates.</p>
    </div>

    <div class="welcome-card">
      <p class="eyebrow">👤 MY PROFILE</p>
      <h3>Student Information</h3>
      <div class="admin-form-grid">
        <div><strong>Full Name</strong><br>${escapeHtml(name)}</div>
        <div><strong>Birth Date</strong><br>${formatDate(profile.birth_date)}</div>
        <div><strong>Gender</strong><br>${escapeHtml(profile.gender || "—")}</div>
        <div><strong>Phone</strong><br>${escapeHtml(profile.phone || "—")}</div>
        <div><strong>Address</strong><br>${escapeHtml(profile.address || "—")}</div>
        <div><strong>Emergency Contact</strong><br>${escapeHtml(profile.emergency_contact_name || "—")}</div>
        <div><strong>Emergency Phone</strong><br>${escapeHtml(profile.emergency_contact_phone || "—")}</div>
      </div>
      <div class="admin-actions">
        <button id="studentEditProfile" class="btn" type="button">✏️ EDIT MY PROFILE</button>
        <button id="studentPrintProfile" class="btn outline" type="button">🖨️ PRINT STUDENT PROFILE</button>
      </div>
      <div id="studentEditPanel" class="welcome-card" style="display:none;margin-top:18px;">
        <p class="eyebrow">✏️ EDIT MY PROFILE</p>
        <h3>Update Your Personal Information</h3>
        <p class="portal-note">You can update your personal and emergency-contact information. Student ID, belt, status, and date joined are controlled by the academy.</p>
        <div class="admin-form-grid">
          <div style="grid-column:1/-1;padding:12px;border:1px solid #ddd;border-radius:10px;background:#fafafa;">
            <strong>📷 PROFILE PICTURE</strong>
            <p class="portal-note" style="margin:5px 0 8px;">Upload a clear recent photo. JPG, PNG, or WebP, maximum 5 MB.</p>
            <label for="studentProfilePhoto" style="display:inline-flex;align-items:center;justify-content:center;padding:9px 16px;border-radius:7px;background:#111;color:#fff;font-weight:700;cursor:pointer;font-size:13px;">📷 CHOOSE PHOTO</label>
            <input id="studentProfilePhoto" type="file" accept="image/jpeg,image/png,image/webp" style="display:none;">
            <span id="studentProfilePhotoName" style="display:block;margin-top:7px;font-size:12px;color:#555;">No photo selected</span>
            <p id="studentProfilePhotoStatus" class="portal-note" style="margin:5px 0 0;"></p>
          </div>
          <label>Student ID<input type="text" value="${escapeHtml(profile.student_id || "Pending assignment")}" readonly></label>
          <label>Email<input type="email" value="${escapeHtml(user.email || "")}" readonly></label>
          <label>First Name<input id="editFirstName" type="text" autocomplete="given-name"></label>
          <label>Middle Name<input id="editMiddleName" type="text" autocomplete="additional-name"></label>
          <label>Last Name<input id="editLastName" type="text" autocomplete="family-name"></label>
          <label>Birth Date<input id="editBirthDate" type="date"></label>
          <label>Gender<select id="editGender"><option value="">— Select —</option><option value="Male">Male</option><option value="Female">Female</option><option value="Other">Other</option></select></label>
          <label>Phone<input id="editPhone" type="tel" autocomplete="tel"></label>
          <label style="grid-column:1/-1;">Complete Address<textarea id="editAddress" rows="3" autocomplete="street-address" placeholder="House/Unit, Street, Barangay, City/Municipality, Province"></textarea></label>
          <label>Emergency Contact Name<input id="editEmergencyName" type="text" autocomplete="name"></label>
          <label>Emergency Contact Phone<input id="editEmergencyPhone" type="tel" autocomplete="tel"></label>
        </div>
        <div class="admin-actions">
          <button id="saveStudentProfile" class="btn" type="button">💾 SAVE CHANGES</button>
          <button id="cancelStudentEdit" class="btn outline" type="button">CANCEL</button>
        </div>
        <p id="studentEditMessage" class="form-message"></p>
      </div>
    </div>

    <div class="welcome-card">
      <p class="eyebrow">📅 ATTENDANCE</p>
      <h3>My Attendance History</h3>
      <div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Date</th><th>Status</th><th>Remarks</th></tr></thead><tbody id="portalAttendanceRows"><tr><td colspan="3">Loading…</td></tr></tbody></table></div>
    </div>

    <div class="welcome-card">
      <p class="eyebrow">🥋 PROMOTION HISTORY</p>
      <h3>Your Belt Promotion History</h3>
      <div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Previous Belt</th><th>New Belt</th><th>Date</th><th>Examiner</th><th>Remarks</th></tr></thead><tbody id="portalPromotionRows"><tr><td colspan="5">Loading…</td></tr></tbody></table></div>
    </div>

    <div class="welcome-card">
      <p class="eyebrow">💳 PAYMENTS</p>
      <h3>My Payment History</h3>
      <div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Date</th><th>Amount</th><th>Type</th><th>Reference</th><th>Status</th><th>Remarks</th></tr></thead><tbody id="portalPaymentRows"><tr><td colspan="6">Loading…</td></tr></tbody></table></div>
    </div>

    <div class="welcome-card">
      <p class="eyebrow">📜 CERTIFICATES</p>
      <h3>My Certificates & Documents</h3>
      <div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Certificate</th><th>Date Issued</th><th>Action</th></tr></thead><tbody id="portalCertificateRows"><tr><td colspan="3">Loading…</td></tr></tbody></table></div>
    </div>

    <div class="welcome-card">
      <p class="eyebrow">🔐 ACCOUNT SECURITY</p>
      <h3>Change Password</h3>
      <div class="admin-form-grid">
        <label>New Password<input id="studentNewPassword" type="password" minlength="6" placeholder="At least 6 characters"></label>
        <label>Confirm Password<input id="studentConfirmPassword" type="password" minlength="6" placeholder="Confirm new password"></label>
      </div>
      <div class="admin-actions"><button id="studentChangePassword" class="btn" type="button">CHANGE PASSWORD</button></div>
      <p id="studentSecurityMessage" class="form-message"></p>
    </div>
  `);

  $("studentPrintProfile")?.addEventListener("click", () => printStudentPortalProfile(profile, effectiveBelt, photoUrl));
  $("studentEditProfile")?.addEventListener("click", () => openStudentProfileEditor(profile));
  $("cancelStudentEdit")?.addEventListener("click", () => {
    const panel = $("studentEditPanel");
    if (panel) panel.style.display = "none";
    setMessage($("studentEditMessage"), "", "");
  });
  $("saveStudentProfile")?.addEventListener("click", () => saveStudentProfile(user.id));
  $("studentChangePassword")?.addEventListener("click", changeStudentPassword);

  // Load optional portal sections in the background so authentication never remains
  // stuck on “Signing in…” if one optional table/storage resource is unavailable.
  Promise.allSettled([
    loadStudentPortalAttendance(user.id),
    loadStudentPortalPromotions(user.id),
    loadStudentPortalPayments(user.id),
    loadStudentPortalCertificates(user.id)
  ]).then((results) => {
    results.forEach((result) => {
      if (result.status === "rejected") console.error("Student portal section failed:", result.reason);
    });
  });
}

async function loadStudentPortalAttendance(userId) {
  const rows = $("portalAttendanceRows"); if (!rows) return;
  const { data, error } = await db.from("attendance").select("attendance_date,status,remarks").eq("student_id", userId).order("attendance_date", { ascending: false }).limit(200);
  if (error) { rows.innerHTML = `<tr><td colspan="3">${escapeHtml(error.message)}</td></tr>`; return; }
  rows.innerHTML = (data || []).map(a => `<tr><td>${formatDate(a.attendance_date)}</td><td>${escapeHtml(a.status || "—")}</td><td>${escapeHtml(a.remarks || "—")}</td></tr>`).join("") || `<tr><td colspan="3">No attendance records yet.</td></tr>`;
}

async function loadStudentPortalPromotions(userId) {
  const rows = $("portalPromotionRows"); if (!rows) return;
  const { data, error } = await db.from("promotions").select("previous_belt,new_belt,promotion_date,examiner,remarks").eq("student_id", userId).order("promotion_date", { ascending: false });
  if (error) { rows.innerHTML = `<tr><td colspan="5">${escapeHtml(error.message)}</td></tr>`; return; }
  rows.innerHTML = (data || []).map(p => `<tr><td>${escapeHtml(p.previous_belt || "—")}</td><td>${escapeHtml(p.new_belt || "—")}</td><td>${formatDate(p.promotion_date)}</td><td>${escapeHtml(p.examiner || "—")}</td><td>${escapeHtml(p.remarks || "—")}</td></tr>`).join("") || `<tr><td colspan="5">No promotion records yet.</td></tr>`;
}

async function loadStudentPortalPayments(userId) {
  const rows = $("portalPaymentRows"); if (!rows) return;
  const { data, error } = await db.from("payments").select("payment_date,amount,payment_type,reference_number,status,remarks").eq("student_id", userId).order("payment_date", { ascending: false }).limit(200);
  if (error) { rows.innerHTML = `<tr><td colspan="6">${escapeHtml(error.message)}</td></tr>`; return; }
  rows.innerHTML = (data || []).map(p => `<tr><td>${formatDate(p.payment_date)}</td><td>₱${escapeHtml(p.amount ?? "0")}</td><td>${escapeHtml(p.payment_type || "—")}</td><td>${escapeHtml(p.reference_number || "—")}</td><td>${escapeHtml(p.status || "—")}</td><td>${escapeHtml(p.remarks || "—")}</td></tr>`).join("") || `<tr><td colspan="6">No payment records yet.</td></tr>`;
}

async function loadStudentPortalCertificates(userId) {
  const rows = $("portalCertificateRows"); if (!rows) return;
  const { data, error } = await db.from("student_certificates").select("id,certificate_name,issued_date,file_name,file_path").eq("student_id", userId).order("created_at", { ascending: false });
  if (error) { rows.innerHTML = `<tr><td colspan="3">${escapeHtml(error.message)}</td></tr>`; return; }
  rows.innerHTML = (data || []).map(c => `<tr><td>${escapeHtml(c.certificate_name || c.file_name || "Certificate")}</td><td>${formatDate(c.issued_date)}</td><td><button class="btn outline portal-view-certificate" data-id="${escapeHtml(c.id)}" type="button">VIEW</button></td></tr>`).join("") || `<tr><td colspan="3">No certificates uploaded yet.</td></tr>`;
  rows.onclick = async (e) => {
    const btn = e.target.closest(".portal-view-certificate");
    if (!btn) return;
    const { data: record, error: readError } = await db.from("student_certificates").select("file_path,file_name").eq("id", btn.dataset.id).eq("student_id", userId).maybeSingle();
    if (readError || !record) { alert("Unable to find this certificate."); return; }
    const { data: urlData, error: urlError } = await db.storage.from("student-documents").createSignedUrl(record.file_path, 3600);
    if (urlError || !urlData?.signedUrl) { alert("Unable to open this certificate: " + (urlError?.message || "signed URL unavailable")); return; }
    window.open(urlData.signedUrl, "_blank", "noopener");
  };
}

function openStudentProfileEditor(profile) {
  const panel = $("studentEditPanel");
  if (!panel) return;
  panel.style.display = "block";
  $("editFirstName").value = profile.first_name || "";
  $("editMiddleName").value = profile.middle_name || "";
  $("editLastName").value = profile.last_name || "";
  $("editBirthDate").value = profile.birth_date || "";
  $("editGender").value = profile.gender || "";
  $("editPhone").value = profile.phone || "";
  $("editAddress").value = profile.address || "";
  $("editEmergencyName").value = profile.emergency_contact_name || "";
  $("editEmergencyPhone").value = profile.emergency_contact_phone || "";
  const photoStatus = $("studentProfilePhotoStatus");
  if (photoStatus) photoStatus.textContent = profile.photo_path ? "A profile picture is already saved. Choose a new file to replace it." : "No profile picture uploaded yet.";
  const photoInput = $("studentProfilePhoto");
  photoInput?.addEventListener("change", () => {
    const name = $("studentProfilePhotoName");
    if (name) name.textContent = photoInput.files?.[0]?.name || "No photo selected";
  });
  setMessage($("studentEditMessage"), "", "");
  panel.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function saveStudentProfile(userId) {
  const msg = $("studentEditMessage");
  const firstName = $("editFirstName")?.value.trim() || "";
  const middleName = $("editMiddleName")?.value.trim() || "";
  const lastName = $("editLastName")?.value.trim() || "";
  if (!firstName || !lastName) {
    setMessage(msg, "First Name and Last Name are required.", "error");
    return;
  }

  setMessage(msg, "Saving your profile…");
  const updates = {
    first_name: firstName,
    middle_name: middleName || null,
    last_name: lastName,
    birth_date: $("editBirthDate")?.value || null,
    gender: $("editGender")?.value || null,
    phone: $("editPhone")?.value.trim() || null,
    address: $("editAddress")?.value.trim() || null,
    emergency_contact_name: $("editEmergencyName")?.value.trim() || null,
    emergency_contact_phone: $("editEmergencyPhone")?.value.trim() || null
  };

  const photoInput = $("studentProfilePhoto");
  const photoFile = photoInput?.files?.[0] || null;
  if (photoFile) {
    if (!["image/jpeg", "image/png", "image/webp"].includes(photoFile.type)) {
      setMessage(msg, "Please upload a JPG, PNG, or WebP photo.", "error");
      return;
    }
    if (photoFile.size > 5 * 1024 * 1024) {
      setMessage(msg, "Photo must be 5 MB or smaller.", "error");
      return;
    }
  }

  const { data, error } = await db
    .from("students")
    .update(updates)
    .eq("id", userId)
    .select("id, student_id, first_name, middle_name, last_name, birth_date, gender, phone, address, emergency_contact_name, emergency_contact_phone, current_belt, status, date_joined, created_at, photo_path")
    .maybeSingle();

  if (error) {
    setMessage(msg, "Profile update failed: " + error.message, "error");
    return;
  }
  if (!data) {
    setMessage(msg, "Profile was not updated. Please contact the academy administrator.", "error");
    return;
  }

  if (photoFile) {
    try {
      const ext = (photoFile.name.split(".").pop() || "jpg").toLowerCase();
      const path = `students/${userId}/photo.${ext}`;
      const status = $("studentProfilePhotoStatus");
      if (status) status.textContent = "Uploading profile picture…";
      const { error: removeError } = await db.storage.from("student-photos").remove([path]);
      if (removeError) console.warn("Old profile photo removal:", removeError.message);
      const { error: uploadError } = await db.storage.from("student-photos").upload(path, photoFile, {
        upsert: false,
        contentType: photoFile.type,
        cacheControl: "3600"
      });
      if (uploadError) {
        setMessage(msg, "Profile saved, but photo upload failed: " + uploadError.message, "error");
        return;
      }
      const { error: photoRecordError } = await db.from("students").update({ photo_path: path }).eq("id", userId);
      if (photoRecordError) {
        setMessage(msg, "Profile saved, but photo record update failed: " + photoRecordError.message, "error");
        return;
      }
    } catch (photoError) {
      setMessage(msg, "Profile saved, but photo upload failed: " + (photoError?.message || "Unknown error"), "error");
      return;
    }
  }

  setMessage(msg, photoFile ? "Profile and picture updated successfully." : "Profile updated successfully.", "success");
  const panel = $("studentEditPanel");
  if (panel) panel.style.display = "none";
  setTimeout(() => window.location.reload(), 500);
}

async function changeStudentPassword() {
  const msg = $("studentSecurityMessage");
  const password = $("studentNewPassword")?.value || "";
  const confirmPassword = $("studentConfirmPassword")?.value || "";
  if (password.length < 6) { setMessage(msg, "Password must be at least 6 characters.", "error"); return; }
  if (password !== confirmPassword) { setMessage(msg, "Passwords do not match.", "error"); return; }
  const { error } = await db.auth.updateUser({ password });
  if (error) { setMessage(msg, "Password change failed: " + error.message, "error"); return; }
  $("studentNewPassword").value = "";
  $("studentConfirmPassword").value = "";
  setMessage(msg, "Password changed successfully.", "success");
}

function printStudentPortalProfile(profile, effectiveBelt, photoUrl) {
  const name = [profile.first_name, profile.middle_name, profile.last_name].filter(Boolean).join(" ") || "Student";
  const w = window.open("", "_blank", "width=900,height=800");
  if (!w) { alert("Please allow pop-ups to print your profile."); return; }
  const photo = photoUrl ? `<img src="${escapeHtml(photoUrl)}" class="photo" alt="Student photo">` : `<div class="photo placeholder">STUDENT<br>PHOTO</div>`;
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(name)} - Student Profile</title><style>body{font-family:Arial,sans-serif;padding:25px;color:#111}.card{max-width:760px;margin:auto;border:2px solid #111;padding:25px}.head{display:flex;align-items:center;gap:15px;border-bottom:2px solid #111;padding-bottom:15px}.head img{width:70px;height:70px;object-fit:contain}.photo{width:130px;height:160px;object-fit:cover;border:1px solid #888}.placeholder{display:flex;align-items:center;justify-content:center;text-align:center;color:#777}.top{display:flex;gap:22px;margin-top:20px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;flex:1}.field{border-bottom:1px solid #ccc;padding:8px}.label{font-size:10px;text-transform:uppercase;color:#666}.value{font-weight:bold;margin-top:3px}@media print{@page{size:A4;margin:12mm}body{padding:0}.card{border:2px solid #111}}</style></head><body><div class="card"><div class="head"><img src="${escapeHtml(new URL("hanah-neht-logo.png", window.location.href).href)}"><div><strong>HANAH NEHT TAEKWONDO ACADEMY</strong><br>KUKKIWON DOJANG<br>STUDENT PROFILE</div></div><div class="top">${photo}<div class="grid"><div class="field"><div class="label">Student Name</div><div class="value">${escapeHtml(name)}</div></div><div class="field"><div class="label">Student ID</div><div class="value">${escapeHtml(profile.student_id || "Pending assignment")}</div></div><div class="field"><div class="label">Current Belt</div><div class="value">${escapeHtml(effectiveBelt)}</div></div><div class="field"><div class="label">Status</div><div class="value">${escapeHtml(profile.status || "Pending")}</div></div><div class="field"><div class="label">Date Joined</div><div class="value">${escapeHtml(formatDate(profile.date_joined || profile.created_at))}</div></div><div class="field"><div class="label">Birth Date</div><div class="value">${escapeHtml(formatDate(profile.birth_date))}</div></div><div class="field"><div class="label">Phone</div><div class="value">${escapeHtml(profile.phone || "—")}</div></div><div class="field"><div class="label">Emergency Contact</div><div class="value">${escapeHtml(profile.emergency_contact_name || "—")}</div></div></div></div><p style="margin-top:35px;border-top:1px solid #ccc;padding-top:15px">This profile is for academy identification and student record reference.</p><div style="display:flex;gap:80px;margin-top:70px"><div style="flex:1;border-top:1px solid #111;text-align:center;padding-top:6px">Student / Parent Signature</div><div style="flex:1;border-top:1px solid #111;text-align:center;padding-top:6px">Head Coach / Examiner</div></div></div></body></html>`);
  w.document.close(); w.focus(); setTimeout(() => w.print(), 400);
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

  // Use only columns that exist in the current students table.
  // auth_user_email is not a students-table column and caused a 400 REST error.
  const { data: studentsData, error } = await db
    .from("students")
    .select("id, student_id, first_name, middle_name, last_name, current_belt, status, date_joined, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    rows.innerHTML = `<tr><td colspan="6">${escapeHtml(error.message)}</td></tr>`;
    setMessage(msg, error.message, "error");
    return;
  }

  let students = studentsData || [];

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
      ? `<span class="status-active">ACTIVE</span> <button class="view-profile-btn" data-id="${escapeHtml(s.id)}" type="button">VIEW PROFILE</button>`
      : `<button class="approve-btn" data-id="${escapeHtml(s.id)}" type="button">APPROVE</button> <button class="view-profile-btn" data-id="${escapeHtml(s.id)}" type="button">VIEW PROFILE</button>`;
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
    const profileBtn = event.target.closest(".view-profile-btn");
    if (profileBtn) {
      event.preventDefault();
      event.stopPropagation();
      await showStudentRecord(profileBtn.dataset.id);
      return;
    }
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



// QR Code support
let qrCodeLibraryPromise = null;
function ensureQRCodeLibrary() {
  if (window.QRCode) return Promise.resolve();
  if (qrCodeLibraryPromise) return qrCodeLibraryPromise;
  qrCodeLibraryPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("QR Code library could not be loaded."));
    document.head.appendChild(script);
  });
  return qrCodeLibraryPromise;
}

async function makeStudentQRCode(student) {
  const sid = student?.student_id || "";
  if (!sid) return "";
  try {
    await ensureQRCodeLibrary();
    const holder = document.createElement("div");
    holder.style.position = "fixed";
    holder.style.left = "-10000px";
    holder.style.top = "-10000px";
    document.body.appendChild(holder);
    const qrText = `HANAH NEHT TAEKWONDO ACADEMY\nStudent ID: ${sid}`;
    new QRCode(holder, { text: qrText, width: 180, height: 180, correctLevel: QRCode.CorrectLevel.M });
    await new Promise(r => setTimeout(r, 100));
    const canvas = holder.querySelector("canvas");
    const img = holder.querySelector("img");
    const dataUrl = canvas ? canvas.toDataURL("image/png") : (img?.src || "");
    holder.remove();
    return dataUrl;
  } catch (e) {
    console.warn("QR code generation failed:", e);
    return "";
  }
}

// Student Master Record
function ensureStudentRecordPanel() {
  let panel = $("studentRecordPanel");
  if (panel) return panel;
  const section = $("student-login");
  const container = section?.querySelector(".container");
  if (!container) return null;
  panel = document.createElement("div");
  panel.id = "studentRecordPanel";
  panel.className = "admin-dashboard student-record-panel";
  panel.style.display = "none";
  panel.innerHTML = `
    <div class="admin-head">
      <div>
        <p class="eyebrow">STUDENT MASTER RECORD</p>
        <h2 id="recordStudentName">Student Profile</h2>
        <p id="recordStudentId" class="admin-subtitle"></p>
      </div>
      <div class="admin-actions">
        <button id="printStudentRecord" class="btn" type="button">PRINT RECORD</button>
        <button id="printStudentCard" class="btn" type="button">PRINT PROFILE CARD</button>
        <button id="editStudentRecord" class="btn outline" type="button">EDIT STUDENT</button>
        <button id="deleteStudentRecord" class="danger-btn" type="button">🗑️ DELETE STUDENT</button>
        <button id="closeStudentRecord" class="btn outline" type="button">CLOSE</button>
      </div>
    </div>
    <div id="recordEditForm" class="welcome-card" style="display:none">
      <h3>✏️ Edit Student Information</h3>
      <div class="admin-form-grid">
        <label>First Name<input id="editFirstName"></label>
        <label>Middle Name<input id="editMiddleName"></label>
        <label>Last Name<input id="editLastName"></label>
        <label>Birth Date<input id="editBirthDate" type="date"></label>
        <label>Gender<select id="editGender"><option value="">Select</option><option>Male</option><option>Female</option></select></label>
        <label>Phone<input id="editPhone"></label>
        <label>Address<input id="editAddress"></label>
        <label>Emergency Contact<input id="editEmergencyName"></label>
        <label>Emergency Phone<input id="editEmergencyPhone"></label>
        <label>Current Belt<select id="editCurrentBelt">
          <option>White Belt</option>
          <option>Yellow Belt</option>
          <option>Orange Belt</option>
          <option>Green Belt</option>
          <option>Blue Belt</option>
          <option>Purple Belt</option>
          <option>Brown Belt</option>
          <option>Stripe Brown Belt</option>
          <option>Red Belt</option>
          <option>Stripe Red Belt</option>
          <option>Poom</option>
          <option>1st Dan</option>
          <option>2nd Dan</option>
          <option>3rd Dan</option>
          <option>4th Dan</option>
          <option>5th Dan</option>
        </select></label>
        <label>Status<select id="editStatus"><option>Active</option><option>Pending</option></select></label>
      </div>
      <div class="admin-actions"><button id="saveStudentEdit" class="btn" type="button">SAVE CHANGES</button><button id="cancelStudentEdit" class="btn outline" type="button">CANCEL</button></div>
    </div>
    <div class="welcome-card" id="recordSummary">Loading student profile…</div>
    <div class="welcome-card" id="recordPhotoCard">
      <h3>📷 Student Photo</h3>
      <div class="photo-upload-row">
        <img id="recordStudentPhoto" class="record-student-photo" alt="Student photo" style="display:none">
        <div><input id="studentPhotoFile" type="file" accept="image/jpeg,image/png,image/webp" style="display:block;margin-bottom:8px">
        <button id="uploadStudentPhoto" class="btn" type="button">UPLOAD PHOTO</button>
        <p id="studentPhotoStatus" class="form-message">Choose a photo, then click UPLOAD PHOTO.</p>
        <p class="form-message">JPG, PNG, or WebP. Maximum 5 MB.</p></div>
      </div>
    </div>
    <div class="admin-table-wrap">
      <h3>📜 Certificates & Documents</h3>
      <div class="admin-actions"><input id="certificateFile" type="file" accept="application/pdf,image/jpeg,image/png,image/webp"><input id="certificateType" type="text" placeholder="Certificate name/type"><input id="certificateDate" type="date"><button id="uploadCertificate" class="btn" type="button">UPLOAD CERTIFICATE</button></div>
      <p id="certificateMessage" class="form-message"></p>
      <table class="admin-table"><thead><tr><th>Certificate</th><th>Date Issued</th><th>Uploaded</th><th>Action</th></tr></thead><tbody id="recordCertificateRows"><tr><td colspan="4">Loading…</td></tr></tbody></table>
    </div>
    <div class="admin-table-wrap">
      <h3>🥋 Belt Promotion History</h3>
      <table class="admin-table"><thead><tr><th>Previous Belt</th><th>New Belt</th><th>Date</th><th>Examiner</th><th>Remarks</th><th>Action</th></tr></thead><tbody id="recordPromotionRows"><tr><td colspan="6">Loading…</td></tr></tbody></table>
    </div>
    <div class="admin-table-wrap">
      <h3>📅 Attendance History</h3>
      <table class="admin-table"><thead><tr><th>Date</th><th>Status</th><th>Remarks</th><th>Action</th></tr></thead><tbody id="recordAttendanceRows"><tr><td colspan="3">Loading…</td></tr></tbody></table>
    </div>
    <div class="admin-table-wrap">
      <h3>💳 Payment History</h3>
      <div class="admin-actions"><button id="addPaymentRecord" class="btn" type="button">ADD PAYMENT</button></div>
      <table class="admin-table"><thead><tr><th>Date</th><th>Amount</th><th>Type</th><th>Reference</th><th>Status</th><th>Remarks</th><th>Action</th></tr></thead><tbody id="recordPaymentRows"><tr><td colspan="6">Loading…</td></tr></tbody></table>
    </div>
    <div id="paymentForm" class="welcome-card" style="display:none">
    <h3>💳 Add Payment</h3>
    <div class="admin-form-grid">
      <label>Date<input id="paymentDate" type="date"></label>
      <label>Amount<input id="paymentAmount" type="number" min="0" step="0.01"></label>
      <label>Type<input id="paymentType" placeholder="Membership / Tuition / Exam"></label>
      <label>Reference<input id="paymentReference"></label>
      <label>Status<select id="paymentStatus"><option>Paid</option><option>Pending</option><option>Cancelled</option></select></label>
      <label>Remarks<input id="paymentRemarks"></label>
    </div>
    <div class="admin-actions"><button id="savePayment" class="btn" type="button">SAVE PAYMENT</button><button id="cancelPayment" class="btn outline" type="button">CANCEL</button></div>
  </div>
  <p id="recordMessage" class="form-message"></p>
  `;
  container.appendChild(panel);
  $("closeStudentRecord")?.addEventListener("click", () => { panel.style.display = "none"; });
  $("editStudentRecord")?.addEventListener("click", () => { $("recordEditForm").style.display = "block"; });
  $("cancelStudentEdit")?.addEventListener("click", () => { $("recordEditForm").style.display = "none"; });
  $("saveStudentEdit")?.addEventListener("click", () => saveStudentEdit(window.currentRecordStudentId));
  $("deleteStudentRecord")?.addEventListener("click", () => deleteStudentRecord(window.currentRecordStudentId));
  $("printStudentRecord")?.addEventListener("click", printStudentRecord);
  $("printStudentCard")?.addEventListener("click", printStudentProfileCard);
  $("uploadStudentPhoto")?.addEventListener("click", async () => {
    const input = $("studentPhotoFile");
    const status = $("studentPhotoStatus");
    if (!input) { if (status) status.textContent = "Photo input is missing. Please refresh the page."; return; }
    if (!input.files || !input.files.length) {
      if (status) status.textContent = "Please choose a photo first.";
      input.click();
      return;
    }
    await uploadStudentPhoto(window.currentRecordStudentId);
  });
  $("studentPhotoFile")?.addEventListener("change", () => {
    const file = $("studentPhotoFile")?.files?.[0];
    const status = $("studentPhotoStatus");
    if (!file) { if (status) status.textContent = "No photo selected."; return; }
    if (status) status.textContent = `Selected: ${file.name} (${(file.size/1024/1024).toFixed(2)} MB). Click UPLOAD PHOTO.`;
  });
  $("uploadCertificate")?.addEventListener("click", () => uploadCertificate(window.currentRecordStudentId));
  $("addPaymentRecord")?.addEventListener("click", () => { $("paymentForm").style.display = "block"; });
  $("cancelPayment")?.addEventListener("click", () => { $("paymentForm").style.display = "none"; });
  $("savePayment")?.addEventListener("click", () => savePaymentRecord(window.currentRecordStudentId));
  return panel;
}

async function showStudentRecord(studentId) {
  const panel = ensureStudentRecordPanel();
  if (!panel || !studentId) return;
  panel.style.display = "block";
  window.currentRecordStudentId = studentId;
  panel.scrollIntoView({ behavior: "smooth", block: "start" });
  const summary = $("recordSummary"), message = $("recordMessage");
  summary.innerHTML = "Loading student profile…";
  $("recordPromotionRows").innerHTML = `<tr><td colspan="6">Loading…</td></tr>`;
  $("recordAttendanceRows").innerHTML = `<tr><td colspan="4">Loading…</td></tr>`;
  $("recordPaymentRows").innerHTML = `<tr><td colspan="7">Loading…</td></tr>`;
  setMessage(message, "");

  const { data: student, error: studentError } = await db.from("students")
    .select("id, student_id, first_name, middle_name, last_name, birth_date, gender, phone, address, emergency_contact_name, emergency_contact_phone, current_belt, status, date_joined, created_at, photo_path")
    .eq("id", studentId).maybeSingle();
  if (studentError || !student) {
    const err = studentError?.message || "Student record not found.";
    summary.innerHTML = `<p class="form-message error">${escapeHtml(err)}</p>`;
    return;
  }

  // Repair missing Student ID and synchronize the displayed current belt from the latest promotion.
  // This keeps the Master Record accurate even if an older student row was created before these features were installed.
  let repairedStudentId = student.student_id;
  if (!repairedStudentId) {
    try {
      repairedStudentId = await generateStudentId();
      const { error: idError } = await db.from("students").update({ student_id: repairedStudentId }).eq("id", studentId);
      if (idError) repairedStudentId = null;
    } catch (e) {
      console.warn("Unable to repair Student ID", e);
    }
  }

  const { data: latestPromotion } = await db.from("promotions")
    .select("new_belt,promotion_date")
    .eq("student_id", studentId)
    .order("promotion_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  const effectiveBelt = latestPromotion?.new_belt || student.current_belt || "White Belt";
  window.currentRecordData = { ...student, student_id: repairedStudentId || student.student_id, current_belt: effectiveBelt };
  if (latestPromotion?.new_belt && latestPromotion.new_belt !== student.current_belt) {
    const { error: beltError } = await db.from("students").update({ current_belt: latestPromotion.new_belt }).eq("id", studentId);
    if (beltError) console.warn("Unable to synchronize current belt", beltError);
  }
  const name = [student.first_name, student.middle_name, student.last_name].filter(Boolean).join(" ") || "Unnamed Student";
  $("recordStudentName").textContent = name;
  $("recordStudentId").textContent = `${repairedStudentId || "No Student ID"} • ${student.status || "Pending"}`;
  $("editFirstName").value = student.first_name || "";
  $("editMiddleName").value = student.middle_name || "";
  $("editLastName").value = student.last_name || "";
  $("editBirthDate").value = student.birth_date || "";
  $("editGender").value = student.gender || "";
  $("editPhone").value = student.phone || "";
  $("editAddress").value = student.address || "";
  $("editEmergencyName").value = student.emergency_contact_name || "";
  $("editEmergencyPhone").value = student.emergency_contact_phone || "";
  $("editCurrentBelt").value = student.current_belt || "White Belt";
  $("editStatus").value = student.status || "Active";
  $("recordEditForm").style.display = "none";
  $("paymentForm").style.display = "none";
  if ($("certificateDate") && !$("certificateDate").value) $("certificateDate").value = new Date().toISOString().slice(0,10);
  if ($("certificateType")) $("certificateType").value = "";
  if ($("certificateFile")) $("certificateFile").value = "";
  if ($("studentPhotoFile")) $("studentPhotoFile").value = "";
  summary.innerHTML = `
    <div class="admin-form-grid">
      <div><strong>Student ID</strong><br>${escapeHtml(repairedStudentId || "—")}</div>
      <div><strong>Current Belt</strong><br>${escapeHtml(effectiveBelt)}</div>
      <div><strong>Status</strong><br>${escapeHtml(student.status || "Pending")}</div>
      <div><strong>Date Joined</strong><br>${formatDate(student.date_joined || student.created_at)}</div>
      <div><strong>Birth Date</strong><br>${formatDate(student.birth_date)}</div>
      <div><strong>Gender</strong><br>${escapeHtml(student.gender || "—")}</div>
      <div><strong>Phone</strong><br>${escapeHtml(student.phone || "—")}</div>
      <div><strong>Address</strong><br>${escapeHtml(student.address || "—")}</div>
      <div><strong>Emergency Contact</strong><br>${escapeHtml(student.emergency_contact_name || "—")}</div>
      <div><strong>Emergency Phone</strong><br>${escapeHtml(student.emergency_contact_phone || "—")}</div>
    </div>
    <div class="student-qr-box" style="margin-top:18px;padding:16px;border:1px solid #ddd;border-radius:12px;display:flex;align-items:center;gap:18px;flex-wrap:wrap;">
      <div id="recordStudentQR" style="width:180px;height:180px;display:flex;align-items:center;justify-content:center;background:#fff;"></div>
      <div><strong>STUDENT QR CODE</strong><p style="margin:6px 0 0;color:#666;font-size:13px;">Scan to read this student's academy ID.</p><div style="margin-top:8px;font-weight:700;">${escapeHtml(repairedStudentId || "—")}</div></div>
    </div>`;

  const qrHolder = $("recordStudentQR");
  if (qrHolder) {
    try {
      const qrDataUrl = await makeStudentQRCode(window.currentRecordData);
      qrHolder.innerHTML = qrDataUrl ? `<img src="${qrDataUrl}" alt="Student QR Code" width="180" height="180">` : `<span style="font-size:12px;color:#888;text-align:center;">QR unavailable</span>`;
    } catch (e) {
      qrHolder.innerHTML = `<span style="font-size:12px;color:#888;text-align:center;">QR unavailable</span>`;
    }
  }

  const [promotionsRes, attendanceRes, paymentsRes, certificatesRes] = await Promise.all([
    db.from("promotions").select("id,previous_belt,new_belt,promotion_date,examiner,remarks").eq("student_id", studentId).order("promotion_date", { ascending: false }),
    db.from("attendance").select("id,attendance_date,status,remarks").eq("student_id", studentId).order("attendance_date", { ascending: false }).limit(200),
    db.from("payments").select("id,payment_date,amount,payment_type,reference_number,status,remarks").eq("student_id", studentId).order("payment_date", { ascending: false }).limit(200),
    db.from("student_certificates").select("id,certificate_name,issued_date,file_name,file_path,created_at").eq("student_id", studentId).order("created_at", { ascending: false })
  ]);

  const photoImg = $("recordStudentPhoto");
  let photoUrl = "";
  if (student.photo_path) {
    const { data: photoData } = db.storage.from("student-photos").getPublicUrl(student.photo_path);
    photoUrl = photoData?.publicUrl || "";
  }
  if (photoImg) {
    if (photoUrl) { photoImg.src = photoUrl; photoImg.style.display = "block"; }
    else { photoImg.removeAttribute("src"); photoImg.style.display = "none"; }
  }
  window.currentRecordData = { ...window.currentRecordData, photo_url: photoUrl };

  const certificateRows = $("recordCertificateRows");
  if (certificatesRes.error) {
    certificateRows.innerHTML = `<tr><td colspan="4">${escapeHtml(certificatesRes.error.message)}</td></tr>`;
  } else {
    certificateRows.innerHTML = (certificatesRes.data || []).map(c => `<tr><td>${escapeHtml(c.certificate_name || c.file_name || "Certificate")}</td><td>${formatDate(c.issued_date)}</td><td>${formatDate(c.created_at)}</td><td><button class="btn outline view-certificate-btn" data-id="${escapeHtml(c.id)}" type="button">VIEW</button> <button class="danger-btn delete-certificate-btn" data-id="${escapeHtml(c.id)}" type="button">DELETE</button></td></tr>`).join("") || `<tr><td colspan="4">No certificates uploaded yet.</td></tr>`;
    certificateRows.onclick = async (e) => {
      const view = e.target.closest(".view-certificate-btn");
      if (view) { await viewCertificate(view.dataset.id); return; }
      const del = e.target.closest(".delete-certificate-btn");
      if (del) await deleteCertificate(del.dataset.id, studentId);
    };
  }

  const promotionRows = $("recordPromotionRows");
  if (promotionsRes.error) promotionRows.innerHTML = `<tr><td colspan="6">${escapeHtml(promotionsRes.error.message)}</td></tr>`;
  else promotionRows.innerHTML = (promotionsRes.data || []).map(p => `<tr><td>${escapeHtml(p.previous_belt || "—")}</td><td>${escapeHtml(p.new_belt || "—")}</td><td>${formatDate(p.promotion_date)}</td><td>${escapeHtml(p.examiner || "—")}</td><td>${escapeHtml(p.remarks || "—")}</td><td><button class="danger-btn delete-promotion-btn" data-id="${escapeHtml(p.id)}" type="button">DELETE</button></td></tr>`).join("") || `<tr><td colspan="6">No promotion records yet.</td></tr>`;
  promotionRows.onclick = async (e) => { const b=e.target.closest(".delete-promotion-btn"); if(b) await deletePromotionRecord(b.dataset.id, studentId); };

  const attendanceRows = $("recordAttendanceRows");
  if (attendanceRes.error) attendanceRows.innerHTML = `<tr><td colspan="4">${escapeHtml(attendanceRes.error.message)}</td></tr>`;
  else attendanceRows.innerHTML = (attendanceRes.data || []).map(a => `<tr><td>${formatDate(a.attendance_date)}</td><td>${escapeHtml(a.status || "—")}</td><td>${escapeHtml(a.remarks || "—")}</td><td><button class="danger-btn delete-attendance-btn" data-id="${escapeHtml(a.id)}" type="button">DELETE</button></td></tr>`).join("") || `<tr><td colspan="4">No attendance records yet.</td></tr>`;
  attendanceRows.onclick = async (e) => { const b=e.target.closest(".delete-attendance-btn"); if(b) await deleteAttendanceRecord(b.dataset.id, studentId); };

  const paymentRows = $("recordPaymentRows");
  if (paymentsRes.error) {
    paymentRows.innerHTML = `<tr><td colspan="7">${escapeHtml(paymentsRes.error.message)}</td></tr>`;
    setMessage(message, "Payment history is currently read-only until the administrator payment policy is enabled.", "error");
  } else {
    paymentRows.innerHTML = (paymentsRes.data || []).map(p => `<tr><td>${formatDate(p.payment_date)}</td><td>₱${escapeHtml(p.amount ?? "0")}</td><td>${escapeHtml(p.payment_type || "—")}</td><td>${escapeHtml(p.reference_number || "—")}</td><td>${escapeHtml(p.status || "—")}</td><td>${escapeHtml(p.remarks || "—")}</td><td><button class="danger-btn delete-payment-btn" data-id="${escapeHtml(p.id)}" type="button">DELETE</button></td></tr>`).join("") || `<tr><td colspan="7">No payment records yet.</td></tr>`;
    paymentRows.onclick = async (e) => { const b=e.target.closest(".delete-payment-btn"); if(b) await deletePaymentRecord(b.dataset.id, studentId); };
  }
}


async function deleteStudentRecord(studentId) {
  if (!studentId) return;
  const student = window.currentRecordData;
  const name = [student?.first_name, student?.middle_name, student?.last_name].filter(Boolean).join(" ") || "this student";
  const sid = student?.student_id || "No Student ID";
  const confirmed = confirm(
    `PERMANENT DELETE\\n\\nDelete ${name} (${sid})?\\n\\nThis will remove the student's academy profile and related attendance, promotion, payment, and certificate records. The student's login account will also be removed.\\n\\nThis action cannot be undone.\\n\\nClick OK only if this is the duplicate account.`
  );
  if (!confirmed) return;

  const msg = $("recordMessage");
  setMessage(msg, "Deleting student account… Please wait.");

  const { data, error } = await db.rpc("admin_delete_student", { target_student_id: studentId });
  if (error) {
    console.error("Delete student error:", error);
    setMessage(msg, "Student deletion failed: " + error.message, "error");
    return;
  }

  setMessage(msg, "Duplicate student account deleted successfully.", "success");
  window.currentRecordStudentId = null;
  window.currentRecordData = null;
  const panel = $("studentRecordPanel");
  if (panel) panel.style.display = "none";
  await loadAdminStudents();
}

async function saveStudentEdit(studentId) {
  if (!studentId) return;
  const msg = $("recordMessage");
  const payload = {
    first_name: $("editFirstName").value.trim(), middle_name: $("editMiddleName").value.trim() || null,
    last_name: $("editLastName").value.trim(), birth_date: $("editBirthDate").value || null,
    gender: $("editGender").value || null, phone: $("editPhone").value.trim() || null,
    address: $("editAddress").value.trim() || null, emergency_contact_name: $("editEmergencyName").value.trim() || null,
    emergency_contact_phone: $("editEmergencyPhone").value.trim() || null,
    current_belt: $("editCurrentBelt").value,
    status: $("editStatus").value
  };
  if (!payload.first_name || !payload.last_name) { setMessage(msg, "First name and last name are required.", "error"); return; }
  const { error } = await db.from("students").update(payload).eq("id", studentId);
  if (error) { setMessage(msg, "Update failed: " + error.message, "error"); return; }
  setMessage(msg, "Student information updated successfully.", "success");
  await showStudentRecord(studentId);
  await loadAdminStudents();
}

async function deletePromotionRecord(recordId, studentId) {
  if (!recordId || !confirm("Delete this promotion record? This cannot be undone.")) return;
  const { error } = await db.from("promotions").delete().eq("id", recordId);
  if (error) { setMessage($("recordMessage"), "Delete failed: " + error.message, "error"); return; }
  setMessage($("recordMessage"), "Promotion record deleted.", "success");
  await showStudentRecord(studentId);
  await loadPromotionAdmin();
  await ensureGalleryAdminPanel();
}

async function deleteAttendanceRecord(recordId, studentId) {
  if (!recordId || !confirm("Delete this attendance record? This cannot be undone.")) return;
  const { error } = await db.from("attendance").delete().eq("id", recordId);
  if (error) { setMessage($("recordMessage"), "Delete failed: " + error.message, "error"); return; }
  setMessage($("recordMessage"), "Attendance record deleted.", "success");
  await showStudentRecord(studentId);
  await loadAdminAttendance();
}

async function savePaymentRecord(studentId) {
  if (!studentId) return;
  const msg = $("recordMessage");
  const date = $("paymentDate").value, amount = $("paymentAmount").value, type = $("paymentType").value.trim();
  if (!date || !amount || !type) { setMessage(msg, "Payment date, amount, and type are required.", "error"); return; }
  const { error } = await db.from("payments").insert({
    student_id: studentId, payment_date: date, amount: Number(amount), payment_type: type,
    reference_number: $("paymentReference").value.trim() || null, status: $("paymentStatus").value,
    remarks: $("paymentRemarks").value.trim() || null
  });
  if (error) { setMessage(msg, "Payment save failed: " + error.message, "error"); return; }
  $("paymentForm").style.display = "none";
  $("paymentDate").value = ""; $("paymentAmount").value = ""; $("paymentType").value = ""; $("paymentReference").value = ""; $("paymentRemarks").value = "";
  setMessage(msg, "Payment recorded successfully.", "success");
  await showStudentRecord(studentId);
}

window.uploadStudentPhoto = uploadStudentPhoto;

async function uploadStudentPhoto(studentId) {
  const msg = $("recordMessage");
  try {
    if (!studentId) throw new Error("Student record was not identified. Please close the profile and open VIEW PROFILE again.");
    const input = $("studentPhotoFile");
    const file = input?.files?.[0];
    if (!file) { setMessage(msg, "Please choose a student photo first.", "error"); return; }
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) { setMessage(msg, "Please upload a JPG, PNG, or WebP image.", "error"); return; }
    if (file.size > 5 * 1024 * 1024) { setMessage(msg, "Photo must be 5 MB or smaller.", "error"); return; }

    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `students/${studentId}/photo.${ext}`;
    setMessage(msg, "Uploading student photo… Please wait.");
    const photoStatus = $("studentPhotoStatus");
    if (photoStatus) photoStatus.textContent = "Uploading photo to Supabase Storage…";

    // Upload as a normal INSERT instead of upsert. This avoids requiring
    // UPDATE permission when replacing an existing student photo.
    const { error: removeError } = await db.storage
      .from("student-photos")
      .remove([path]);

    // A missing old file is fine; continue with the new upload.
    if (removeError) {
      console.warn("Existing student photo could not be removed:", removeError.message);
    }

    const { error: uploadError } = await db.storage
      .from("student-photos")
      .upload(path, file, {
        upsert: false,
        contentType: file.type,
        cacheControl: "3600"
      });
    if (uploadError) throw new Error("Storage upload failed: " + uploadError.message);

    const { error: updateError } = await db.from("students")
      .update({ photo_path: path })
      .eq("id", studentId);
    if (updateError) throw new Error("Student record update failed: " + updateError.message);

    if (input) input.value = "";
    setMessage(msg, "Student photo uploaded successfully.", "success");
    if (photoStatus) photoStatus.textContent = "Photo uploaded successfully.";
    await showStudentRecord(studentId);
  } catch (err) {
    console.error("Student photo upload error:", err);
    setMessage(msg, err?.message || "Student photo upload failed.", "error");
    const photoStatus = $("studentPhotoStatus");
    if (photoStatus) photoStatus.textContent = "Upload failed: " + (err?.message || "Unknown error");
  }
}

async function uploadCertificate(studentId) {
  if (!studentId) return;
  const file = $("certificateFile")?.files?.[0];
  const name = $("certificateType")?.value.trim() || file?.name || "Certificate";
  const issuedDate = $("certificateDate")?.value || null;
  const msg = $("certificateMessage");
  if (!file) { setMessage(msg, "Please choose a certificate file first.", "error"); return; }
  const allowed = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
  if (!allowed.includes(file.type)) { setMessage(msg, "Please upload a PDF, JPG, PNG, or WebP file.", "error"); return; }
  if (file.size > 10 * 1024 * 1024) { setMessage(msg, "Certificate must be 10 MB or smaller.", "error"); return; }
  const safe = file.name.replace(/[^a-zA-Z0-9._-]+/g, "_");
  const path = `students/${studentId}/certificates/${Date.now()}_${safe}`;
  setMessage(msg, "Uploading certificate…");
  const { error: uploadError } = await db.storage.from("student-documents").upload(path, file, { upsert: false, contentType: file.type });
  if (uploadError) { setMessage(msg, "Certificate upload failed: " + uploadError.message, "error"); return; }
  const { error: insertError } = await db.from("student_certificates").insert({ student_id: studentId, certificate_name: name, issued_date: issuedDate, file_name: file.name, file_path: path });
  if (insertError) { await db.storage.from("student-documents").remove([path]); setMessage(msg, "Certificate record failed: " + insertError.message, "error"); return; }
  setMessage(msg, "Certificate uploaded successfully.", "success");
  await showStudentRecord(studentId);
}

async function viewCertificate(recordId) {
  const { data: record, error } = await db.from("student_certificates").select("file_path,file_name").eq("id", recordId).maybeSingle();
  if (error || !record) { setMessage($("recordMessage"), "Unable to find certificate: " + (error?.message || "record not found"), "error"); return; }
  const { data, error: urlError } = await db.storage.from("student-documents").createSignedUrl(record.file_path, 3600);
  if (urlError || !data?.signedUrl) { setMessage($("recordMessage"), "Unable to open certificate: " + (urlError?.message || "signed URL unavailable"), "error"); return; }
  window.open(data.signedUrl, "_blank", "noopener");
}

async function deleteCertificate(recordId, studentId) {
  if (!recordId || !confirm("Delete this certificate? This cannot be undone.")) return;
  const { data: record, error: readError } = await db.from("student_certificates").select("file_path").eq("id", recordId).maybeSingle();
  if (readError || !record) { setMessage($("recordMessage"), "Delete failed: " + (readError?.message || "certificate not found"), "error"); return; }
  const { error: fileError } = await db.storage.from("student-documents").remove([record.file_path]);
  if (fileError) { setMessage($("recordMessage"), "Certificate file delete failed: " + fileError.message, "error"); return; }
  const { error } = await db.from("student_certificates").delete().eq("id", recordId);
  if (error) { setMessage($("recordMessage"), "Certificate record delete failed: " + error.message, "error"); return; }
  setMessage($("recordMessage"), "Certificate deleted.", "success");
  await showStudentRecord(studentId);
}

async function deletePaymentRecord(recordId, studentId) {
  if (!recordId || !confirm("Delete this payment record? This cannot be undone.")) return;
  const { error } = await db.from("payments").delete().eq("id", recordId);
  if (error) { setMessage($("recordMessage"), "Delete failed: " + error.message, "error"); return; }
  setMessage($("recordMessage"), "Payment record deleted.", "success");
  await showStudentRecord(studentId);
}

async function printStudentProfileCard() {
  const student = window.currentRecordData;
  if (!student) { setMessage($("recordMessage"), "Student profile is still loading.", "error"); return; }
  const printWindow = window.open("", "_blank", "width=900,height=800");
  if (!printWindow) { setMessage($("recordMessage"), "Please allow pop-ups to print the profile card.", "error"); return; }
  const name = [student.first_name, student.middle_name, student.last_name].filter(Boolean).join(" ") || "Unnamed Student";
  const sid = student.student_id || "—";
  const belt = student.current_belt || "White Belt";
  const status = student.status || "Pending";
  const joined = formatDate(student.date_joined || student.created_at);
  const logo = new URL("hanah-neht-logo.png", window.location.href).href;
  const photo = student.photo_url ? `<img class="photo-img" src="${escapeHtml(student.photo_url)}" alt="Student photo">` : '<div class="photo">STUDENT<br>PHOTO</div>';
  let qrDataUrl = "";
  try { qrDataUrl = await makeStudentQRCode(student); } catch (e) {}
  const qr = qrDataUrl ? `<div class="qr-wrap"><img src="${qrDataUrl}" alt="Student QR Code"><div>SCAN STUDENT QR</div></div>` : '';
  printWindow.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(name)} - Student Profile Card</title><style>
  *{box-sizing:border-box}body{margin:0;background:#eee;font-family:Arial,sans-serif;color:#111;padding:24px}.card{width:780px;max-width:100%;margin:0 auto;background:#fff;border:2px solid #111;border-radius:16px;overflow:hidden;box-shadow:0 3px 12px rgba(0,0,0,.12)}.head{background:#111;color:#fff;padding:18px 24px;display:flex;align-items:center;gap:16px}.head img{width:64px;height:64px;object-fit:contain;background:#fff;border-radius:8px}.academy{font-size:13px;letter-spacing:1.5px}.academy strong{display:block;font-size:22px;letter-spacing:1px}.sub{font-size:11px;margin-top:4px}.body{padding:24px}.top{display:flex;gap:22px;align-items:flex-start}.photo{width:125px;height:155px;border:2px dashed #888;display:flex;align-items:center;justify-content:center;text-align:center;font-weight:bold;color:#777;font-size:14px;flex:none}.photo-img{width:125px;height:155px;border:2px solid #888;object-fit:cover;flex:none}.identity{flex:1}.name{font-size:28px;font-weight:800;margin:0 0 8px}.id{font-size:16px;font-weight:700;margin-bottom:14px}.badge{display:inline-block;padding:7px 12px;border:1px solid #111;border-radius:999px;margin-right:7px;font-weight:700}.grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:22px}.field{border-bottom:1px solid #ccc;padding-bottom:8px}.label{font-size:10px;text-transform:uppercase;color:#666;letter-spacing:1px}.value{font-size:14px;font-weight:600;margin-top:3px}.qr-wrap{margin-left:auto;text-align:center;font-size:9px;font-weight:700}.qr-wrap img{display:block;width:130px;height:130px;margin-bottom:5px}.section{margin-top:24px;border-top:2px solid #111;padding-top:10px}.section h3{margin:0 0 9px;font-size:15px}.sig{display:flex;gap:50px;margin-top:48px}.sig div{flex:1;border-top:1px solid #111;text-align:center;padding-top:7px;font-size:11px}.footer{text-align:center;font-size:10px;color:#666;padding:12px;border-top:1px solid #ddd}@media print{body{background:#fff;padding:0}.card{width:100%;border:2px solid #111;box-shadow:none}@page{size:A4;margin:12mm}}</style></head><body><div class="card"><div class="head"><img src="${logo}" alt="Hanah Neht logo"><div class="academy"><strong>HANAH NEHT TAEKWONDO ACADEMY</strong><span>KUKKIWON DOJANG • STUDENT PROFILE</span></div></div><div class="body"><div class="top">${photo}<div class="identity"><p class="name">${escapeHtml(name)}</p><div class="id">STUDENT ID: ${escapeHtml(sid)}</div><span class="badge">${escapeHtml(belt)}</span><span class="badge">${escapeHtml(status)}</span><div class="grid"><div class="field"><div class="label">Date Joined</div><div class="value">${escapeHtml(joined)}</div></div><div class="field"><div class="label">Birth Date</div><div class="value">${escapeHtml(formatDate(student.birth_date))}</div></div><div class="field"><div class="label">Gender</div><div class="value">${escapeHtml(student.gender || "—")}</div></div><div class="field"><div class="label">Phone</div><div class="value">${escapeHtml(student.phone || "—")}</div></div></div></div>${qr}</div><div class="section"><h3>CONTACT & EMERGENCY INFORMATION</h3><div class="grid"><div class="field"><div class="label">Address</div><div class="value">${escapeHtml(student.address || "—")}</div></div><div class="field"><div class="label">Emergency Contact</div><div class="value">${escapeHtml(student.emergency_contact_name || "—")}</div></div><div class="field"><div class="label">Emergency Phone</div><div class="value">${escapeHtml(student.emergency_contact_phone || "—")}</div></div></div></div><div class="section"><h3>ACADEMY RECORD</h3><p style="font-size:13px;line-height:1.5;margin:0">This profile card is issued for academy identification and student record reference. Promotion, attendance, and payment details are maintained in the academy's online student management system.</p></div><div class="sig"><div>Student / Parent Signature</div><div>Head Coach / Examiner</div></div></div><div class="footer">HANAH NEHT TAEKWONDO ACADEMY • KUKKIWON DOJANG</div></div></body></html>`);
  printWindow.document.close(); printWindow.focus(); setTimeout(() => printWindow.print(), 400);
}

function printStudentRecord() {
  const panel = $("studentRecordPanel");
  if (!panel) return;
  const printWindow = window.open("", "_blank", "width=1000,height=800");
  if (!printWindow) { setMessage($("recordMessage"), "Please allow pop-ups to print the record.", "error"); return; }
  printWindow.document.write(`<!doctype html><html><head><title>Student Master Record</title><style>body{font-family:Arial,sans-serif;padding:30px;color:#111}h1,h2,h3{margin-bottom:8px}.admin-table{width:100%;border-collapse:collapse;margin:12px 0 25px}.admin-table th,.admin-table td{border:1px solid #999;padding:7px;text-align:left}.admin-form-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:14px}.welcome-card{padding:10px;margin:10px 0;border:1px solid #ccc}.admin-head{display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #111;margin-bottom:20px}.btn,.admin-actions,#recordEditForm,#paymentForm,#recordMessage{display:none}</style></head><body>${panel.innerHTML}</body></html>`);
  printWindow.document.close(); printWindow.focus(); setTimeout(() => printWindow.print(), 300);
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
  area.insertAdjacentHTML("afterbegin", `
    <div class="welcome-card admin-welcome">
      <p class="eyebrow">AUTHORIZED ADMINISTRATOR</p>
      <h3>Welcome, Master Reynaldo!</h3>
      <p>Administrator account: ${escapeHtml(user.email)}</p>
    </div>
  `);
  await loadAdminStudents();
  ensureAttendancePanel();
  await loadAttendanceStudents();
  await loadAdminAttendance();
  await loadPromotionAdmin();
  await ensureGalleryAdminPanel();
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

// Gallery upload button - delegated handler so it keeps working after dynamic rendering.
document.addEventListener("click", async (event) => {
  const button = event.target.closest("#uploadGalleryMedia");
  if (!button || button.dataset.busy === "true") return;
  button.dataset.busy = "true";
  try {
    await uploadGalleryMedia();
  } catch (err) {
    console.error("Gallery upload error:", err);
    setMessage($("galleryAdminMessage"), "Upload error: " + (err?.message || String(err)), "error");
  } finally {
    button.dataset.busy = "false";
  }
});

// Restore an existing session after refresh.
loadPublicGallery();
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
