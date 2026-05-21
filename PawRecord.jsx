import { useState, useEffect } from "react";

// ─── localStorage helpers ────────────────────────────────────────────────────
const STORAGE_VERSION = "5";
function loadStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
function saveStorage(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

// ─── Notification helpers ─────────────────────────────────────────────────────
function notifPermission() {
  if (!("Notification" in window)) return "unsupported";
  return Notification.permission; // "default" | "granted" | "denied"
}
async function requestNotifPermission() {
  if (!("Notification" in window)) return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}
function sendNotif(title, body, tag) {
  if (notifPermission() !== "granted") return;
  new Notification(title, { body, tag, icon: "/favicon.ico" });
}
function checkAndNotify(pets, history, visits) {
  if (notifPermission() !== "granted") return;
  const notified = loadStorage("pr_notified", {});
  let updated = false;
  const today = new Date();

  // Vaccine due dates
  pets.forEach(pet => {
    const ph = history[pet.id] || {};
    Object.entries(ph).forEach(([vaccineName, doses]) => {
      if (!doses.length) return;
      const last = doses[doses.length - 1];
      if (!last?.nextDue) return;
      const days = Math.ceil((new Date(last.nextDue) - today) / 86400000);
      if (days < 0 || days > 60) return;
      const key = `${pet.id}-${vaccineName}-${last.nextDue}`;
      if (notified[key]) return;
      const when = days === 0 ? "today" : days === 1 ? "tomorrow" : `in ${days} days`;
      sendNotif(`🐾 ${pet.name} — ${vaccineName} due ${when}`, `Due on ${new Date(last.nextDue).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}`, key);
      notified[key] = true;
      updated = true;
    });
  });

  // Vet visit next appointments
  pets.forEach(pet => {
    (visits[pet.id] || []).forEach(visit => {
      if (!visit.nextAppointment) return;
      const days = Math.ceil((new Date(visit.nextAppointment) - today) / 86400000);
      if (days < 0 || days > 60) return;
      const key = `visit-${pet.id}-${visit.id}-${visit.nextAppointment}`;
      if (notified[key]) return;
      const when = days === 0 ? "today" : days === 1 ? "tomorrow" : `in ${days} days`;
      sendNotif(`🏥 ${pet.name} — Vet appointment ${when}`, `Scheduled for ${new Date(visit.nextAppointment).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}`, key);
      notified[key] = true;
      updated = true;
    });
  });

  if (updated) saveStorage("pr_notified", notified);
}
// Clear old data if app version changed (e.g. sample data reset)
if (localStorage.getItem("pr_version") !== STORAGE_VERSION) {
  ["pr_pets","pr_history","pr_activePetId","pr_custom_vaccines"].forEach(k => localStorage.removeItem(k));
  localStorage.setItem("pr_version", STORAGE_VERSION);
}

const C = {
  cream: "#FDF6EC", brown: "#6B3F1F", amber: "#D4872A",
  sage: "#7A9E7E", coral: "#E8735A", light: "#FFF9F2",
  muted: "#B89880", dark: "#3D2010", blue: "#5B8DB8", purple: "#8B6BB1",
};

// ─── Vaccine Schedules ──────────────────────────────────────────────────────
const DOG_VACCINES = [
  {
    name: "Rabies", type: "Core",
    description: "Required by law in most states",
    doses: [
      { label: "1st dose", weekMin: 12, weekMax: 16 },
      { label: "Booster (1yr)", monthsAfter: 12 },
      { label: "Booster (3yr)", monthsAfter: 36, repeat: true },
    ],
    boosterIntervalMonths: 36, color: C.coral,
  },
  {
    name: "DHPP", type: "Core",
    description: "Distemper, Hepatitis, Parainfluenza, Parvovirus",
    doses: [
      { label: "1st dose", weekMin: 6, weekMax: 8 },
      { label: "2nd dose", weekMin: 10, weekMax: 12 },
      { label: "3rd dose", weekMin: 14, weekMax: 16 },
      { label: "Booster (1yr)", monthsAfter: 12 },
      { label: "Booster (3yr)", monthsAfter: 36, repeat: true },
    ],
    boosterIntervalMonths: 36, color: C.amber,
  },
  {
    name: "Bordetella", type: "Non-Core",
    description: "Kennel cough — recommended for social dogs",
    doses: [
      { label: "1st dose", weekMin: 8 },
      { label: "Annual booster", monthsAfter: 12, repeat: true },
    ],
    boosterIntervalMonths: 12, color: C.sage,
  },
  {
    name: "Leptospirosis", type: "Non-Core",
    description: "Recommended for dogs exposed to wildlife/water",
    doses: [
      { label: "1st dose", weekMin: 12 },
      { label: "2nd dose (3-4wks later)", weekMin: 15 },
      { label: "Annual booster", monthsAfter: 12, repeat: true },
    ],
    boosterIntervalMonths: 12, color: C.blue,
  },
  {
    name: "Lyme Disease", type: "Non-Core",
    description: "For dogs in tick-endemic areas",
    doses: [
      { label: "1st dose", weekMin: 12 },
      { label: "2nd dose (2-4wks later)", weekMin: 15 },
      { label: "Annual booster", monthsAfter: 12, repeat: true },
    ],
    boosterIntervalMonths: 12, color: C.purple,
  },
  {
    name: "Canine Influenza", type: "Non-Core",
    description: "For dogs in high-risk/boarding environments",
    doses: [
      { label: "1st dose", weekMin: 8 },
      { label: "2nd dose (2-4wks later)", weekMin: 11 },
      { label: "Annual booster", monthsAfter: 12, repeat: true },
    ],
    boosterIntervalMonths: 12, color: "#C0836A",
  },
];

const CAT_VACCINES = [
  {
    name: "Rabies", type: "Core",
    description: "Required by law in most states",
    doses: [
      { label: "1st dose", weekMin: 12 },
      { label: "Booster (1yr)", monthsAfter: 12 },
      { label: "Booster (3yr)", monthsAfter: 36, repeat: true },
    ],
    boosterIntervalMonths: 36, color: C.coral,
  },
  {
    name: "FVRCP", type: "Core",
    description: "Feline Viral Rhinotracheitis, Calicivirus, Panleukopenia",
    doses: [
      { label: "1st dose", weekMin: 6, weekMax: 8 },
      { label: "2nd dose", weekMin: 10, weekMax: 12 },
      { label: "3rd dose", weekMin: 14, weekMax: 16 },
      { label: "Booster (1yr)", monthsAfter: 12 },
      { label: "Booster (3yr)", monthsAfter: 36, repeat: true },
    ],
    boosterIntervalMonths: 36, color: C.amber,
  },
  {
    name: "FeLV", type: "Core (kittens)",
    description: "Feline Leukemia Virus — essential for outdoor cats",
    doses: [
      { label: "1st dose", weekMin: 8 },
      { label: "2nd dose (3-4wks later)", weekMin: 11 },
      { label: "Annual booster", monthsAfter: 12, repeat: true },
    ],
    boosterIntervalMonths: 12, color: C.sage,
  },
  {
    name: "FIV", type: "Non-Core",
    description: "Feline Immunodeficiency Virus — for at-risk cats",
    doses: [
      { label: "1st dose", weekMin: 8 },
      { label: "2nd dose (2-3wks later)", weekMin: 10 },
      { label: "3rd dose (2-3wks later)", weekMin: 13 },
      { label: "Annual booster", monthsAfter: 12, repeat: true },
    ],
    boosterIntervalMonths: 12, color: C.blue,
  },
  {
    name: "Chlamydophila", type: "Non-Core",
    description: "For multi-cat households with respiratory issues",
    doses: [
      { label: "1st dose", weekMin: 9 },
      { label: "2nd dose (3-4wks later)", weekMin: 12 },
      { label: "Annual booster", monthsAfter: 12, repeat: true },
    ],
    boosterIntervalMonths: 12, color: C.purple,
  },
];

function getVaccineList(species, customVaccines = {}, hiddenVaccines = {}) {
  const base = species === "Dog" ? DOG_VACCINES : species === "Cat" ? CAT_VACCINES : [];
  const hidden = hiddenVaccines[species] || [];
  const custom = (customVaccines[species] || []).map(v => ({ ...v, isCustom: true }));
  const merged = [...base, ...custom].filter(v => !hidden.includes(v.name));
  // Core first, then Non-Core
  return [...merged.filter(v => v.type.startsWith("Core")), ...merged.filter(v => !v.type.startsWith("Core"))];
}

const SAMPLE_PETS = [
  { id: 1, name: "Mandu", species: "Dog", breed: "", dob: "2023-02-10", weight: "", photo: "🐕", color: C.amber },
];

const SAMPLE_HISTORY = {
  1: {
    "DHPP": [
      { id: 101, date: "2023-03-31", dose: "1st dose", vet: "Banfield Pet Hospital", notes: "", nextDue: "2023-04-14" },
      { id: 102, date: "2023-04-14", dose: "2nd dose", vet: "Banfield Pet Hospital", notes: "", nextDue: "2023-05-05" },
      { id: 103, date: "2023-05-05", dose: "3rd dose", vet: "Banfield Pet Hospital", notes: "", nextDue: "2024-04-11" },
      { id: 104, date: "2023-05-26", dose: "4th dose", vet: "Banfield Pet Hospital", notes: "", nextDue: "2027-04-11" },
    ],
    "Bordetella": [
      { id: 201, date: "2023-04-14", dose: "1st dose", vet: "Banfield Pet Hospital", notes: "", nextDue: "2023-10-12" },
      { id: 202, date: "2023-10-12", dose: "2nd dose", vet: "Banfield Pet Hospital", notes: "", nextDue: "2026-06-02" },
    ],
    "Leptospirosis": [
      { id: 301, date: "2023-05-05", dose: "1st dose", vet: "Banfield Pet Hospital", notes: "", nextDue: "2023-05-26" },
      { id: 302, date: "2023-05-26", dose: "2nd dose", vet: "Banfield Pet Hospital", notes: "", nextDue: "2024-05-31" },
      { id: 303, date: "2024-05-31", dose: "3rd dose", vet: "Banfield Pet Hospital", notes: "", nextDue: "2026-06-02" },
    ],
    "Rabies": [
      { id: 401, date: "2023-05-26", dose: "1st dose", vet: "Banfield Pet Hospital", notes: "", nextDue: "2024-05-31" },
      { id: 402, date: "2024-05-31", dose: "2nd dose", vet: "Banfield Pet Hospital", notes: "", nextDue: "" },
      { id: 403, date: "2026-05-19", dose: "3rd dose", vet: "Banfield Pet Hospital", notes: "", nextDue: "2027-05-31" },
    ],
    "Annual Vaccine Exam": [
      { id: 501, date: "2025-06-02", dose: "1st dose", vet: "", notes: "", nextDue: "2026-06-02" },
    ],
    "Heartworm Test": [
      { id: 601, date: "2026-06-02", dose: "1st dose", vet: "", notes: "", nextDue: "2026-06-02" },
    ],
  },
};

const SAMPLE_CUSTOM_VACCINES = {
  Dog: [
    { name: "Annual Vaccine Exam", type: "Non-Core", description: "Annual wellness exam with vaccinations", doses: [{ label: "1st dose" }, { label: "Annual", monthsAfter: 12, repeat: true }], boosterIntervalMonths: 12, color: C.blue },
    { name: "Heartworm Test",      type: "Non-Core", description: "Annual heartworm prevention & test",    doses: [{ label: "1st dose" }, { label: "Annual", monthsAfter: 12, repeat: true }], boosterIntervalMonths: 12, color: C.sage },
  ],
};

function getAge(dob) {
  const diff = Date.now() - new Date(dob).getTime();
  const years = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
  const months = Math.floor((diff % (1000 * 60 * 60 * 24 * 365.25)) / (1000 * 60 * 60 * 24 * 30.4));
  if (years === 0) return `${months}mo`;
  if (months === 0) return `${years}yr`;
  return `${years}yr ${months}mo`;
}
function ordinal(n) {
  const s = ["th","st","nd","rd"], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]) + " dose";
}

function parseLocalDate(str) { const [y, m, d] = str.split("-").map(Number); return new Date(y, m - 1, d); }
function getDaysUntil(d) { if (!d) return 9999; const today = new Date(); today.setHours(0,0,0,0); return Math.ceil((parseLocalDate(d) - today) / 86400000); }
function addMonths(dateStr, m) { const d = parseLocalDate(dateStr); d.setMonth(d.getMonth() + m); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
function fmt(d) { if (!d) return "—"; return parseLocalDate(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }); }
function localToday() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
function getLastMedDate(med) { if (!med.history?.length) return med.startDate || null; return [...med.history].sort((a,b) => b.date.localeCompare(a.date))[0].date; }
function getNextMedDue(med) { const last = getLastMedDate(med); if (!last) return null; return addMonths(last, parseInt(med.intervalMonths)||1); }

function StatusBadge({ nextDue, size = "sm" }) {
  if (!nextDue) return null;
  const days = getDaysUntil(nextDue);
  let label, bg, color;
  if (days < 0)        { label = "Overdue";                   bg = "#FFE8E8"; color = "#C0392B"; }
  else if (days <= 30) { label = `Due in ${days}d`;           bg = "#FFF3CD"; color = "#856404"; }
  else if (days <= 90) { label = `~${Math.round(days/30)}mo`; bg = "#FFF8E1"; color = "#A0700A"; }
  else                 { label = "Current";                   bg = "#E8F5E9"; color = "#2E7D32"; }
  const p = size === "lg" ? "5px 14px" : "3px 10px";
  const fs = size === "lg" ? 13 : 11;
  return <span style={{ background: bg, color, borderRadius: 20, padding: p, fontSize: fs, fontWeight: 700, letterSpacing: 0.3, fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap" }}>{label}</span>;
}

function Modal({ title, onClose, children }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(61,32,16,0.45)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.light, borderRadius: 20, padding: 24, width: "100%", maxWidth: 480, maxHeight: "92vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(61,32,16,0.25)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h3 style={{ margin: 0, color: C.dark, fontFamily: "'Playfair Display', serif", fontSize: 19 }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: C.muted }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

const IS = { width: "100%", padding: "9px 13px", borderRadius: 9, border: `1.5px solid ${C.muted}40`, background: "#FFF", fontSize: 14, fontFamily: "'DM Sans', sans-serif", color: C.dark, outline: "none", boxSizing: "border-box" };
function Lbl({ t }) { return <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: C.brown, marginBottom: 5, fontFamily: "'DM Sans', sans-serif", letterSpacing: 0.8, textTransform: "uppercase" }}>{t}</label>; }
function Input({ label, ...p }) { return <div style={{ marginBottom: 13 }}><Lbl t={label} /><input {...p} style={{ ...IS, ...(p.style||{}) }} /></div>; }
function Sel({ label, children, ...p }) { return <div style={{ marginBottom: 13 }}><Lbl t={label} /><select {...p} style={IS}>{children}</select></div>; }
function TA({ label, ...p }) { return <div style={{ marginBottom: 13 }}><Lbl t={label} /><textarea {...p} style={{ ...IS, resize: "vertical", minHeight: 70 }} /></div>; }
function Btn({ children, variant = "primary", ...p }) {
  const s = { primary: { background: C.amber, color: "#FFF", border: "none" }, secondary: { background: "transparent", color: C.brown, border: `1.5px solid ${C.brown}40` } };
  return <button {...p} style={{ padding: "9px 18px", borderRadius: 9, fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", cursor: "pointer", ...s[variant], ...(p.style||{}) }}>{children}</button>;
}

function DoseTimeline({ vaccine, history, onEdit, onDelete }) {
  const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date));

  if (sorted.length === 0) {
    return (
      <div style={{ paddingLeft: 8, marginBottom: 12, fontSize: 12, color: C.muted }}>
        No doses logged yet. Click "+ Log New Dose" to get started.
      </div>
    );
  }

  return (
    <div style={{ position: "relative", paddingLeft: 30, marginTop: 6, marginBottom: 6 }}>
      <div style={{ position: "absolute", left: 11, top: 10, bottom: 10, width: 2, background: `${C.muted}25`, borderRadius: 2 }} />
      {sorted.map((given, i) => (
        <div key={given.id} style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 13 }}>
          <div style={{ width: 22, height: 22, borderRadius: "50%", background: vaccine.color, border: `2px solid ${vaccine.color}`, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "#FFF", fontWeight: 800, zIndex: 1 }}>✓</div>
          <div style={{ flex: 1, paddingTop: 2 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: C.muted, minWidth: 52 }}>{ordinal(i + 1)}</span>
              {given.dose && given.dose !== ordinal(i + 1) &&
                <span style={{ fontSize: 13, fontWeight: 600, color: C.dark }}>{given.dose}</span>
              }
              <span style={{ fontSize: 11, color: vaccine.color, fontWeight: 700 }}>{fmt(given.date)}</span>
              <span style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
                <button onClick={() => onEdit(given)} style={{ background: `${C.amber}18`, border: "none", borderRadius: 6, padding: "2px 7px", fontSize: 12, cursor: "pointer", color: C.brown }}>✏️</button>
                <button onClick={() => onDelete(given)} style={{ background: "#FFE8E8", border: "none", borderRadius: 6, padding: "2px 7px", fontSize: 12, cursor: "pointer", color: "#C0392B" }}>🗑️</button>
              </span>
            </div>
            {given.vet && <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>🏥 {given.vet}</div>}
            {given.notes && <div style={{ fontSize: 11, color: C.brown, background: `${C.amber}15`, borderRadius: 6, padding: "3px 8px", marginTop: 4, display: "inline-block" }}>{given.notes}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

function VaccineCard({ vaccine, history, seriesTotal, onLogDose, onEditDose, onDeleteDose, onSetSeriesTotal }) {
  const [open, setOpen] = useState(false);
  const [editingTotal, setEditingTotal] = useState(false);
  const [totalInput, setTotalInput] = useState("");
  const defaultTotal = vaccine.doses.filter(d => !d.repeat).length;
  const total = seriesTotal ?? defaultTotal;
  const doseCount = history.length;
  const last = [...history].sort((a, b) => new Date(b.date) - new Date(a.date))[0];
  const nextDue = last?.nextDue;
  const pct = total > 0 ? Math.min(100, (doseCount / total) * 100) : 0;

  return (
    <div style={{ background: "#FFF", borderRadius: 14, overflow: "hidden", boxShadow: "0 2px 8px rgba(61,32,16,0.06)", borderLeft: `4px solid ${vaccine.color}`, marginBottom: 10 }}>
      <div style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }} onClick={() => setOpen(o => !o)}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: `${vaccine.color}18`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>💉</div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 700, fontSize: 15, color: C.dark }}>{vaccine.name}</span>
            <span style={{ fontSize: 10, fontWeight: 700, background: vaccine.type.includes("Core") ? `${C.coral}18` : `${C.sage}18`, color: vaccine.type.includes("Core") ? C.coral : C.sage, borderRadius: 6, padding: "2px 7px", textTransform: "uppercase", letterSpacing: 0.5 }}>{vaccine.type}</span>
          </div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
            {vaccine.description}
            {doseCount > 0 && <span style={{ marginLeft: 8, color: vaccine.color, fontWeight: 600 }}>· {doseCount} dose{doseCount !== 1 ? "s" : ""} given</span>}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {nextDue ? <StatusBadge nextDue={nextDue} /> : <span style={{ fontSize: 11, color: C.muted }}>Not started</span>}
          <span style={{ color: C.muted, fontSize: 14 }}>{open ? "▲" : "▼"}</span>
        </div>
      </div>
      {open && (
        <div style={{ borderTop: `1px solid ${C.muted}18`, padding: "16px 18px" }}>
          {/* Progress bar with editable total */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11, color: C.muted, marginBottom: 5 }}>
              <span>Initial series progress</span>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {editingTotal
                  ? <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <input type="number" min={1} max={20} value={totalInput} onChange={e => setTotalInput(e.target.value)}
                        style={{ width: 42, padding: "1px 5px", borderRadius: 5, border: `1.5px solid ${C.amber}`, fontSize: 11, textAlign: "center" }} />
                      <button onClick={() => { onSetSeriesTotal(parseInt(totalInput)||1); setEditingTotal(false); }}
                        style={{ background: C.amber, color: "#FFF", border: "none", borderRadius: 5, padding: "2px 7px", fontSize: 11, cursor: "pointer" }}>✓</button>
                      <button onClick={() => setEditingTotal(false)}
                        style={{ background: `${C.muted}20`, color: C.muted, border: "none", borderRadius: 5, padding: "2px 6px", fontSize: 11, cursor: "pointer" }}>✕</button>
                    </span>
                  : <span onClick={e => { e.stopPropagation(); setTotalInput(String(total)); setEditingTotal(true); }}
                      style={{ cursor: "pointer", textDecoration: "underline dotted", color: C.muted }}>
                      {Math.min(doseCount, total)} / {total} doses {doseCount >= total ? "✅ Complete" : ""}
                    </span>
                }
              </span>
            </div>
            <div style={{ height: 7, background: `${C.muted}20`, borderRadius: 4, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${pct}%`, background: vaccine.color, borderRadius: 4, transition: "width 0.4s" }} />
            </div>
          </div>
          <DoseTimeline vaccine={vaccine} history={history} onEdit={onEditDose} onDelete={onDeleteDose} />
          {nextDue && (
            <div style={{ background: `${vaccine.color}10`, borderRadius: 10, padding: "10px 14px", marginTop: 10, marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>Next Due</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: C.dark }}>{fmt(nextDue)}</div>
              </div>
              <StatusBadge nextDue={nextDue} size="lg" />
            </div>
          )}
          <Btn onClick={() => onLogDose(vaccine)} style={{ width: "100%" }}>+ Log New Dose</Btn>
        </div>
      )}
    </div>
  );
}

export default function PawRecord() {
  const [pets, setPets] = useState(() => loadStorage("pr_pets", SAMPLE_PETS));
  const [history, setHistory] = useState(() => loadStorage("pr_history", SAMPLE_HISTORY));
  const [visits, setVisits] = useState(() => loadStorage("pr_visits", {}));
  const [seriesTotals, setSeriesTotals] = useState(() => loadStorage("pr_series_totals", {}));
  const [customVaccines, setCustomVaccines] = useState(() => loadStorage("pr_custom_vaccines", SAMPLE_CUSTOM_VACCINES));
  const [hiddenVaccines, setHiddenVaccines] = useState(() => loadStorage("pr_hidden_vaccines", {}));
  const [medications, setMedications] = useState(() => loadStorage("pr_medications", {}));
  const [showManageVaccines, setShowManageVaccines] = useState(false);
  const [newVaccineForm, setNewVaccineForm] = useState({ name: "", type: "Non-Core", description: "", boosterIntervalMonths: "12" });
  const [activePet, setActivePet] = useState(() => {
    const saved = loadStorage("pr_pets", SAMPLE_PETS);
    const savedId = loadStorage("pr_activePetId", null);
    return saved.find(p => p.id === savedId) ?? saved[0] ?? null;
  });

  // ─── Persist to localStorage on change ──────────────────────────────────
  useEffect(() => { saveStorage("pr_pets", pets); }, [pets]);
  useEffect(() => { saveStorage("pr_history", history); }, [history]);
  useEffect(() => { saveStorage("pr_visits", visits); }, [visits]);
  useEffect(() => { saveStorage("pr_series_totals", seriesTotals); }, [seriesTotals]);
  useEffect(() => { saveStorage("pr_custom_vaccines", customVaccines); }, [customVaccines]);
  useEffect(() => { saveStorage("pr_hidden_vaccines", hiddenVaccines); }, [hiddenVaccines]);
  useEffect(() => { saveStorage("pr_medications", medications); }, [medications]);
  useEffect(() => { if (activePet) saveStorage("pr_activePetId", activePet.id); }, [activePet]);
  const [toast, setToast] = useState(null);
  const [notifStatus, setNotifStatus] = useState(() => notifPermission());
  const [view, setView] = useState("vaccines");

  // ─── Run notification check on load ────────────────────────────────────────
  useEffect(() => {
    if (notifStatus === "granted") checkAndNotify(pets, history, visits);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [filterType, setFilterType] = useState("All");
  const [showAddPet, setShowAddPet] = useState(false);
  const [logModal, setLogModal] = useState(null);
  const [editModal, setEditModal] = useState(null); // { vaccine, dose }
  const [editForm, setEditForm] = useState({ dose: "", date: "", vet: "", notes: "", nextDue: "" });
  const [visitModal, setVisitModal] = useState(null); // null | "add" | visit-object (for edit)
  const [visitForm, setVisitForm] = useState({ date: "", vet: "", reason: "", notes: "", weight: "", medications: "", nextAppointment: "", cost: "" });
  const [newPet, setNewPet] = useState({ name: "", species: "Dog", breed: "", dob: "", weight: "", photo: "🐕", color: C.amber });
  const [logForm, setLogForm] = useState({ dose: "", date: "", vet: "", notes: "", nextDue: "" });
  const [medModal, setMedModal] = useState(null); // null | "add-regular" | "add-onetime" | med-object (edit)
  const [medForm, setMedForm] = useState({});

  const vaccines = getVaccineList(activePet?.species, customVaccines, hiddenVaccines);
  const petMeds = medications[activePet?.id] || [];
  const regularMeds = petMeds.filter(m => m.type === "regular");
  const onetimeMeds = petMeds.filter(m => m.type === "onetime");
  const petHistory = history[activePet?.id] || {};
  const filteredVaccines = vaccines
    .filter(v => filterType === "All" ? true : v.type.startsWith(filterType))
    .sort((a, b) => {
      const aHas = (petHistory[a.name] || []).length > 0 ? 0 : 1;
      const bHas = (petHistory[b.name] || []).length > 0 ? 0 : 1;
      return aHas - bHas;
    });
  const upcomingAll = pets.flatMap(p => {
    const ph = history[p.id] || {};
    return Object.entries(ph).flatMap(([vname, doses]) => {
      if (!doses.length) return [];
      const last = doses[doses.length - 1];
      if (!last?.nextDue) return [];
      return [{ petName: p.name, petPhoto: p.photo, vaccineName: vname, nextDue: last.nextDue }];
    });
  }).filter(x => getDaysUntil(x.nextDue) <= 90).sort((a, b) => getDaysUntil(a.nextDue) - getDaysUntil(b.nextDue));

  async function enableNotifications() {
    const granted = await requestNotifPermission();
    setNotifStatus(granted ? "granted" : "denied");
    if (granted) {
      checkAndNotify(pets, history, visits);
      showToast("Notifications enabled 🔔");
    } else {
      showToast("Notifications blocked — check browser settings ✗", false);
    }
  }

  function showToast(msg, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }

  function exportData() {
    const payload = { version: 2, exportedAt: new Date().toISOString(), pets, history, visits, medications };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const _d = new Date(); const _localDate = `${_d.getFullYear()}-${String(_d.getMonth()+1).padStart(2,"0")}-${String(_d.getDate()).padStart(2,"0")}`;
    a.download = `pawrecord-backup-${_localDate}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Backup downloaded ✓");
  }

  function importData(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target.result);
        if (!Array.isArray(data.pets) || typeof data.history !== "object") throw new Error("Invalid format");
        if (!window.confirm(`Import ${data.pets.length} pet(s) from backup?\nThis will replace your current data.`)) return;
        setPets(data.pets);
        setHistory(data.history);
        setVisits(data.visits || {});
        setMedications(data.medications || {});
        setActivePet(data.pets[0] ?? null);
        showToast(`Imported ${data.pets.length} pet(s) ✓`);
      } catch {
        showToast("Import failed — invalid file ✗", false);
      }
    };
    reader.readAsText(file);
  }

  const BLANK_VISIT = { date: "", vet: "", reason: "", notes: "", weight: "", medications: "", nextAppointment: "", cost: "" };

  function openAddVisit() {
    setVisitForm({ ...BLANK_VISIT, date: new Date().toISOString().split("T")[0] });
    setVisitModal("add");
  }

  function openEditVisit(v) {
    setVisitForm({ date: v.date, vet: v.vet || "", reason: v.reason || "", notes: v.notes || "", weight: v.weight || "", medications: v.medications || "", nextAppointment: v.nextAppointment || "", cost: v.cost || "" });
    setVisitModal(v);
  }

  function saveVisit() {
    if (!visitForm.date) return;
    const petVisits = visits[activePet.id] || [];
    if (visitModal === "add") {
      setVisits(v => ({ ...v, [activePet.id]: [{ id: Date.now(), ...visitForm }, ...petVisits] }));
    } else {
      setVisits(v => ({ ...v, [activePet.id]: petVisits.map(x => x.id === visitModal.id ? { ...x, ...visitForm } : x) }));
    }
    setVisitModal(null);
  }

  function deleteVisit(visitId) {
    if (!window.confirm("Delete this vet visit record?")) return;
    setVisits(v => ({ ...v, [activePet.id]: (v[activePet.id] || []).filter(x => x.id !== visitId) }));
  }

  function toggleHideVaccine(vaccineName) {
    const species = activePet.species;
    const hidden = hiddenVaccines[species] || [];
    const next = hidden.includes(vaccineName) ? hidden.filter(n => n !== vaccineName) : [...hidden, vaccineName];
    setHiddenVaccines(h => ({ ...h, [species]: next }));
  }

  function addCustomVaccine() {
    if (!newVaccineForm.name.trim()) return;
    const species = activePet.species;
    const interval = parseInt(newVaccineForm.boosterIntervalMonths) || 12;
    const newV = {
      name: newVaccineForm.name.trim(),
      type: newVaccineForm.type,
      description: newVaccineForm.description.trim(),
      doses: [
        { label: "1st dose" },
        { label: "Booster", monthsAfter: interval, repeat: true },
      ],
      boosterIntervalMonths: interval,
      color: C.purple,
    };
    setCustomVaccines(c => ({ ...c, [species]: [...(c[species] || []), newV] }));
    setNewVaccineForm({ name: "", type: "Non-Core", description: "", boosterIntervalMonths: "12" });
    showToast(`"${newV.name}" added ✓`);
  }

  function deleteCustomVaccine(vaccineName) {
    if (!window.confirm(`Remove "${vaccineName}" vaccine?`)) return;
    const species = activePet.species;
    setCustomVaccines(c => ({ ...c, [species]: (c[species] || []).filter(v => v.name !== vaccineName) }));
    // Also clean up any history for this vaccine
    setHistory(h => {
      const ph = { ...(h[activePet.id] || {}) };
      delete ph[vaccineName];
      return { ...h, [activePet.id]: ph };
    });
    showToast(`"${vaccineName}" removed`);
  }

  function openLogModal(vaccine) {
    const ph = petHistory[vaccine.name] || [];
    const sorted = [...ph].sort((a, b) => a.date.localeCompare(b.date));
    const last = sorted[sorted.length - 1];
    const nextNum = sorted.length + 1;
    const today = new Date().toISOString().split("T")[0];
    setLogForm({ dose: ordinal(nextNum), date: today, vet: last?.vet || "", notes: "", nextDue: "" });
    setLogModal(vaccine);
  }

  function saveLog() {
    if (!logForm.date || !logForm.dose) return;
    setHistory(h => ({ ...h, [activePet.id]: { ...(h[activePet.id] || {}), [logModal.name]: [...(h[activePet.id]?.[logModal.name] || []), { id: Date.now(), ...logForm }] } }));
    setLogModal(null);
  }

  function openEditModal(vaccine, dose) {
    setEditForm({ dose: dose.dose, date: dose.date, vet: dose.vet || "", notes: dose.notes || "", nextDue: dose.nextDue || "" });
    setEditModal({ vaccine, dose });
  }

  function saveEdit() {
    if (!editForm.date || !editForm.dose) return;
    const { vaccine, dose } = editModal;
    setHistory(h => ({
      ...h,
      [activePet.id]: {
        ...(h[activePet.id] || {}),
        [vaccine.name]: (h[activePet.id]?.[vaccine.name] || []).map(d =>
          d.id === dose.id ? { ...d, ...editForm } : d
        ),
      },
    }));
    setEditModal(null);
  }

  function deleteDose(vaccine, dose) {
    if (!window.confirm(`Delete the "${dose.dose}" dose on ${fmt(dose.date)}?`)) return;
    setHistory(h => ({
      ...h,
      [activePet.id]: {
        ...(h[activePet.id] || {}),
        [vaccine.name]: (h[activePet.id]?.[vaccine.name] || []).filter(d => d.id !== dose.id),
      },
    }));
  }

  function gaveMedToday(medId) {
    setMedications(m => ({ ...m, [activePet.id]: (m[activePet.id]||[]).map(med => med.id !== medId ? med : { ...med, history: [...(med.history||[]), { id: Date.now(), date: localToday() }] }) }));
    showToast("Medication logged ✓");
  }
  function deleteMed(medId) {
    if (!window.confirm("Delete this medication?")) return;
    setMedications(m => ({ ...m, [activePet.id]: (m[activePet.id]||[]).filter(med => med.id !== medId) }));
    showToast("Medication removed");
  }
  function saveMed() {
    if (!medForm.name?.trim()) return;
    const isNew = medModal === "add-regular" || medModal === "add-onetime";
    if (isNew) {
      const type = medModal === "add-regular" ? "regular" : "onetime";
      const newMed = { id: Date.now(), type, ...medForm, name: medForm.name.trim(), history: [] };
      setMedications(m => ({ ...m, [activePet.id]: [...(m[activePet.id]||[]), newMed] }));
      showToast(`"${newMed.name}" added ✓`);
    } else {
      setMedications(m => ({ ...m, [activePet.id]: (m[activePet.id]||[]).map(med => med.id === medModal.id ? { ...med, ...medForm, name: medForm.name.trim() } : med) }));
      showToast("Medication updated ✓");
    }
    setMedModal(null);
  }

  function addPet() {
    if (!newPet.name || !newPet.dob) return;
    const id = Date.now();
    const pet = { ...newPet, id };
    setPets(p => [...p, pet]);
    setHistory(h => ({ ...h, [id]: {} }));
    setActivePet(pet);
    setShowAddPet(false);
    setNewPet({ name: "", species: "Dog", breed: "", dob: "", weight: "", photo: "🐕", color: C.amber });
  }

  function removePet(petId) {
    const remaining = pets.filter(p => p.id !== petId);
    setPets(remaining);
    setHistory(h => { const next = { ...h }; delete next[petId]; return next; });
    if (activePet?.id === petId) setActivePet(remaining[0] ?? null);
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=DM+Sans:wght@400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: ${C.cream}; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-thumb { background: ${C.muted}50; border-radius: 3px; }
      `}</style>
      <div style={{ minHeight: "100vh", background: C.cream, fontFamily: "'DM Sans', sans-serif", maxWidth: 960, margin: "0 auto" }}>
        {/* ── Top bar: brand + tools ── */}
        <div style={{ background: C.brown, padding: "14px 22px 0", display: "flex", flexDirection: "column", gap: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 26 }}>🐾</span>
              <div>
                <div style={{ fontFamily: "'Playfair Display', serif", color: "#FFF", fontSize: 21, fontWeight: 700 }}>PawRecord</div>
                <div style={{ color: C.muted, fontSize: 11 }}>Vaccine History & Health Tracker</div>
              </div>
            </div>
            {/* Tools: notifications + export/import */}
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              {notifStatus !== "granted"
                ? <button onClick={enableNotifications} style={{ background: notifStatus === "denied" ? "#C0392B" : C.amber, color: "#FFF", border: "none", borderRadius: 8, padding: "6px 13px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                    {notifStatus === "denied" ? "🔕 Blocked" : "🔔 Enable Alerts"}
                  </button>
                : <button onClick={() => { checkAndNotify(pets, history, visits); sendNotif("🐾 PawRecord", "Notifications are working! You'll be alerted when vaccines are due.", "test-" + Date.now()); showToast("Test notification sent!"); }} style={{ background: C.sage, color: "#FFF", border: "none", borderRadius: 8, padding: "6px 13px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>🔔 Alerts On</button>
              }
              <button onClick={exportData} style={{ background: "transparent", color: C.muted, border: `1px solid ${C.muted}60`, borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>⬇ Export</button>
              <label style={{ background: "transparent", color: C.muted, border: `1px solid ${C.muted}60`, borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                ⬆ Import<input type="file" accept=".json" onChange={importData} style={{ display: "none" }} />
              </label>
            </div>
          </div>
          {/* ── Nav tabs ── */}
          <div style={{ display: "flex", gap: 2 }}>
            {[["vaccines","💉 Vaccines"],["visits","🏥 Visits"],["medications","💊 Meds"],["schedule","📅 Schedule"],["summary","📊 Summary"]].map(([v, lbl]) => (
              <button key={v} onClick={() => setView(v)} style={{ background: view === v ? C.cream : "transparent", color: view === v ? C.brown : C.muted, border: "none", borderRadius: "8px 8px 0 0", padding: "8px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>{lbl}</button>
            ))}
          </div>
        </div>
        <div style={{ display: "flex" }}>
          <div style={{ width: 185, minHeight: "calc(100vh - 65px)", background: "#FFF", borderRight: `1px solid ${C.muted}18`, padding: "14px 10px", flexShrink: 0 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8, paddingLeft: 4 }}>My Pets</div>
            {pets.map(pet => (
              <div key={pet.id} style={{ position: "relative", marginBottom: 3 }}
                onMouseEnter={e => e.currentTarget.querySelector(".del-btn").style.opacity = "1"}
                onMouseLeave={e => e.currentTarget.querySelector(".del-btn").style.opacity = "0"}>
                <div onClick={() => setActivePet(pet)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 8px", paddingRight: 28, borderRadius: 10, cursor: "pointer", background: activePet?.id === pet.id ? `${pet.color}18` : "transparent", borderLeft: activePet?.id === pet.id ? `3px solid ${pet.color}` : "3px solid transparent" }}>
                  <span style={{ fontSize: 22 }}>{pet.photo}</span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13, color: C.dark }}>{pet.name}</div>
                    <div style={{ fontSize: 10, color: C.muted }}>{pet.species} · {getAge(pet.dob)}</div>
                  </div>
                </div>
                <button className="del-btn" onClick={e => { e.stopPropagation(); if (window.confirm(`Remove ${pet.name}?`)) removePet(pet.id); }}
                  style={{ position: "absolute", top: 6, right: 4, opacity: 0, transition: "opacity 0.15s", background: "#FFE8E8", border: "none", borderRadius: 6, width: 22, height: 22, fontSize: 13, color: "#C0392B", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>×</button>
              </div>
            ))}
            <button onClick={() => setShowAddPet(true)} style={{ width: "100%", padding: "8px", borderRadius: 9, border: `1.5px dashed ${C.muted}60`, background: "transparent", color: C.muted, fontSize: 12, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", marginTop: 6 }}>+ Add Pet</button>
          </div>
          <div style={{ flex: 1, padding: "22px 24px", overflowY: "auto" }}>
            {activePet && (
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
                <div style={{ width: 50, height: 50, borderRadius: 13, background: `${activePet.color}20`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26 }}>{activePet.photo}</div>
                <div>
                  <h2 style={{ fontFamily: "'Playfair Display', serif", color: C.dark, fontSize: 21, fontWeight: 700 }}>{activePet.name}</h2>
                  <div style={{ color: C.muted, fontSize: 12 }}>{activePet.breed} · {activePet.species} · {getAge(activePet.dob)} old · {activePet.weight}</div>
                </div>
              </div>
            )}
            {view === "vaccines" && (
              <>
                <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
                  {["All","Core","Non-Core"].map(f => (
                    <button key={f} onClick={() => setFilterType(f)} style={{ padding: "5px 14px", borderRadius: 20, border: "none", background: filterType === f ? C.brown : `${C.muted}18`, color: filterType === f ? "#FFF" : C.brown, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>{f}</button>
                  ))}
                  <button onClick={() => setShowManageVaccines(true)} style={{ marginLeft: "auto", padding: "5px 13px", borderRadius: 20, border: `1.5px solid ${C.muted}40`, background: "transparent", color: C.muted, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>⚙️ Manage</button>
                </div>
                {filteredVaccines.map(v => (
                  <VaccineCard key={v.name} vaccine={v} history={petHistory[v.name] || []}
                    seriesTotal={seriesTotals[activePet?.id]?.[v.name]}
                    onSetSeriesTotal={n => setSeriesTotals(s => ({ ...s, [activePet.id]: { ...(s[activePet.id]||{}), [v.name]: n } }))}
                    onLogDose={openLogModal} onEditDose={dose => openEditModal(v, dose)} onDeleteDose={dose => deleteDose(v, dose)} />
                ))}
              </>
            )}
            {view === "visits" && (
              <>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <h3 style={{ fontFamily: "'Playfair Display', serif", color: C.dark, fontSize: 18, margin: 0 }}>Vet Visits — {activePet?.name}</h3>
                  <Btn onClick={openAddVisit} style={{ padding: "7px 16px" }}>+ Log Visit</Btn>
                </div>
                {(visits[activePet?.id] || []).length === 0
                  ? <div style={{ background: "#FFF", borderRadius: 14, padding: 32, textAlign: "center", color: C.muted, boxShadow: "0 2px 8px rgba(61,32,16,0.06)" }}>
                      <div style={{ fontSize: 32, marginBottom: 10 }}>🏥</div>
                      <div style={{ fontWeight: 600, marginBottom: 4, color: C.brown }}>No visits recorded yet</div>
                      <div style={{ fontSize: 12 }}>Click "+ Log Visit" to add your first vet visit</div>
                    </div>
                  : (visits[activePet?.id] || []).map(visit => (
                    <div key={visit.id} style={{ background: "#FFF", borderRadius: 14, padding: "18px 20px", marginBottom: 12, boxShadow: "0 2px 8px rgba(61,32,16,0.06)", borderLeft: `4px solid ${C.blue}` }}>
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
                            <span style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 16, color: C.dark }}>{fmt(visit.date)}</span>
                            {visit.reason && <span style={{ background: `${C.blue}15`, color: C.blue, borderRadius: 6, padding: "2px 9px", fontSize: 11, fontWeight: 700 }}>{visit.reason}</span>}
                            {visit.nextAppointment && getDaysUntil(visit.nextAppointment) <= 90 && <StatusBadge nextDue={visit.nextAppointment} />}
                          </div>
                          {visit.vet && <div style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>🏥 {visit.vet}</div>}
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: visit.notes ? 10 : 0 }}>
                            {visit.weight && <span style={{ background: `${C.sage}15`, color: C.sage, borderRadius: 7, padding: "3px 10px", fontSize: 12, fontWeight: 600 }}>⚖️ {visit.weight} lbs</span>}
                            {visit.cost && <span style={{ background: `${C.amber}15`, color: C.amber, borderRadius: 7, padding: "3px 10px", fontSize: 12, fontWeight: 600 }}>💰 ${visit.cost}</span>}
                            {visit.nextAppointment && <span style={{ background: `${C.purple}15`, color: C.purple, borderRadius: 7, padding: "3px 10px", fontSize: 12, fontWeight: 600 }}>📆 Next: {fmt(visit.nextAppointment)}</span>}
                          </div>
                          {visit.medications && <div style={{ fontSize: 12, color: C.brown, background: `${C.amber}12`, borderRadius: 8, padding: "6px 10px", marginBottom: 6 }}>💊 <strong>Medications:</strong> {visit.medications}</div>}
                          {visit.notes && <div style={{ fontSize: 12, color: C.dark, background: `${C.cream}`, borderRadius: 8, padding: "6px 10px", borderLeft: `3px solid ${C.muted}40` }}>{visit.notes}</div>}
                        </div>
                        <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
                          <button onClick={() => openEditVisit(visit)} style={{ background: `${C.amber}18`, border: "none", borderRadius: 7, padding: "5px 9px", fontSize: 13, cursor: "pointer", color: C.brown }}>✏️</button>
                          <button onClick={() => deleteVisit(visit.id)} style={{ background: "#FFE8E8", border: "none", borderRadius: 7, padding: "5px 9px", fontSize: 13, cursor: "pointer", color: "#C0392B" }}>🗑️</button>
                        </div>
                      </div>
                    </div>
                  ))
                }
              </>
            )}
            {view === "medications" && (
              <>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <h3 style={{ fontFamily: "'Playfair Display', serif", color: C.dark, fontSize: 18, margin: 0 }}>Medications — {activePet?.name}</h3>
                  <div style={{ display: "flex", gap: 6 }}>
                    <Btn onClick={() => { setMedForm({ name: "", intervalMonths: "1", startDate: localToday(), notes: "" }); setMedModal("add-regular"); }} style={{ padding: "7px 14px", fontSize: 12 }}>+ Regular</Btn>
                    <Btn variant="secondary" onClick={() => { setMedForm({ name: "", startDate: localToday(), endDate: "", timesPerDay: "1", notes: "" }); setMedModal("add-onetime"); }} style={{ padding: "7px 14px", fontSize: 12 }}>+ One-time</Btn>
                  </div>
                </div>
                {petMeds.length === 0 ? (
                  <div style={{ background: "#FFF", borderRadius: 14, padding: 32, textAlign: "center", color: C.muted, boxShadow: "0 2px 8px rgba(61,32,16,0.06)" }}>
                    <div style={{ fontSize: 32, marginBottom: 10 }}>💊</div>
                    <div style={{ fontWeight: 600, marginBottom: 4, color: C.brown }}>No medications added yet</div>
                    <div style={{ fontSize: 12 }}>Add a regular (monthly/quarterly) or one-time prescribed medication</div>
                  </div>
                ) : (
                  <>
                    {regularMeds.length > 0 && (
                      <>
                        <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>🔄 Regular</div>
                        {regularMeds.map(med => {
                          const lastDate = getLastMedDate(med);
                          const nextDue = getNextMedDue(med);
                          const givenToday = lastDate === localToday();
                          const intervalLabel = med.intervalMonths == 1 ? "Monthly" : med.intervalMonths == 3 ? "Every 3 months" : med.intervalMonths == 6 ? "Every 6 months" : "Annually";
                          return (
                            <div key={med.id} style={{ background: "#FFF", borderRadius: 14, padding: "18px 20px", marginBottom: 12, boxShadow: "0 2px 8px rgba(61,32,16,0.06)", borderLeft: `4px solid ${C.purple}` }}>
                              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                                <div style={{ flex: 1 }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                                    <span style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 16, color: C.dark }}>{med.name}</span>
                                    <span style={{ background: `${C.purple}15`, color: C.purple, borderRadius: 6, padding: "2px 9px", fontSize: 11, fontWeight: 700 }}>{intervalLabel}</span>
                                    {nextDue && <StatusBadge nextDue={nextDue} />}
                                  </div>
                                  {lastDate && <div style={{ fontSize: 12, color: C.muted, marginBottom: 10 }}>Last given: {fmt(lastDate)}{nextDue ? ` · Next due: ${fmt(nextDue)}` : ""}</div>}
                                  {med.notes && <div style={{ fontSize: 12, color: C.dark, background: C.cream, borderRadius: 8, padding: "6px 10px", borderLeft: `3px solid ${C.muted}40`, marginBottom: 10 }}>{med.notes}</div>}
                                  <button onClick={() => !givenToday && gaveMedToday(med.id)} disabled={givenToday}
                                    style={{ padding: "8px 18px", borderRadius: 9, border: "none", background: givenToday ? `${C.sage}25` : C.amber, color: givenToday ? C.sage : "#FFF", fontSize: 13, fontWeight: 700, cursor: givenToday ? "default" : "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                                    {givenToday ? "✓ Given Today" : "💊 Gave it today"}
                                  </button>
                                </div>
                                <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
                                  <button onClick={() => { setMedForm({ name: med.name, intervalMonths: String(med.intervalMonths), startDate: med.startDate || "", notes: med.notes || "" }); setMedModal(med); }} style={{ background: `${C.amber}18`, border: "none", borderRadius: 7, padding: "5px 9px", fontSize: 13, cursor: "pointer", color: C.brown }}>✏️</button>
                                  <button onClick={() => deleteMed(med.id)} style={{ background: "#FFE8E8", border: "none", borderRadius: 7, padding: "5px 9px", fontSize: 13, cursor: "pointer", color: "#C0392B" }}>🗑️</button>
                                </div>
                              </div>
                              {(med.history||[]).length > 0 && (
                                <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.muted}15` }}>
                                  <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 6 }}>History</div>
                                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                    {[...med.history].sort((a,b) => b.date.localeCompare(a.date)).map(h => (
                                      <span key={h.id} style={{ background: `${C.purple}12`, color: C.purple, borderRadius: 6, padding: "3px 10px", fontSize: 12, fontWeight: 600 }}>{fmt(h.date)}</span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </>
                    )}
                    {onetimeMeds.length > 0 && (
                      <>
                        <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8, marginTop: regularMeds.length > 0 ? 18 : 0 }}>📋 One-time / Prescribed</div>
                        {onetimeMeds.map(med => {
                          const today = localToday();
                          const status = med.endDate && med.endDate < today ? "completed" : med.startDate > today ? "upcoming" : "active";
                          const ss = status === "completed" ? { bg: `${C.sage}18`, color: C.sage, label: "✓ Completed" } : status === "upcoming" ? { bg: `${C.blue}15`, color: C.blue, label: "Upcoming" } : { bg: `${C.amber}18`, color: C.amber, label: "● Active" };
                          const freqLabel = med.timesPerDay == 1 ? "Once daily" : med.timesPerDay == 2 ? "Twice daily" : "3× daily";
                          return (
                            <div key={med.id} style={{ background: "#FFF", borderRadius: 14, padding: "18px 20px", marginBottom: 12, boxShadow: "0 2px 8px rgba(61,32,16,0.06)", borderLeft: `4px solid ${C.blue}` }}>
                              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                                <div style={{ flex: 1 }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                                    <span style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 16, color: C.dark }}>{med.name}</span>
                                    <span style={{ background: ss.bg, color: ss.color, borderRadius: 6, padding: "2px 9px", fontSize: 11, fontWeight: 700 }}>{ss.label}</span>
                                    <span style={{ background: `${C.blue}12`, color: C.blue, borderRadius: 6, padding: "2px 9px", fontSize: 11, fontWeight: 600 }}>{freqLabel}</span>
                                  </div>
                                  <div style={{ fontSize: 12, color: C.muted, marginBottom: med.notes ? 8 : 0 }}>{fmt(med.startDate)}{med.endDate ? ` → ${fmt(med.endDate)}` : ""}</div>
                                  {med.notes && <div style={{ fontSize: 12, color: C.dark, background: C.cream, borderRadius: 8, padding: "6px 10px", borderLeft: `3px solid ${C.muted}40`, marginTop: 6 }}>{med.notes}</div>}
                                </div>
                                <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
                                  <button onClick={() => { setMedForm({ name: med.name, startDate: med.startDate, endDate: med.endDate || "", timesPerDay: String(med.timesPerDay), notes: med.notes || "" }); setMedModal(med); }} style={{ background: `${C.amber}18`, border: "none", borderRadius: 7, padding: "5px 9px", fontSize: 13, cursor: "pointer", color: C.brown }}>✏️</button>
                                  <button onClick={() => deleteMed(med.id)} style={{ background: "#FFE8E8", border: "none", borderRadius: 7, padding: "5px 9px", fontSize: 13, cursor: "pointer", color: "#C0392B" }}>🗑️</button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </>
                    )}
                  </>
                )}
              </>
            )}
            {view === "schedule" && (
              <>
                <h3 style={{ fontFamily: "'Playfair Display', serif", color: C.dark, fontSize: 18, marginBottom: 14 }}>Recommended Schedule — {activePet?.species}</h3>
                <div style={{ background: "#FFF", borderRadius: 14, overflow: "hidden", boxShadow: "0 2px 8px rgba(61,32,16,0.06)" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: C.brown, color: "#FFF" }}>
                        {["Vaccine","Type","Initial Series","Booster Cycle","Status"].map(h => (
                          <th key={h} style={{ padding: "11px 14px", textAlign: "left", fontWeight: 600, fontSize: 11, letterSpacing: 0.5, textTransform: "uppercase", fontFamily: "'DM Sans', sans-serif" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {vaccines.map((v, i) => {
                        const ph = petHistory[v.name] || [];
                        const last = ph[ph.length - 1];
                        const initial = v.doses.filter(d => !d.repeat);
                        return (
                          <tr key={v.name} style={{ background: i % 2 === 0 ? "#FFF" : `${C.cream}90`, borderBottom: `1px solid ${C.muted}15` }}>
                            <td style={{ padding: "12px 14px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <div style={{ width: 8, height: 8, borderRadius: "50%", background: v.color, flexShrink: 0 }} />
                                <span style={{ fontWeight: 600, color: C.dark }}>{v.name}</span>
                              </div>
                              <div style={{ fontSize: 11, color: C.muted, marginTop: 2, paddingLeft: 16 }}>{v.description}</div>
                            </td>
                            <td style={{ padding: "12px 14px" }}>
                              <span style={{ fontSize: 11, fontWeight: 700, background: v.type.includes("Core") ? `${C.coral}18` : `${C.sage}18`, color: v.type.includes("Core") ? C.coral : C.sage, borderRadius: 6, padding: "2px 8px" }}>{v.type}</span>
                            </td>
                            <td style={{ padding: "12px 14px", color: C.muted, fontSize: 12 }}>
                              {initial.map((d, j) => (
                                <div key={j} style={{ marginBottom: 2 }}><span style={{ color: C.brown, fontWeight: 600 }}>#{j+1}</span> {d.label}{d.weekMin && <span style={{ color: C.muted }}> (wk {d.weekMin}{d.weekMax ? `–${d.weekMax}` : "+"})</span>}</div>
                              ))}
                            </td>
                            <td style={{ padding: "12px 14px", color: C.dark, fontSize: 12, fontWeight: 600 }}>Every {v.boosterIntervalMonths >= 36 ? "3 years" : v.boosterIntervalMonths >= 12 ? "year" : `${v.boosterIntervalMonths} mo`}</td>
                            <td style={{ padding: "12px 14px" }}>
                              {last?.nextDue ? <div><StatusBadge nextDue={last.nextDue} /><div style={{ fontSize: 10, color: C.muted, marginTop: 4 }}>Due {fmt(last.nextDue)}</div></div> : <span style={{ fontSize: 11, color: C.muted }}>Not started</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
            {view === "summary" && (
              <>
                <h3 style={{ fontFamily: "'Playfair Display', serif", color: C.dark, fontSize: 18, marginBottom: 16 }}>All Pets — Health Summary</h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px,1fr))", gap: 11, marginBottom: 24 }}>
                  {[
                    { label: "Total Pets",     value: pets.length,                                                                          icon: "🐾", color: C.amber },
                    { label: "Doses Recorded", value: Object.values(history).flatMap(p => Object.values(p).flat()).length,                  icon: "💉", color: C.sage  },
                    { label: "Due ≤30 Days",   value: upcomingAll.filter(x => getDaysUntil(x.nextDue) <= 30).length,                       icon: "⚠️", color: C.coral },
                    { label: "Due ≤90 Days",   value: upcomingAll.length,                                                                   icon: "📅", color: C.blue  },
                  ].map(s => (
                    <div key={s.label} style={{ background: "#FFF", borderRadius: 12, padding: "16px 16px", boxShadow: "0 2px 8px rgba(61,32,16,0.06)", borderTop: `3px solid ${s.color}` }}>
                      <div style={{ fontSize: 22, marginBottom: 4 }}>{s.icon}</div>
                      <div style={{ fontSize: 26, fontWeight: 700, color: C.dark, fontFamily: "'Playfair Display', serif" }}>{s.value}</div>
                      <div style={{ fontSize: 11, color: C.muted }}>{s.label}</div>
                    </div>
                  ))}
                </div>
                <h4 style={{ fontFamily: "'Playfair Display', serif", color: C.dark, fontSize: 16, marginBottom: 10 }}>⏰ Upcoming Due Dates (90 days)</h4>
                {upcomingAll.length === 0
                  ? <div style={{ background: "#FFF", borderRadius: 11, padding: 22, textAlign: "center", color: C.muted }}>All vaccinations are current! ✅</div>
                  : <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {upcomingAll.map((r, i) => (
                        <div key={i} style={{ background: "#FFF", borderRadius: 11, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, boxShadow: "0 2px 6px rgba(61,32,16,0.06)" }}>
                          <span style={{ fontSize: 20 }}>{r.petPhoto}</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, fontSize: 13, color: C.dark }}>{r.petName} — {r.vaccineName}</div>
                            <div style={{ fontSize: 11, color: C.muted }}>Due: {fmt(r.nextDue)}</div>
                          </div>
                          <StatusBadge nextDue={r.nextDue} />
                        </div>
                      ))}
                    </div>
                }
                <h4 style={{ fontFamily: "'Playfair Display', serif", color: C.dark, fontSize: 16, marginBottom: 10, marginTop: 26 }}>📋 Vaccine Status by Pet</h4>
                {pets.map(pet => {
                  const pvaccines = getVaccineList(pet.species);
                  const ph = history[pet.id] || {};
                  return (
                    <div key={pet.id} style={{ background: "#FFF", borderRadius: 12, padding: "14px 18px", marginBottom: 10, boxShadow: "0 2px 8px rgba(61,32,16,0.06)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                        <span style={{ fontSize: 22 }}>{pet.photo}</span>
                        <span style={{ fontWeight: 700, fontSize: 14, color: C.dark }}>{pet.name}</span>
                        <span style={{ fontSize: 11, color: C.muted }}>{pet.species}</span>
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                        {pvaccines.map(v => {
                          const doses = ph[v.name] || [];
                          const last = doses[doses.length - 1];
                          return (
                            <div key={v.name} style={{ background: doses.length > 0 ? `${v.color}12` : `${C.muted}10`, border: `1px solid ${doses.length > 0 ? v.color+"40" : C.muted+"25"}`, borderRadius: 8, padding: "5px 10px", display: "flex", alignItems: "center", gap: 6 }}>
                              <div style={{ width: 7, height: 7, borderRadius: "50%", background: doses.length > 0 ? v.color : C.muted }} />
                              <span style={{ fontSize: 12, fontWeight: 600, color: doses.length > 0 ? C.dark : C.muted }}>{v.name}</span>
                              {last?.nextDue && <StatusBadge nextDue={last.nextDue} />}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>
      </div>
      {logModal && (
        <Modal title={`Log Dose — ${logModal.name}`} onClose={() => setLogModal(null)}>
          <div style={{ background: `${logModal.color}12`, borderRadius: 10, padding: "10px 14px", marginBottom: 14, fontSize: 13, color: C.brown }}>
            💡 <strong>{logModal.name}</strong> — {logModal.description}
          </div>
          <div style={{ marginBottom: 13 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: C.brown, marginBottom: 5, letterSpacing: 0.8, textTransform: "uppercase" }}>DOSE / STAGE</label>
            <input list={`doses-log-${logModal.name}`} value={logForm.dose} onChange={e => setLogForm(f => ({ ...f, dose: e.target.value }))}
              placeholder="e.g. 1st dose, Booster..." style={{ ...{width:"100%",padding:"9px 13px",borderRadius:9,border:`1.5px solid ${C.muted}40`,background:"#FFF",fontSize:14,fontFamily:"'DM Sans',sans-serif",color:C.dark,outline:"none",boxSizing:"border-box"} }} />
            <datalist id={`doses-log-${logModal.name}`}>
              {Array.from({ length: 8 }, (_, i) => <option key={i} value={ordinal(i + 1)} />)}
              <option value="Booster" />
            </datalist>
          </div>
          <Input label="Date Administered *" type="date" value={logForm.date} onChange={e => setLogForm(f => ({ ...f, date: e.target.value }))} />
          <Input label="Veterinarian / Clinic" placeholder="e.g. Dr. Kim, Bothell Animal Clinic" value={logForm.vet} onChange={e => setLogForm(f => ({ ...f, vet: e.target.value }))} />
          <div style={{ marginBottom: 13 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: C.brown, marginBottom: 5, letterSpacing: 0.8, textTransform: "uppercase" }}>NEXT DUE DATE <span style={{ fontWeight: 400, color: C.muted, textTransform: "none" }}>(optional)</span></label>
            <div style={{ display: "flex", gap: 6 }}>
              <input type="date" value={logForm.nextDue} onChange={e => setLogForm(f => ({ ...f, nextDue: e.target.value }))}
                style={{ flex: 1, padding:"9px 13px",borderRadius:9,border:`1.5px solid ${C.muted}40`,background:"#FFF",fontSize:14,fontFamily:"'DM Sans',sans-serif",color:C.dark,outline:"none",boxSizing:"border-box" }} />
              {logForm.date && <button onClick={() => setLogForm(f => ({ ...f, nextDue: addMonths(f.date, logModal.boosterIntervalMonths) }))}
                style={{ padding:"9px 12px", borderRadius:9, border:`1.5px solid ${C.amber}40`, background:`${C.amber}12`, color:C.amber, fontSize:11, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap" }}>Auto ↗</button>}
              {logForm.nextDue && <button onClick={() => setLogForm(f => ({ ...f, nextDue: "" }))}
                style={{ padding:"9px 12px", borderRadius:9, border:`1.5px solid ${C.muted}40`, background:`${C.muted}12`, color:C.muted, fontSize:11, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap" }}>None</button>}
            </div>
          </div>
          <TA label="Notes" placeholder="Reactions, batch number, observations..." value={logForm.notes} onChange={e => setLogForm(f => ({ ...f, notes: e.target.value }))} />
          <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
            <Btn onClick={saveLog} style={{ flex: 1 }}>Save Dose</Btn>
            <Btn variant="secondary" onClick={() => setLogModal(null)}>Cancel</Btn>
          </div>
        </Modal>
      )}
      {editModal && (
        <Modal title={`Edit Dose — ${editModal.vaccine.name}`} onClose={() => setEditModal(null)}>
          <div style={{ background: `${editModal.vaccine.color}12`, borderRadius: 10, padding: "10px 14px", marginBottom: 14, fontSize: 13, color: C.brown }}>
            ✏️ Editing <strong>{editForm.dose}</strong> logged on {fmt(editModal.dose.date)}
          </div>
          <div style={{ marginBottom: 13 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: C.brown, marginBottom: 5, letterSpacing: 0.8, textTransform: "uppercase" }}>DOSE / STAGE</label>
            <input list={`doses-edit-${editModal.vaccine.name}`} value={editForm.dose} onChange={e => setEditForm(f => ({ ...f, dose: e.target.value }))}
              placeholder="e.g. 1st dose, Booster..." style={{ width:"100%",padding:"9px 13px",borderRadius:9,border:`1.5px solid ${C.muted}40`,background:"#FFF",fontSize:14,fontFamily:"'DM Sans',sans-serif",color:C.dark,outline:"none",boxSizing:"border-box" }} />
            <datalist id={`doses-edit-${editModal.vaccine.name}`}>
              {Array.from({ length: 8 }, (_, i) => <option key={i} value={ordinal(i + 1)} />)}
              <option value="Booster" />
            </datalist>
          </div>
          <Input label="Date Administered *" type="date" value={editForm.date} onChange={e => setEditForm(f => ({ ...f, date: e.target.value }))} />
          <Input label="Veterinarian / Clinic" placeholder="e.g. Dr. Kim, Bothell Animal Clinic" value={editForm.vet} onChange={e => setEditForm(f => ({ ...f, vet: e.target.value }))} />
          <div style={{ marginBottom: 13 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: C.brown, marginBottom: 5, letterSpacing: 0.8, textTransform: "uppercase" }}>NEXT DUE DATE <span style={{ fontWeight: 400, color: C.muted, textTransform: "none" }}>(optional)</span></label>
            <div style={{ display: "flex", gap: 6 }}>
              <input type="date" value={editForm.nextDue} onChange={e => setEditForm(f => ({ ...f, nextDue: e.target.value }))}
                style={{ flex:1, padding:"9px 13px",borderRadius:9,border:`1.5px solid ${C.muted}40`,background:"#FFF",fontSize:14,fontFamily:"'DM Sans',sans-serif",color:C.dark,outline:"none",boxSizing:"border-box" }} />
              {editForm.nextDue && <button onClick={() => setEditForm(f => ({ ...f, nextDue: "" }))}
                style={{ padding:"9px 12px", borderRadius:9, border:`1.5px solid ${C.muted}40`, background:`${C.muted}12`, color:C.muted, fontSize:11, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap" }}>None</button>}
              {editForm.date && <button onClick={() => setEditForm(f => ({ ...f, nextDue: addMonths(f.date, editModal.vaccine.boosterIntervalMonths) }))}
                style={{ padding:"9px 12px", borderRadius:9, border:`1.5px solid ${C.amber}40`, background:`${C.amber}12`, color:C.amber, fontSize:11, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap" }}>Auto ↗</button>}
            </div>
          </div>
          <TA label="Notes" placeholder="Reactions, batch number, observations..." value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} />
          <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
            <Btn onClick={saveEdit} style={{ flex: 1 }}>Save Changes</Btn>
            <Btn variant="secondary" onClick={() => setEditModal(null)}>Cancel</Btn>
          </div>
        </Modal>
      )}
      {showAddPet && (
        <Modal title="Add New Pet" onClose={() => setShowAddPet(false)}>
          <div style={{ display: "flex", gap: 7, marginBottom: 14 }}>
            {["🐕","🐈","🐇","🐠","🦜","🐹"].map(e => (
              <button key={e} onClick={() => setNewPet(p => ({ ...p, photo: e }))} style={{ fontSize: 22, background: newPet.photo === e ? `${C.amber}22` : "#F5F5F5", border: newPet.photo === e ? `2px solid ${C.amber}` : "2px solid transparent", borderRadius: 9, padding: 6, cursor: "pointer", width: 42, height: 42 }}>{e}</button>
            ))}
          </div>
          <Input label="Pet Name *" placeholder="e.g. Biscuit" value={newPet.name} onChange={e => setNewPet(p => ({ ...p, name: e.target.value }))} />
          <Sel label="Species" value={newPet.species} onChange={e => setNewPet(p => ({ ...p, species: e.target.value }))}>
            {["Dog","Cat","Rabbit","Bird","Fish","Other"].map(s => <option key={s}>{s}</option>)}
          </Sel>
          <Input label="Breed" placeholder="e.g. Golden Retriever" value={newPet.breed} onChange={e => setNewPet(p => ({ ...p, breed: e.target.value }))} />
          <Input label="Date of Birth *" type="date" value={newPet.dob} onChange={e => setNewPet(p => ({ ...p, dob: e.target.value }))} />
          <Input label="Weight (lbs)" placeholder="e.g. 30 lbs" value={newPet.weight} onChange={e => setNewPet(p => ({ ...p, weight: e.target.value }))} />
          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            <Btn onClick={addPet} style={{ flex: 1 }}>Add Pet</Btn>
            <Btn variant="secondary" onClick={() => setShowAddPet(false)}>Cancel</Btn>
          </div>
        </Modal>
      )}
      {showManageVaccines && activePet && (
        <Modal title={`Manage Vaccines — ${activePet.species}`} onClose={() => setShowManageVaccines(false)}>
          {/* Built-in vaccines — toggle visibility */}
          <div style={{ fontSize: 11, fontWeight: 700, color: C.brown, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 8 }}>Built-in Vaccines</div>
          {(activePet.species === "Dog" ? DOG_VACCINES : CAT_VACCINES).map(v => {
            const hidden = (hiddenVaccines[activePet.species] || []).includes(v.name);
            return (
              <div key={v.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 12px", borderRadius: 9, background: hidden ? `${C.muted}10` : `${v.color}10`, marginBottom: 6, opacity: hidden ? 0.5 : 1 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: v.color }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: C.dark }}>{v.name}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: v.type.includes("Core") ? C.coral : C.sage, background: v.type.includes("Core") ? `${C.coral}15` : `${C.sage}15`, borderRadius: 4, padding: "1px 6px" }}>{v.type}</span>
                  </div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 2, paddingLeft: 15 }}>{v.description}</div>
                </div>
                <button onClick={() => toggleHideVaccine(v.name)} style={{ background: hidden ? `${C.sage}18` : `${C.muted}18`, border: "none", borderRadius: 7, padding: "4px 10px", fontSize: 12, cursor: "pointer", color: hidden ? C.sage : C.muted, fontWeight: 600, whiteSpace: "nowrap" }}>
                  {hidden ? "👁 Show" : "🙈 Hide"}
                </button>
              </div>
            );
          })}

          {/* Custom vaccines */}
          {(customVaccines[activePet.species] || []).length > 0 && (
            <>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.brown, letterSpacing: 0.8, textTransform: "uppercase", margin: "16px 0 8px" }}>Custom Vaccines</div>
              {(customVaccines[activePet.species] || []).map(v => (
                <div key={v.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 12px", borderRadius: 9, background: `${C.purple}10`, marginBottom: 6 }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.purple }} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: C.dark }}>{v.name}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: C.purple, background: `${C.purple}15`, borderRadius: 4, padding: "1px 6px" }}>{v.type}</span>
                    </div>
                    {v.description && <div style={{ fontSize: 11, color: C.muted, marginTop: 2, paddingLeft: 15 }}>{v.description}</div>}
                  </div>
                  <button onClick={() => deleteCustomVaccine(v.name)} style={{ background: "#FFE8E8", border: "none", borderRadius: 7, padding: "4px 10px", fontSize: 12, cursor: "pointer", color: "#C0392B", fontWeight: 600 }}>🗑️ Remove</button>
                </div>
              ))}
            </>
          )}

          {/* Add custom vaccine */}
          <div style={{ borderTop: `1px solid ${C.muted}20`, marginTop: 16, paddingTop: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.brown, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 10 }}>+ Add Custom Vaccine</div>
            <Input label="Vaccine Name *" placeholder="e.g. Giardia" value={newVaccineForm.name} onChange={e => setNewVaccineForm(f => ({ ...f, name: e.target.value }))} />
            <Sel label="Type" value={newVaccineForm.type} onChange={e => setNewVaccineForm(f => ({ ...f, type: e.target.value }))}>
              {["Core","Non-Core"].map(t => <option key={t}>{t}</option>)}
            </Sel>
            <Input label="Description" placeholder="e.g. For dogs exposed to contaminated water" value={newVaccineForm.description} onChange={e => setNewVaccineForm(f => ({ ...f, description: e.target.value }))} />
            <Sel label="Booster Every" value={newVaccineForm.boosterIntervalMonths} onChange={e => setNewVaccineForm(f => ({ ...f, boosterIntervalMonths: e.target.value }))}>
              <option value="6">6 months</option>
              <option value="12">1 year</option>
              <option value="24">2 years</option>
              <option value="36">3 years</option>
            </Sel>
            <Btn onClick={addCustomVaccine} style={{ width: "100%" }}>Add Vaccine</Btn>
          </div>
        </Modal>
      )}
      {medModal && (
        <Modal
          title={medModal === "add-regular" ? "Add Regular Medication" : medModal === "add-onetime" ? "Add One-time Medication" : `Edit — ${medModal.name}`}
          onClose={() => setMedModal(null)}>
          <Input label="Medication Name *" placeholder="e.g. NexGard, Bravecto, Apoquel" value={medForm.name} onChange={e => setMedForm(f => ({ ...f, name: e.target.value }))} />
          {(medModal === "add-regular" || medModal?.type === "regular") ? (
            <>
              <Sel label="Give Every" value={medForm.intervalMonths} onChange={e => setMedForm(f => ({ ...f, intervalMonths: e.target.value }))}>
                <option value="1">Monthly (every 1 month)</option>
                <option value="3">Every 3 months</option>
                <option value="6">Every 6 months</option>
                <option value="12">Annually (every 12 months)</option>
              </Sel>
              <Input label="Start Date" type="date" value={medForm.startDate} onChange={e => setMedForm(f => ({ ...f, startDate: e.target.value }))} />
            </>
          ) : (
            <>
              <div style={{ display: "flex", gap: 10 }}>
                <div style={{ flex: 1 }}><Input label="Start Date *" type="date" value={medForm.startDate} onChange={e => setMedForm(f => ({ ...f, startDate: e.target.value }))} /></div>
                <div style={{ flex: 1 }}><Input label="End Date" type="date" value={medForm.endDate} onChange={e => setMedForm(f => ({ ...f, endDate: e.target.value }))} /></div>
              </div>
              <Sel label="Times Per Day" value={medForm.timesPerDay} onChange={e => setMedForm(f => ({ ...f, timesPerDay: e.target.value }))}>
                <option value="1">Once daily</option>
                <option value="2">Twice daily</option>
                <option value="3">Three times daily</option>
              </Sel>
            </>
          )}
          <TA label="Notes (optional)" placeholder="ex) NexGard 25mg, prescribed by Dr. Kim" value={medForm.notes} onChange={e => setMedForm(f => ({ ...f, notes: e.target.value }))} />
          <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
            <Btn onClick={saveMed} style={{ flex: 1 }}>{medModal === "add-regular" || medModal === "add-onetime" ? "Add Medication" : "Save Changes"}</Btn>
            <Btn variant="secondary" onClick={() => setMedModal(null)}>Cancel</Btn>
          </div>
        </Modal>
      )}
      {visitModal && (
        <Modal title={visitModal === "add" ? "Log Vet Visit" : "Edit Vet Visit"} onClose={() => setVisitModal(null)}>
          <Input label="Visit Date *" type="date" value={visitForm.date} onChange={e => setVisitForm(f => ({ ...f, date: e.target.value }))} />
          <Input label="Veterinarian / Clinic" placeholder="e.g. Dr. Kim, Bothell Animal Clinic" value={visitForm.vet} onChange={e => setVisitForm(f => ({ ...f, vet: e.target.value }))} />
          <Sel label="Reason for Visit" value={visitForm.reason} onChange={e => setVisitForm(f => ({ ...f, reason: e.target.value }))}>
            <option value="">Select reason...</option>
            {["Annual checkup","Sick visit","Follow-up","Vaccination","Dental cleaning","Surgery","Grooming","Other"].map(r => <option key={r} value={r}>{r}</option>)}
          </Sel>
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1 }}><Input label="Weight (lbs)" placeholder="e.g. 28" value={visitForm.weight} onChange={e => setVisitForm(f => ({ ...f, weight: e.target.value }))} /></div>
            <div style={{ flex: 1 }}><Input label="Cost ($)" placeholder="e.g. 85" value={visitForm.cost} onChange={e => setVisitForm(f => ({ ...f, cost: e.target.value }))} /></div>
          </div>
          <Input label="Medications Prescribed" placeholder="e.g. Apoquel 16mg, 30 days" value={visitForm.medications} onChange={e => setVisitForm(f => ({ ...f, medications: e.target.value }))} />
          <Input label="Next Appointment" type="date" value={visitForm.nextAppointment} onChange={e => setVisitForm(f => ({ ...f, nextAppointment: e.target.value }))} />
          <TA label="Notes / Summary" placeholder="Observations, diagnoses, recommendations..." value={visitForm.notes} onChange={e => setVisitForm(f => ({ ...f, notes: e.target.value }))} />
          <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
            <Btn onClick={saveVisit} style={{ flex: 1 }}>{visitModal === "add" ? "Save Visit" : "Save Changes"}</Btn>
            <Btn variant="secondary" onClick={() => setVisitModal(null)}>Cancel</Btn>
          </div>
        </Modal>
      )}
      {toast && (
        <div style={{ position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", background: toast.ok ? C.dark : "#C0392B", color: "#FFF", borderRadius: 12, padding: "11px 22px", fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", boxShadow: "0 6px 24px rgba(0,0,0,0.18)", zIndex: 200, whiteSpace: "nowrap", pointerEvents: "none" }}>
          {toast.msg}
        </div>
      )}
    </>
  );
}
