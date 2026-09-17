// HANAH NEHT TAEKWONDO ACADEMY
// Real Supabase Authentication connection.
// Only the publishable key is used in browser code.

const SUPABASE_URL = "https://ztlnszexrwximmmomdui.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_aAK8s-mKAmV6JZdTyN_PIg_iifwClYn";

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

const menu = document.querySelector(".menu-btn");
const nav = document.querySelector("nav");
if (menu && nav) menu.onclick = () => nav.classList.toggle("open");

const modal = document.getElementById("registerModal");
const registerBtn = document.getElementById("registerBtn");
const closeRegister = document.getElementById("closeRegister");

function openRegistration() {
  if (modal) {
    modal.style.display = "flex";
    modal.setAttribute("aria-hidden", "false");
  }
}
function closeRegistration() {
  if (modal) {
    modal.style.display = "none";
    modal.setAttribute("aria-hidden", "true");
  }
}
if (registerBtn) registerBtn.onclick = openRegistration;
if (closeRegister) closeRegister.onclick = closeRegistration;
if (modal) modal.onclick = e => { if (e.target === modal) closeRegistration(); };

const registerForm = document.getElementById("registerForm");
if (registerForm) {
  registerForm.onsubmit = async e => {
    e.preventDefault();
    const msg = document.getElementById("registerMessage");
    const first_name = document.getElementById("regFirstName").value.trim();
    const last_name = document.getElementById("regLastName").value.trim();
    const email = document.getElementById("regEmail").value.trim();
    const password = document.getElementById("regPassword").value;

    msg.textContent = "Creating student account…";

    const { data, error } = await db.auth.signUp({
      email,
      password,
      options: {
        data: { first_name, last_name },
        emailRedirectTo: window.location.origin + window.location.pathname
      }
    });

    if (error) {
      msg.textContent = error.message;
      return;
    }

    registerForm.reset();
    if (data.session) {
      msg.textContent = "Account created successfully. Your academy status is Pending approval.";
    } else {
      msg.textContent = "Account created. Please check your email to confirm the account, then sign in.";
    }
  };
}

const loginForm = document.getElementById("loginForm");
if (loginForm) {
  loginForm.onsubmit = async e => {
    e.preventDefault();
    const msg = document.getElementById("loginMessage");
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    msg.textContent = "Signing in…";
    const { data, error } = await db.auth.signInWithPassword({ email, password });

    if (error) {
      msg.textContent = error.message;
      return;
    }

    const { data: profile } = await db
      .from("students")
      .select("first_name,last_name,student_id,current_belt,status")
      .eq("id", data.user.id)
      .maybeSingle();

    if (profile) {
      msg.textContent = `Welcome, ${profile.first_name}! Status: ${profile.status}. Belt: ${profile.current_belt}.`;
    } else {
      msg.textContent = "Login successful. Your academy profile is being prepared.";
    }
  };
}
