/* ============================================================
   EduCache — db.js
   Shared IndexedDB wrapper.
   Stores:
     - resources  : metadata + file blob uploaded by admin
     - users      : mock student/admin accounts
   All reads/writes return Promises.
   ============================================================ */
'use strict';

const DB_NAME    = 'educacheDB';
const DB_VERSION = 1;

/* ---------- open ------------------------------------------ */
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = e => {
      const db = e.target.result;

      // resources store
      if (!db.objectStoreNames.contains('resources')) {
        const rs = db.createObjectStore('resources', { keyPath: 'id', autoIncrement: true });
        rs.createIndex('subject',  'subject',  { unique: false });
        rs.createIndex('class',    'class',    { unique: false });
        rs.createIndex('category', 'category', { unique: false });
      }

      // users store (seeded below)
      if (!db.objectStoreNames.contains('users')) {
        db.createObjectStore('users', { keyPath: 'id' });
      }
    };

    req.onsuccess = e => {
      const db = e.target.result;
      seedUsers(db).then(() => resolve(db));
    };

    req.onerror = () => reject(req.error);
  });
}

/* ---------- seed users once ------------------------------- */
function seedUsers(db) {
  return new Promise((resolve) => {
    const tx  = db.transaction('users', 'readwrite');
    const st  = tx.objectStore('users');
    const chk = st.get('STU-2024-001');
    chk.onsuccess = () => {
      if (chk.result) { resolve(); return; }   // already seeded
      const USERS = [
        { id: 'STU-2024-001', password: 'student123', role: 'student', name: 'Ama Kyei',     class: 'SHS 2', stream: 'Science'  },
        { id: 'STU-2024-002', password: 'student123', role: 'student', name: 'Kofi Mensah',  class: 'SHS 1', stream: 'General Arts' },
        { id: 'STU-2024-003', password: 'student123', role: 'student', name: 'Abena Asante', class: 'SHS 3', stream: 'Business' },
        { id: 'ADM-0001',     password: 'admin123',   role: 'admin',   name: 'Mr. Boateng',  class: null,    stream: null      },
      ];
      USERS.forEach(u => st.put(u));
      tx.oncomplete = resolve;
    };
    chk.onerror = resolve;
  });
}

/* ---------- authenticate ---------------------------------- */
function authenticate(id, password) {
  return openDB().then(db => new Promise((resolve, reject) => {
    const tx  = db.transaction('users', 'readonly');
    const req = tx.objectStore('users').get(id);
    req.onsuccess = () => {
      const u = req.result;
      if (u && u.password === password) resolve(u);
      else resolve(null);
    };
    req.onerror = () => reject(req.error);
  }));
}

/* ---------- resources ------------------------------------- */

/** Add a resource. data.file is a Blob. */
function addResource(data) {
  return openDB().then(db => new Promise((resolve, reject) => {
    const tx  = db.transaction('resources', 'readwrite');
    const req = tx.objectStore('resources').add({
      title:       data.title,
      subject:     data.subject,
      class:       data.class,
      category:    data.category,
      description: data.description || '',
      fileName:    data.fileName,
      fileType:    data.fileType,
      fileSize:    data.fileSize,
      file:        data.file,          // Blob
      uploadedAt:  Date.now(),
    });
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  }));
}

/** Get all resources (metadata only — no blob for listing) */
function getAllResources() {
  return openDB().then(db => new Promise((resolve, reject) => {
    const tx   = db.transaction('resources', 'readonly');
    const req  = tx.objectStore('resources').getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  }));
}

/** Get one resource including its Blob */
function getResource(id) {
  return openDB().then(db => new Promise((resolve, reject) => {
    const tx  = db.transaction('resources', 'readonly');
    const req = tx.objectStore('resources').get(id);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror   = () => reject(req.error);
  }));
}

/** Delete a resource by id */
function deleteResource(id) {
  return openDB().then(db => new Promise((resolve, reject) => {
    const tx  = db.transaction('resources', 'readwrite');
    const req = tx.objectStore('resources').delete(id);
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  }));
}

/** Format bytes nicely */
function fmtSize(bytes) {
  if (bytes < 1024)       return bytes + ' B';
  if (bytes < 1048576)    return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

/** Format timestamp */
function fmtDate(ts) {
  return new Date(ts).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
