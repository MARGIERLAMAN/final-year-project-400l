# EduCache — SHS Offline Resource Hub

A Progressive Web App (PWA) for schools to distribute study materials, past questions, and notes over a local network — no internet required.

## 🚀 GitHub Pages Setup

1. Push this repo to GitHub.
2. Go to **Settings → Pages** → set Source to `main` branch, root (`/`).
3. Your site will be live at `https://<username>.github.io/<repo-name>/`.

## 📁 Project Structure

```
/
├── index.html          ← Entry point (redirects to login)
├── login.html          ← Login page (student & admin)
├── home.html           ← Student dashboard
├── admin.html          ← Admin resource manager
├── sw.js               ← Service Worker (offline PWA support)
├── manifest.json       ← PWA manifest
├── css/
│   ├── login.css
│   ├── home.css
│   └── admin.css
├── js/
│   ├── db.js           ← Shared IndexedDB wrapper
│   ├── login.js
│   ├── home.js
│   └── admin.js
└── icons/
    ├── icon-192.svg    ← PWA icon (add your own)
    └── icon-512.svg    ← PWA icon (add your own)
```

## 🔐 Demo Credentials

| Role    | School ID      | Password     |
|---------|----------------|--------------|
| Student | `STU-2024-001` | `student123` |
| Admin   | `ADM-0001`     | `admin123`   |

## 📦 Features

- **Offline-first PWA** — works without internet via Service Worker + IndexedDB
- **Student view** — search, filter, and download resources by subject/class
- **Admin panel** — drag-and-drop file upload, manage and delete resources
- **No server needed** — all data stored locally in the browser's IndexedDB

## ⚠️ Notes

- Files uploaded by the admin are stored in **IndexedDB** (browser storage), scoped per device/browser.
- The app does not have a backend — it is fully client-side.
- Add your own SVG icons to the `icons/` folder for full PWA installability.
