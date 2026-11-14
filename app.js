'use strict';

/* ============================================================
   workoutracker — registro personal de entrenamientos
   Todo se guarda en el teléfono (localStorage). Sin servidor.
   ============================================================ */

// Clave original: no cambiarla o se perderían los datos guardados en el teléfono
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
const TAB_TITLES = { entrenar: 'Entrenar', historial: 'Historial', ejercicios: 'Ejercicios', perfil: 'Resumen' };

/* ---------- helpers ---------- */
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const num = (v) => { const n = parseFloat(String(v ?? '').replace(',', '.')); return Number.isFinite(n) ? n : 0; };
const fmtN = (n, d = 1) => Number(n).toLocaleString('es', { maximumFractionDigits: d });
const fmtDate = (ts) => new Date(ts).toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long', year: new Date(ts).getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined });
const fmtShort = (ts) => {
  const d = new Date(ts); const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff = Math.round((today - new Date(d).setHours(0, 0, 0, 0)) / 864e5);
  if (diff === 0) return 'Hoy';
  if (diff === 1) return 'Ayer';
  if (diff < 7) return d.toLocaleDateString('es', { weekday: 'long' });
  return d.toLocaleDateString('es', { day: 'numeric', month: 'short', year: d.getFullYear() !== today.getFullYear() ? '2-digit' : undefined });
};
const fmtTime = (ts) => new Date(ts).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
function fmtClock(ms, forceH = false) {
  const s = Math.max(0, Math.floor(ms / 1000)); const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); const ss = s % 60;
  return (h || forceH ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(ss).padStart(2, '0');
}
const e1rm = (w, r) => (r > 0 && w > 0 ? (r === 1 ? w : w * (1 + r / 30)) : 0); // fórmula de Epley
const initials = (name) => name.split(/\s+/).filter((x) => x.length > 2 || /^[A-Z]/.test(x)).slice(0, 2).map((x) => x[0].toUpperCase()).join('') || name[0];
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
const haptic = () => { try { navigator.vibrate?.(12); } catch { /* sin soporte */ } };

const ICON = {
  dumbbell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6.5v11M2.8 9.5v5M18 6.5v11M21.2 9.5v5M6 12h12"/></svg>',
  history: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="4.5" width="17" height="16" rx="3"/><path d="M3.5 9.5h17M8 2.8v3.4M16 2.8v3.4"/><circle cx="8.5" cy="14" r=".6" fill="currentColor"/><circle cx="12" cy="14" r=".6" fill="currentColor"/><circle cx="15.5" cy="14" r=".6" fill="currentColor"/></svg>',
  list: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1.2" fill="currentColor"/><circle cx="4.5" cy="12" r="1.2" fill="currentColor"/><circle cx="4.5" cy="18" r="1.2" fill="currentColor"/></svg>',
  rings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5.2"/><circle cx="12" cy="12" r="1.6"/></svg>',
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M15 4.5L7.5 12l7.5 7.5"/></svg>',
  down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 9l7 7 7-7"/></svg>',
  dots: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><circle cx="7.5" cy="12" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="16.5" cy="12" r="1" fill="currentColor"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  chev: '<svg class="chev" viewBox="0 0 8 13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1.5 1.5l5 5-5 5"/></svg>',
  chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 20h18M5 16l5-5 3.5 3L20 7"/></svg>',
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
  d.settings = { rest: 90, sound: true, goal: 3, goalMin: 180, goalSets: 60, ...(d.settings || {}) };
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
  const out = {};
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

function startOfWeek(ts) {
  const d = new Date(ts); d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // lunes
  return d.getTime();
}
function weekStats(start = startOfWeek(Date.now())) {
  const ws = db.workouts.filter((w) => w.start >= start && w.start < start + 7 * 864e5);
  return {
    count: ws.length,
    mins: Math.round(ws.reduce((t, w) => t + (w.end - w.start), 0) / 60000),
    sets: ws.reduce((n, w) => n + workoutSets(w), 0),
  };
}
function streakWeeks() {
  let n = 0; let s = startOfWeek(Date.now());
  const has = (s) => db.workouts.some((w) => w.start >= s && w.start < s + 7 * 864e5);
  if (!has(s)) s -= 7 * 864e5; // la semana actual aún puede completarse
  while (has(s)) { n++; s -= 7 * 864e5; }
  return n;
}

/* ---------- estado de la interfaz ---------- */
const ui = {
  tab: 'entrenar',
  stack: [],
  sheet: null,
  exQuery: '', exMuscle: '',
  metric: 'e1rm',
  draft: null,
  rest: null,
  anim: null,
};
function go(screen) { ui.stack.push(screen); ui.anim = 'push'; render(); window.scrollTo(0, 0); }
function back() { ui.stack.pop(); ui.anim = 'pop'; render(); window.scrollTo(0, 0); }

const SCREEN_TITLES = { workout: 'Entrenamiento', detail: 'Resumen', exercise: 'Ejercicio', routine: 'Rutina' };
function backLabel() {
  const prev = ui.stack[ui.stack.length - 2];
  return prev ? SCREEN_TITLES[prev.type] : TAB_TITLES[ui.tab];
}
function navBar({ title = '', large = true, left = '', right = '', backBtn = false }) {
  const l = backBtn ? `<button class="nav-back" data-a="back">${ICON.back}<span>${esc(backLabel())}</span></button>` : left;
  return `<header class="nav ${large ? 'has-large' : 'solid'}"><div class="nav-l">${l}</div><div class="nav-t">${esc(title)}</div><div class="nav-r">${right}</div></header>
    ${large ? `<h1 class="large">${esc(title)}</h1>` : ''}`;
}

/* ---------- render ---------- */
function render() {
  let top = ui.stack[ui.stack.length - 1];
  if (top?.type === 'workout' && !db.active) { ui.stack.pop(); top = ui.stack[ui.stack.length - 1]; }
  const inWorkout = top?.type === 'workout';
  document.body.classList.toggle('in-workout', inWorkout);
  const main = $('#main');
  main.innerHTML = top ? SCREENS[top.type](top) : TABS[ui.tab]();
  main.classList.remove('push', 'pop', 'fade');
  if (ui.anim) { void main.offsetWidth; main.classList.add(ui.anim); ui.anim = null; }
  $('#tabs').innerHTML = [
    ['perfil', 'Resumen', ICON.rings], ['entrenar', 'Entrenar', ICON.dumbbell],
    ['historial', 'Historial', ICON.history], ['ejercicios', 'Ejercicios', ICON.list],
  ].map(([id, label, ic]) => `<button class="${ui.tab === id ? 'on' : ''}" data-a="tab" data-id="${id}">${ic}<span>${label}</span></button>`).join('');
  const ab = $('#activebar');
  ab.hidden = !db.active || inWorkout;
  document.body.classList.toggle('has-active', !ab.hidden);
  if (!ab.hidden) ab.innerHTML = `<button data-a="open-workout"><span class="dot"></span><span class="grow ell">${esc(db.active.name)}</span><span class="t" id="ab-timer">${fmtClock(Date.now() - db.active.start)}</span></button>`;
  renderRest();
  renderSheet();
  onScroll();
}
function onScroll() { document.body.classList.toggle('scrolled', window.scrollY > 36); }
window.addEventListener('scroll', onScroll, { passive: true });

/* ---------- componentes ---------- */
function rings(vals) {
  // vals: [{p, color}] de afuera hacia adentro
  const size = 132, sw = 15, gap = 2;
  return `<svg class="rings" viewBox="0 0 ${size} ${size}">${vals.map((v, i) => {
    const r = size / 2 - sw / 2 - i * (sw + gap); const c = 2 * Math.PI * r;
    const shown = Math.min(Math.max(0, v.p), 1);
    return `<circle cx="${size / 2}" cy="${size / 2}" r="${r}" stroke="${v.color}" stroke-opacity=".22" stroke-width="${sw}"/>
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" stroke="${v.color}" stroke-width="${sw}" stroke-dasharray="${(shown * c).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 ${size / 2} ${size / 2})" ${shown === 0 ? 'stroke-opacity="0"' : ''}/>`;
  }).join('')}</svg>`;
}
function weekRingsCard() {
  const st = db.settings; const w = weekStats();
  return `<div class="card rings-card">
    ${rings([{ p: w.count / st.goal, color: 'var(--pink)' }, { p: w.mins / st.goalMin, color: 'var(--green)' }, { p: w.sets / st.goalSets, color: 'var(--cyan)' }])}
    <div class="ring-legend">
      <div><span>Entrenamientos</span><b class="c-pink">${w.count}/${st.goal}</b></div>
      <div><span>Minutos</span><b class="c-green">${w.mins}/${st.goalMin}<small> MIN</small></b></div>
      <div style="margin:0"><span>Series</span><b class="c-cyan">${w.sets}/${st.goalSets}</b></div>
    </div></div>`;
}
const empty = (icon, title, text) => `<div class="empty">${icon}<b>${title}</b>${text}</div>`;
const metric = (label, value, unit, color) => `<div class="metric"><span>${label}</span><b class="${color}">${value}${unit ? `<small>${unit}</small>` : ''}</b></div>`;

/* ---------- pestañas ---------- */
const TABS = {
  perfil() {
    const ws = db.workouts;
    const totalVol = ws.reduce((v, w) => v + workoutVolume(w), 0);
    const totalTime = ws.reduce((t, w) => t + ((w.end || w.start) - w.start), 0);
    const weekStart = startOfWeek(Date.now());
    const weeks = [];
    for (let i = 9; i >= 0; i--) {
      const s = weekStart - i * 7 * 864e5; const e = s + 7 * 864e5;
      weeks.push({ x: s, y: ws.filter((w) => w.start >= s && w.start < e).length });
    }
    const st = db.settings;
    const today = cap(new Date().toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' }));
    return `
      ${navBar({ title: 'Resumen' })}
      <div class="muted xs" style="margin:-10px 0 14px;text-transform:uppercase;font-weight:600">${esc(today)}</div>
      <h2 style="margin-top:0">Esta semana</h2>
      ${weekRingsCard()}
      <h2>Tendencias</h2>
      <div class="metrics">
        ${metric('Entrenamientos', ws.length, '', 'c-pink')}
        ${metric('Semanas seguidas', streakWeeks(), '', 'c-green')}
        ${metric('Volumen total', fmtN(totalVol / 1000), 'T', 'c-cyan')}
        ${metric('Tiempo total', Math.round(totalTime / 36e5), 'H', 'c-yellow')}
      </div>
      <div class="card"><div class="xs muted" style="font-weight:600;margin-bottom:6px">ENTRENAMIENTOS POR SEMANA</div>${barChart(weeks)}</div>
      ${muscleSplit()}
      <div class="sec">Metas semanales</div>
      <div class="group">
        ${goalCell('Entrenamientos', 'goal', st.goal, 1, '')}
        ${goalCell('Minutos', 'goalMin', st.goalMin, 15, ' min')}
        ${goalCell('Series', 'goalSets', st.goalSets, 5, '')}
      </div>
      <div class="sec">Entrenamiento</div>
      <div class="group">
        <label class="cell"><span class="grow">Descanso entre series</span>
          <select data-in="rest">${[0, 30, 45, 60, 90, 120, 150, 180, 240, 300].map((s) => `<option value="${s}" ${st.rest === s ? 'selected' : ''}>${s ? fmtClock(s * 1000) : 'No'}</option>`).join('')}</select>${ICON.chev}</label>
        <div class="cell"><span class="grow">Sonido y vibración</span><label class="switch"><input type="checkbox" data-in="sound" ${st.sound ? 'checked' : ''}><span></span></label></div>
      </div>
      <div class="sec">Tus datos</div>
      <div class="group">
        <button class="cell" data-a="export"><span class="grow" style="color:var(--accent)">Exportar copia de seguridad</span></button>
        <button class="cell" data-a="import"><span class="grow" style="color:var(--accent)">Importar copia</span></button>
        <button class="cell danger" data-a="reset"><span class="grow">Borrar todos los datos</span></button>
      </div>
      <div class="foot">Todo se guarda solo en este teléfono. Exporta una copia de vez en cuando para no perder tu historial.</div>`;
  },

  entrenar() {
    const routines = db.routines;
    return `
      ${navBar({ title: 'Entrenar', right: `<button class="nav-btn" data-a="new-routine" aria-label="Nueva rutina">${ICON.plus}</button>` })}
      ${db.active ? `
        <div class="card"><div class="row between"><div class="grow"><h3>${esc(db.active.name)}</h3>
        <div class="muted small">En curso desde las ${fmtTime(db.active.start)}</div></div>
        <button class="pill" data-a="open-workout">Continuar</button></div></div>`
        : `<button class="btn primary block" data-a="start-empty">Empezar entrenamiento</button>`}
      <h2>Rutinas</h2>
      ${routines.length ? routines.map((r) => `
        <div class="card">
          <div class="row" style="align-items:flex-start">
            <div class="grow" data-a="edit-routine" data-id="${r.id}">
              <h3>${esc(r.name)}</h3>
              <div class="muted small">${r.exercises.map((x) => esc(exName(x.exerciseId))).join(', ') || 'Sin ejercicios'}</div>
            </div>
            <button class="nav-btn" style="height:28px;padding:0 0 0 8px" data-a="routine-menu" data-id="${r.id}" aria-label="Opciones">${ICON.dots}</button>
          </div>
          <button class="btn primary sm" style="margin-top:12px" data-a="start-routine" data-id="${r.id}">Empezar</button>
        </div>`).join('') : `
        <div class="card" style="text-align:center;padding:24px 16px">
          <div class="muted small" style="margin-bottom:12px">Crea rutinas como «Pecho y tríceps» o «Pierna» para empezar con un toque.</div>
          <button class="btn sm" data-a="new-routine">Nueva rutina</button></div>`}
      ${lastWorkoutCard()}`;
  },

  historial() {
    const ws = sortedWorkouts();
    if (!ws.length) return `${navBar({ title: 'Historial' })}${empty(ICON.history, 'Sin entrenamientos', 'Cuando termines uno aparecerá aquí.')}`;
    let html = navBar({ title: 'Historial' });
    let month = '';
    ws.forEach((w) => {
      const m = cap(new Date(w.start).toLocaleDateString('es', { month: 'long', year: 'numeric' }));
      if (m !== month) { month = m; html += `<h2>${esc(m)}</h2>`; }
      html += workoutCard(w);
    });
    return html;
  },

  ejercicios() {
    return `
      ${navBar({ title: 'Ejercicios', right: `<button class="nav-btn" data-a="new-exercise" aria-label="Crear ejercicio">${ICON.plus}</button>` })}
      <input type="search" class="search" placeholder="Buscar" value="${esc(ui.exQuery)}" data-in="exq" autocomplete="off">
      <div class="chips">${['', ...MUSCLES].map((m) => `<button class="chip ${ui.exMuscle === m ? 'on' : ''}" data-a="ex-muscle" data-m="${esc(m)}">${m || 'Todos'}</button>`).join('')}</div>
      <div id="exlist">${exerciseList(ui.exQuery, ui.exMuscle, null)}</div>`;
  },
};

function goalCell(label, key, val, step, unit) {
  return `<div class="cell"><span class="grow">${label}</span><span class="step-val">${val}${unit}</span>
    <div class="stepper"><button data-a="goal" data-k="${key}" data-d="${-step}">−</button><button data-a="goal" data-k="${key}" data-d="${step}">+</button></div></div>`;
}
function lastWorkoutCard() {
  const w = sortedWorkouts()[0];
  return w ? `<h2>Último entrenamiento</h2>${workoutCard(w)}` : '';
}
function workoutCard(w) {
  const prs = prCount(prsOf(w));
  const ex = w.exercises.slice(0, 4).map((e) => esc(exName(e.exerciseId))).join(' · ') + (w.exercises.length > 4 ? ` · +${w.exercises.length - 4}` : '');
  return `
    <button class="card tap" data-a="open-detail" data-id="${w.id}">
      <div class="row"><span class="avatar" style="color:var(--green)">${ICON.dumbbell.replace('<svg', '<svg width="22" height="22"')}</span>
        <div class="grow"><div class="row between"><b class="ell">${esc(w.name)}</b><span class="muted xs" style="flex:none">${esc(cap(fmtShort(w.start)))}</span></div>
        <div class="row" style="gap:14px;margin-top:2px;font-family:var(--round);font-weight:600">
          <span class="c-yellow">${fmtClock(w.end - w.start, true)}</span><span class="c-pink">${fmtN(workoutVolume(w), 0)} kg</span><span class="c-cyan">${workoutSets(w)} series</span>
        </div></div>${ICON.chev}</div>
      <div class="muted xs" style="margin:8px 0 0 50px">${ex}${prs ? ` <span class="pr">· 🏆 ${prs}</span>` : ''}</div>
    </button>`;
}
function muscleSplit() {
  const since = Date.now() - 30 * 864e5; const cnt = {};
  db.workouts.filter((w) => w.start >= since).forEach((w) => w.exercises.forEach((e) => {
    const m = exById(e.exerciseId)?.muscle || 'Otro'; cnt[m] = (cnt[m] || 0) + e.sets.length;
  }));
  const rows = Object.entries(cnt).sort((a, b) => b[1] - a[1]);
  if (!rows.length) return '';
  const max = rows[0][1];
  return `<div class="card"><div class="xs muted" style="font-weight:600;margin-bottom:6px">SERIES POR MÚSCULO · 30 DÍAS</div>${rows.map(([m, n]) => `
    <div style="margin:8px 0"><div class="row between small"><span>${esc(m)}</span><span class="c-green" style="font-family:var(--round);font-weight:600">${n}</span></div>
    <div style="height:6px;background:rgba(164,245,60,.15);border-radius:4px;margin-top:4px"><div style="height:100%;width:${(n / max) * 100}%;background:var(--green);border-radius:4px"></div></div></div>`).join('')}</div>`;
}

function exerciseList(q, muscle, selected) {
  const words = norm(q).split(/\s+/).filter(Boolean);
  const items = db.exercises
    .filter((e) => (!muscle || e.muscle === muscle) && words.every((w) => norm(e.name + ' ' + e.muscle).includes(w)))
    .sort((a, b) => a.name.localeCompare(b.name, 'es'));
  const counts = {};
  db.workouts.forEach((w) => w.exercises.forEach((e) => { counts[e.exerciseId] = (counts[e.exerciseId] || 0) + 1; }));
  if (!items.length) return `<div class="empty"><b>Sin resultados</b>No se encontró «${esc(q)}».<br><br><button class="btn sm" data-a="new-exercise" data-name="${esc(q)}">Crear «${esc(q)}»</button></div>`;
  // agrupar por letra inicial, como la app Contactos
  const groups = [];
  items.forEach((e) => {
    const L = norm(e.name)[0]?.toUpperCase() || '#';
    if (!groups.length || groups[groups.length - 1].L !== L) groups.push({ L, items: [] });
    groups[groups.length - 1].items.push(e);
  });
  return groups.map((g) => `<div class="letter">${g.L}</div><div class="group" style="--inset:66px">${g.items.map((e) => `
    <button class="cell ${selected?.includes(e.id) ? 'sel' : ''}" data-a="${selected ? 'pick-toggle' : 'open-exercise'}" data-id="${e.id}">
      <span class="avatar">${selected?.includes(e.id) ? ICON.check.replace('<svg', '<svg width="18" height="18"') : esc(initials(e.name))}</span>
      <span class="grow"><div class="ell">${esc(e.name)}</div><div class="muted xs">${esc(e.muscle)}${e.type === 'tiempo' ? ' · tiempo' : ''}${e.custom ? ' · personalizado' : ''}</div></span>
      ${counts[e.id] ? `<span class="badge">${counts[e.id]}</span>` : ''}${selected ? '' : ICON.chev}
    </button>`).join('')}</div>`).join('');
}

/* ---------- pantallas ---------- */
const SCREENS = {
  workout() {
    const w = db.active;
    const doneW = { exercises: w.exercises.map((e) => ({ ...e, sets: e.sets.filter((s) => s.done) })) };
    return `
      ${navBar({ title: 'Entrenamiento', large: false,
        left: `<button class="nav-btn" data-a="minimize" aria-label="Minimizar">${ICON.down}</button>`,
        right: `<button class="pill" data-a="finish">Terminar</button>` })}
      <input class="wname" value="${esc(w.name)}" data-in="wname" aria-label="Nombre del entrenamiento">
      <div class="timer" id="wtimer">${fmtClock(Date.now() - w.start, true)}</div>
      <div class="row" style="gap:18px;font-family:var(--round);font-weight:600;font-size:20px;margin-bottom:16px">
        <span class="c-pink">${fmtN(workoutVolume(doneW), 0)}<small style="font-size:14px"> KG</small></span>
        <span class="c-cyan">${workoutSets(doneW)}<small style="font-size:14px"> SERIES</small></span>
      </div>
      ${w.exercises.map((e, ei) => exerciseBlock(e, ei)).join('')}
      ${!w.exercises.length ? empty(ICON.dumbbell, 'Agrega un ejercicio', 'Elige de la lista o crea uno nuevo.') : ''}
      <button class="btn primary block" data-a="add-exercises">Agregar ejercicios</button>
      <button class="btn danger plain block" style="margin-top:6px" data-a="discard">Descartar entrenamiento</button>`;
  },

  detail({ id }) {
    const w = db.workouts.find((x) => x.id === id);
    if (!w) { ui.stack.pop(); return TABS[ui.tab](); }
    const prs = prsOf(w);
    const n = prCount(prs);
    return `
      ${navBar({ title: w.name, backBtn: true, right: `<button class="nav-btn" data-a="detail-menu" data-id="${w.id}" aria-label="Opciones">${ICON.dots}</button>` })}
      <div class="muted small" style="margin:-8px 0 12px">${esc(cap(fmtDate(w.start)))} · ${fmtTime(w.start)}–${fmtTime(w.end)}</div>
      <div class="metrics">
        ${metric('Duración', fmtClock(w.end - w.start, true), '', 'c-yellow')}
        ${metric('Volumen', fmtN(workoutVolume(w), 0), 'KG', 'c-pink')}
        ${metric('Series', workoutSets(w), '', 'c-cyan')}
        ${metric('Récords', n ? '🏆 ' + n : '0', '', 'c-green')}
      </div>
      ${w.exercises.map((e) => {
        let k = 0; const type = exById(e.exerciseId)?.type;
        return `<div class="card">
          <button class="ex-title" data-a="open-exercise" data-id="${e.exerciseId}">${esc(exName(e.exerciseId))}</button>
          ${e.note ? `<div class="muted small">${esc(e.note)}</div>` : ''}
          ${e.sets.map((s, si) => {
            const lbl = s.t === 'c' ? 'C' : s.t === 'f' ? 'F' : ++k;
            const marks = prs[e.exerciseId]?.[si];
            return `<div class="dset"><span class="n">${lbl}</span><span class="grow">${setText(s, type)}</span>${marks ? `<span class="pr xs">🏆 ${marks.join(' · ')}</span>` : ''}</div>`;
          }).join('')}
        </div>`;
      }).join('')}
      <button class="btn primary block" style="margin-top:6px" data-a="repeat" data-id="${w.id}">Repetir entrenamiento</button>
      <button class="btn block" style="margin-top:10px" data-a="save-as-routine" data-id="${w.id}">Guardar como rutina</button>`;
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
      : [['e1rm', '1RM', 'kg'], ['maxW', 'Peso', 'kg'], ['vol', 'Volumen', 'kg'], ['maxR', 'Reps', '']];
    if (!metrics.some((m) => m[0] === ui.metric)) ui.metric = metrics[0][0];
    const mt = metrics.find((m) => m[0] === ui.metric);
    const best = (k) => Math.max(0, ...sessions.map((s) => s[k]));
    let bestSet = null;
    sessions.forEach((s) => s.sets.forEach((x) => { const v = e1rm(num(x.w), num(x.r)); if (!bestSet || v > bestSet.v) bestSet = { v, x }; }));
    return `
      ${navBar({ title: ex.name, backBtn: true, right: ex.custom ? `<button class="nav-btn" data-a="exercise-menu" data-id="${ex.id}" aria-label="Opciones">${ICON.dots}</button>` : '' })}
      <div class="row" style="margin:-6px 0 6px"><span class="tag">${esc(ex.muscle)}</span><span class="tag">${time ? 'Tiempo y distancia' : 'Peso y repeticiones'}</span></div>
      ${!sessions.length ? empty(ICON.chart, 'Sin registros', 'Aún no has hecho este ejercicio.') : `
      <div class="metrics">
        ${time ? `
          ${metric('Mejor sesión', fmtN(best('mins')), 'MIN', 'c-yellow')}
          ${metric('Mayor distancia', fmtN(best('km'), 2), 'KM', 'c-green')}` : `
          ${metric('Peso máximo', fmtN(best('maxW')), 'KG', 'c-pink')}
          ${metric('1RM estimado', fmtN(best('e1rm')), 'KG', 'c-green')}
          ${metric('Mejor volumen', fmtN(best('vol'), 0), 'KG', 'c-cyan')}
          ${metric('Mejor serie', bestSet?.v ? `${fmtN(num(bestSet.x.w))}×${fmtN(num(bestSet.x.r), 0)}` : '—', '', 'c-yellow')}`}
      </div>
      <h2>Progreso</h2>
      <div class="seg">${metrics.map(([k, l]) => `<button class="${k === ui.metric ? 'on' : ''}" data-a="metric" data-k="${k}">${l}</button>`).join('')}</div>
      <div class="card">${lineChart(sessions.map((s) => ({ x: s.date, y: s[mt[0]] })), mt[2])}</div>
      <h2>Historial <span class="muted" style="font-weight:400;font-size:17px">· ${sessions.length}</span></h2>
      ${[...sessions].reverse().map((s) => `
        <button class="card tap" data-a="open-detail" data-id="${s.id}">
          <div class="row between"><span class="muted xs" style="font-weight:600;text-transform:uppercase">${esc(fmtShort(s.date))}</span>${ICON.chev}</div>
          ${s.sets.map((x, i) => `<div class="dset"><span class="n">${x.t === 'c' ? 'C' : x.t === 'f' ? 'F' : i + 1}</span><span>${setText(x, ex.type)}</span></div>`).join('')}
        </button>`).join('')}`}`;
  },

  routine() {
    const r = ui.draft;
    const addCell = '<button class="cell" data-a="add-exercises"><span style="color:var(--accent)">Agregar ejercicios…</span></button>';
    return `
      ${navBar({ title: r.id ? 'Editar rutina' : 'Nueva rutina', large: false,
        left: '<button class="nav-btn" data-a="back">Cancelar</button>',
        right: '<button class="nav-btn bold" data-a="save-routine">Guardar</button>' })}
      <div class="sec">Nombre</div>
      <div class="group"><div class="field-cell"><input data-in="rname" value="${esc(r.name)}" placeholder="Ej. Pecho y tríceps" style="text-align:left;color:var(--text)"></div></div>
      <div class="sec">Ejercicios</div>
      <div class="group">${r.exercises.map((x, i) => `
        <div class="cell">
          <button class="grow" style="text-align:left" data-a="r-menu" data-i="${i}"><div class="ell">${esc(exName(x.exerciseId))}</div><div class="muted xs">${x.sets} series · ${esc(exById(x.exerciseId)?.muscle || '')}</div></button>
          <div class="stepper"><button data-a="r-sets" data-i="${i}" data-d="-1">−</button><button data-a="r-sets" data-i="${i}" data-d="1">+</button></div>
        </div>`).join('')}${addCell}</div>
      <div class="foot">Usa − y + para el número de series. Toca un ejercicio para moverlo o quitarlo.</div>
      ${r.id ? '<div class="group" style="margin-top:28px"><button class="cell center" style="color:var(--red)" data-a="delete-routine">Eliminar rutina</button></div>' : ''}`;
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
        <button class="nav-btn" data-a="ex-menu" data-ei="${ei}" aria-label="Opciones">${ICON.dots}</button>
      </div>
      ${e.note !== undefined ? `<input class="ex-note" placeholder="Nota (asiento en 4, agarre cerrado…)" value="${esc(e.note)}" data-in="note" data-ei="${ei}">` : ''}
      <div class="set-grid set-head"><span>Serie</span><span>Anterior</span><span>${time ? 'Min' : 'Kg'}</span><span>${time ? 'Km' : 'Reps'}</span><span></span></div>
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
      <button class="add-set" data-a="add-set" data-ei="${ei}">+ Agregar serie</button>
    </div>`;
}

/* ---------- gráficos (SVG) ---------- */
function lineChart(pts, unit) {
  pts = pts.filter((p) => p.y > 0);
  if (pts.length < 2) return '<div class="muted small" style="text-align:center;padding:24px 8px">Registra al menos 2 sesiones para ver tu progreso.</div>';
  const W = 340, H = 180, L = 6, R = 36, T = 12, B = 22;
  const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
  const x0 = Math.min(...xs), x1 = Math.max(...xs);
  let y0 = Math.min(...ys), y1 = Math.max(...ys);
  const pad = (y1 - y0) * 0.15 || y1 * 0.1 || 1; y0 = Math.max(0, y0 - pad); y1 += pad;
  const X = (x) => L + ((x - x0) / (x1 - x0 || 1)) * (W - L - R);
  const Y = (y) => T + (1 - (y - y0) / (y1 - y0)) * (H - T - B);
  const path = pts.map((p, i) => `${i ? 'L' : 'M'}${X(p.x).toFixed(1)},${Y(p.y).toFixed(1)}`).join('');
  const ticks = [0, 0.5, 1].map((f) => y0 + f * (y1 - y0));
  const d = (ts) => new Date(ts).toLocaleDateString('es', { day: 'numeric', month: 'short' });
  const last = pts[pts.length - 1];
  return `<div class="muted xs" style="font-weight:600">ÚLTIMA SESIÓN</div>
    <div style="font-family:var(--round);font-size:28px;font-weight:600" class="c-green">${fmtN(last.y)}<small style="font-size:16px"> ${esc(unit.toUpperCase())}</small></div>
    <svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Gráfico de progreso">
    <defs><linearGradient id="gfill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a4f53c" stop-opacity=".35"/><stop offset="1" stop-color="#a4f53c" stop-opacity="0"/></linearGradient></defs>
    ${ticks.map((t) => `<line class="grid" x1="${L}" x2="${W - R}" y1="${Y(t)}" y2="${Y(t)}"/><text class="axis" x="${W - R + 6}" y="${Y(t) + 3}">${fmtN(t, t < 10 ? 1 : 0)}</text>`).join('')}
    <path class="area" d="${path}L${X(x1)},${H - B}L${X(x0)},${H - B}Z"/>
    <path class="line" d="${path}"/>
    ${pts.length <= 40 ? pts.map((p) => `<circle class="dot" cx="${X(p.x)}" cy="${Y(p.y)}" r="3"/>`).join('') : ''}
    <text class="axis" x="${L}" y="${H - 5}">${d(x0)}</text><text class="axis" x="${W - R}" y="${H - 5}" text-anchor="end">${d(x1)}</text>
  </svg>`;
}
function barChart(pts) {
  const W = 340, H = 120, B = 18, T = 14;
  const max = Math.max(1, ...pts.map((p) => p.y));
  const bw = W / pts.length;
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Entrenamientos por semana">
    <line class="grid" x1="0" x2="${W}" y1="${H - B}" y2="${H - B}"/>
    ${pts.map((p, i) => {
      const h = Math.max(p.y ? 4 : 0, (p.y / max) * (H - B - T)); const x = i * bw + bw * 0.22;
      return `<rect class="bar" x="${x}" y="${H - B - h}" width="${bw * 0.56}" height="${h}" rx="${Math.min(4, bw * 0.28)}" opacity="${i === pts.length - 1 ? 1 : 0.55}"/>
        ${p.y ? `<text class="axis" x="${x + bw * 0.28}" y="${H - B - h - 4}" text-anchor="middle">${p.y}</text>` : ''}
        ${i % 3 === 0 || i === pts.length - 1 ? `<text class="axis" x="${x + bw * 0.28}" y="${H - 3}" text-anchor="middle">${new Date(p.x).toLocaleDateString('es', { day: 'numeric', month: 'short' })}</text>` : ''}`;
    }).join('')}
  </svg>`;
}

/* ---------- hojas inferiores ---------- */
function openSheet(s) { ui.sheet = s; renderSheet(); }
function closeSheet() { ui.sheet = null; renderSheet(); }
let lastSheet = null;
function renderSheet() {
  const wrap = $('#sheet-wrap'); const s = ui.sheet;
  wrap.hidden = !s;
  if (!s) { lastSheet = null; return; }
  const sh = $('#sheet');
  // animar solo cuando aparece una hoja distinta
  if (lastSheet !== s) { sh.style.animation = 'none'; void sh.offsetWidth; sh.style.animation = ''; lastSheet = s; }
  if (s.type === 'picker') {
    sh.className = 'page';
    sh.innerHTML = `<div class="grab"></div>
      <div class="sheet-nav"><div class="nav-l"><button class="nav-btn" data-a="close-sheet">Cancelar</button></div>
        <div class="nav-t">${s.replace !== undefined ? 'Reemplazar' : 'Ejercicios'}</div>
        <div class="nav-r"><button class="nav-btn bold" data-a="pick-done" ${s.sel.length ? '' : 'disabled style="opacity:.35"'}>Agregar${s.sel.length ? ` (${s.sel.length})` : ''}</button></div></div>
      <div class="scroll" id="picklist-scroll">
        <input type="search" class="search" placeholder="Buscar" value="${esc(s.q)}" data-in="pickq" autocomplete="off" style="margin-top:6px">
        <div class="chips">${['', ...MUSCLES].map((m) => `<button class="chip ${s.m === m ? 'on' : ''}" data-a="pick-muscle" data-m="${esc(m)}">${m || 'Todos'}</button>`).join('')}</div>
        <div id="picklist">${exerciseList(s.q, s.m, s.sel)}</div>
        <div class="group" style="margin-top:18px"><button class="cell" data-a="new-exercise"><span style="color:var(--accent)">Crear ejercicio nuevo…</span></button></div>
      </div>`;
  } else if (s.type === 'menu') {
    sh.className = 'action';
    sh.innerHTML = `<div class="action-group">${s.title ? `<div class="action-title">${esc(s.title)}</div>` : ''}${s.items.map((it, i) =>
      `<button class="action-item ${it.danger ? 'danger' : ''}" data-a="menu-pick" data-i="${i}">${esc(it.label)}</button>`).join('')}</div>
      <button class="action-cancel" data-a="close-sheet">Cancelar</button>`;
  } else if (s.type === 'exform') {
    const e = s.ex;
    sh.className = 'page';
    sh.innerHTML = `<div class="grab"></div>
      <div class="sheet-nav"><div class="nav-l"><button class="nav-btn" data-a="exform-cancel">Cancelar</button></div>
        <div class="nav-t">${e.id ? 'Editar ejercicio' : 'Nuevo ejercicio'}</div>
        <div class="nav-r"><button class="nav-btn bold" data-a="save-exercise">Guardar</button></div></div>
      <div class="scroll">
        <div class="sec">Nombre</div>
        <div class="group"><div class="field-cell"><input id="f-name" value="${esc(e.name)}" placeholder="Ej. Press en máquina Smith" style="text-align:left;color:var(--text)"></div></div>
        <div class="sec">Detalles</div>
        <div class="group">
          <label class="field-cell"><span class="grow">Grupo muscular</span><select id="f-muscle">${MUSCLES.map((m) => `<option ${m === e.muscle ? 'selected' : ''}>${m}</option>`).join('')}</select>${ICON.chev}</label>
          <label class="field-cell"><span class="grow">Registro</span><select id="f-type">
            <option value="peso" ${e.type !== 'tiempo' ? 'selected' : ''}>Peso y reps</option>
            <option value="tiempo" ${e.type === 'tiempo' ? 'selected' : ''}>Tiempo y distancia</option></select>${ICON.chev}</label>
        </div>
      </div>`;
    setTimeout(() => { const f = $('#f-name'); if (f && !e.name) f.focus(); }, 350);
  }
}

/* ---------- alertas estilo iOS ---------- */
function ask({ title, msg = '', ok = 'Aceptar', cancel = 'Cancelar', danger = false, input = null }) {
  return new Promise((resolve) => {
    const d = $('#dialog');
    d.innerHTML = `<div class="alert" role="alertdialog"><div class="alert-body"><b>${esc(title)}</b>${msg ? `<p>${esc(msg)}</p>` : ''}
      ${input !== null ? `<input id="alert-in" value="${esc(input)}">` : ''}</div>
      <div class="alert-btns">${cancel ? `<button data-r="0">${esc(cancel)}</button>` : ''}<button data-r="1" class="${danger ? 'danger' : 'bold'}">${esc(ok)}</button></div></div>`;
    d.hidden = false;
    const inp = $('#alert-in');
    if (inp) setTimeout(() => { inp.focus(); inp.select(); }, 60);
    d.onclick = (ev) => {
      const b = ev.target.closest('[data-r]'); if (!b) return;
      ev.stopPropagation();
      const yes = b.dataset.r === '1';
      const val = inp ? inp.value : null;
      d.hidden = true; d.onclick = null; d.innerHTML = '';
      resolve(inp ? (yes ? val : null) : yes);
    };
  });
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
  el.innerHTML = `<div class="rest-box"><div class="grow"><div class="lbl">DESCANSO</div><div class="time">${fmtClock(left + 999)}</div></div>
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
    [0, 0.22, 0.44].forEach((t, i) => {
      const o = audioCtx.createOscillator(); const g = audioCtx.createGain();
      o.type = 'sine'; o.frequency.value = i === 2 ? 1320 : 990; o.connect(g); g.connect(audioCtx.destination);
      const at = audioCtx.currentTime + t;
      g.gain.setValueAtTime(0.22, at); g.gain.exponentialRampToValueAtTime(0.001, at + 0.18);
      o.start(at); o.stop(at + 0.2);
    });
  } catch { /* sin audio */ }
}
// iOS solo permite sonido después de un toque: se activa en el primer toque
document.addEventListener('touchend', () => {
  try { audioCtx ||= new (window.AudioContext || window.webkitAudioContext)(); if (audioCtx.state === 'suspended') audioCtx.resume(); } catch { /* nada */ }
}, { once: true });
setInterval(() => {
  if (db.active) {
    const a = $('#wtimer'); if (a) a.textContent = fmtClock(Date.now() - db.active.start, true);
    const b = $('#ab-timer'); if (b) b.textContent = fmtClock(Date.now() - db.active.start);
  }
  if (ui.rest) {
    if (Date.now() >= ui.rest.end) { stopRest(); beep(); toast('Descanso terminado'); }
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
  t.style.animation = 'none'; void t.offsetWidth; t.style.animation = '';
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 2200);
}
function defaultName() {
  const h = new Date().getHours();
  return h < 12 ? 'Entrenamiento de la mañana' : h < 19 ? 'Entrenamiento de la tarde' : 'Entrenamiento de la noche';
}
const newSet = (t = 'n') => ({ w: '', r: '', done: false, t });

async function startWorkout(name, exercises, routineId = null) {
  if (db.active && !(await ask({ title: 'Entrenamiento en curso', msg: '¿Descartar el actual y empezar uno nuevo?', ok: 'Descartar', danger: true }))) return;
  db.active = {
    id: uid(), name: name || defaultName(), start: Date.now(), routineId,
    exercises: (exercises || []).filter((x) => exById(x.exerciseId)).map((x) => ({
      exerciseId: x.exerciseId,
      sets: x.sets?.map ? x.sets.map((s) => newSet(s.t || 'n')) : Array.from({ length: x.sets || 3 }, () => newSet()),
    })),
  };
  stopRest(); save();
  ui.stack = [{ type: 'workout' }]; ui.anim = 'push'; render(); window.scrollTo(0, 0);
}

async function finishWorkout() {
  const w = db.active;
  const doneCount = w.exercises.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0);
  const pending = w.exercises.reduce((n, e) => n + e.sets.filter((s) => !s.done).length, 0);
  if (!doneCount) {
    if (await ask({ title: 'Sin series completadas', msg: 'No has marcado ninguna serie. ¿Descartar este entrenamiento?', ok: 'Descartar', danger: true })) discardWorkout(true);
    return;
  }
  if (pending && !(await ask({ title: '¿Terminar entrenamiento?', msg: `${pending} serie${pending > 1 ? 's' : ''} sin marcar no se guardará${pending > 1 ? 'n' : ''}.`, ok: 'Terminar' }))) return;
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
  ui.tab = 'historial'; ui.stack = [{ type: 'detail', id: fin.id }]; ui.anim = 'fade';
  render(); window.scrollTo(0, 0);
  toast(n ? `🏆 ${n} récord${n > 1 ? 's' : ''} nuevo${n > 1 ? 's' : ''}` : 'Entrenamiento guardado');
}
async function discardWorkout(skipConfirm) {
  if (!skipConfirm && !(await ask({ title: '¿Descartar entrenamiento?', msg: 'Se perderá lo que registraste.', ok: 'Descartar', danger: true }))) return;
  db.active = null; stopRest(); save(); ui.stack = []; ui.anim = 'fade'; render();
}

function toggleSet(ei, si) {
  const e = db.active.exercises[ei]; const s = e.sets[si];
  if (s.done) { s.done = false; save(); render(); return; }
  const ref = previousSets(e.exerciseId)[si] || e.sets[si - 1];
  if (s.w === '' && ref) s.w = String(ref.w || '');
  if (s.r === '' && ref) s.r = String(ref.r || '');
  if (!num(s.w) && !num(s.r)) { toast(isTime(e.exerciseId) ? 'Ingresa los minutos' : 'Ingresa las repeticiones'); return; }
  s.done = true; haptic();
  if (s.t !== 'c' && !isTime(e.exerciseId)) startRest(db.settings.rest); else if (s.t === 'c') startRest(Math.min(60, db.settings.rest));
  save(); render();
}

function routineMenu(r) {
  openSheet({ type: 'menu', title: r.name, items: [
    { label: 'Empezar rutina', run: () => startWorkout(r.name, r.exercises, r.id) },
    { label: 'Editar', run: () => editRoutine(r) },
    { label: 'Duplicar', run: () => { db.routines.push({ ...structuredClone(r), id: uid(), name: r.name + ' (copia)' }); save(); render(); } },
    { label: 'Eliminar rutina', danger: true, run: async () => { if (await ask({ title: `¿Eliminar «${r.name}»?`, ok: 'Eliminar', danger: true })) { db.routines = db.routines.filter((x) => x.id !== r.id); save(); render(); } } },
  ] });
}
function editRoutine(r) {
  ui.draft = r ? structuredClone(r) : { id: null, name: '', exercises: [] };
  go({ type: 'routine' });
}
async function saveAsRoutine(wk) {
  const name = await ask({ title: 'Guardar como rutina', msg: 'Ponle un nombre a la rutina.', input: wk.name, ok: 'Guardar' });
  if (!name || !name.trim()) return;
  db.routines.push({ id: uid(), name: name.trim(), exercises: wk.exercises.map((e) => ({ exerciseId: e.exerciseId, sets: e.sets.filter((s) => s.t !== 'c').length || e.sets.length })) });
  save(); toast('Rutina guardada');
}

function exportData() {
  const data = JSON.stringify({ app: 'workoutracker', version: 1, exportedAt: new Date().toISOString(), ...db }, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const name = `workoutracker-copia-${new Date().toISOString().slice(0, 10)}.json`;
  const file = new File([blob], name, { type: 'application/json' });
  if (navigator.canShare?.({ files: [file] })) {
    navigator.share({ files: [file], title: 'Copia de workoutracker' }).catch(() => {});
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
    if (!(await ask({ title: 'Importar copia', msg: `Tiene ${d.workouts.length} entrenamientos y ${d.routines?.length || 0} rutinas. Reemplazará tus datos actuales.`, ok: 'Importar' }))) return;
    delete d.app; delete d.version; delete d.exportedAt;
    db = normalize(d); save(); ui.stack = []; render(); toast('Copia importada');
  } catch { toast('El archivo no es una copia válida'); }
});

/* ---------- eventos ---------- */
document.addEventListener('click', async (ev) => {
  const el = ev.target.closest('[data-a]');
  if (!el || el.disabled) return;
  const a = el.dataset.a; const d = el.dataset;
  const ei = d.ei !== undefined ? +d.ei : null; const si = d.si !== undefined ? +d.si : null;
  const w = db.active;
  switch (a) {
    case 'tab':
      if (ui.tab === d.id && !ui.stack.length) { window.scrollTo({ top: 0, behavior: 'smooth' }); break; }
      ui.tab = d.id; ui.stack = []; ui.anim = 'fade'; render(); window.scrollTo(0, 0); break;
    case 'back': back(); break;
    case 'start-empty': startWorkout(); break;
    case 'start-routine': { const r = db.routines.find((x) => x.id === d.id); if (r) startWorkout(r.name, r.exercises, r.id); break; }
    case 'open-workout': ui.stack = [{ type: 'workout' }]; ui.anim = 'push'; render(); window.scrollTo(0, 0); break;
    case 'minimize': ui.stack = []; ui.anim = 'fade'; render(); break;
    case 'finish': finishWorkout(); break;
    case 'discard': discardWorkout(); break;
    case 'new-routine': editRoutine(null); break;
    case 'edit-routine': { const r = db.routines.find((x) => x.id === d.id); if (r) editRoutine(r); break; }
    case 'routine-menu': { const r = db.routines.find((x) => x.id === d.id); if (r) routineMenu(r); break; }
    case 'open-detail': go({ type: 'detail', id: d.id }); break;
    case 'open-exercise': if (ui.sheet) closeSheet(); go({ type: 'exercise', id: d.id }); break;
    case 'metric': ui.metric = d.k; render(); break;
    case 'ex-muscle': ui.exMuscle = d.m; render(); break;
    case 'goal': { const k = d.k; const min = { goal: 1, goalMin: 15, goalSets: 5 }[k]; db.settings[k] = Math.max(min, db.settings[k] + +d.d); save(); render(); break; }

    case 'add-exercises': openSheet({ type: 'picker', q: '', m: '', sel: [], target: ui.stack.at(-1)?.type }); break;
    case 'pick-toggle': {
      const s = ui.sheet; const i = s.sel.indexOf(d.id);
      if (i >= 0) s.sel.splice(i, 1); else s.sel.push(d.id);
      haptic();
      if (s.replace !== undefined) { pickDone(); break; }
      const top = $('#picklist-scroll').scrollTop; renderSheet(); $('#picklist-scroll').scrollTop = top; break;
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
        { label: (s.t === 'c' ? '✓ ' : '') + 'Calentamiento', run: setType('c') },
        { label: (s.t === 'f' ? '✓ ' : '') + 'Al fallo', run: setType('f') },
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
        { label: 'Cambiar nombre', run: async () => { const n = await ask({ title: 'Cambiar nombre', input: wk.name, ok: 'Guardar' }); if (n && n.trim()) { wk.name = n.trim(); save(); render(); } } },
        { label: 'Repetir entrenamiento', run: () => startWorkout(wk.name, wk.exercises) },
        { label: 'Guardar como rutina', run: () => saveAsRoutine(wk) },
        { label: 'Eliminar entrenamiento', danger: true, run: async () => { if (await ask({ title: '¿Eliminar entrenamiento?', msg: 'Se quitará de tu historial.', ok: 'Eliminar', danger: true })) { db.workouts = db.workouts.filter((x) => x.id !== wk.id); save(); back(); } } },
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
      save(); ui.draft = null; ui.tab = 'entrenar'; ui.stack = []; ui.anim = 'pop'; render(); toast('Rutina guardada');
      break;
    }
    case 'delete-routine':
      if (await ask({ title: '¿Eliminar rutina?', ok: 'Eliminar', danger: true })) { db.routines = db.routines.filter((x) => x.id !== ui.draft.id); save(); ui.stack = []; ui.anim = 'pop'; render(); }
      break;

    case 'new-exercise': {
      const q = d.name ?? ui.sheet?.q ?? '';
      const from = ui.sheet?.type === 'picker' ? ui.sheet : null;
      openSheet({ type: 'exform', ex: { id: null, name: q, muscle: from?.m || ui.exMuscle || 'Pecho', type: 'peso' }, back: from });
      break;
    }
    case 'exform-cancel': ui.sheet = ui.sheet.back || null; renderSheet(); break;
    case 'save-exercise': {
      const name = $('#f-name').value.trim();
      if (!name) { toast('Escribe un nombre'); return; }
      const s = ui.sheet; const vals = { name, muscle: $('#f-muscle').value, type: $('#f-type').value };
      if (s.ex.id) Object.assign(exById(s.ex.id), vals);
      else {
        const ex = { id: 'c' + uid(), custom: true, ...vals }; db.exercises.push(ex);
        if (s.back) { s.back.sel.push(ex.id); s.back.q = ''; }
      }
      save(); ui.sheet = s.back || null; render(); toast('Ejercicio guardado');
      break;
    }
    case 'exercise-menu': {
      const ex = exById(d.id);
      openSheet({ type: 'menu', title: ex.name, items: [
        { label: 'Editar', run: () => openSheet({ type: 'exform', ex: { ...ex } }) },
        { label: 'Eliminar ejercicio', danger: true, run: async () => {
          const used = db.workouts.some((w) => w.exercises.some((e) => e.exerciseId === ex.id));
          if (!(await ask({ title: `¿Eliminar «${ex.name}»?`, msg: used ? 'Aparece en tu historial; esas series quedarán como «Ejercicio eliminado».' : '', ok: 'Eliminar', danger: true }))) return;
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
      if (await ask({ title: '¿Borrar todos los datos?', msg: 'Se eliminarán tus entrenamientos, rutinas y ejercicios personalizados. No se puede deshacer.', ok: 'Borrar', danger: true })
        && await ask({ title: '¿Estás seguro?', msg: 'Te recomendamos exportar una copia primero.', ok: 'Borrar todo', danger: true })) {
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
  if (ev.target.dataset.in === 'rest') { db.settings.rest = +ev.target.value; save(); }
});
document.addEventListener('focusin', (ev) => { if (ev.target.classList?.contains('num')) setTimeout(() => ev.target.select?.(), 0); });
document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
window.addEventListener('pagehide', save);

/* ---------- arranque ---------- */
if (navigator.storage?.persist) navigator.storage.persist().catch(() => {});
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
if (db.active) ui.stack = [{ type: 'workout' }];
render();
