/* ============================================================
   EduCache — login.js  (PWA + IndexedDB version)
   ============================================================ */
'use strict';

// Register service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./final-year-project-400l/sw.js').catch(() => {});
}

let activeRole = 'student';

const roleTabs   = document.querySelectorAll('.role-tab');
const schoolId   = document.getElementById('schoolId');
const password   = document.getElementById('password');
const loginBtn   = document.getElementById('loginBtn');
const btnText    = document.getElementById('btnText');
const btnSpinner = document.getElementById('btnSpinner');
const errorBanner= document.getElementById('errorBanner');
const pwToggle   = document.getElementById('pwToggle');
const eyeIcon    = document.getElementById('eyeIcon');

// ── Role tabs ────────────────────────────────────────────────
roleTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    roleTabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    activeRole = tab.dataset.role;
    schoolId.placeholder = activeRole === 'admin' ? 'e.g. ADM-0001' : 'e.g. STU-2024-001';
    hideError();
  });
});

// ── Password toggle ──────────────────────────────────────────
pwToggle.addEventListener('click', () => {
  const hidden = password.type === 'password';
  password.type = hidden ? 'text' : 'password';
  eyeIcon.innerHTML = hidden
    ? `<path d="M17.94 17.94A10 10 0 0 1 12 20c-7 0-11-8-11-8a18 18 0 0 1 5.06-5.94"/>
       <path d="M9.9 4.24A9 9 0 0 1 12 4c7 0 11 8 11 8a18 18 0 0 1-2.16 3.19"/>
       <line x1="1" y1="1" x2="23" y2="23"/>`
    : `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>`;
});

// ── Helpers ──────────────────────────────────────────────────
function showError(msg) { errorBanner.textContent = msg; errorBanner.style.display = 'block'; }
function hideError()    { errorBanner.style.display = 'none'; }

function setLoading(on) {
  loginBtn.disabled        = on;
  btnText.style.display    = on ? 'none'         : 'inline';
  btnSpinner.style.display = on ? 'inline-block'  : 'none';
}

// ── Login ────────────────────────────────────────────────────
async function handleLogin() {
  hideError();
  const id = schoolId.value.trim();
  const pw = password.value;
  if (!id) { showError('Enter your School ID.'); return; }
  if (!pw) { showError('Enter your password.'); return; }

  setLoading(true);
  try {
    const user = await authenticate(id, pw);
    if (!user) { showError('Invalid School ID or password.'); setLoading(false); return; }
    if (user.role !== activeRole) {
      showError(`This ID belongs to a ${user.role} account. Switch the tab above.`);
      setLoading(false); return;
    }
    // Save session
    sessionStorage.setItem('eduCache_user', JSON.stringify(user));
    window.location.replace(user.role === 'admin' ? './final-year-project-400l/admin.html' : './final-year-project-400l/home.html');
  } catch (err) {
    showError('Something went wrong. Try again.');
    setLoading(false);
  }
}

loginBtn.addEventListener('click', handleLogin);
password.addEventListener('keydown', e => { if (e.key === 'Enter') handleLogin(); });
[schoolId, password].forEach(el => el.addEventListener('input', hideError));

// ── Already logged in? ───────────────────────────────────────
(function() {
  try {
    const u = JSON.parse(sessionStorage.getItem('eduCache_user'));
    if (u?.id) window.location.replace(u.role === 'admin' ? './final-year-project-400l/admin.html' : './final-year-project-400l/home.html');
  } catch {}
})();
