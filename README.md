# 🐾 PawRecord — Pet Vaccine & Health Tracker

A React prototype for managing pet vaccination history, dose timelines, and health records.

---

## 📁 Files in This Folder
- `PawRecord.jsx` — Main React component (full app)
- `README.md` — This setup guide

---

## 🛠 Requirements
- Node.js (LTS) → https://nodejs.org
- VS Code → https://code.visualstudio.com

---

## 🚀 Setup Steps (Terminal)

### 1. Create Vite + React project
```
npm create vite@latest pawrecord -- --template react
cd pawrecord
npm install
```

### 2. Replace the default App
- Delete contents of `src/App.jsx`
- Paste the contents of `PawRecord.jsx` into `src/App.jsx`

### 3. Clean up App.css and index.css (optional)
- Delete contents of `src/App.css`
- Delete contents of `src/index.css`

### 4. Run locally
```
npm run dev
```
- Opens at: http://localhost:5173

---

## 🌐 Deploy to Vercel (Free Hosting)

### Option A — Vercel CLI
```
npm install -g vercel
vercel
```

### Option B — Vercel Dashboard
1. Push project to GitHub
2. Go to https://vercel.com
3. Import your GitHub repo
4. Click Deploy → done!

---

## 📋 Phase 1 Roadmap (Remaining)
- [ ] JSON export / import (data backup)
- [ ] localStorage persistence (data survives refresh)
- [ ] Edit / delete a logged dose
- [ ] Vet visit records
- [ ] PDF export

## 🔮 Phase 2 Roadmap
- [ ] Sync vaccine schedule with Google Calendar / Apple Calendar
- [ ] Push notification 60 days before next vaccine due date

---

## 🧱 Tech Stack
- React 18 (Vite)
- No external UI libraries (pure inline styles)
- Google Fonts: Playfair Display + DM Sans

---

Built with Claude · May 2026
