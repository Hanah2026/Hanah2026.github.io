// HANAH NEHT TAEKWONDO ACADEMY
const SUPABASE_URL = "https://ztlnszexrwximmmomdui.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_aAK8s-mKAmV6JZdTyN_PIg_iifwClYn";

const menu = document.querySelector(".menu-btn");
const nav = document.querySelector("nav");
if (menu && nav) menu.onclick = () => nav.classList.toggle("open");

const modal = document.getElementById("registerModal");
const registerBtn = document.getElementById("registerBtn");
const closeRegister = document.getElementById("closeRegister");

function openRegistration() {
  if (!modal) return;
  modal.style.display = "flex";
  modal.setAttribute("aria-hidden", "false");
}
function closeRegistration() {
  if (!modal) return;
  modal.style.display = "none";
  modal.setAttribute("aria-hidden", "true");
}
if (registerBtn) registerBtn.onclick = openRegistration;
if (closeRegister) closeRegister.onclick = closeRegistration;
if (modal) modal.onclick = (e) => { if (e.target === modal) closeRegistration(); };

const loginForm = document.getElementById("loginForm");
if (loginForm) {
  loginForm.onsubmit = (e) => {
    e.preventDefault();
    const msg = document.getElementById("loginMessage");
    if (msg) msg.textContent = "The login screen is ready. Online authentication will be connected after this version is published.";
  };
}

const registerForm = document.getElementById("registerForm");
if (registerForm) {
  registerForm.onsubmit = async (e) => {
    e.preventDefault();
    const msg = document.getElementById("registerMessage");
    if (msg) msg.textContent = "Registration form received. The real Supabase account connection will be enabled in the online version.";
  };
}
