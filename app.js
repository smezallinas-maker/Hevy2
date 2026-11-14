'use strict';

/* ============================================================
   Forja — registro personal de entrenamientos
   Todo se guarda en el teléfono (localStorage). Sin servidor.
   ============================================================ */

const STORE_KEY = 'forja-data-v1';
const MUSCLES = ['Pecho', 'Espalda', 'Piernas', 'Glúteos', 'Hombros', 'Bíceps', 'Tríceps', 'Abdomen', 'Cardio', 'Otro'];
// type: 'peso' = kg × reps ; 'tiempo' = minutos + km
const DEFAULT_EXERCISES = [
  ['Press de banca con barra', 'Pecho'], ['Press inclinado con barra', 'Pecho'], ['Press inclinado con mancuernas', 'Pecho'],
  ['Press de banca con mancuernas', 'Pecho'], ['Aperturas con mancuernas', 'Pecho'], ['Cruce de poleas', 'Pecho'],
  ['Pec deck / contractor', 'Pecho'], ['Fondos en paralelas', 'Pecho'], ['Flexiones', 'Pecho'],
  ['Dominadas', 'Espalda'], ['Jalón al pecho', 'Espalda'], ['Remo con barra', 'Espalda'], ['Remo con mancuerna', 'Espalda'],
  ['Remo sentado en polea', 'Espalda'], ['Remo en máquina', 'Espalda'], ['Peso muerto', 'Espalda'], ['Pullover en polea', 'Espalda'],
  ['Hiperextensiones', 'Espalda'],
  ['Sentadilla con barra', 'Piernas'], ['Sentadilla frontal', 'Piernas'], ['Sentadilla hack', 'Piernas'], ['Prensa de piernas', 'Piernas'],
  ['Extensión de cuádriceps', 'Piernas'], ['Curl femoral acostado', 'Piernas'], ['Curl femoral sentado', 'Piernas'],
  ['Peso muerto rumano', 'Piernas'], ['Zancadas', 'Piernas'], ['Sentadilla búlgara', 'Piernas'], ['Elevación de talones', 'Piernas'],
  ['Hip thrust', 'Glúteos'], ['Patada de glúteo en polea', 'Glúteos'], ['Abducción de cadera', 'Glúteos'], ['Puente de glúteo', 'Glúteos'],
  ['Press militar con barra', 'Hombros'], ['Press de hombro con mancuernas', 'Hombros'], ['Press de hombro en máquina', 'Hombros'],
  ['Elevaciones laterales', 'Hombros'], ['Elevaciones frontales', 'Hombros'], ['Pájaros (deltoide posterior)', 'Hombros'],
  ['Face pull', 'Hombros'], ['Encogimientos', 'Hombros'],
  ['Curl con barra', 'Bíceps'], ['Curl con mancuernas', 'Bíceps'], ['Curl martillo', 'Bíceps'], ['Curl predicador', 'Bíceps'],
  ['Curl en polea', 'Bíceps'], ['Curl concentrado', 'Bíceps'],
  ['Extensión de tríceps en polea', 'Tríceps'], ['Press francés', 'Tríceps'], ['Extensión sobre la cabeza', 'Tríceps'],
  ['Press cerrado', 'Tríceps'], ['Patada de tríceps', 'Tríceps'], ['Fondos en banco', 'Tríceps'],
  ['Crunch', 'Abdomen'], ['Plancha', 'Abdomen', 'tiempo'], ['Elevación de piernas colgado', 'Abdomen'], ['Rueda abdominal', 'Abdomen'],
  ['Crunch en polea', 'Abdomen'], ['Russian twist', 'Abdomen'],
  ['Caminadora', 'Cardio', 'tiempo'], ['Bicicleta estática', 'Cardio', 'tiempo'], ['Elíptica', 'Cardio', 'tiempo'],
  ['Remo (máquina)', 'Cardio', 'tiempo'], ['Escaladora', 'Cardio', 'tiempo'], ['Saltar la cuerda', 'Cardio', 'tiempo'],
];

/* ---------- helpers ---------- */
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const num = (v) => { const n = parseFloat(String(v ?? '').replace(',', '.')); return Number.isFinite(n) ? n : 0; };
const fmtN = (n, d = 1) => Number(n).toLocaleString('es', { maximumFractionDigits: d });
const fmtDate = (ts) => new Date(ts).toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short', year: new Date(ts).getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined });
const fmtTime = (ts) => new Date(ts).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
function fmtDur(ms) {
  const m = Math.max(0, Math.floor(ms / 60000)); const h = Math.floor(m / 60);
  return h ? `${h} h ${m % 60} min` : `${m} min`;
}
function fmtClock(ms) {
  const s = Math.max(0, Math.floor(ms / 1000)); const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); const ss = s % 60;
  return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(ss).padStart(2, '0');
}
const e1rm = (w, r) => (r > 0 && w > 0 ? (r === 1 ? w : w * (1 + r / 30)) : 0); // fórmula de Epley
const initials = (name) => name.split(/\s+/).filter((x) => x.length > 2 || /^[A-Z]/.test(x)).slice(0, 2).map((x) => x[0].toUpperCase()).join('') || name[0];

const ICON = {
  dumbbell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 7v10M3 9.5v5M18 7v10M21 9.5v5M6 12h12"/></svg>',
  history: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/></svg>',
  list: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/></svg>',
  user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>',
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
  down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 9l7 7 7-7"/></svg>',
  dots: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
};

/* ---------- datos ---------- */
function load() {
  let d = null;
  try { d = JSON.parse(localStorage.getItem(STORE_KEY)); } catch { /* vacío */ }
  return normalize(d || {});
}
function normalize(d) {
  d.exercises = Array.isArray(d.exercises) ? d.exercises : [];
  d.routines = Array.isArray(d.routines) ? d.routines : [];
  d.workouts = Array.isArray(d.workouts) ? d.workouts : [];
  d.active = d.active || null;
  d.settings = { rest: 90, sound: true, ...(d.settings || {}) };
  const have = new Set(d.exercises.map((e) => e.id));
  DEFAULT_EXERCISES.forEach(([name, muscle, type], i) => {
    const id = 'ex' + i;
    if (!have.has(id)) d.exercises.push({ id, name, muscle, type: type || 'peso' });
  });
  return d;
}
let db = load();
let saveTimer = null;
function save() {
  clearTimeout(saveTimer);
  try { localStorage.setItem(STORE_KEY, JSON.stringify(db)); } catch { toast('No se pudo guardar en el teléfono'); }
}
function saveSoon() { clearTimeout(saveTimer); saveTimer = setTimeout(save, 300); }

const exById = (id) => db.exercises.find((e) => e.id === id);
const exName = (id) => exById(id)?.name || 'Ejercicio eliminado';
const isTime = (id) => exById(id)?.type === 'tiempo';
const sortedWorkouts = () => [...db.workouts].sort((a, b) => b.start - a.start);

function setText(s, type) {
  if (type === 'tiempo') {
    const parts = [];
    if (num(s.w)) parts.push(fmtN(num(s.w)) + ' min');
    if (num(s.r)) parts.push(fmtN(num(s.r), 2) + ' km');
    return parts.join(' · ') || '—';
  }
  return num(s.w) ? `${fmtN(num(s.w))} kg × ${fmtN(num(s.r), 0)}` : `${fmtN(num(s.r), 0)} reps`;
}
function workoutVolume(w) {
  let v = 0;
  w.exercises.forEach((e) => { if (!isTime(e.exerciseId)) e.sets.forEach((s) => { if (s.done !== false) v += num(s.w) * num(s.r); }); });
  return v;
}
const workoutSets = (w) => w.exercises.reduce((n, e) => n + e.sets.filter((s) => s.done !== false).length, 0);

/** Series de la última vez que hiciste ese ejercicio */
function previousSets(exerciseId) {
  for (const w of sortedWorkouts()) {
    const e = w.exercises.find((x) => x.exerciseId === exerciseId);
    if (e && e.sets.length) return e.sets;
  }
  return [];
}

/** Récords logrados en un entrenamiento (comparado con todo lo anterior) */
function prsOf(workout) {
  const out = {}; // exerciseId -> {si, kinds:[]}
  const before = db.workouts.filter((w) => w.start < workout.start);
  workout.exercises.forEach((e) => {
    if (isTime(e.exerciseId)) return;
    let prevBest = 0, prevMax = 0, had = false;
    before.forEach((w) => w.exercises.forEach((x) => {
      if (x.exerciseId !== e.exerciseId) return;
      x.sets.forEach((s) => { had = true; prevBest = Math.max(prevBest, e1rm(num(s.w), num(s.r))); prevMax = Math.max(prevMax, num(s.w)); });
    }));
    if (!had) return;
    let bi = -1, best = prevBest, mi = -1, max = prevMax;
    e.sets.forEach((s, i) => {
      if (s.t === 'c') return;
      const v = e1rm(num(s.w), num(s.r)); if (v > best) { best = v; bi = i; }
      if (num(s.w) > max) { max = num(s.w); mi = i; }
    });
    const marks = {};
    if (bi >= 0) (marks[bi] ||= []).push('1RM');
    if (mi >= 0) (marks[mi] ||= []).push('Peso');
    if (Object.keys(marks).length) out[e.exerciseId] = marks;
  });
  return out;
}
const prCount = (prs) => Object.values(prs).reduce((n, m) => n + Object.keys(m).length, 0);

/* ---------- estado de la interfaz ---------- */
const ui = {
  tab: 'entrenar',
  stack: [], // pantallas encima de las pestañas
  sheet: null,
  exQuery: '', exMuscle: '',
  metric: 'e1rm',
  draft: null, // rutina en edición
  rest: null, // {end, total}
};
function go(screen) { ui.stack.push(screen); render(); window.scrollTo(0, 0); }
function back() { ui.stack.pop(); render(); window.scrollTo(0, 0); }

/* ---------- render ---------- */
function render() {
  let top = ui.stack[ui.stack.length - 1];
  if (top?.type === 'workout' && !db.active) { ui.stack.pop(); top = ui.stack[ui.stack.length - 1]; }
  const inWorkout = top?.type === 'workout';
  document.body.classList.toggle('in-workout', inWorkout);
  $('#main').innerHTML = top ? SCREENS[top.type](top) : TABS[ui.tab]();
  $('#tabs').innerHTML = [
    ['entrenar', 'Entrenar', ICON.dumbbell], ['historial', 'Historial', ICON.history],
    ['ejercicios', 'Ejercicios', ICON.list], ['perfil', 'Perfil', ICON.user],
  ].map(([id, label, ic]) => `<button class="${!top && ui.tab === id ? 'on' : ''}" data-a="tab" data-id="${id}">${ic}<span>${label}</span></button>`).join('');
  const ab = $('#activebar');
  ab.hidden = !db.active || inWorkout;
  if (!ab.hidden) ab.innerHTML = `<button data-a="open-workout"><span>▶ ${esc(db.active.name)}</span><span id="ab-timer">${fmtClock(Date.now() - db.active.start)}</span></button>`;
  renderRest();
  renderSheet();
}

/* ---------- pestañas ---------- */
const TABS = {
  entrenar() {
    const routines = db.routines;
    return `
      <div class="top"><h1>Entrenar</h1></div>
      ${db.active ? `
        <div class="card"><div class="row between"><div class="grow"><h3>${esc(db.active.name)}</h3>
        <div class="muted small">En curso · empezó ${fmtTime(db.active.start)}</div></div>
        <button class="btn primary sm" data-a="open-workout">Continuar</button></div></div>`
        : `<button class="btn primary block" data-a="start-empty">${ICON.plus.replace('<svg', '<svg width="20" height="20"')} Empezar entrenamiento vacío</button>`}
      <div class="row between"><h2>Mis rutinas</h2><button class="btn ghost sm" data-a="new-routine">+ Nueva rutina</button></div>
      ${routines.length ? routines.map((r) => `
        <div class="card">
          <div class="row between">
            <div class="grow" data-a="edit-routine" data-id="${r.id}">
              <h3>${esc(r.name)}</h3>
              <div class="muted small">${r.exercises.map((x) => esc(exName(x.exerciseId))).join(', ') || 'Sin ejercicios'}</div>
            </div>
            <button class="icon-btn" data-a="routine-menu" data-id="${r.id}" aria-label="Opciones">${ICON.dots}</button>
          </div>
          <button class="btn primary block sm" style="margin-top:10px" data-a="start-routine" data-id="${r.id}">Empezar rutina</button>
        </div>`).join('') : `
        <div class="empty"><div class="big">📋</div>Crea rutinas (por ejemplo «Pecho y tríceps» o «Pierna») para empezar tus entrenamientos con un toque.</div>`}
      ${lastWorkoutCard()}
    `;
  },

  historial() {
    const ws = sortedWorkouts();
    if (!ws.length) return `<div class="top"><h1>Historial</h1></div><div class="empty"><div class="big">🏋️</div>Aún no hay entrenamientos.<br>Cuando termines uno aparecerá aquí.</div>`;
    let html = `<div class="top"><h1>Historial</h1><span class="sub">${ws.length} entrenamientos</span></div>`;
    let month = '';
    ws.forEach((w) => {
      const m = new Date(w.start).toLocaleDateString('es', { month: 'long', year: 'numeric' });
      if (m !== month) { month = m; html += `<h2>${esc(m)}</h2>`; }
      html += workoutCard(w);
    });
    return html;
  },

  ejercicios() {
    return `
      <div class="top"><h1>Ejercicios</h1><button class="btn ghost sm" data-a="new-exercise">+ Crear</button></div>
      <input type="search" placeholder="Buscar ejercicio…" value="${esc(ui.exQuery)}" data-in="exq" autocomplete="off">
      <div class="chips">${['', ...MUSCLES].map((m) => `<button class="chip ${ui.exMuscle === m ? 'on' : ''}" data-a="ex-muscle" data-m="${esc(m)}">${m || 'Todos'}</button>`).join('')}</div>
      <div id="exlist">${exerciseList(ui.exQuery, ui.exMuscle, null)}</div>`;
  },

  perfil() {
    const ws = db.workouts;
    const totalVol = ws.reduce((v, w) => v + workoutVolume(w), 0);
    const totalTime = ws.reduce((t, w) => t + ((w.end || w.start) - w.start), 0);
    const weekStart = startOfWeek(Date.now());
    const thisWeek = ws.filter((w) => w.start >= weekStart).length;
    // últimas 10 semanas
    const weeks = [];
    for (let i = 9; i >= 0; i--) {
      const s = weekStart - i * 7 * 864e5; const e = s + 7 * 864e5;
      weeks.push({ x: s, y: ws.filter((w) => w.start >= s && w.start < e).length });
    }
    const st = db.settings;
    return `
      <div class="top"><h1>Perfil</h1></div>
      <div class="stats">
        <div class="stat"><b>${ws.length}</b><span>Entrenamientos</span></div>
        <div class="stat"><b>${thisWeek}</b><span>Esta semana</span></div>
        <div class="stat"><b>${streakWeeks()}</b><span>Semanas seguidas</span></div>
        <div class="stat"><b>${fmtN(totalVol / 1000)} t</b><span>Volumen total</span></div>
        <div class="stat"><b>${Math.round(totalTime / 36e5)} h</b><span>Tiempo total</span></div>
      </div>
      <h2>Entrenamientos por semana</h2>
      <div class="card">${barChart(weeks)}</div>
      ${muscleSplit()}
      <h2>Ajustes</h2>
      <div class="card">
        <label class="field"><span>Descanso automático entre series</span>
          <select data-in="rest">${[0, 30, 45, 60, 90, 120, 150, 180, 240, 300].map((s) => `<option value="${s}" ${st.rest === s ? 'selected' : ''}>${s ? fmtClock(s * 1000) + ' min' : 'Desactivado'}</option>`).join('')}</select>
        </label>
        <label class="row" style="gap:10px"><input type="checkbox" style="width:auto" data-in="sound" ${st.sound ? 'checked' : ''}> Sonido y vibración al terminar el descanso</label>
      </div>
      <h2>Tus datos</h2>
      <div class="card">
        <p class="muted small" style="margin-top:0">Todo se guarda solo en este teléfono. Haz una copia de seguridad de vez en cuando para no perder tu historial.</p>
        <div class="row"><button class="btn sm grow" data-a="export">Exportar copia</button><button class="btn sm grow" data-a="import">Importar copia</button></div>
        <button class="btn danger sm block" style="margin-top:8px" data-a="reset">Borrar todos los datos</button>
      </div>
      <p class="muted small" style="text-align:center">Forja · tu registro de gimnasio</p>`;
  },
};

function lastWorkoutCard() {
  const w = sortedWorkouts()[0];
  return w ? `<h2>Último entrenamiento</h2>${workoutCard(w)}` : '';
}
function workoutCard(w) {
  const prs = prCount(prsOf(w));
  return `
    <div class="card tap" data-a="open-detail" data-id="${w.id}">
      <div class="row between"><h3 class="grow">${esc(w.name)}</h3><span class="muted small">${fmtDate(w.start)}</span></div>
      <div class="muted small" style="margin-bottom:8px">${fmtDur(w.end - w.start)} · ${fmtN(workoutVolume(w), 0)} kg · ${workoutSets(w)} series${prs ? ` · <span class="pr">🏆 ${prs} récord${prs > 1 ? 's' : ''}</span>` : ''}</div>
      ${w.exercises.slice(0, 5).map((e) => `<div class="small">${e.sets.length} × ${esc(exName(e.exerciseId))}</div>`).join('')}
      ${w.exercises.length > 5 ? `<div class="small muted">y ${w.exercises.length - 5} más…</div>` : ''}
    </div>`;
}
function startOfWeek(ts) {
  const d = new Date(ts); d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // lunes
  return d.getTime();
}
function streakWeeks() {
  let n = 0; let s = startOfWeek(Date.now());
  const has = (s) => db.workouts.some((w) => w.start >= s && w.start < s + 7 * 864e5);
  if (!has(s)) s -= 7 * 864e5; // la semana actual aún puede completarse
  while (has(s)) { n++; s -= 7 * 864e5; }
  return n;
}
function muscleSplit() {
  const since = Date.now() - 30 * 864e5; const cnt = {};
  db.workouts.filter((w) => w.start >= since).forEach((w) => w.exercises.forEach((e) => {
    const m = exById(e.exerciseId)?.muscle || 'Otro'; cnt[m] = (cnt[m] || 0) + e.sets.length;
  }));
  const rows = Object.entries(cnt).sort((a, b) => b[1] - a[1]);
  if (!rows.length) return '';
  const max = rows[0][1];
  return `<h2>Series por músculo · 30 días</h2><div class="card">${rows.map(([m, n]) => `
    <div style="margin:6px 0"><div class="row between small"><span>${esc(m)}</span><span class="muted">${n}</span></div>
    <div style="height:6px;background:var(--surface-2);border-radius:4px;margin-top:3px"><div style="height:100%;width:${(n / max) * 100}%;background:var(--accent);border-radius:4px"></div></div></div>`).join('')}</div>`;
}

function exerciseList(q, muscle, selected) {
  const words = norm(q).split(/\s+/).filter(Boolean);
  const items = db.exercises
    .filter((e) => (!muscle || e.muscle === muscle) && words.every((w) => norm(e.name + ' ' + e.muscle).includes(w)))
    .sort((a, b) => a.name.localeCompare(b.name, 'es'));
  const counts = {};
  db.workouts.forEach((w) => w.exercises.forEach((e) => { counts[e.exerciseId] = (counts[e.exerciseId] || 0) + 1; }));
  if (!items.length) return `<div class="empty">No se encontró «${esc(q)}».<br><br><button class="btn primary sm" data-a="new-exercise" data-name="${esc(q)}">Crear «${esc(q)}»</button></div>`;
  return items.map((e) => `
    <button class="list-item ${selected?.includes(e.id) ? 'sel' : ''}" data-a="${selected ? 'pick-toggle' : 'open-exercise'}" data-id="${e.id}">
      <span class="avatar">${selected?.includes(e.id) ? '✓' : esc(initials(e.name))}</span>
      <span class="grow"><div>${esc(e.name)}</div><div class="muted small">${esc(e.muscle)}${e.type === 'tiempo' ? ' · tiempo' : ''}${e.custom ? ' · personalizado' : ''}</div></span>
      ${counts[e.id] ? `<span class="tag">${counts[e.id]}×</span>` : ''}
    </button>`).join('');
}
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

/* ---------- pantallas ---------- */
const SCREENS = {
  workout() {
    const w = db.active;
    const done = workoutSets({ exercises: w.exercises.map((e) => ({ ...e, sets: e.sets.filter((s) => s.done) })) });
    const vol = workoutVolume({ exercises: w.exercises.map((e) => ({ ...e, sets: e.sets.filter((s) => s.done) })) });
    return `
      <div class="top">
        <button class="icon-btn" data-a="minimize" aria-label="Minimizar">${ICON.down}</button>
        <h1>Entrenando</h1>
        <span class="sub" id="wtimer">${fmtClock(Date.now() - w.start)}</span>
        <button class="btn ok sm" data-a="finish">Terminar</button>
      </div>
      <input class="wname" value="${esc(w.name)}" data-in="wname" aria-label="Nombre del entrenamiento">
      <div class="stats">
        <div class="stat"><b>${fmtN(vol, 0)} kg</b><span>Volumen</span></div>
        <div class="stat"><b>${done}</b><span>Series hechas</span></div>
      </div>
      ${w.exercises.map((e, ei) => exerciseBlock(e, ei)).join('')}
      ${!w.exercises.length ? '<div class="empty"><div class="big">💪</div>Agrega tu primer ejercicio</div>' : ''}
      <button class="btn primary block" data-a="add-exercises">${ICON.plus.replace('<svg', '<svg width="20" height="20"')} Agregar ejercicios</button>
      <button class="btn danger block" style="margin-top:10px;background:none" data-a="discard">Descartar entrenamiento</button>`;
  },

  detail({ id }) {
    const w = db.workouts.find((x) => x.id === id);
    if (!w) { ui.stack.pop(); return TABS[ui.tab](); }
    const prs = prsOf(w);
    const n = prCount(prs);
    return `
      <div class="top"><button class="icon-btn" data-a="back">${ICON.back}</button><h1>${esc(w.name)}</h1>
        <button class="icon-btn" data-a="detail-menu" data-id="${w.id}">${ICON.dots}</button></div>
      <div class="muted">${fmtDate(w.start)} · ${fmtTime(w.start)}</div>
      <div class="stats">
        <div class="stat"><b>${fmtDur(w.end - w.start)}</b><span>Duración</span></div>
        <div class="stat"><b>${fmtN(workoutVolume(w), 0)} kg</b><span>Volumen</span></div>
        <div class="stat"><b>${workoutSets(w)}</b><span>Series</span></div>
        ${n ? `<div class="stat"><b class="pr">🏆 ${n}</b><span>Récords</span></div>` : ''}
      </div>
      ${w.notes ? `<div class="card small">${esc(w.notes)}</div>` : ''}
      ${w.exercises.map((e) => {
        let k = 0; const type = exById(e.exerciseId)?.type;
        return `<div class="card">
          <button class="name" style="font-weight:700;color:var(--accent);font-size:16px" data-a="open-exercise" data-id="${e.exerciseId}">${esc(exName(e.exerciseId))}</button>
          ${e.note ? `<div class="muted small">${esc(e.note)}</div>` : ''}
          ${e.sets.map((s, si) => {
            const lbl = s.t === 'c' ? 'C' : s.t === 'f' ? 'F' : ++k;
            const marks = prs[e.exerciseId]?.[si];
            return `<div class="dset"><span class="n">${lbl}</span><span class="grow">${setText(s, type)}</span>${marks ? `<span class="pr small">🏆 ${marks.join(' · ')}</span>` : ''}</div>`;
          }).join('')}
        </div>`;
      }).join('')}
      <div class="row" style="margin-top:6px">
        <button class="btn primary grow" data-a="repeat" data-id="${w.id}">Repetir</button>
        <button class="btn grow" data-a="save-as-routine" data-id="${w.id}">Guardar como rutina</button>
      </div>`;
  },

  exercise({ id }) {
    const ex = exById(id);
    if (!ex) { ui.stack.pop(); return TABS[ui.tab](); }
    const time = ex.type === 'tiempo';
    const sessions = [...db.workouts].sort((a, b) => a.start - b.start)
      .map((w) => ({ w, e: w.exercises.find((x) => x.exerciseId === id) })).filter((x) => x.e && x.e.sets.length)
      .map(({ w, e }) => {
        const sets = e.sets;
        return {
          id: w.id, date: w.start, sets,
          e1rm: Math.max(0, ...sets.map((s) => e1rm(num(s.w), num(s.r)))),
          maxW: Math.max(0, ...sets.map((s) => num(s.w))),
          maxR: Math.max(0, ...sets.map((s) => num(s.r))),
          vol: sets.reduce((v, s) => v + num(s.w) * num(s.r), 0),
          mins: sets.reduce((v, s) => v + num(s.w), 0),
          km: sets.reduce((v, s) => v + num(s.r), 0),
        };
      });
    const metrics = time
      ? [['mins', 'Minutos', 'min'], ['km', 'Distancia', 'km']]
      : [['e1rm', '1RM est.', 'kg'], ['maxW', 'Peso máx.', 'kg'], ['vol', 'Volumen', 'kg'], ['maxR', 'Reps máx.', '']];
    if (!metrics.some((m) => m[0] === ui.metric)) ui.metric = metrics[0][0];
    const metric = metrics.find((m) => m[0] === ui.metric);
    const best = (k) => Math.max(0, ...sessions.map((s) => s[k]));
    let bestSet = null;
    sessions.forEach((s) => s.sets.forEach((x) => { const v = e1rm(num(x.w), num(x.r)); if (!bestSet || v > bestSet.v) bestSet = { v, x }; }));
    return `
      <div class="top"><button class="icon-btn" data-a="back">${ICON.back}</button><h1>${esc(ex.name)}</h1>
        ${ex.custom ? `<button class="icon-btn" data-a="exercise-menu" data-id="${ex.id}">${ICON.dots}</button>` : ''}</div>
      <div class="row"><span class="tag">${esc(ex.muscle)}</span><span class="tag">${time ? 'Tiempo y distancia' : 'Peso y repeticiones'}</span></div>
      ${!sessions.length ? '<div class="empty"><div class="big">📈</div>Todavía no has registrado este ejercicio.</div>' : `
      <div class="stats">
        ${time ? `
          <div class="stat"><b>${fmtN(best('mins'))} min</b><span>Mejor sesión</span></div>
          <div class="stat"><b>${fmtN(best('km'), 2)} km</b><span>Mayor distancia</span></div>` : `
          <div class="stat"><b>${fmtN(best('maxW'))} kg</b><span>Peso máximo</span></div>
          <div class="stat"><b>${fmtN(best('e1rm'))} kg</b><span>1RM estimado</span></div>
          <div class="stat"><b>${fmtN(best('vol'), 0)} kg</b><span>Mejor volumen</span></div>
          ${bestSet?.v ? `<div class="stat"><b>${fmtN(num(bestSet.x.w))}×${fmtN(num(bestSet.x.r), 0)}</b><span>Mejor serie</span></div>` : ''}`}
        <div class="stat"><b>${sessions.length}</b><span>Sesiones</span></div>
      </div>
      <h2>Progreso</h2>
      <div class="seg">${metrics.map(([k, l]) => `<button class="${k === ui.metric ? 'on' : ''}" data-a="metric" data-k="${k}">${l}</button>`).join('')}</div>
      <div class="card">${lineChart(sessions.map((s) => ({ x: s.date, y: s[metric[0]] })), metric[2])}</div>
      <h2>Historial</h2>
      ${[...sessions].reverse().map((s) => `
        <div class="card tap" data-a="open-detail" data-id="${s.id}">
          <div class="muted small" style="margin-bottom:4px">${fmtDate(s.date)}</div>
          ${s.sets.map((x, i) => `<div class="dset"><span class="n">${x.t === 'c' ? 'C' : x.t === 'f' ? 'F' : i + 1}</span><span>${setText(x, ex.type)}</span></div>`).join('')}
        </div>`).join('')}`}`;
  },

  routine() {
    const r = ui.draft;
    return `
      <div class="top"><button class="icon-btn" data-a="back">${ICON.back}</button><h1>${r.id ? 'Editar rutina' : 'Nueva rutina'}</h1>
        <button class="btn primary sm" data-a="save-routine">Guardar</button></div>
      <label class="field"><span>Nombre</span><input data-in="rname" value="${esc(r.name)}" placeholder="Ej. Pecho y tríceps"></label>
      ${r.exercises.map((x, i) => `
        <div class="card row">
          <div class="grow"><div style="font-weight:600">${esc(exName(x.exerciseId))}</div><div class="muted small">${esc(exById(x.exerciseId)?.muscle || '')}</div></div>
          <div class="stepper"><button data-a="r-sets" data-i="${i}" data-d="-1">−</button><b>${x.sets} ser.</b><button data-a="r-sets" data-i="${i}" data-d="1">+</button></div>
          <button class="icon-btn" data-a="r-menu" data-i="${i}">${ICON.dots}</button>
        </div>`).join('')}
      ${!r.exercises.length ? '<div class="empty">Agrega los ejercicios de esta rutina</div>' : ''}
      <button class="btn primary block" data-a="add-exercises">${ICON.plus.replace('<svg', '<svg width="20" height="20"')} Agregar ejercicios</button>
      ${r.id ? '<button class="btn danger block" style="margin-top:10px;background:none" data-a="delete-routine">Eliminar rutina</button>' : ''}`;
  },
};

function exerciseBlock(e, ei) {
  const ex = exById(e.exerciseId);
  const time = ex?.type === 'tiempo';
  const prev = previousSets(e.exerciseId);
  let k = 0;
  return `
    <div class="ex-card">
      <div class="ex-head">
        <button class="name" data-a="open-exercise" data-id="${e.exerciseId}">${esc(exName(e.exerciseId))}</button>
        <button class="icon-btn" data-a="ex-menu" data-ei="${ei}" aria-label="Opciones">${ICON.dots}</button>
      </div>
      ${e.note !== undefined ? `<input class="ex-note" placeholder="Nota (asiento en 4, agarre cerrado…)" value="${esc(e.note)}" data-in="note" data-ei="${ei}">` : ''}
      <div class="set-grid set-head"><span>Serie</span><span>Anterior</span><span>${time ? 'Min' : 'Kg'}</span><span>${time ? 'Km' : 'Reps'}</span><span>✓</span></div>
      ${e.sets.map((s, si) => {
        const lbl = s.t === 'c' ? 'C' : s.t === 'f' ? 'F' : ++k;
        const p = prev[si];
        const pw = p ? fmtN(num(p.w)) : ''; const pr = p ? fmtN(num(p.r), 2) : '';
        return `
        <div class="set-grid set-row ${s.done ? 'done' : ''}">
          <button class="set-num t-${s.t || 'n'}" data-a="set-menu" data-ei="${ei}" data-si="${si}">${lbl}</button>
          <button class="prev" data-a="fill-prev" data-ei="${ei}" data-si="${si}">${p ? esc(time ? setText(p, 'tiempo') : `${pw} × ${fmtN(num(p.r), 0)}`) : '—'}</button>
          <input class="num" inputmode="decimal" enterkeyhint="next" data-in="w" data-ei="${ei}" data-si="${si}" value="${esc(s.w)}" placeholder="${esc(pw)}">
          <input class="num" inputmode="${time ? 'decimal' : 'numeric'}" enterkeyhint="done" data-in="r" data-ei="${ei}" data-si="${si}" value="${esc(s.r)}" placeholder="${esc(pr)}">
          <button class="check" data-a="toggle-set" data-ei="${ei}" data-si="${si}" aria-label="Completar serie">${ICON.check}</button>
        </div>`;
      }).join('')}
      <button class="btn block sm" style="margin-top:6px;background:none;color:var(--muted)" data-a="add-set" data-ei="${ei}">+ Agregar serie</button>
    </div>`;
}

/* ---------- gráficos (SVG) ---------- */
function lineChart(pts, unit) {
  pts = pts.filter((p) => p.y > 0);
  if (pts.length < 2) return '<div class="muted small" style="text-align:center;padding:20px">Registra al menos 2 sesiones para ver tu progreso.</div>';
  const W = 340, H = 170, L = 38, R = 10, T = 10, B = 24;
  const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
  const x0 = Math.min(...xs), x1 = Math.max(...xs);
  let y0 = Math.min(...ys), y1 = Math.max(...ys);
  const pad = (y1 - y0) * 0.15 || y1 * 0.1 || 1; y0 = Math.max(0, y0 - pad); y1 += pad;
  const X = (x) => L + ((x - x0) / (x1 - x0 || 1)) * (W - L - R);
  const Y = (y) => T + (1 - (y - y0) / (y1 - y0)) * (H - T - B);
  const path = pts.map((p, i) => `${i ? 'L' : 'M'}${X(p.x).toFixed(1)},${Y(p.y).toFixed(1)}`).join('');
  const ticks = [0, 0.5, 1].map((f) => y0 + f * (y1 - y0));
  const d = (ts) => new Date(ts).toLocaleDateString('es', { day: 'numeric', month: 'short' });
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Gráfico de progreso">
    ${ticks.map((t) => `<line class="grid" x1="${L}" x2="${W - R}" y1="${Y(t)}" y2="${Y(t)}"/><text class="axis" x="${L - 6}" y="${Y(t) + 3}" text-anchor="end">${fmtN(t, t < 10 ? 1 : 0)}</text>`).join('')}
    <path class="area" d="${path}L${X(x1)},${H - B}L${X(x0)},${H - B}Z"/>
    <path class="line" d="${path}"/>
    ${pts.length <= 40 ? pts.map((p) => `<circle class="dot" cx="${X(p.x)}" cy="${Y(p.y)}" r="3"/>`).join('') : ''}
    <text class="axis" x="${L}" y="${H - 6}">${d(x0)}</text><text class="axis" x="${W - R}" y="${H - 6}" text-anchor="end">${d(x1)}</text>
    <text class="axis" x="${W - R}" y="${T + 8}" text-anchor="end">${esc(unit)}</text>
  </svg>`;
}
function barChart(pts) {
  const W = 340, H = 130, B = 20, T = 14;
  const max = Math.max(1, ...pts.map((p) => p.y));
  const bw = W / pts.length;
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Entrenamientos por semana">
    <line class="grid" x1="0" x2="${W}" y1="${H - B}" y2="${H - B}"/>
    ${pts.map((p, i) => {
      const h = (p.y / max) * (H - B - T); const x = i * bw + bw * 0.2;
      return `<rect class="bar" x="${x}" y="${H - B - h}" width="${bw * 0.6}" height="${h}" rx="3" opacity="${i === pts.length - 1 ? 1 : 0.6}"/>
        ${p.y ? `<text class="axis" x="${x + bw * 0.3}" y="${H - B - h - 3}" text-anchor="middle">${p.y}</text>` : ''}
        ${i % 3 === 0 || i === pts.length - 1 ? `<text class="axis" x="${x + bw * 0.3}" y="${H - 5}" text-anchor="middle">${new Date(p.x).toLocaleDateString('es', { day: 'numeric', month: 'short' })}</text>` : ''}`;
    }).join('')}
  </svg>`;
}

/* ---------- hojas inferiores ---------- */
function openSheet(s) { ui.sheet = s; renderSheet(); }
function closeSheet() { ui.sheet = null; renderSheet(); }
function renderSheet() {
  const wrap = $('#sheet-wrap'); const s = ui.sheet;
  wrap.hidden = !s;
  if (!s) return;
  const sh = $('#sheet');
  if (s.type === 'picker') {
    sh.innerHTML = `<div class="grab"></div>
      <div class="row between"><h3>Agregar ejercicios</h3><button class="btn ghost sm" data-a="new-exercise">+ Crear</button></div>
      <input type="search" placeholder="Buscar…" value="${esc(s.q)}" data-in="pickq" autocomplete="off">
      <div class="chips">${['', ...MUSCLES].map((m) => `<button class="chip ${s.m === m ? 'on' : ''}" data-a="pick-muscle" data-m="${esc(m)}">${m || 'Todos'}</button>`).join('')}</div>
      <div class="scroll" id="picklist">${exerciseList(s.q, s.m, s.sel)}</div>
      <button class="btn primary block" style="margin-top:10px" data-a="pick-done" ${s.sel.length ? '' : 'disabled'}>Agregar${s.sel.length ? ` (${s.sel.length})` : ''}</button>`;
  } else if (s.type === 'menu') {
    sh.innerHTML = `<div class="grab"></div>${s.title ? `<h3>${esc(s.title)}</h3>` : ''}<div class="scroll">${s.items.map((it, i) =>
      `<button class="menu-item ${it.danger ? 'danger' : ''}" data-a="menu-pick" data-i="${i}">${esc(it.label)}</button>`).join('')}</div>
      <button class="btn block" style="margin-top:10px" data-a="close-sheet">Cancelar</button>`;
  } else if (s.type === 'exform') {
    const e = s.ex;
    sh.innerHTML = `<div class="grab"></div><h3>${e.id ? 'Editar ejercicio' : 'Nuevo ejercicio'}</h3>
      <div class="scroll">
      <label class="field"><span>Nombre</span><input id="f-name" value="${esc(e.name)}" placeholder="Ej. Press en máquina Smith"></label>
      <label class="field"><span>Grupo muscular</span><select id="f-muscle">${MUSCLES.map((m) => `<option ${m === e.muscle ? 'selected' : ''}>${m}</option>`).join('')}</select></label>
      <label class="field"><span>Tipo de registro</span><select id="f-type">
        <option value="peso" ${e.type !== 'tiempo' ? 'selected' : ''}>Peso y repeticiones</option>
        <option value="tiempo" ${e.type === 'tiempo' ? 'selected' : ''}>Tiempo y distancia</option></select></label>
      </div>
      <button class="btn primary block" data-a="save-exercise">Guardar</button>`;
    setTimeout(() => { const f = $('#f-name'); if (f && !e.name) f.focus(); }, 50);
  }
}

/* ---------- temporizador de descanso ---------- */
function startRest(sec) {
  if (!sec) return;
  ui.rest = { end: Date.now() + sec * 1000, total: sec * 1000 };
  renderRest();
}
function stopRest() { ui.rest = null; renderRest(); }
function renderRest() {
  const el = $('#rest');
  document.body.classList.toggle('has-rest', !!ui.rest);
  if (!ui.rest) { el.hidden = true; return; }
  const left = ui.rest.end - Date.now();
  el.hidden = false;
  el.innerHTML = `<div class="rest-box"><span class="muted small">Descanso</span><span class="time">${fmtClock(left + 999)}</span>
    <button class="btn sm" data-a="rest-add" data-d="-15">−15</button><button class="btn sm" data-a="rest-add" data-d="15">+15</button>
    <button class="btn primary sm" data-a="rest-skip">Saltar</button>
    <div class="rest-bar" style="width:${Math.max(0, (left / ui.rest.total) * 100)}%"></div></div>`;
}
let audioCtx = null;
function beep() {
  if (!db.settings.sound) return;
  try { navigator.vibrate?.([200, 100, 200]); } catch { /* no soportado */ }
  try {
    audioCtx ||= new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.25, 0.5].forEach((t) => {
      const o = audioCtx.createOscillator(); const g = audioCtx.createGain();
      o.frequency.value = 880; o.connect(g); g.connect(audioCtx.destination);
      const at = audioCtx.currentTime + t;
      g.gain.setValueAtTime(0.25, at); g.gain.exponentialRampToValueAtTime(0.001, at + 0.18);
      o.start(at); o.stop(at + 0.2);
    });
  } catch { /* sin audio */ }
}
setInterval(() => {
  if (db.active) {
    const t = fmtClock(Date.now() - db.active.start);
    const a = $('#wtimer'); if (a) a.textContent = t;
    const b = $('#ab-timer'); if (b) b.textContent = t;
  }
  if (ui.rest) {
    if (Date.now() >= ui.rest.end) { stopRest(); beep(); toast('¡Descanso terminado! 💪'); }
    else {
      const el = $('#rest .time'); const bar = $('#rest .rest-bar');
      const left = ui.rest.end - Date.now();
      if (el) el.textContent = fmtClock(left + 999);
      if (bar) bar.style.width = Math.max(0, (left / ui.rest.total) * 100) + '%';
    }
  }
}, 500);

/* ---------- acciones ---------- */
let toastTimer;
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 2200);
}
function defaultName() {
  const h = new Date().getHours();
  return h < 12 ? 'Entrenamiento de la mañana' : h < 19 ? 'Entrenamiento de la tarde' : 'Entrenamiento de la noche';
}
const newSet = (t = 'n') => ({ w: '', r: '', done: false, t });

function startWorkout(name, exercises, routineId = null) {
  if (db.active && !confirm('Ya tienes un entrenamiento en curso. ¿Descartarlo y empezar uno nuevo?')) return;
  db.active = {
    id: uid(), name: name || defaultName(), start: Date.now(), routineId,
    exercises: (exercises || []).filter((x) => exById(x.exerciseId)).map((x) => ({
      exerciseId: x.exerciseId,
      sets: x.sets?.map ? x.sets.map((s) => newSet(s.t || 'n')) : Array.from({ length: x.sets || 3 }, () => newSet()),
    })),
  };
  stopRest(); save();
  ui.stack = [{ type: 'workout' }]; render(); window.scrollTo(0, 0);
}

function finishWorkout() {
  const w = db.active;
  const doneCount = w.exercises.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0);
  const pending = w.exercises.reduce((n, e) => n + e.sets.filter((s) => !s.done).length, 0);
  if (!doneCount) {
    if (confirm('No has completado ninguna serie. ¿Descartar este entrenamiento?')) discardWorkout(true);
    return;
  }
  if (pending && !confirm(`Tienes ${pending} serie${pending > 1 ? 's' : ''} sin marcar como hecha${pending > 1 ? 's' : ''}; no se guardará${pending > 1 ? 'n' : ''}. ¿Terminar?`)) return;
  const fin = {
    id: w.id, name: (w.name || '').trim() || defaultName(), start: w.start, end: Date.now(), routineId: w.routineId,
    exercises: w.exercises.map((e) => {
      const out = { exerciseId: e.exerciseId, sets: e.sets.filter((s) => s.done).map((s) => ({ w: num(s.w), r: num(s.r), t: s.t || 'n' })) };
      if (e.note) out.note = e.note;
      return out;
    }).filter((e) => e.sets.length),
  };
  db.workouts.push(fin); db.active = null; stopRest(); save();
  const n = prCount(prsOf(fin));
  ui.tab = 'historial'; ui.stack = [{ type: 'detail', id: fin.id }];
  render(); window.scrollTo(0, 0);
  toast(n ? `¡Entrenamiento guardado! 🏆 ${n} récord${n > 1 ? 's' : ''} nuevo${n > 1 ? 's' : ''}` : '¡Entrenamiento guardado! 💪');
}
function discardWorkout(skipConfirm) {
  if (!skipConfirm && !confirm('¿Descartar este entrenamiento? Se perderá lo registrado.')) return;
  db.active = null; stopRest(); save(); ui.stack = []; render();
}

function toggleSet(ei, si) {
  const e = db.active.exercises[ei]; const s = e.sets[si];
  if (s.done) { s.done = false; save(); render(); return; }
  // completar campos vacíos con la serie anterior o la última vez
  const ref = previousSets(e.exerciseId)[si] || e.sets[si - 1];
  if (s.w === '' && ref) s.w = String(ref.w || '');
  if (s.r === '' && ref) s.r = String(ref.r || '');
  if (!num(s.w) && !num(s.r)) { toast(isTime(e.exerciseId) ? 'Ingresa los minutos' : 'Ingresa las repeticiones'); return; }
  s.done = true;
  if (s.t !== 'c' && !isTime(e.exerciseId)) startRest(db.settings.rest); else if (s.t === 'c') startRest(Math.min(60, db.settings.rest));
  save(); render();
}

function routineMenu(r) {
  openSheet({ type: 'menu', title: r.name, items: [
    { label: 'Empezar rutina', run: () => startWorkout(r.name, r.exercises, r.id) },
    { label: 'Editar', run: () => editRoutine(r) },
    { label: 'Duplicar', run: () => { db.routines.push({ ...structuredClone(r), id: uid(), name: r.name + ' (copia)' }); save(); render(); } },
    { label: 'Eliminar', danger: true, run: () => { if (confirm(`¿Eliminar la rutina «${r.name}»?`)) { db.routines = db.routines.filter((x) => x.id !== r.id); save(); render(); } } },
  ] });
}
function editRoutine(r) {
  ui.draft = r ? structuredClone(r) : { id: null, name: '', exercises: [] };
  go({ type: 'routine' });
}

function exportData() {
  const data = JSON.stringify({ app: 'forja', version: 1, exportedAt: new Date().toISOString(), ...db }, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const name = `forja-copia-${new Date().toISOString().slice(0, 10)}.json`;
  const file = new File([blob], name, { type: 'application/json' });
  if (navigator.canShare?.({ files: [file] })) {
    navigator.share({ files: [file], title: 'Copia de Forja' }).catch(() => download(blob, name));
  } else download(blob, name);
}
function download(blob, name) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
$('#import-file').addEventListener('change', async (ev) => {
  const f = ev.target.files[0]; ev.target.value = '';
  if (!f) return;
  try {
    const d = JSON.parse(await f.text());
    if (!Array.isArray(d.workouts) || !Array.isArray(d.exercises)) throw new Error('formato');
    if (!confirm(`La copia tiene ${d.workouts.length} entrenamientos y ${d.routines?.length || 0} rutinas. Esto reemplazará tus datos actuales. ¿Continuar?`)) return;
    delete d.app; delete d.version; delete d.exportedAt;
    db = normalize(d); save(); ui.stack = []; render(); toast('Copia importada ✔');
  } catch { toast('El archivo no es una copia válida de Forja'); }
});

/* ---------- eventos ---------- */
document.addEventListener('click', (ev) => {
  const el = ev.target.closest('[data-a]');
  if (!el || el.disabled) return;
  const a = el.dataset.a; const d = el.dataset;
  const ei = d.ei !== undefined ? +d.ei : null; const si = d.si !== undefined ? +d.si : null;
  const w = db.active;
  switch (a) {
    case 'tab': ui.tab = d.id; ui.stack = []; render(); window.scrollTo(0, 0); break;
    case 'back': back(); break;
    case 'start-empty': startWorkout(); break;
    case 'start-routine': { const r = db.routines.find((x) => x.id === d.id); if (r) startWorkout(r.name, r.exercises, r.id); break; }
    case 'open-workout': ui.stack = [{ type: 'workout' }]; render(); window.scrollTo(0, 0); break;
    case 'minimize': ui.stack = []; render(); break;
    case 'finish': finishWorkout(); break;
    case 'discard': discardWorkout(); break;
    case 'new-routine': editRoutine(null); break;
    case 'edit-routine': { const r = db.routines.find((x) => x.id === d.id); if (r) editRoutine(r); break; }
    case 'routine-menu': { const r = db.routines.find((x) => x.id === d.id); if (r) routineMenu(r); break; }
    case 'open-detail': go({ type: 'detail', id: d.id }); break;
    case 'open-exercise': if (ui.sheet) closeSheet(); go({ type: 'exercise', id: d.id }); break;
    case 'metric': ui.metric = d.k; render(); break;
    case 'ex-muscle': ui.exMuscle = d.m; render(); break;

    case 'add-exercises': openSheet({ type: 'picker', q: '', m: '', sel: [], target: ui.stack.at(-1)?.type }); break;
    case 'pick-toggle': {
      const s = ui.sheet; const i = s.sel.indexOf(d.id);
      if (i >= 0) s.sel.splice(i, 1); else s.sel.push(d.id);
      if (s.replace !== undefined) { pickDone(); break; }
      const scroll = $('#picklist').scrollTop; renderSheet(); $('#picklist').scrollTop = scroll; break;
    }
    case 'pick-muscle': ui.sheet.m = d.m; renderSheet(); break;
    case 'pick-done': pickDone(); break;

    case 'add-set': {
      const sets = w.exercises[ei].sets; const last = sets[sets.length - 1];
      sets.push({ ...newSet(), w: last && last.t !== 'c' ? last.w : '', r: last && last.t !== 'c' ? last.r : '' });
      save(); render(); break;
    }
    case 'toggle-set': toggleSet(ei, si); break;
    case 'fill-prev': {
      const p = previousSets(w.exercises[ei].exerciseId)[si];
      if (p) { const s = w.exercises[ei].sets[si]; s.w = String(p.w || ''); s.r = String(p.r || ''); save(); render(); }
      break;
    }
    case 'set-menu': {
      const s = w.exercises[ei].sets[si];
      const setType = (t) => () => { s.t = t; save(); render(); };
      openSheet({ type: 'menu', title: `Serie ${si + 1}`, items: [
        { label: (s.t === 'n' || !s.t ? '✓ ' : '') + 'Serie normal', run: setType('n') },
        { label: (s.t === 'c' ? '✓ ' : '') + 'Calentamiento (C)', run: setType('c') },
        { label: (s.t === 'f' ? '✓ ' : '') + 'Al fallo (F)', run: setType('f') },
        { label: 'Eliminar serie', danger: true, run: () => { w.exercises[ei].sets.splice(si, 1); save(); render(); } },
      ] });
      break;
    }
    case 'ex-menu': {
      const list = w.exercises; const e = list[ei];
      const items = [
        { label: e.note !== undefined ? 'Quitar nota' : 'Agregar nota', run: () => { if (e.note !== undefined) delete e.note; else e.note = ''; save(); render(); } },
        { label: 'Reemplazar ejercicio', run: () => openSheet({ type: 'picker', q: '', m: exById(e.exerciseId)?.muscle || '', sel: [], target: 'workout', replace: ei }) },
      ];
      if (ei > 0) items.push({ label: 'Mover arriba', run: () => { [list[ei - 1], list[ei]] = [list[ei], list[ei - 1]]; save(); render(); } });
      if (ei < list.length - 1) items.push({ label: 'Mover abajo', run: () => { [list[ei + 1], list[ei]] = [list[ei], list[ei + 1]]; save(); render(); } });
      items.push({ label: 'Quitar ejercicio', danger: true, run: () => { list.splice(ei, 1); save(); render(); } });
      openSheet({ type: 'menu', title: exName(e.exerciseId), items });
      break;
    }
    case 'menu-pick': { const it = ui.sheet.items[+d.i]; closeSheet(); it.run(); break; }
    case 'close-sheet': closeSheet(); break;

    case 'rest-add': if (ui.rest) { ui.rest.end += +d.d * 1000; ui.rest.total = Math.max(ui.rest.total + Math.max(0, +d.d * 1000), 1000); if (ui.rest.end <= Date.now()) stopRest(); else renderRest(); } break;
    case 'rest-skip': stopRest(); break;

    case 'detail-menu': {
      const wk = db.workouts.find((x) => x.id === d.id);
      openSheet({ type: 'menu', title: wk.name, items: [
        { label: 'Cambiar nombre', run: () => { const n = prompt('Nombre del entrenamiento', wk.name); if (n && n.trim()) { wk.name = n.trim(); save(); render(); } } },
        { label: 'Repetir este entrenamiento', run: () => startWorkout(wk.name, wk.exercises) },
        { label: 'Guardar como rutina', run: () => saveAsRoutine(wk) },
        { label: 'Eliminar entrenamiento', danger: true, run: () => { if (confirm('¿Eliminar este entrenamiento del historial?')) { db.workouts = db.workouts.filter((x) => x.id !== wk.id); save(); back(); } } },
      ] });
      break;
    }
    case 'repeat': { const wk = db.workouts.find((x) => x.id === d.id); startWorkout(wk.name, wk.exercises); break; }
    case 'save-as-routine': saveAsRoutine(db.workouts.find((x) => x.id === d.id)); break;

    case 'r-sets': { const x = ui.draft.exercises[+d.i]; x.sets = Math.max(1, Math.min(20, x.sets + +d.d)); render(); break; }
    case 'r-menu': {
      const list = ui.draft.exercises; const i = +d.i;
      const items = [];
      if (i > 0) items.push({ label: 'Mover arriba', run: () => { [list[i - 1], list[i]] = [list[i], list[i - 1]]; render(); } });
      if (i < list.length - 1) items.push({ label: 'Mover abajo', run: () => { [list[i + 1], list[i]] = [list[i], list[i + 1]]; render(); } });
      items.push({ label: 'Quitar de la rutina', danger: true, run: () => { list.splice(i, 1); render(); } });
      openSheet({ type: 'menu', title: exName(list[i].exerciseId), items });
      break;
    }
    case 'save-routine': {
      const r = ui.draft; r.name = r.name.trim();
      if (!r.name) { toast('Ponle un nombre a la rutina'); return; }
      if (!r.exercises.length) { toast('Agrega al menos un ejercicio'); return; }
      if (r.id) db.routines = db.routines.map((x) => (x.id === r.id ? r : x)); else db.routines.push({ ...r, id: uid() });
      save(); ui.draft = null; ui.tab = 'entrenar'; ui.stack = []; render(); toast('Rutina guardada ✔');
      break;
    }
    case 'delete-routine':
      if (confirm('¿Eliminar esta rutina?')) { db.routines = db.routines.filter((x) => x.id !== ui.draft.id); save(); ui.stack = []; render(); }
      break;

    case 'new-exercise': {
      const q = d.name ?? ui.sheet?.q ?? '';
      openSheet({ type: 'exform', ex: { id: null, name: q, muscle: ui.sheet?.m || ui.exMuscle || 'Pecho', type: 'peso' }, back: ui.sheet?.type === 'picker' ? ui.sheet : null });
      break;
    }
    case 'save-exercise': {
      const name = $('#f-name').value.trim();
      if (!name) { toast('Escribe un nombre'); return; }
      const s = ui.sheet; const vals = { name, muscle: $('#f-muscle').value, type: $('#f-type').value };
      if (s.ex.id) Object.assign(exById(s.ex.id), vals);
      else {
        const ex = { id: 'c' + uid(), custom: true, ...vals }; db.exercises.push(ex);
        if (s.back) { s.back.sel.push(ex.id); s.back.q = ''; }
      }
      save(); ui.sheet = s.back || null; render(); toast('Ejercicio guardado ✔');
      break;
    }
    case 'exercise-menu': {
      const ex = exById(d.id);
      openSheet({ type: 'menu', title: ex.name, items: [
        { label: 'Editar', run: () => openSheet({ type: 'exform', ex: { ...ex } }) },
        { label: 'Eliminar ejercicio', danger: true, run: () => {
          const used = db.workouts.some((w) => w.exercises.some((e) => e.exerciseId === ex.id));
          if (!confirm(used ? 'Este ejercicio aparece en tu historial; esas series quedarán como «Ejercicio eliminado». ¿Eliminar?' : `¿Eliminar «${ex.name}»?`)) return;
          db.exercises = db.exercises.filter((x) => x.id !== ex.id);
          db.routines.forEach((r) => { r.exercises = r.exercises.filter((x) => x.exerciseId !== ex.id); });
          save(); back();
        } },
      ] });
      break;
    }

    case 'export': exportData(); break;
    case 'import': $('#import-file').click(); break;
    case 'reset':
      if (confirm('¿Borrar TODOS tus entrenamientos, rutinas y ejercicios personalizados? No se puede deshacer.') && confirm('¿Seguro? Te recomendamos exportar una copia primero.')) {
        localStorage.removeItem(STORE_KEY); db = load(); ui.stack = []; stopRest(); render(); toast('Datos borrados');
      }
      break;
  }
});

function pickDone() {
  const s = ui.sheet; const ids = s.sel;
  closeSheet();
  if (!ids.length) return;
  if (s.target === 'routine') {
    ids.forEach((id) => ui.draft.exercises.push({ exerciseId: id, sets: 3 }));
  } else if (db.active) {
    if (s.replace !== undefined) {
      db.active.exercises[s.replace] = { exerciseId: ids[0], sets: db.active.exercises[s.replace].sets.map((x) => newSet(x.t)) };
    } else {
      ids.forEach((id) => {
        const prev = previousSets(id);
        const n = Math.max(1, prev.filter((x) => x.t !== 'c').length || 3);
        db.active.exercises.push({ exerciseId: id, sets: Array.from({ length: n }, () => newSet()) });
      });
    }
    save();
  }
  render();
}

function saveAsRoutine(wk) {
  const name = prompt('Nombre de la rutina', wk.name);
  if (!name || !name.trim()) return;
  db.routines.push({ id: uid(), name: name.trim(), exercises: wk.exercises.map((e) => ({ exerciseId: e.exerciseId, sets: e.sets.filter((s) => s.t !== 'c').length || e.sets.length })) });
  save(); toast('Rutina guardada ✔');
}

document.addEventListener('input', (ev) => {
  const el = ev.target; const k = el.dataset.in;
  if (!k) return;
  const ei = +el.dataset.ei; const si = +el.dataset.si;
  switch (k) {
    case 'w': case 'r': {
      const s = db.active?.exercises[ei]?.sets[si];
      if (s) { s[k] = el.value.replace(/[^\d.,]/g, ''); if (el.value !== s[k]) el.value = s[k]; saveSoon(); }
      break;
    }
    case 'wname': db.active.name = el.value; saveSoon(); break;
    case 'note': db.active.exercises[ei].note = el.value; saveSoon(); break;
    case 'rname': ui.draft.name = el.value; break;
    case 'exq': ui.exQuery = el.value; $('#exlist').innerHTML = exerciseList(ui.exQuery, ui.exMuscle, null); break;
    case 'pickq': ui.sheet.q = el.value; $('#picklist').innerHTML = exerciseList(ui.sheet.q, ui.sheet.m, ui.sheet.sel); break;
    case 'rest': db.settings.rest = +el.value; save(); break;
    case 'sound': db.settings.sound = el.checked; save(); break;
  }
});
document.addEventListener('change', (ev) => {
  if (ev.target.dataset.in === 'sound') { db.settings.sound = ev.target.checked; save(); }
});
// Seleccionar el contenido al tocar un campo numérico facilita corregir
document.addEventListener('focusin', (ev) => { if (ev.target.classList?.contains('num')) setTimeout(() => ev.target.select?.(), 0); });
// Guardar al salir de la app
document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
window.addEventListener('pagehide', save);

/* ---------- arranque ---------- */
if (navigator.storage?.persist) navigator.storage.persist().catch(() => {});
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
if (db.active) ui.stack = [{ type: 'workout' }];
render();
