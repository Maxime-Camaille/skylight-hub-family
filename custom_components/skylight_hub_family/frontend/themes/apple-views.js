/* Écrans rendus PAR le thème Apple — la refonte, pas un habillage.
 *
 * Contrat : `renderView(host, view, wrap)` renvoie `true` si le thème sait
 * dessiner cette vue. Le panneau n'instancie alors AUCUNE carte. Skylight
 * n'implémente rien et garde ses cartes d'origine : le retour est garanti.
 *
 * Données  : `host._app` (profils, soldes, repas, clés de listes) + `callWS`
 *            `skylight_hub_family/list` pour les items.
 * Actions  : `skylight_hub_family/todo|stars|text|settings`, puis
 *            `host._refreshData()` qui relit la config et rafraîchit la vue.
 */

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function parseDesc(item) {
  try { const v = JSON.parse((item && item.description) || '{}'); return (v && typeof v === 'object') ? v : {}; } catch (e) { return {}; }
}

/* Date LOCALE, pas UTC : `toISOString()` donne la veille entre 00 h et 02 h. */
function localDay() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const DAYS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

function sortedProfiles(host) {
  const p = (host._app && host._app.profiles) || [];
  return p.slice().sort((a, b) => (a.ord || 0) - (b.ord || 0));
}

async function listItems(host, entity) {
  if (!entity) return [];
  try {
    const r = await host._hass.callWS({ type: 'skylight_hub_family/list', entity });
    return (r && r.items) || [];
  } catch (e) { return []; }
}

/* ============================== GABARIT D'ÉCRAN ============================= */
function screen({ title, sub, actions = '', body }) {
  return `<div class="av">
    <header class="av-hdr">
      <div class="av-titles">
        <h1 class="av-t1">${esc(title)}</h1>
        ${sub ? `<p class="av-t2">${esc(sub)}</p>` : ''}
      </div>
      <div class="av-actions">${actions}</div>
    </header>
    <div class="av-body">${body}</div>
  </div>`;
}

function todayLabel() {
  const d = new Date();
  const j = DAYS[(d.getDay() + 6) % 7];
  return `${j.charAt(0).toUpperCase()}${j.slice(1)} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/* ================================== TÂCHES =================================
 * Une colonne par personne (l'information ne change pas), mais rendue comme une
 * pile de cartes groupées : la couleur ne porte que l'avatar et la case.
 */
async function renderTasks(host, wrap) {
  const profiles = sortedProfiles(host);
  const app = host._app || {};
  const choresEnt = (app.lists && app.lists.chores) || 'todo.taches_famille';
  const chores = await listItems(host, choresEnt);

  const byProf = new Map();
  for (const p of profiles) byProf.set(p.id, { routines: [], chores: [] });
  const open = [];

  for (const c of chores) {
    const d = parseDesc(c);
    if (d.o && byProf.has(d.o)) byProf.get(d.o).chores.push(c);
    else open.push(c);
  }
  for (const p of profiles) {
    const ent = p.routine || ('todo.routines_' + p.id);
    const items = await listItems(host, ent);
    for (const it of items) byProf.get(p.id).routines.push({ item: it, entity: ent });
  }

  const colIcon = (p) => (p.photo && p.photo.indexOf(':') === 0 ? p.photo.slice(1) : (p.name || '?').charAt(0).toUpperCase());

  const rowsHtml = (item, entity, profId) => {
    const d = parseDesc(item);
    const done = item.status === 'completed';
    const stars = Number(d.s || 0);
    return `<button class="av-row${done ? ' is-done' : ''}" data-uid="${esc(item.uid)}" data-ent="${esc(entity)}" data-prof="${esc(profId || '')}" data-stars="${stars}">
      <span class="av-chk" style="color:${esc(profId ? (profiles.find((x) => x.id === profId) || {}).accent || '#8E8E93' : '#8E8E93')}">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7"/></svg>
      </span>
      ${d.e ? `<span class="av-emo">${esc(d.e)}</span>` : ''}
      <span class="av-lbl">${esc(item.summary)}</span>
      ${stars ? `<span class="av-val"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 17.3L18.2 21l-1.6-7 5.4-4.8-7.2-.6L12 2 9.2 8.6 2 9.2l5.5 4.8L5.8 21z"/></svg>${stars}</span>` : ''}
    </button>`;
  };

  const byPeriod = (list) => {
    const groups = [['morning', 'Matin'], ['afternoon', 'Après-midi'], ['evening', 'Soir']];
    const out = [];
    for (const [key, label] of groups) {
      const items = list.filter((x) => (parseDesc(x.item).p || '') === key);
      if (items.length) out.push(`<div class="av-sect">${label}</div>` + items.map((x) => rowsHtml(x.item, x.entity, x.profId)).join(''));
    }
    const rest = list.filter((x) => !['morning', 'afternoon', 'evening'].includes(parseDesc(x.item).p || ''));
    if (rest.length) out.push(rest.map((x) => rowsHtml(x.item, x.entity, x.profId)).join(''));
    return out.join('');
  };

  const column = (p) => {
    const data = byProf.get(p.id);
    const routines = data.routines.map((x) => ({ ...x, profId: p.id }));
    const routinesHtml = byPeriod(routines);
    const choresHtml = data.chores.map((c) => rowsHtml(c, choresEnt, p.id)).join('');
    const total = routines.length + data.chores.length;
    const done = [...routines.map((x) => x.item), ...data.chores].filter((i) => i.status === 'completed').length;
    const balance = ((app.stars || {})[p.id]) || 0;
    return `<section class="av-col" style="--p:${esc(p.color || '#E5E5EA')};--a:${esc(p.accent || '#8E8E93')}">
      <div class="av-who">
        <span class="av-av" style="background:${esc(p.accent || p.color || '#8E8E93')}">${esc(colIcon(p))}</span>
        <span class="av-nm">${esc(p.name)}</span>
        <span class="av-score">${done}/${total} · ★ ${balance}</span>
      </div>
      <div class="av-card">
        ${routinesHtml}${choresHtml}
        ${total === 0 ? '<div class="av-empty">Rien à faire aujourd’hui</div>' : ''}
      </div>
    </section>`;
  };

  const openHtml = open.map((c) => rowsHtml(c, choresEnt, '')).join('');
  const openCol = `<section class="av-col" style="--p:#E5E5EA;--a:#6B5CA5">
    <div class="av-who">
      <span class="av-av" style="background:#6B5CA5">＋</span>
      <span class="av-nm">À faire</span>
      <span class="av-score">${open.filter((i) => i.status === 'completed').length}/${open.length}</span>
    </div>
    <div class="av-card">
      <div class="av-sect">Ouvert à tous</div>
      ${openHtml || '<div class="av-empty">Aucune tâche libre</div>'}
      <div class="av-add">
        <input class="av-in" placeholder="Nouvelle tâche…" aria-label="Nouvelle tâche">
        <button class="av-btn" data-add="1">Ajouter</button>
      </div>
    </div>
  </section>`;

  wrap.innerHTML = screen({
    title: 'Tâches',
    sub: `${todayLabel()} · ${new Date().toTimeString().slice(0, 5)}`,
    actions: `<button class="av-btn ghost" data-act="refresh">Actualiser</button>`,
    body: `<div class="av-board">${profiles.map(column).join('')}${openCol}</div>`,
  });

  const rerender = async () => { await host._refreshData(); await renderTasks(host, wrap); };

  wrap.querySelectorAll('.av-row').forEach((b) => {
    b.addEventListener('click', async () => {
      const d = parseDesc({ description: b.dataset.desc });
      const uid = b.dataset.uid;
      const ent = b.dataset.ent;
      const done = b.classList.contains('is-done');
      const item = { uid };
      /* on relit la description depuis le DOM : elle n'est pas exposée ici,
         donc on la reconstruit depuis l'item courant au moment du clic */
      const all = ent === choresEnt ? chores : (await listItems(host, ent));
      const cur = all.find((x) => x.uid === uid) || {};
      const cd = parseDesc(cur);
      const today = localDay();
      const stars = Number(cd.s || 0);
      const prof = b.dataset.prof;
      b.disabled = true;
      await host._hass.callWS({
        type: 'skylight_hub_family/todo',
        entity: ent,
        op: 'update',
        item_uid: uid,
        status: done ? 'needs_action' : 'completed',
        description: JSON.stringify(done
          ? { ...cd, cd: cd.cd === today ? '' : cd.cd }
          : { ...cd, cd: today }),
      });
      if (prof && stars) {
        const credited = done ? (cd.cd === today) : (cd.cd !== today);
        if (credited) {
          await host._hass.callWS({ type: 'skylight_hub_family/stars', profile: prof, delta: done ? -stars : stars });
        }
      }
      await rerender();
    });
  });

  const addBtn = wrap.querySelector('[data-add]');
  const input = wrap.querySelector('.av-in');
  if (addBtn && input) {
    addBtn.addEventListener('click', async () => {
      const v = input.value.trim();
      if (!v) return;
      await host._hass.callWS({
        type: 'skylight_hub_family/todo',
        entity: choresEnt,
        op: 'add',
        item: { summary: v, description: JSON.stringify({ t: 'chore', s: Number((host._app && host._app.stars_per_task) || 10) }) },
      });
      await rerender();
    });
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') addBtn.click(); });
  }
  const refresh = wrap.querySelector('[data-act="refresh"]');
  if (refresh) refresh.addEventListener('click', rerender);
  return true;
}

/* =================================== REPAS ================================= */
async function renderMeals(host, wrap) {
  const app = host._app || {};
  const meals = app.meals || {};
  let week = 1;

  const cellValue = (day) => String(meals[`input_text.repas_${day}${week === 2 ? '2' : ''}`] || '');
  const split = (v) => { const parts = String(v || '').split('|'); return { midi: parts[0] || '', soir: parts[1] || '' }; };

  const build = () => {
    const today = (new Date().getDay() + 6) % 7;
    const cols = DAYS.map((day, i) => {
      const { midi, soir } = split(cellValue(day));
      const isToday = i === today;
      return `<div class="av-day${isToday ? ' is-today' : ''}">
        <div class="av-dayh"><span>${day.slice(0, 3).replace(/^./, (c) => c.toUpperCase())}</span><b>${new Date(Date.now() + (i - today) * 864e5).getDate()}</b></div>
        <div class="av-meal" data-day="${day}" data-row="0">${midi ? esc(midi) : '<span class="av-ph">Midi</span>'}</div>
        <div class="av-meal" data-day="${day}" data-row="1">${soir ? esc(soir) : '<span class="av-ph">Soir</span>'}</div>
      </div>`;
    }).join('');
    return `<div class="av-week">${cols}</div>`;
  };

  const draw = () => {
    wrap.innerHTML = screen({
      title: 'Repas',
      sub: todayLabel(),
      actions: `<div class="av-seg"><button data-week="1" class="${week === 1 ? 'on' : ''}">S1</button><button data-week="2" class="${week === 2 ? 'on' : ''}">S2</button></div>`,
      body: build(),
    });
    wrap.querySelectorAll('[data-week]').forEach((b) => b.addEventListener('click', () => { week = Number(b.dataset.week); draw(); }));
    wrap.querySelectorAll('.av-meal').forEach((c) => {
      c.addEventListener('click', () => {
        const day = c.dataset.day;
        const row = Number(c.dataset.row);
        const cur = split(cellValue(day));
        const val = window.prompt(`Repas — ${day}`, row === 0 ? cur.midi : cur.soir);
        if (val == null) return;
        const next = row === 0 ? `${val.trim()}|${cur.soir}` : `${cur.midi}|${val.trim()}`;
        const ent = `input_text.repas_${day}${week === 2 ? '2' : ''}`;
        host._hass.callWS({ type: 'skylight_hub_family/text', entity: ent, value: next })
          .then(async () => { await host._refreshData(); meals[ent] = next; draw(); });
      });
    });
  };
  draw();
  return true;
}

/* ================================= RÉGLAGES ================================ */
async function renderSettings(host, wrap) {
  const app = host._app || {};
  const theme = host._themeId || 'skylight';
  const kiosk = !!app.kiosk;

  wrap.innerHTML = screen({
    title: 'Réglages',
    sub: `${app.family_name || 'Famille'} · version ${esc(app.version || '')}`,
    body: `
      <div class="av-group">
        <div class="av-gt">Thème</div>
        <div class="av-card pad">
          <button class="av-choice${theme === 'skylight' ? ' on' : ''}" data-theme="skylight">
            <span class="av-choice-t">Skylight Calendar</span>
            <span class="av-choice-s">Le tableau familial d’origine</span>
          </button>
          <button class="av-choice${theme === 'apple' ? ' on' : ''}" data-theme="apple">
            <span class="av-choice-t">Apple</span>
            <span class="av-choice-s">Refonte Apple 2026</span>
          </button>
        </div>
      </div>
      <div class="av-group">
        <div class="av-gt">Affichage</div>
        <div class="av-card pad">
          <button class="av-choice${kiosk ? ' on' : ''}" data-kiosk="1">
            <span class="av-choice-t">Plein écran</span>
            <span class="av-choice-s">Masque la barre de Home Assistant</span>
          </button>
        </div>
      </div>
      <div class="av-group">
        <div class="av-gt">Application</div>
        <div class="av-card pad">
          <div class="av-kv"><span>Version</span><b>${esc(app.version || '')}</b></div>
          <div class="av-kv"><span>Thème actif</span><b>${esc(theme)}</b></div>
          <div class="av-kv"><span>Profils</span><b>${(app.profiles || []).length}</b></div>
        </div>
      </div>`,
  });

  wrap.querySelectorAll('[data-theme]').forEach((b) => {
    b.addEventListener('click', async () => {
      const id = b.dataset.theme;
      await host._hass.callWS({ type: 'skylight_hub_family/settings', theme: id });
      window.dispatchEvent(new CustomEvent('skylight-theme-changed', { detail: { theme: id } }));
    });
  });
  const k = wrap.querySelector('[data-kiosk]');
  if (k) {
    k.addEventListener('click', async () => {
      await host._hass.callWS({ type: 'skylight_hub_family/settings', kiosk: !kiosk });
      await host._refreshData();
      await renderSettings(host, wrap);
    });
  }
  return true;
}

/* =============================== RÉCOMPENSES =============================== */
async function renderRewards(host, wrap) {
  const profiles = sortedProfiles(host);
  const app = host._app || {};
  const ent = (app.lists && app.lists.rewards) || 'todo.recompenses';
  const items = await listItems(host, ent);

  const byProf = new Map();
  for (const p of profiles) byProf.set(p.id, []);
  const orphans = [];
  for (const it of items) {
    const d = parseDesc(it);
    if (d.o && byProf.has(d.o)) byProf.get(d.o).push(it);
    else orphans.push(it);
  }

  const card = (it, p) => {
    const d = parseDesc(it);
    const cost = Number(d.c || 0);
    const done = it.status === 'completed';
    const solde = Number(((app.stars || {})[p.id]) || 0);
    const ok = !done && solde >= cost;
    return `<div class="av-reward${done ? ' is-done' : ''}">
      <span class="av-reward-emo">${esc(d.e || '🎁')}</span>
      <span class="av-reward-t">${esc(it.summary)}</span>
      <span class="av-reward-c">★ ${cost}</span>
      <button class="av-mini${ok ? '' : ' off'}" data-redeem="${esc(it.uid)}" data-prof="${esc(p.id)}" data-cost="${cost}"${done ? ' disabled' : ''}>${done ? 'Pris' : (ok ? 'Échanger' : 'Trop cher')}</button>
      ${done ? `<button class="av-mini ghost" data-unredeem="${esc(it.uid)}">Rendre</button>` : ''}
    </div>`;
  };

  const col = (p) => {
    const list = byProf.get(p.id);
    const open = list.filter((i) => i.status !== 'completed');
    const done = list.filter((i) => i.status === 'completed');
    const solde = Number(((app.stars || {})[p.id]) || 0);
    return `<section class="av-col" style="--p:${esc(p.color || '#E5E5EA')};--a:${esc(p.accent || '#8E8E93')}">
      <div class="av-who">
        <span class="av-av" style="background:${esc(p.accent || p.color || '#8E8E93')}">${esc(p.photo && p.photo.indexOf(':') === 0 ? p.photo.slice(1) : (p.name || '?').charAt(0).toUpperCase())}</span>
        <span class="av-nm">${esc(p.name)}</span>
        <span class="av-score">★ ${solde}</span>
      </div>
      <div class="av-card pad">
        ${open.length ? open.map((i) => card(i, p)).join('') : '<div class="av-empty">Aucune récompense</div>'}
        ${done.length ? done.map((i) => card(i, p)).join('') : ''}
      </div>
    </section>`;
  };

  wrap.innerHTML = screen({
    title: 'Récompenses',
    sub: `${todayLabel()} · ${profiles.length} personnes`,
    body: `<div class="av-board">${profiles.map(col).join('')}</div>`,
  });

  const refresh = async () => { await host._refreshData(); await renderRewards(host, wrap); };

  wrap.querySelectorAll('[data-redeem]').forEach((b) => {
    b.addEventListener('click', async (e) => {
      e.stopPropagation();
      const uid = b.dataset.redeem;
      const prof = b.dataset.prof;
      const cost = Number(b.dataset.cost);
      b.disabled = true;
      const raw = items.find((x) => x.uid === uid);
      const meta = parseDesc(raw);
      await host._hass.callWS({ type: 'skylight_hub_family/stars', profile: prof, delta: -cost });
      await host._hass.callWS({
        type: 'skylight_hub_family/todo', entity: ent, op: 'update', item_uid: uid,
        status: 'completed',
        description: JSON.stringify({ ...meta, by: prof, d: localDay() }),
      });
      await refresh();
    });
  });
  wrap.querySelectorAll('[data-unredeem]').forEach((b) => {
    b.addEventListener('click', async (e) => {
      e.stopPropagation();
      b.disabled = true;
      await host._hass.callWS({ type: 'skylight_hub_family/todo', entity: ent, op: 'update', item_uid: b.dataset.unredeem, status: 'needs_action' });
      await refresh();
    });
  });
  return true;
}

/* ================================== PROFILS ================================ */
const PALETTE = ['#2E9E63', '#A8D46A', '#4FC3D0', '#0F5F6E', '#4677A8', '#8E5BD9', '#D9548C', '#C2185B', '#C22F2F', '#E0622A', '#7A4B2A', '#A9762F', '#F5A623', '#2B3038'];

function hexToHsl(hex) {
  const [r0, g0, b0] = [1, 3, 5].map((i) => parseInt(String(hex).substr(i, 2), 16) / 255);
  const mx = Math.max(r0, g0, b0); const mn = Math.min(r0, g0, b0);
  const l = (mx + mn) / 2;
  let h = 0; let s = 0;
  if (mx !== mn) {
    const d = mx - mn;
    s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    if (mx === r0) h = (g0 - b0) / d + (g0 < b0 ? 6 : 0);
    else if (mx === g0) h = (b0 - r0) / d + 2;
    else h = (r0 - g0) / d + 4;
    h *= 60;
  }
  return [h, s, l];
}

/* teinte vive -> pastel : même teinte, même saturation, luminosité 82 % */
function pastelOf(hex) {
  const [h, s] = hexToHsl(hex);
  const l = 0.82;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const hh = ((h % 360) + 360) % 360;
  let rgb;
  if (hh < 60) rgb = [c, x, 0];
  else if (hh < 120) rgb = [x, c, 0];
  else if (hh < 180) rgb = [0, c, x];
  else if (hh < 240) rgb = [0, x, c];
  else if (hh < 300) rgb = [x, 0, c];
  else rgb = [c, 0, x];
  return '#' + rgb.map((v) => Math.round((v + m) * 255).toString(16).padStart(2, '0')).join('');
}

async function renderProfiles(host, wrap) {
  const app = host._app || {};
  const ent = (app.lists && app.lists.profiles) || 'todo.profils';
  const raw = await listItems(host, ent);
  const profiles = sortedProfiles(host);

  const rows = profiles.map((p) => {
    const item = raw.find((x) => (parseDesc(x).i || '') === p.id);
    return `<button class="av-prow" data-edit="${esc(p.id)}">
      <span class="av-av" style="background:${esc(p.accent || p.color || '#8E8E93')}">${esc(p.photo && p.photo.indexOf(':') === 0 ? p.photo.slice(1) : (p.name || '?').charAt(0).toUpperCase())}</span>
      <span class="av-nm">${esc(p.name)}</span>
      <svg class="av-chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>
    </button>`;
  }).join('');

  wrap.innerHTML = screen({
    title: 'Profils',
    sub: 'Ordre et couleur s’appliquent partout : tâches, récompenses, calendrier.',
    body: `<div class="av-card">${rows || '<div class="av-empty">Aucun profil</div>'}
      <button class="av-prow add" data-add="1">
        <span class="av-av" style="background:rgba(118,118,128,.18);color:#007AFF">＋</span>
        <span class="av-nm">Ajouter un profil</span>
      </button></div>
      <div class="av-edit" hidden></div>`,
  });

  const openEditor = (id) => {
    const p = profiles.find((x) => x.id === id);
    const item = raw.find((x) => (parseDesc(x).i || '') === id);
    const box = wrap.querySelector('.av-edit');
    if (!box) return;
    const isNew = !p;
    const cur = p ? (p.accent || p.color) : PALETTE[0];
    box.hidden = false;
    box.innerHTML = `<div class="av-card pad" style="margin-top:14px">
      <div class="av-form">
        <label class="av-lab">Nom</label>
        <input class="av-in" id="av-name" value="${esc(isNew ? '' : p.name)}" placeholder="Prénom">
        <label class="av-lab">Couleur</label>
        <div class="av-swatches">${PALETTE.map((c) => `<button class="av-sw${c.toLowerCase() === String(cur).toLowerCase() ? ' on' : ''}" style="background:${c}" data-c="${c}"></button>`).join('')}</div>
        <div class="av-form-act">
          <button class="av-btn ghost" data-cancel="1">Annuler</button>
          <button class="av-btn" data-save="1">Enregistrer</button>
        </div>
      </div></div>`;
    let picked = cur;
    box.querySelectorAll('.av-sw').forEach((s) => s.addEventListener('click', () => {
      picked = s.dataset.c;
      box.querySelectorAll('.av-sw').forEach((x) => x.classList.toggle('on', x === s));
    }));
    box.querySelector('[data-cancel]').addEventListener('click', () => { box.hidden = true; box.innerHTML = ''; });
    box.querySelector('[data-save]').addEventListener('click', async () => {
      const name = box.querySelector('#av-name').value.trim();
      if (!name) return;
      const pastel = pastelOf(picked);
      if (isNew) {
        const id2 = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_');
        const ord = Math.max(0, ...profiles.map((x) => x.ord || 0)) + 1;
        await host._hass.callWS({
          type: 'skylight_hub_family/todo', entity: ent, op: 'add',
          item: { summary: name, description: JSON.stringify({ c: pastel, a: picked, s: true, i: id2, r: 'todo.routines_' + id2, ord }) },
        });
      } else {
        const meta = item ? parseDesc(item) : {};
        await host._hass.callWS({
          type: 'skylight_hub_family/todo', entity: ent, op: 'update', item_uid: item ? item.uid : id,
          rename: name,
          description: JSON.stringify({ ...meta, c: pastel, a: picked }),
        });
      }
      await host._refreshData();
      await renderProfiles(host, wrap);
    });
  };

  wrap.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', () => openEditor(b.dataset.edit)));
  const add = wrap.querySelector('[data-add]');
  if (add) add.addEventListener('click', () => openEditor(null));
  return true;
}

/* ================================= CALENDRIER ============================== */
async function renderCalendar(host, wrap) {
  const profiles = sortedProfiles(host);
  const app = host._app || {};
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start.getTime() + 4 * 864e5);

  const cals = [];
  for (const p of profiles) {
    const list = Array.isArray(p.calendars) && p.calendars.length ? p.calendars : (p.calendar ? [p.calendar] : []);
    for (const c of list) cals.push(c);
  }

  let events = {};
  if (cals.length) {
    try {
      const res = await host._hass.callService('calendar', 'get_events',
        { start_date_time: start.toISOString(), end_date_time: end.toISOString() },
        { entity_id: cals }, false, true);
      const r = (res && res.response) || res || {};
      for (const k of Object.keys(r)) {
        if (r[k] && Array.isArray(r[k].events)) events[k] = r[k].events;
      }
    } catch (e) { events = {}; }
  }

  const dayCol = (i) => {
    const d = new Date(start.getTime() + i * 864e5);
    const isToday = i === 0;
    const rows = [];
    for (const p of profiles) {
      const list = Array.isArray(p.calendars) && p.calendars.length ? p.calendars : (p.calendar ? [p.calendar] : []);
      for (const c of list) {
        for (const ev of (events[c] || [])) {
          const s = new Date(ev.start);
          if (s.getFullYear() !== d.getFullYear() || s.getMonth() !== d.getMonth() || s.getDate() !== d.getDate()) continue;
          rows.push(`<div class="av-evt" style="--p:${esc(p.accent || p.color || '#8E8E93')}">
            <span class="av-evt-dot"></span>
            <span class="av-evt-t">${esc(ev.summary || '')}</span>
            <span class="av-evt-h">${ev.start && String(ev.start).length > 10 ? new Date(ev.start).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''}</span>
          </div>`);
        }
      }
    }
    const label = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'][d.getDay()];
    return `<section class="av-day${isToday ? ' is-today' : ''}">
      <div class="av-dayh"><span>${label}</span><b>${d.getDate()}</b></div>
      ${rows.length ? rows.join('') : '<div class="av-meal-void">Aucun événement</div>'}
    </section>`;
  };

  wrap.innerHTML = screen({
    title: app.family_name ? `Famille ${app.family_name}` : 'Calendrier',
    sub: `${start.getDate()} ${MONTHS[start.getMonth()]} – ${new Date(end.getTime() - 864e5).getDate()} ${MONTHS[end.getMonth()]}`,
    body: `<div class="av-days">${[0, 1, 2, 3].map(dayCol).join('')}</div>`,
  });
  return true;
}

/* ================================= DISPATCH ================================ */
export function renderView(host, view, wrap) {
  if (!host || !wrap) return false;
  switch (view) {
    case 'taches': {
      if (!wrap._avBusy) { wrap._avBusy = true; renderTasks(host, wrap).finally(() => { wrap._avBusy = false; }); }
      return true;
    }
    case 'repas-test': {
      if (!wrap._avBusy) { wrap._avBusy = true; renderMeals(host, wrap).finally(() => { wrap._avBusy = false; }); }
      return true;
    }
    case 'reglages': {
      if (!wrap._avBusy) { wrap._avBusy = true; renderSettings(host, wrap).finally(() => { wrap._avBusy = false; }); }
      return true;
    }
    case 'recompenses': {
      if (!wrap._avBusy) { wrap._avBusy = true; renderRewards(host, wrap).finally(() => { wrap._avBusy = false; }); }
      return true;
    }
    case 'profils': {
      if (!wrap._avBusy) { wrap._avBusy = true; renderProfiles(host, wrap).finally(() => { wrap._avBusy = false; }); }
      return true;
    }
    case 'calendrier': {
      if (!wrap._avBusy) { wrap._avBusy = true; renderCalendar(host, wrap).finally(() => { wrap._avBusy = false; }); }
      return true;
    }
    default:
      return false;
  }
}

/* =================================== CSS ================================== */
export const VIEWS_CSS = `
.av{height:100%;display:flex;flex-direction:column;overflow:hidden}
.av-hdr{
  flex:0 0 auto;display:flex;align-items:center;gap:12px;
  margin:12px 16px 8px;padding:12px 18px;border-radius:20px;
  background:rgba(255,255,255,.55);
  -webkit-backdrop-filter:blur(28px) saturate(190%);
  backdrop-filter:blur(28px) saturate(190%);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.9),0 10px 30px rgba(20,24,40,.12),0 2px 6px rgba(20,24,40,.07);
}
.av-titles{min-width:0;flex:1 1 auto}
.av-t1{margin:0;font:600 28px/34px -apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",system-ui,sans-serif;letter-spacing:-.012em;color:#000}
.av-t2{margin:2px 0 0;font:400 13px/18px -apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI",system-ui,sans-serif;color:rgba(60,60,67,.75)}
.av-actions{display:flex;align-items:center;gap:8px;flex:0 0 auto}
.av-btn{
  height:34px;padding:0 16px;border:0;border-radius:999px;background:#007AFF;color:#fff;
  font:600 15px/1 -apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI",system-ui,sans-serif;
  letter-spacing:-.016em;cursor:pointer;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.35),0 6px 16px rgba(0,90,200,.28);
}
.av-btn.ghost{background:rgba(118,118,128,.14);color:#000;box-shadow:none}
.av-body{flex:1 1 auto;min-height:0;overflow:auto;padding:0 16px 16px}

.av-board{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:14px;align-items:stretch}
.av-col{
  min-width:0;display:flex;flex-direction:column;gap:8px;height:100%;
  padding:10px 8px 8px;border-radius:22px;
  background:linear-gradient(180deg,
    color-mix(in srgb,var(--p,#E5E5EA) 18%,#fff) 0%,
    color-mix(in srgb,var(--p,#E5E5EA) 8%,#F2F2F7) 100%);
  box-shadow:inset 0 .5px 0 rgba(255,255,255,.75),0 0 0 .5px rgba(20,24,40,.05);
}
.av-col::before{content:"";display:block;height:3px;margin:0 6px 2px;border-radius:99px;background:var(--a,#8E8E93);opacity:.75}
.av-who{display:flex;align-items:center;gap:9px;padding:0 6px}
.av-av{width:30px;height:30px;border-radius:50%;display:grid;place-items:center;font-size:16px;color:#fff;font-weight:600;flex:0 0 30px}
.av-nm{font:600 17px/22px -apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI",system-ui,sans-serif;letter-spacing:-.026em;color:#000}
.av-score{margin-left:auto;font:400 13px/18px -apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI",system-ui,sans-serif;color:rgba(60,60,67,.75);font-variant-numeric:tabular-nums}
.av-card{
  background:#fff;border-radius:18px;overflow:hidden;
  box-shadow:inset 0 .5px 0 rgba(255,255,255,.95),0 0 0 .5px rgba(20,24,40,.07),0 8px 20px rgba(20,24,40,.08),0 1px 3px rgba(20,24,40,.04);
}
.av-card.pad{padding:6px 0}
.av-sect{padding:14px 16px 6px;font:600 12px/16px -apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI",system-ui,sans-serif;letter-spacing:.06em;text-transform:uppercase;color:rgba(60,60,67,.7)}
.av-row{
  width:100%;display:flex;align-items:center;gap:10px;min-height:52px;padding:8px 14px;
  border:0;border-top:.5px solid rgba(60,60,67,.22);background:#fff;text-align:left;cursor:pointer;
  font:400 15px/20px -apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI",system-ui,sans-serif;
  letter-spacing:-.016em;color:#000;
}
.av-row:first-of-type{border-top:0}
.av-row:active{background:rgba(118,118,128,.08)}
.av-chk{width:22px;height:22px;border-radius:50%;border:1.6px solid currentColor;flex:0 0 22px;display:grid;place-items:center}
.av-chk svg{width:12px;height:12px;stroke:#fff;fill:none;stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round;opacity:0}
.av-row.is-done .av-chk{background:currentColor}
.av-row.is-done .av-chk svg{opacity:1}
.av-emo{font-size:16px;line-height:1;flex:0 0 auto}
.av-lbl{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.av-row.is-done .av-lbl{color:rgba(60,60,67,.75);text-decoration:line-through;text-decoration-color:rgba(60,60,67,.3)}
.av-val{display:inline-flex;align-items:center;gap:3px;flex:0 0 auto;font-size:13px;color:rgba(60,60,67,.75)}
.av-val svg{width:11px;height:11px;fill:#FF9500}
.av-empty{padding:18px 16px;text-align:center;font:400 15px/20px -apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI",system-ui,sans-serif;color:rgba(60,60,67,.5)}
.av-add{display:flex;gap:8px;padding:10px 12px;border-top:.5px solid rgba(60,60,67,.22)}
.av-in{flex:1 1 auto;min-width:0;height:34px;border:0;border-radius:10px;padding:0 12px;background:rgba(118,118,128,.12);
  font:400 15px/1 -apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI",system-ui,sans-serif;color:#000;outline:none}

.av-week{display:grid;grid-template-columns:repeat(7,1fr);gap:12px}
.av-day{display:flex;flex-direction:column;gap:8px;min-width:0}
.av-dayh{display:flex;align-items:baseline;gap:6px;padding:0 4px;font:600 15px/20px -apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI",system-ui,sans-serif;color:#000}
.av-dayh span{font-weight:400;color:rgba(60,60,67,.75)}
.av-day.is-today .av-dayh b{background:#FF3B30;color:#fff;border-radius:999px;padding:1px 8px}
.av-meal{
  min-height:120px;border-radius:16px;background:#fff;padding:12px;
  box-shadow:inset 0 0 0 .5px rgba(20,24,40,.10),0 8px 22px rgba(20,24,40,.08);
  font:400 15px/20px -apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI",system-ui,sans-serif;
  letter-spacing:-.016em;color:#000;cursor:pointer;
}
.av-meal:active{background:rgba(118,118,128,.06)}
.av-ph{color:rgba(60,60,67,.3)}
.av-seg{display:flex;background:rgba(118,118,128,.12);border-radius:9px;padding:2px}
.av-seg button{border:0;background:none;border-radius:7px;padding:5px 12px;font:500 13px/1 -apple-system,BlinkMacSystemFont,"SF Pro Text",system-ui,sans-serif;color:rgba(60,60,67,.7);cursor:pointer}
.av-seg button.on{background:#fff;color:#000;font-weight:600;box-shadow:0 1px 2px rgba(0,0,0,.10)}

.av-group{margin:18px 0}
.av-gt{margin:0 0 7px 4px;font:400 13px/18px -apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI",system-ui,sans-serif;letter-spacing:-.006em;text-transform:uppercase;color:rgba(60,60,67,.75)}
.av-choice{display:flex;flex-direction:column;gap:2px;width:100%;border:0;background:none;text-align:left;padding:14px 16px;cursor:pointer;border-top:.5px solid rgba(60,60,67,.22)}
.av-choice:first-child{border-top:0}
.av-choice.on{background:rgba(0,122,255,.06)}
.av-choice-t{font:400 17px/22px -apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI",system-ui,sans-serif;letter-spacing:-.026em;color:#000}
.av-choice.on .av-choice-t{color:#007AFF;font-weight:600}
.av-choice-s{font:400 13px/18px -apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI",system-ui,sans-serif;color:rgba(60,60,67,.75)}
.av-kv{display:flex;justify-content:space-between;gap:12px;padding:12px 16px;border-top:.5px solid rgba(60,60,67,.22);font:400 15px/20px -apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI",system-ui,sans-serif;color:#000}
.av-kv:first-child{border-top:0}
.av-kv b{font-weight:600}

/* --- récompenses --- */
.av-reward{display:flex;align-items:center;gap:10px;padding:12px 14px;border-top:.5px solid rgba(60,60,67,.22)}
.av-reward:first-child{border-top:0}
.av-reward.is-done{opacity:.55}
.av-reward-emo{font-size:26px;line-height:1;flex:0 0 auto}
.av-reward-t{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
  font:400 15px/20px -apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI",system-ui,sans-serif;color:#000}
.av-reward-c{flex:0 0 auto;font:600 13px/18px -apple-system,BlinkMacSystemFont,"SF Pro Text",system-ui,sans-serif;color:#FF9500;font-variant-numeric:tabular-nums}
.av-mini{height:30px;padding:0 12px;border:0;border-radius:999px;background:#007AFF;color:#fff;
  font:600 13px/1 -apple-system,BlinkMacSystemFont,"SF Pro Text",system-ui,sans-serif;cursor:pointer;flex:0 0 auto}
.av-mini.off{background:rgba(118,118,128,.14);color:rgba(60,60,67,.7)}
.av-mini.ghost{background:rgba(118,118,128,.14);color:#007AFF}

/* --- profils --- */
.av-prow{display:flex;align-items:center;gap:12px;width:100%;min-height:56px;padding:8px 16px;border:0;background:none;
  border-top:.5px solid rgba(60,60,67,.22);cursor:pointer;text-align:left}
.av-prow:first-child{border-top:0}
.av-prow.add .av-av{font-size:18px}
.av-chev{width:18px;height:18px;margin-left:auto;stroke:rgba(60,60,67,.3);fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.av-edit .av-card{margin-top:14px}
.av-form{padding:14px 16px;display:flex;flex-direction:column;gap:10px}
.av-lab{font:600 12px/16px -apple-system,BlinkMacSystemFont,"SF Pro Text",system-ui,sans-serif;letter-spacing:.06em;text-transform:uppercase;color:rgba(60,60,67,.7)}
.av-swatches{display:flex;flex-wrap:wrap;gap:10px}
.av-sw{width:30px;height:30px;border-radius:50%;border:0;cursor:pointer;box-shadow:inset 0 0 0 2px rgba(255,255,255,.9)}
.av-sw.on{box-shadow:0 0 0 2px #007AFF,inset 0 0 0 2px #fff}
.av-form-act{display:flex;gap:10px;justify-content:flex-end;margin-top:6px}

/* --- calendrier --- */
.av-days{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;align-items:start}
.av-evt{display:flex;align-items:center;gap:8px;padding:10px 12px;margin-bottom:6px;border-radius:12px;background:#fff;
  box-shadow:inset 0 0 0 .5px rgba(20,24,40,.10),0 4px 12px rgba(20,24,40,.06)}
.av-evt-dot{width:8px;height:8px;border-radius:50%;background:var(--p);flex:0 0 8px}
.av-evt-t{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
  font:400 15px/20px -apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI",system-ui,sans-serif;letter-spacing:-.016em;color:#000}
.av-evt-h{font:400 13px/18px -apple-system,BlinkMacSystemFont,"SF Pro Text",system-ui,sans-serif;color:rgba(60,60,67,.7);font-variant-numeric:tabular-nums}
.av-meal-void{padding:14px 4px;font:400 13px/18px -apple-system,BlinkMacSystemFont,"SF Pro Text",system-ui,sans-serif;color:rgba(60,60,67,.5)}

@media (max-width:900px){
  .av-hdr{margin:10px 12px 8px;padding:10px 14px;border-radius:18px}
  .av-t1{font-size:22px;line-height:28px}
  .av-body{padding:0 12px 12px}
  .av-board{grid-template-columns:1fr}
  .av-week{grid-template-columns:repeat(2,1fr)}
}
@media (prefers-reduced-transparency:reduce){
  .av-hdr{background:#fff;backdrop-filter:none;-webkit-backdrop-filter:none}
}
`;
