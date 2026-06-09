/* ============================================================
   EduCache — home.js  (PWA + IndexedDB)
   ============================================================ */
'use strict';

// ── Auth guard ───────────────────────────────────────────────
const session = (() => {
  try { return JSON.parse(sessionStorage.getItem('eduCache_user')); } catch { return null; }
})();
if (!session) window.location.replace('login.html');

// ── DOM refs ─────────────────────────────────────────────────
const sidebar      = document.getElementById('sidebar');
const hamburger    = document.getElementById('hamburger');
const overlay      = document.getElementById('overlay');
const subjectsGrid = document.getElementById('subjectsGrid');
const resourcesList= document.getElementById('resourcesList');
const searchInput  = document.getElementById('searchInput');
const searchBtn    = document.getElementById('searchBtn');
const toast        = document.getElementById('toast');
const dlModal      = document.getElementById('dlModal');

let allResources = [];
let activeFilter = 'all';
let searchQuery  = '';
let pendingDL    = null;  // resource object queued for download

// ── Sidebar ──────────────────────────────────────────────────
const open  = () => { sidebar.classList.add('open');    overlay.classList.add('show');    hamburger.classList.add('open'); };
const close = () => { sidebar.classList.remove('open'); overlay.classList.remove('show'); hamburger.classList.remove('open'); };
hamburger.addEventListener('click', () => sidebar.classList.contains('open') ? close() : open());
overlay.addEventListener('click', close);

// ── Session UI ───────────────────────────────────────────────
function greet(name) {
  const h = new Date().getHours();
  return h < 12 ? `Good morning, ${name} 🌤️` : h < 17 ? `Good afternoon, ${name} ☀️` : `Good evening, ${name} 🌙`;
}
function initials(name) { return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2); }

function applySession() {
  const ini = initials(session.name);
  document.getElementById('sidebarAvatar').textContent = ini;
  document.getElementById('mobileAvatar').textContent  = ini;
  document.getElementById('sidebarName').textContent   = session.name;
  document.getElementById('sidebarClass').textContent  = `${session.class} — ${session.stream}`;
  document.getElementById('heroGreeting').textContent  = greet(session.name.split(' ')[0]);
}

document.getElementById('logoutBtn').addEventListener('click', () => {
  sessionStorage.clear(); window.location.replace('login.html');
});

// ── Load resources from IndexedDB ────────────────────────────
async function loadResources() {
  allResources = await getAllResources();
  renderStats();
  renderSubjects();
  renderResources();
}

// ── Stats ────────────────────────────────────────────────────
function renderStats() {
  const weekAgo = Date.now() - 7 * 864e5;
  const subjects = [...new Set(allResources.map(r => r.subject))];
  const pq       = allResources.filter(r => r.category === 'Past Questions');
  const fresh    = allResources.filter(r => r.uploadedAt > weekAgo);

  animCount(document.getElementById('statTotal'),    allResources.length);
  animCount(document.getElementById('statSubjects'), subjects.length);
  animCount(document.getElementById('statPQ'),       pq.length);
  animCount(document.getElementById('statNew'),      fresh.length);
}

function animCount(el, target) {
  let s = null;
  const step = ts => {
    if (!s) s = ts;
    const p = Math.min((ts - s) / 900, 1);
    el.textContent = Math.floor((1 - Math.pow(1-p,3)) * target);
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// ── Subjects grid (derived from uploaded resources) ───────────
const SUBJECT_META = {
  'Mathematics':         { emoji:'📐', color:'#e67e22' },
  'English':             { emoji:'📖', color:'#2980b9' },
  'Science':             { emoji:'🔬', color:'#27ae60' },
  'Social Studies':      { emoji:'🌍', color:'#8e44ad' },
  'Elective Mathematics':{ emoji:'📊', color:'#c0392b' },
  'Physics':             { emoji:'⚡', color:'#16a085' },
  'Chemistry':           { emoji:'🧪', color:'#d35400' },
  'Biology':             { emoji:'🌱', color:'#1abc9c' },
  'History':             { emoji:'🏛️', color:'#7f8c8d' },
  'Economics':           { emoji:'💹', color:'#f39c12' },
  'Literature':          { emoji:'📜', color:'#9b59b6' },
  'ICT':                 { emoji:'💻', color:'#2c3e50' },
};

function filtered() {
  return allResources.filter(r => {
    const mf = activeFilter === 'all' || r.class === activeFilter || r.category === activeFilter;
    const ms = !searchQuery ||
      r.title.toLowerCase().includes(searchQuery) ||
      r.subject.toLowerCase().includes(searchQuery);
    return mf && ms;
  });
}

function renderSubjects() {
  const list = filtered();
  const counts = {};
  list.forEach(r => { counts[r.subject] = (counts[r.subject] || 0) + 1; });
  const subjects = Object.keys(counts);

  if (!subjects.length) {
    subjectsGrid.innerHTML = `<p class="empty-msg">No subjects found.</p>`;
    return;
  }

  subjectsGrid.innerHTML = subjects.map(s => {
    const m = SUBJECT_META[s] || { emoji:'📁', color:'#7a9b7d' };
    return `<div class="subject-card" style="--sc:${m.color}"
              onclick="filterBySubject('${s}')">
              <span class="subject-emoji">${m.emoji}</span>
              <div class="subject-name">${s}</div>
              <div class="subject-count">${counts[s]} file${counts[s]>1?'s':''}</div>
            </div>`;
  }).join('');
}

window.filterBySubject = function(sub) {
  searchInput.value = sub;
  searchQuery = sub.toLowerCase();
  renderSubjects();
  renderResources();
};

// ── Resources list ────────────────────────────────────────────
function renderResources() {
  const list = filtered();

  if (!list.length) {
    resourcesList.innerHTML = allResources.length === 0
      ? `<div class="empty-state">
           <div class="empty-icon">📭</div>
           <p class="empty-title">No resources yet</p>
           <p class="empty-sub">The admin hasn't uploaded any files yet.<br>Check back soon or ask your IT teacher.</p>
         </div>`
      : `<p class="empty-msg">No resources match your search.</p>`;
    return;
  }

  resourcesList.innerHTML = list.map(r => `
    <div class="resource-item" onclick="openDownload(${r.id})">
      <div class="resource-icon" style="background:${(SUBJECT_META[r.subject]||{color:'#3a7d44'}).color}22;
           color:${(SUBJECT_META[r.subject]||{color:'#3a7d44'}).color}">
        ${fileEmoji(r.fileType)}
      </div>
      <div class="resource-info">
        <div class="resource-title">${r.title}</div>
        <div class="resource-meta">${r.subject} · ${r.class} · ${r.category} · ${fmtSize(r.fileSize)}</div>
        <div class="resource-date">Added ${fmtDate(r.uploadedAt)}</div>
      </div>
      <button class="resource-dl" onclick="event.stopPropagation();openDownload(${r.id})">⬇ Get</button>
    </div>`).join('');
}

function fileEmoji(type) {
  if (!type) return '📄';
  if (type.includes('pdf'))   return '📕';
  if (type.includes('video')) return '🎬';
  if (type.includes('word') || type.includes('doc')) return '📝';
  if (type.includes('presentation') || type.includes('ppt')) return '📊';
  return '📄';
}

// ── Download modal ────────────────────────────────────────────
window.openDownload = async function(id) {
  const r = await getResource(id);
  if (!r) return;
  pendingDL = r;
  document.getElementById('dlTitle').textContent = r.title;
  document.getElementById('dlMeta').textContent  = `${r.subject} · ${r.class} · ${r.category} · ${fmtSize(r.fileSize)}`;
  document.getElementById('dlDesc').textContent  = r.description || 'No description provided.';
  dlModal.style.display = 'grid';
};

document.getElementById('dlCancel').addEventListener('click', () => {
  dlModal.style.display = 'none'; pendingDL = null;
});

document.getElementById('dlConfirm').addEventListener('click', () => {
  if (!pendingDL) return;
  const url  = URL.createObjectURL(pendingDL.file);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = pendingDL.fileName || pendingDL.title;
  a.click();
  URL.revokeObjectURL(url);
  dlModal.style.display = 'none';
  showToast(`✅ Downloading "${pendingDL.title.slice(0,30)}…"`);
  pendingDL = null;
});

// ── Search + chips ────────────────────────────────────────────
function doSearch() {
  searchQuery = searchInput.value.trim().toLowerCase();
  renderSubjects(); renderResources();
}
searchBtn.addEventListener('click', doSearch);
searchInput.addEventListener('keydown', e => { if (e.key === 'Enter') doSearch(); });
searchInput.addEventListener('input',   () => { if (!searchInput.value) { searchQuery=''; renderSubjects(); renderResources(); } });

document.querySelectorAll('.chip').forEach(c => {
  c.addEventListener('click', () => {
    document.querySelectorAll('.chip').forEach(x => x.classList.remove('active'));
    c.classList.add('active');
    activeFilter = c.dataset.filter;
    renderSubjects(); renderResources();
  });
});

// ── Toast ─────────────────────────────────────────────────────
let toastTimer;
function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3200);
}

// ── Init ──────────────────────────────────────────────────────
applySession();
loadResources();
