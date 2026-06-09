/* ============================================================
   EduCache — admin.js  (PWA + IndexedDB)
   Upload real files → stored in IndexedDB as Blobs.
   Students on home.js read from the same DB and download.
   ============================================================ */
'use strict';

// ── Auth guard (admin only) ───────────────────────────────────
const session = (() => {
  try { return JSON.parse(sessionStorage.getItem('eduCache_user')); } catch { return null; }
})();
if (!session || session.role !== 'admin') window.location.replace('login.html');

// ── DOM refs ─────────────────────────────────────────────────
const sidebar    = document.getElementById('sidebar');
const hamburger  = document.getElementById('hamburger');
const overlay    = document.getElementById('overlay');
const dropzone   = document.getElementById('dropzone');
const fileInput  = document.getElementById('fileInput');
const filePreview= document.getElementById('filePreview');
const fpIcon     = document.getElementById('fpIcon');
const fpName     = document.getElementById('fpName');
const fpSize     = document.getElementById('fpSize');
const fpRemove   = document.getElementById('fpRemove');
const progressWrap = document.getElementById('progressWrap');
const progressBar  = document.getElementById('progressBar');
const progressLabel= document.getElementById('progressLabel');
const formError    = document.getElementById('formError');
const uploadSuccess= document.getElementById('uploadSuccess');
const uploadBtn    = document.getElementById('uploadBtn');
const upBtnText    = document.getElementById('upBtnText');
const upSpinner    = document.getElementById('upSpinner');
const resetBtn     = document.getElementById('resetBtn');
const tableBody    = document.getElementById('resourceTableBody');
const tableEmpty   = document.getElementById('tableEmpty');
const deleteModal  = document.getElementById('deleteModal');
const deleteMsg    = document.getElementById('deleteModalMsg');
const toast        = document.getElementById('toast');

let selectedFile = null;   // File object chosen by admin
let pendingDeleteId = null; // id of resource to delete

// ── Sidebar ──────────────────────────────────────────────────
const openSB  = () => { sidebar.classList.add('open');    overlay.classList.add('show');    hamburger.classList.add('open'); };
const closeSB = () => { sidebar.classList.remove('open'); overlay.classList.remove('show'); hamburger.classList.remove('open'); };
hamburger.addEventListener('click', () => sidebar.classList.contains('open') ? closeSB() : openSB());
overlay.addEventListener('click', closeSB);

// ── Session UI ───────────────────────────────────────────────
function initials(name) { return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2); }
document.getElementById('sidebarAvatar').textContent = initials(session.name);
document.getElementById('mobileAvatar').textContent  = initials(session.name);
document.getElementById('sidebarName').textContent   = session.name;
document.getElementById('logoutBtn').addEventListener('click', () => {
  sessionStorage.clear(); window.location.replace('login.html');
});

// ── File emoji helper ─────────────────────────────────────────
function fileEmoji(type) {
  if (!type) return '📄';
  if (type.includes('pdf'))   return '📕';
  if (type.includes('video')) return '🎬';
  if (type.includes('word') || type.includes('document')) return '📝';
  if (type.includes('presentation')) return '📊';
  return '📄';
}

// ── Dropzone ──────────────────────────────────────────────────
document.getElementById('dzLink').addEventListener('click', () => fileInput.click());
dropzone.addEventListener('click', () => fileInput.click());

dropzone.addEventListener('dragover', e => { e.preventDefault(); dropzone.classList.add('drag-over'); });
dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));
dropzone.addEventListener('drop', e => {
  e.preventDefault();
  dropzone.classList.remove('drag-over');
  const f = e.dataTransfer.files[0];
  if (f) setFile(f);
});

fileInput.addEventListener('change', () => {
  if (fileInput.files[0]) setFile(fileInput.files[0]);
});

function setFile(file) {
  // 50 MB limit
  if (file.size > 50 * 1024 * 1024) {
    showFormError('File too large. Maximum size is 50 MB.'); return;
  }
  selectedFile = file;
  fpIcon.textContent = fileEmoji(file.type);
  fpName.textContent = file.name;
  fpSize.textContent = fmtSize(file.size);
  filePreview.style.display = 'flex';
  dropzone.style.display    = 'none';
  hideFormError();
  uploadSuccess.style.display = 'none';

  // Auto-fill title from filename
  if (!document.getElementById('resTitle').value) {
    const clean = file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
    document.getElementById('resTitle').value = clean;
  }
}

fpRemove.addEventListener('click', clearFile);

function clearFile() {
  selectedFile = null;
  fileInput.value = '';
  filePreview.style.display = 'none';
  dropzone.style.display    = 'block';
}

// ── Form helpers ──────────────────────────────────────────────
function showFormError(msg) { formError.textContent = msg; formError.style.display = 'block'; }
function hideFormError()    { formError.style.display = 'none'; }

function setUploading(on) {
  uploadBtn.disabled       = on;
  upBtnText.style.display  = on ? 'none'        : 'inline';
  upSpinner.style.display  = on ? 'inline-block' : 'none';
}

function resetForm() {
  clearFile();
  ['resTitle','resSubject','resClass','resCategory','resDesc'].forEach(id => {
    document.getElementById(id).value = '';
  });
  hideFormError();
  uploadSuccess.style.display = 'none';
  progressWrap.style.display  = 'none';
}

resetBtn.addEventListener('click', resetForm);

// ── Upload ────────────────────────────────────────────────────
uploadBtn.addEventListener('click', async () => {
  hideFormError();
  uploadSuccess.style.display = 'none';

  const title    = document.getElementById('resTitle').value.trim();
  const subject  = document.getElementById('resSubject').value;
  const cls      = document.getElementById('resClass').value;
  const category = document.getElementById('resCategory').value;
  const desc     = document.getElementById('resDesc').value.trim();

  // Validate
  if (!selectedFile) { showFormError('Please select a file to upload.'); return; }
  if (!title)        { showFormError('Please enter a resource title.'); return; }
  if (!subject)      { showFormError('Please select a subject.'); return; }
  if (!cls)          { showFormError('Please select a class.'); return; }
  if (!category)     { showFormError('Please select a category.'); return; }

  setUploading(true);
  progressWrap.style.display = 'flex';

  // Animate progress bar (simulated — IndexedDB is sync after read)
  await animateProgress();

  try {
    await addResource({
      title,
      subject,
      class: cls,
      category,
      description: desc,
      fileName: selectedFile.name,
      fileType: selectedFile.type,
      fileSize: selectedFile.size,
      file:     selectedFile,       // actual Blob stored in IDB
    });

    progressBar.style.width = '100%';
    progressLabel.textContent = 'Saved ✓';

    setTimeout(() => {
      progressWrap.style.display = 'none';
      progressBar.style.width   = '0%';
      uploadSuccess.style.display = 'block';
      setUploading(false);
      clearFile();
      ['resTitle','resSubject','resClass','resCategory','resDesc'].forEach(id => {
        document.getElementById(id).value = '';
      });
      loadTable();
      loadStats();
      showToast(`✅ "${title.slice(0,30)}" uploaded for students`);
    }, 600);

  } catch (err) {
    progressWrap.style.display = 'none';
    showFormError('Upload failed. Storage may be full or unavailable.');
    setUploading(false);
  }
});

function animateProgress() {
  return new Promise(resolve => {
    progressBar.style.width = '0%';
    progressLabel.textContent = 'Saving to device…';
    let w = 0;
    const iv = setInterval(() => {
      w += Math.random() * 18 + 8;
      if (w >= 88) { clearInterval(iv); w = 88; resolve(); }
      progressBar.style.width = w + '%';
    }, 80);
  });
}

// ── Load stats ────────────────────────────────────────────────
async function loadStats() {
  const all     = await getAllResources();
  const weekAgo = Date.now() - 7 * 864e5;
  document.getElementById('statTotal').textContent = all.length;
  document.getElementById('statNew').textContent   = all.filter(r => r.uploadedAt > weekAgo).length;
}

// ── Manage table ──────────────────────────────────────────────
let allRows = [];

async function loadTable() {
  allRows = await getAllResources();
  renderTable(allRows);
}

function renderTable(rows) {
  if (!rows.length) {
    tableBody.innerHTML = '';
    tableEmpty.style.display = 'block';
    return;
  }
  tableEmpty.style.display = 'none';
  tableBody.innerHTML = rows.map(r => `
    <tr>
      <td class="tbl-title" title="${r.title}">${r.title.length > 42 ? r.title.slice(0,42)+'…' : r.title}</td>
      <td>${r.subject}</td>
      <td>${r.class}</td>
      <td><span class="tbl-badge">${r.category}</span></td>
      <td>${fmtSize(r.fileSize)}</td>
      <td>${fmtDate(r.uploadedAt)}</td>
      <td>
        <div class="tbl-actions">
          <button class="tbl-btn" onclick="previewResource(${r.id})">👁 View</button>
          <button class="tbl-btn del" onclick="confirmDelete(${r.id}, '${r.title.replace(/'/g,"\\'")}')">🗑 Remove</button>
        </div>
      </td>
    </tr>`).join('');
}

// ── Search / filter table ─────────────────────────────────────
document.getElementById('manageSearch').addEventListener('input', filterTable);
document.getElementById('manageFilter').addEventListener('change', filterTable);

function filterTable() {
  const q  = document.getElementById('manageSearch').value.trim().toLowerCase();
  const sf = document.getElementById('manageFilter').value;
  const filtered = allRows.filter(r => {
    const ms = !q || r.title.toLowerCase().includes(q) || r.subject.toLowerCase().includes(q);
    const mf = sf === 'all' || r.subject === sf;
    return ms && mf;
  });
  renderTable(filtered);
}

// ── Preview (open Blob URL in new tab) ───────────────────────
window.previewResource = async function(id) {
  const r = await getResource(id);
  if (!r || !r.file) { showToast('File not found.'); return; }
  const url = URL.createObjectURL(r.file);
  window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 60000);
};

// ── Delete ────────────────────────────────────────────────────
window.confirmDelete = function(id, title) {
  pendingDeleteId = id;
  deleteMsg.textContent = `"${title}" will be permanently removed and students won't be able to download it.`;
  deleteModal.style.display = 'grid';
};

document.getElementById('deleteCancel').addEventListener('click', () => {
  deleteModal.style.display = 'none'; pendingDeleteId = null;
});

document.getElementById('deleteConfirm').addEventListener('click', async () => {
  if (!pendingDeleteId) return;
  try {
    await deleteResource(pendingDeleteId);
    deleteModal.style.display = 'none';
    pendingDeleteId = null;
    showToast('🗑️ Resource removed');
    await loadTable();
    await loadStats();
  } catch {
    showToast('Failed to delete. Try again.');
  }
});

// ── Toast ─────────────────────────────────────────────────────
let toastTimer;
function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3200);
}

// ── Init ─────────────────────────────────────────────────────
loadStats();
loadTable();
