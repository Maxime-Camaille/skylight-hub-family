/* skylight-hub-calendar-card — vue Calendrier maison, sans Daylight.
 *
 * Config fournie par le panneau :
 *   title, profiles[{id,name,color,accent,pastel,photo,calendar}],
 *   time_entity, weather_entity, days (4)
 *
 * Lecture : calendar.get_events (services HA, return_response).
 * Création : calendar.create_event sur un calendrier qui l'autorise
 * (local en général ; Google/Apple peuvent refuser).
 * Pas de suppression/édition : HA n'expose pas l'uid des événements.
 */

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[c]));
const pad2 = (n) => String(n).padStart(2, '0');
const sameDay = (a, b) => !!a && !!b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const dateKey = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const FR_DAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const FR_MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const WEATHER = {
  sunny: '☀️', 'clear-night': '🌙', partlycloudy: '⛅', cloudy: '☁️', rainy: '🌦️',
  pouring: '🌧️', snowy: '❄️', 'snowy-rainy': '🌨️', fog: '🌫️', windy: '🌬️',
  'windy-variant': '🌬️', lightning: '🌩️', 'lightning-rainy': '⛈️', hail: '🌨️', exceptional: '⚠️',
};
const dayShort = (d) => {
  const s = FR_DAYS[d.getDay()];
  return s.charAt(0).toUpperCase() + s.slice(1, 3) + '.';
};
const timeShort = (d) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
const parseWhen = (v) => {
  if (v == null) return null;
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
    const [y, m, d] = v.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};
const isAllDay = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
const whenRaw = (v) => (v && typeof v === 'object') ? (v.dateTime || v.date) : v;
const isAllDayRaw = (v) => (v && typeof v === 'object' ? !!v.date : isAllDay(v));

const CSS = `
:host{display:block;height:100%;font-family:var(--skylight-sans,Figtree,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif);color:#1F2328;--line:#E9EAF1;--muted:#8A8F9C}
*,*::before,*::after{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
button{font:inherit;color:inherit}
.app{height:100%;display:flex;flex-direction:column;background:#fff;overflow:hidden}
.hdr{flex:0 0 auto;display:flex;align-items:center;gap:16px;padding:16px 22px 6px;min-width:0}
.hl{display:flex;align-items:baseline;gap:14px;min-width:0;overflow:hidden}
.title{font-family:var(--skylight-serif,Literata,Georgia,serif);font-size:26px;font-weight:600;letter-spacing:-.01em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin:0}
.time{font-size:26px;font-weight:500;font-variant-numeric:tabular-nums;white-space:nowrap}
.weather{display:inline-flex;align-items:center;gap:6px;font-size:22px;font-weight:500;white-space:nowrap;color:#4A505E}
.hc{display:flex;align-items:center;gap:8px;margin-left:auto;flex:0 0 auto}
.nav{width:36px;height:36px;border:0;border-radius:50%;background:#F2F4F7;display:grid;place-items:center;cursor:pointer;color:#2B2F38}
.nav:hover{background:#E8EBF1}
.nav svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.range{font-size:15px;font-weight:600;color:#2B2F38;white-space:nowrap;padding:0 4px}
.todaybtn{border:0;background:#F2F4F7;border-radius:999px;height:36px;padding:0 15px;font-size:13px;font-weight:650;cursor:pointer;white-space:nowrap}
.todaybtn:hover{background:#E8EBF1}
.add{border:0;background:#0A7CFF;color:#fff;border-radius:999px;height:36px;padding:0 15px;font-size:13px;font-weight:650;cursor:pointer;display:inline-flex;align-items:center;gap:6px;white-space:nowrap}
.add:hover{background:#0668D8}
.pills{flex:0 0 auto;display:flex;gap:10px;padding:8px 22px 12px;overflow-x:auto;scrollbar-width:none}
.pills::-webkit-scrollbar{display:none}
.pill{flex:1 1 0;min-width:150px;display:flex;align-items:center;justify-content:center;gap:8px;height:40px;border-radius:999px;border:1.5px solid var(--pc);background:var(--pb);font-size:12.5px;font-weight:650;letter-spacing:-.005em;white-space:nowrap;overflow:hidden}
.pill.ghost{background:transparent;border:1.5px dashed #CFC7B8;color:#8B8B90;cursor:pointer;font:inherit;padding:0}
.pill.ghost .pa{background:#EFEAE0;color:#8B8B90}
.pill.ghost .plus{width:20px;height:20px;border-radius:50%;background:#007AFF;color:#fff;display:grid;place-items:center;font-size:14px;font-weight:700;line-height:1;flex:0 0 20px}
.pill.ghost .addlbl{color:#007AFF;font-weight:650;background:none;border:0;height:auto;padding:0}
.pa{width:26px;height:26px;flex:0 0 26px;border-radius:50%;overflow:hidden;background:var(--ac);display:grid;place-items:center;color:#fff;font-size:11px;font-weight:700}
.pa img{width:100%;height:100%;object-fit:cover;display:block}
.pn{overflow:hidden;text-overflow:ellipsis}
.note{margin:0 22px 10px;padding:10px 14px;border-radius:12px;background:#F4F7FB;color:#4A505E;font-size:13px;line-height:1.35;display:flex;align-items:center;gap:10px;flex:0 0 auto}
.note button{margin-left:auto;border:1px solid #D6E2F5;background:#fff;border-radius:9px;padding:6px 11px;font-size:12px;font-weight:650;cursor:pointer;white-space:nowrap}
.note.err{background:#FDECEA;color:#8A1F1A}
.grid{flex:1 1 auto;min-height:0;display:grid;grid-template-columns:repeat(var(--cols),minmax(0,1fr));gap:1px;background:var(--line);border-top:1px solid var(--line);overflow:hidden}
.day{background:#fff;display:flex;flex-direction:column;min-height:0;min-width:0}
.dh{flex:0 0 auto;display:flex;align-items:center;justify-content:center;gap:8px;padding:14px 8px 12px;border-bottom:1px solid var(--line);margin:0 14px;font-family:var(--skylight-serif,Literata,Georgia,serif);font-size:23px;font-weight:600;letter-spacing:-.01em}
.dd{font-variant-numeric:lining-nums}
.day.today .dd{background:#F66951;color:#fff;border-radius:50%;width:1.65em;height:1.65em;display:grid;place-items:center;padding-bottom:.08em}
.de{flex:1 1 auto;min-height:0;overflow-y:auto;padding:12px 12px 18px;display:flex;flex-direction:column;gap:8px;scrollbar-width:thin}
.empty{padding:26px 6px;text-align:center;font-size:13px;color:#9AA0AC}
.loading{padding:22px 6px;text-align:center;font-size:13px;color:#9AA0AC}
.ev{position:relative;min-width:0;cursor:pointer;border-radius:14px;background:var(--ev);padding:10px 42px 10px 12px;min-height:54px;display:flex;flex-direction:column;gap:3px;box-shadow:0 1px 2px rgba(31,35,40,.04)}
.evt{font-size:13.5px;font-weight:700;line-height:1.22;color:#1F2328;overflow-wrap:anywhere}
.evm{font-size:11.5px;font-weight:500;color:#3F4653;opacity:.88;line-height:1.25;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.evo{position:absolute;right:8px;bottom:8px;width:24px;height:24px;border-radius:50%;overflow:hidden;background:var(--ac);display:grid;place-items:center;color:#fff;font-size:10px;font-weight:700;box-shadow:0 0 0 1.5px #fff}
.evo img{width:100%;height:100%;object-fit:cover;display:block}
.scrim{position:fixed;inset:0;background:rgba(18,22,32,.32);backdrop-filter:blur(2px);z-index:40}
.sheet{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);width:min(460px,92vw);max-height:88vh;overflow:auto;background:#fff;border-radius:22px;box-shadow:0 24px 70px rgba(15,23,42,.28);padding:20px 20px 16px;z-index:41}
.stitle{font-family:var(--skylight-serif,Literata,Georgia,serif);font-size:22px;font-weight:600;margin:0 0 14px}
.slab{display:flex;flex-direction:column;gap:6px;font-size:12.5px;font-weight:650;color:#4A505E;margin-bottom:10px}
.slab input{border:1.5px solid #DDE3EC;border-radius:11px;height:42px;padding:0 12px;font:inherit;font-size:14.5px;font-weight:500;color:#1F2328;background:#fff;outline:none}
.slab input:focus{border-color:#0A7CFF;box-shadow:0 0 0 3px rgba(10,124,255,.12)}
.srow{display:grid;grid-template-columns:1.15fr .85fr .85fr;gap:8px}
.srow .slab{margin-bottom:8px}
.calpick{display:flex;gap:8px;flex-wrap:wrap;margin:2px 0 10px}
.calpick button{border:1.5px solid #DDE3EC;background:#fff;border-radius:999px;padding:7px 12px;font-size:12.5px;font-weight:600;cursor:pointer}
.calpick button.on{border-color:#0A7CFF;background:#EAF3FF;color:#0A5FD0}
.serr{font-size:12.5px;color:#8A1F1A;background:#FDECEA;border-radius:10px;padding:8px 10px;margin:4px 0 10px;line-height:1.35}
.sfine{font-size:11.5px;color:#8A8F9C;line-height:1.35;margin:0 0 12px}
.sbtns{display:flex;gap:8px;justify-content:flex-end}
.sbtns button{height:42px;border-radius:12px;padding:0 16px;font-size:13.5px;font-weight:650;cursor:pointer}
.sbtns .cancel{border:1px solid #DDE3EC;background:#fff}
.sbtns .go{border:0;background:#0A7CFF;color:#fff}
.sbtns .go:disabled{opacity:.45;cursor:default}.sbtns .del{border:0;background:#FDECEA;color:#B3261E}.dmeta{font-size:13.5px;line-height:1.5;color:#4A505E;margin:0 0 12px}.allrow{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:600;color:#4A505E;margin:2px 0 10px;cursor:pointer}.allrow input{width:18px;height:18px;accent-color:#0A7CFF}
@media (max-width:899px){
  .hdr{padding:8px 12px 2px;gap:6px;flex-wrap:wrap}
  .hl{flex:1 1 100%;gap:8px;min-width:0}
  .title{flex:1 1 auto;min-width:0;font-size:19px}
  .time{font-size:19px}
  .weather{font-size:15px;gap:4px}
  .hc{flex:1 1 100%;margin-left:0;justify-content:space-between;gap:5px;padding:2px 0 4px}
  .range{font-size:11px;padding:0 2px}
  .todaybtn{display:none}
  .add{height:32px;padding:0 10px;font-size:12px}
  .add .lbl{display:none}
  .nav{width:32px;height:32px}
  .pills{padding:4px 12px 8px;gap:6px}
  .pill{min-width:112px;height:32px;font-size:10.5px;gap:5px}
  .pa{width:22px;height:22px;flex:0 0 22px;font-size:9.5px}
  .grid{grid-template-columns:repeat(2,1fr);grid-auto-rows:1fr}
  .dh{font-size:17px;padding:8px 4px 7px;margin:0 8px;gap:5px}
  .de{padding:8px 8px 12px;gap:6px}
  .ev{padding:8px 36px 8px 10px;min-height:46px;border-radius:12px}
  .evt{font-size:12px}
  .evm{font-size:10.5px}
  .evo{width:21px;height:21px;right:6px;bottom:6px;font-size:9px}
  .note{margin:0 12px 8px;font-size:12px}
  .srow{grid-template-columns:1fr 1fr}
  .srow .slab:first-child{grid-column:1/-1}
}
`;

class SkylightCalendarCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._offset = 0;
    this._events = {};
    this._loading = false;
    this._loaded = false;
    this._err = '';
    this._key = '';
    this._dialog = false;
    this._draft = null;
    this._detail = null;
    this._edit = null;
    this._tick = null;
    this._dayKey = '';
    this._calSig = '';
    this._lastFetch = 0;
    this._refreshTimer = null;
  }

  connectedCallback() {
    this._render();
    if (!this._tick) this._tick = setInterval(() => this._clock(), 30000);
  }

  disconnectedCallback() {
    if (this._tick) clearInterval(this._tick);
    this._tick = null;
  }

  setConfig(cfg) {
    this._cfg = cfg || {};
    this._offset = 0;
    this._key = '';
    this._events = {};
    this._loaded = false;
    this._dialog = false;
    this._draft = null;
    this._detail = null;
    this._edit = null;
    this._render();
    this._refresh(true);
  }

  set hass(h) {
    this._hass = h;
    if (!this._cfg) return;
    const sig = this._allCals().map((id) => {
      const st = h.states && h.states[id];
      return id + ':' + (st ? st.state + '|' + st.last_updated : '');
    }).join(';');
    if (sig !== this._calSig) {
      this._calSig = sig;
      if (!this._refreshTimer) {
        this._refreshTimer = setTimeout(() => { this._refreshTimer = null; this._refresh(true); }, 350);
      }
    }
    if (this._keyFor() !== this._key) this._refresh(true);
    else this._clock();
  }

  _profiles() { return (this._cfg && this._cfg.profiles) || []; }
  /* Plusieurs calendriers par personne : `calendars` est la source, `calendar`
     reste le premier (compatibilité avec les anciennes données). */
  _cals(p) {
    const a = p && p.calendars;
    if (Array.isArray(a) && a.length) return a.filter(Boolean);
    return p && p.calendar ? [p.calendar] : [];
  }
  _allCals() {
    const out = [];
    for (const p of this._withCal()) for (const id of this._cals(p)) if (out.indexOf(id) === -1) out.push(id);
    return out;
  }
  _withCal() { return this._profiles().filter((p) => this._cals(p).length); }
  _features(p) {
    const id = this._cals(p)[0];
    const st = this._hass && this._hass.states && this._hass.states[id];
    return st && st.attributes ? Number(st.attributes.supported_features || 0) : 0;
  }
  _creatable() { return this._withCal().filter((p) => (this._features(p) & 1) !== 0); }
  _dayCount() { return Math.max(1, Math.min(7, Number(this._cfg && this._cfg.days) || 4)); }
  _start() { return addDays(startOfDay(new Date()), Number(this._offset) || 0); }
  _days() { const n = this._dayCount(); return Array.from({ length: n }, (_, i) => addDays(this._start(), i)); }
  _keyFor() { return this._allCals().join(',') + '|' + dateKey(this._start()) + '|' + this._dayCount(); }

  _time() {
    const st = this._hass && this._hass.states && this._hass.states[(this._cfg && this._cfg.time_entity) || 'sensor.heure_actuelle'];
    const v = st && String(st.state || '');
    if (/^\d{1,2}:\d{2}/.test(v)) return v.slice(0, 5);
    const d = new Date();
    return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  }

  _weather() {
    const ent = (this._cfg && this._cfg.weather_entity) || 'weather.forecast_maison';
    const st = this._hass && this._hass.states && this._hass.states[ent];
    if (!st) return '';
    const cond = String(st.state || '').replace(/^weather\./, '');
    const temp = st.attributes && st.attributes.temperature;
    const icon = WEATHER[cond] || '🌤️';
    return icon + (temp != null ? ` ${Math.round(Number(temp))}°` : '');
  }

  _face(p, size = 24) {
    const raw = String((p && p.photo) || '');
    if (raw.charAt(0) === ':') return `<span style="font-size:${Math.round(size * 0.58)}px;line-height:1">${esc(raw.slice(1))}</span>`;
    if (raw && /^(data:|https?:|\/)/.test(raw)) return `<img src="${esc(raw)}" alt="">`;
    return esc(((p && p.name) || '?').charAt(0).toUpperCase());
  }

  async _refresh(force) {
    if (!this._hass) return;
    const key = this._keyFor();
    if (!force && key === this._key) return;
    this._key = key;
    this._dayKey = dateKey(this._start());
    this._lastFetch = Date.now();
    this._calSig = this._allCals().map((id) => {
      const st = this._hass.states && this._hass.states[id];
      return id + ':' + (st ? st.state + '|' + st.last_updated : '');
    }).join(';');
    const ents = this._allCals();
    if (!ents.length) {
      this._events = {};
      this._loading = false;
      this._loaded = true;
      this._err = '';
      this._render();
      return;
    }
    if (!this._loaded) {
      this._loading = true;
      this._render();
    }
    this._err = '';
    try {
      const start = this._start();
      const end = addDays(start, this._dayCount());
      const qs = `?start=${encodeURIComponent(start.toISOString())}&end=${encodeURIComponent(end.toISOString())}`;
      let failures = 0;
      const results = await Promise.all(ents.map(async (id) => {
        try {
          const arr = await this._hass.callApi('GET', 'calendars/' + id + qs);
          if (!Array.isArray(arr)) throw new Error('réponse inattendue');
          return [id, arr];
        } catch (e) {
          failures += 1;
          return [id, []];
        }
      }));
      const next = {};
      for (const [id, arr] of results) next[id] = arr;
      this._events = next;
      if (failures === ents.length) this._err = 'Impossible de charger les calendriers reliés.';
    } catch (e) {
      this._err = (e && e.message) || 'Impossible de charger les calendriers.';
      this._events = {};
    }
    this._loaded = true;
    this._loading = false;
    this._render();
  }

  _shift(n) {
    this._offset = (Number(this._offset) || 0) + n;
    this._key = '';
    this._refresh(true);
  }

  _clock() {
    const clock = this.shadowRoot && this.shadowRoot.querySelector('[data-clock]');
    if (clock) clock.textContent = this._time();
    const w = this.shadowRoot && this.shadowRoot.querySelector('[data-weather]');
    if (w) w.textContent = this._weather();
    const today = dateKey(startOfDay(new Date()));
    if (this._dayKey && today !== this._dayKey) this._refresh(true);
    if (!this._dialog && !this._detail && Date.now() - (this._lastFetch || 0) > 60000) this._refresh(true);
  }

  _openDialog() {
    if (!this._creatable().length) return;
    const day = this._start();
    const now = new Date();
    const same = sameDay(day, now);
    const start = new Date(day);
    if (same) {
      const mins = now.getMinutes() < 30 ? 0 : 30;
      start.setHours(now.getHours(), mins, 0, 0);
    } else {
      start.setHours(9, 0, 0, 0);
    }
    const end = new Date(start);
    end.setHours(end.getHours() + 1);
    this._dialog = true;
    this._detail = null;
    this._edit = null;
    this._draft = {
      title: '',
      date: dateKey(day),
      start: timeShort(start),
      end: timeShort(end),
      profile: this._creatable()[0].id,
      allday: false,
      err: '',
    };
    this._render();
  }

  _closeDialog() {
    this._dialog = false;
    this._draft = null;
    this._detail = null;
    this._edit = null;
    this._render();
  }

  async _create() {
    const root = this.shadowRoot;
    if (!root) return;
    if (this._edit) { await this._saveEdit(); return; }
    const title = (root.getElementById('evt-title') || {}).value || '';
    const date = (root.getElementById('evt-date') || {}).value || '';
    const start = (root.getElementById('evt-start') || {}).value || '';
    const end = (root.getElementById('evt-end') || {}).value || '';
    const allday = !!(root.getElementById('evt-allday') || {}).checked;
    const profs = this._creatable();
    const prof = profs.find((p) => p.id === (this._draft && this._draft.profile)) || profs[0];
    this._draft = { title, date, start, end, allday, profile: prof ? prof.id : '', err: '' };
    if (!title.trim()) { this._draft.err = 'Donnez un titre à l’événement.'; this._render(); return; }
    if (!date) { this._draft.err = 'Renseignez la date.'; this._render(); return; }
    if (!prof) { this._draft.err = 'Aucun calendrier ne permet la création.'; this._render(); return; }
    let data;
    if (allday) {
      const d0 = parseWhen(date);
      if (!d0) { this._draft.err = 'Date invalide.'; this._render(); return; }
      data = {
        entity_id: this._cals(prof)[0],
        summary: title.trim(),
        start_date: date,
        end_date: dateKey(addDays(d0, 1)),
      };
    } else {
      if (!start || !end) { this._draft.err = 'Renseignez les heures.'; this._render(); return; }
      const s = new Date(`${date}T${start}:00`);
      const e = new Date(`${date}T${end}:00`);
      if (!(s.getTime() && e.getTime()) || e <= s) { this._draft.err = 'L’heure de fin doit être après le début.'; this._render(); return; }
      data = {
        entity_id: this._cals(prof)[0],
        summary: title.trim(),
        start_date_time: s.toISOString(),
        end_date_time: e.toISOString(),
      };
    }
    try {
      await this._hass.callService('calendar', 'create_event', data);
      this._dialog = false;
      this._draft = null;
      this._key = '';
      await this._refresh(true);
    } catch (err) {
      this._draft.err = (err && err.message) || 'Création impossible sur ce calendrier.';
      this._render();
    }
  }

  async _saveEdit() {
    const root = this.shadowRoot;
    if (!root || !this._edit) return;
    const item = this._edit.item;
    const ev = item.ev;
    const title = (root.getElementById('evt-title') || {}).value || '';
    const date = (root.getElementById('evt-date') || {}).value || '';
    const start = (root.getElementById('evt-start') || {}).value || '';
    const end = (root.getElementById('evt-end') || {}).value || '';
    const allday = !!(root.getElementById('evt-allday') || {}).checked;
    this._draft = { title, date, start, end, allday, profile: item.prof.id, err: '' };
    if (!title.trim()) { this._draft.err = 'Donnez un titre à l’événement.'; this._render(); return; }
    if (!date) { this._draft.err = 'Renseignez la date.'; this._render(); return; }
    let sIso;
    let eIso;
    if (allday) {
      const d0 = parseWhen(date);
      if (!d0) { this._draft.err = 'Date invalide.'; this._render(); return; }
      sIso = date;
      eIso = dateKey(addDays(d0, 1));
    } else {
      if (!start || !end) { this._draft.err = 'Renseignez les heures.'; this._render(); return; }
      const s = new Date(`${date}T${start}:00`);
      const e = new Date(`${date}T${end}:00`);
      if (!(s.getTime() && e.getTime()) || e <= s) { this._draft.err = 'L’heure de fin doit être après le début.'; this._render(); return; }
      sIso = s.toISOString();
      eIso = e.toISOString();
    }
    try {
      const payload = {
        type: 'skylight_hub_family/cal_event',
        op: 'update',
        entity_id: item.entity || item.prof.calendar,
        uid: ev.uid || '',
        summary: title.trim(),
        start: sIso,
        end: eIso,
        allday,
      };
      if (!ev.uid) {
        payload.match_summary = ev.summary || '';
        payload.match_start = item.allday
          ? dateKey(item.s)
          : dateKey(item.s) + 'T' + timeShort(item.s) + ':00';
      }
      if (ev.rrule && this._edit.scope === 'one') {
        payload.recurrence_id = item.allday
          ? dateKey(item.s)
          : dateKey(item.s) + 'T' + timeShort(item.s) + ':00';
      }
      await this._hass.callWS(payload);
      this._dialog = false;
      this._draft = null;
      this._edit = null;
      this._detail = null;
      this._key = '';
      await this._refresh(true);
    } catch (err) {
      this._draft.err = (err && err.message) || 'Modification impossible sur ce calendrier.';
      this._render();
    }
  }

  _dayEvents(day) {
    const out = [];
    for (const p of this._withCal()) {
      for (const entity of this._cals(p)) {
      const evs = this._events[entity] || [];
      for (const ev of evs) {
        const allDay = isAllDayRaw(ev.start);
        const s = parseWhen(whenRaw(ev.start));
        const e = parseWhen(whenRaw(ev.end)) || (s ? addDays(s, 1) : null);
        if (!s) continue;
        const visible = allDay ? (s <= day && (!e || day < e)) : sameDay(s, day);
        if (!visible) continue;
        out.push({ ev, prof: p, entity, allDay, s, e });
      }
      }
    }
    out.sort((a, b) => {
      if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
      return (a.s ? a.s.getTime() : 0) - (b.s ? b.s.getTime() : 0);
    });
    return out;
  }

  _eventHtml(item, idx) {
    const { ev, prof, allDay, s, e } = item;
    const when = allDay ? 'Toute la journée' : `${timeShort(s)} – ${timeShort(e || s)}`;

    return `<article class="ev" data-ev="${idx}" role="button" tabindex="0" style="--ev:${esc(prof.pastel || '#EAF1FC')};--ac:${esc(prof.accent || prof.color || '#7A8596')}">
      <div class="evt">${esc(ev.summary || 'Sans titre')}</div>
      <div class="evm">${esc(when)}</div>
      <span class="evo">${this._face(prof, 24)}</span>
    </article>`;
  }

  _render() {
    if (!this._cfg) return;
    const root = this.shadowRoot;
    if (!root) return;
    const title = this._cfg.title || 'Famille';
    const days = this._days();
    const today = startOfDay(new Date());
    const withCal = this._withCal();
    const range = (() => {
      const a = days[0];
      const b = days[days.length - 1];
      return `${a.getDate()} ${FR_MONTHS[a.getMonth()]} – ${b.getDate()} ${FR_MONTHS[b.getMonth()]}`;
    })();
    const pills = this._profiles().map((p) => {
      const style = `--pb:${esc(p.pastel || '#F1F3F6')};--pc:${esc(p.pastel || '#E3E7EE')};--ac:${esc(p.accent || p.color || '#7A8596')}`;
      if (this._cals(p).length) {
        return `<div class="pill" style="${style}"><span class="pa">${this._face(p, 26)}</span><span class="pn">${esc(p.name || '')}</span></div>`;
      }
      /* Sans calendrier : c'est une action, pas un état. Un tap ouvre la
         configuration des calendriers sur cette personne. */
      return `<button class="pill ghost" type="button" data-addcal="${esc(p.id)}" style="${style}" aria-label="Ajouter un calendrier à ${esc(p.name || '')}">
        <span class="pa">${this._face(p, 26)}</span><span class="pn">${esc(p.name || '')}</span><span class="plus">+</span><span class="addlbl">Ajouter</span></button>`;
    }).join('');
    const note = this._err
      ? `<div class="note err">${esc(this._err)}</div>`
      : (withCal.length ? '' : `<div class="note">Aucun calendrier relié à un profil.<button data-profiles type="button">Ouvrir Profils</button></div>`);
    this._evIndex = [];
    const dayHtml = days.map((d) => {
      const items = this._dayEvents(d);
      const isToday = sameDay(d, today);
      return `<section class="day${isToday ? ' today' : ''}">
        <div class="dh"><span class="dn">${dayShort(d)}</span><span class="dd">${d.getDate()}</span></div>
        <div class="de">${this._loading ? '<div class="loading">Chargement…</div>' : (items.length ? items.map((it) => { const idx = this._evIndex.push(it) - 1; return this._eventHtml(it, idx); }).join('') : '<div class="empty">Aucun événement</div>')}</div>
      </section>`;
    }).join('');

    const sheet = this._dialog ? this._dialogHtml(this._creatable()) : (this._detail ? this._detailHtml() : '');
    root.innerHTML = `<style>${CSS}</style>
      <div class="app">
        <div class="hdr">
          <div class="hl"><h1 class="title">${esc(title)}</h1><span class="time" data-clock>${esc(this._time())}</span><span class="weather" data-weather>${esc(this._weather())}</span></div>
          <div class="hc">
            <button class="nav" data-prev type="button" aria-label="Jours précédents"><svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg></button>
            <span class="range">${esc(range)}</span>
            <button class="nav" data-next type="button" aria-label="Jours suivants"><svg viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg></button>
            <button class="todaybtn" data-today type="button">Aujourd’hui</button>
            ${this._creatable().length ? `<button class="add" data-add type="button"><span style="font-size:16px;line-height:1">+</span><span class="lbl">Ajouter</span></button>` : ''}
          </div>
        </div>
        ${pills ? `<div class="pills">${pills}</div>` : ''}
        ${note}
        <div class="grid" style="--cols:${days.length}">${dayHtml}</div>
      </div>
      ${sheet}`;
    this._bind();
  }

  _dialogHtml(withCal) {
    const d = this._draft || {};
    const edit = !!this._edit;
    const profs = withCal.map((p) => `<button type="button" class="${p.id === d.profile ? 'on' : ''}" data-cal="${esc(p.id)}">${esc(p.name || '')}</button>`).join('');
    return `<div class="scrim" data-close></div>
      <div class="sheet" role="dialog" aria-modal="true" aria-label="${edit ? 'Modifier l’événement' : 'Nouvel événement'}">
        <h2 class="stitle">${edit ? 'Modifier l’événement' : 'Nouvel événement'}</h2>
        <label class="slab">Titre<input id="evt-title" maxlength="80" placeholder="Rendez-vous, école…" value="${esc(d.title || '')}"></label>
        <div class="srow">
          <label class="slab">Date<input id="evt-date" type="date" value="${esc(d.date || '')}"></label>
          <label class="slab">Début<input id="evt-start" type="time" value="${esc(d.start || '')}"></label>
          <label class="slab">Fin<input id="evt-end" type="time" value="${esc(d.end || '')}"></label>
        </div>
        <label class="allrow"><input type="checkbox" id="evt-allday"${d.allday ? ' checked' : ''}> Toute la journée</label>
        ${edit && this._edit.item.ev.rrule ? `<label class="slab">Appliquer à</label>
          <div class="calpick scopepick">
            <button type="button" class="${(this._edit.scope || 'one') === 'one' ? 'on' : ''}" data-scope="one">Cette occurrence</button>
            <button type="button" class="${this._edit.scope === 'all' ? 'on' : ''}" data-scope="all">Toute la série</button>
          </div>` : ''}
        ${edit ? '' : `<label class="slab">Calendrier</label><div class="calpick">${profs}</div>`}
        ${d.err ? `<div class="serr">${esc(d.err)}</div>` : ''}
        <p class="sfine">${edit ? 'La modification est écrite dans le calendrier d’origine.' : 'Création sur un calendrier relié. Google/Apple peuvent refuser la création depuis Home Assistant.'}</p>
        <div class="sbtns"><button class="cancel" type="button" data-close>Annuler</button><button class="go" type="button" data-create>${edit ? 'Enregistrer' : 'Créer'}</button></div>
      </div>`;
  }

  _openDetail(idx) {
    const item = this._evIndex && this._evIndex[idx];
    if (!item) return;
    this._dialog = false;
    this._draft = null;
    this._edit = null;
    this._detail = { item, confirm: false, err: '' };
    this._render();
  }

  _openEdit() {
    const d = this._detail;
    if (!d || !d.item) return;
    const { ev, prof, allDay, s, e } = d.item;
    /* Par défaut on modifie UNE occurrence (moins destructif) ; le sélecteur
       permet d'appliquer à toute la série. */
    this._edit = { item: d.item, scope: 'one' };
    this._detail = null;
    this._dialog = true;
    this._draft = {
      title: ev.summary || '',
      date: dateKey(s),
      start: timeShort(s),
      end: timeShort(e || s),
      profile: prof.id,
      allday: allDay,
      err: '',
    };
    this._render();
  }

  _detailHtml() {
    const d = this._detail;
    if (!d || !d.item) return '';
    const { ev, prof, allDay, s, e } = d.item;
    const when = allDay ? 'Toute la journée' : `${timeShort(s)} – ${timeShort(e || s)}`;
    const loc = ev.location ? `<br>${esc(ev.location)}` : '';
    return `<div class="scrim" data-close></div>
      <div class="sheet" role="dialog" aria-modal="true" aria-label="Événement">
        <h2 class="stitle">${esc(ev.summary || 'Sans titre')}</h2>
        <div class="dmeta">${esc(when)}<br>${esc(prof.name || '')}${loc}</div>
        ${d.err ? `<div class="serr">${esc(d.err)}</div>` : ''}
        ${ev.rrule ? '<p class="sfine">Événement récurrent : la modification porte sur toute la série ; la suppression peut ne viser qu’une occurrence.</p>' : ''}
        ${d.confirm ? `<p class="sfine">${ev.rrule ? 'Supprimer seulement cette occurrence, ou toute la série ?' : 'Supprimer cet événement ?'}</p>` : ''}
        <div class="sbtns">${d.confirm
          ? (ev.rrule
            ? '<button class="cancel" data-close type="button">Annuler</button><button class="del" data-del-one type="button">Cette occurrence</button><button class="del" data-del-all type="button">Toute la série</button>'
            : '<button class="cancel" data-close type="button">Annuler</button><button class="del" data-del-all type="button">Confirmer</button>')
          : '<button class="cancel" data-close type="button">Fermer</button><button class="cancel" data-edit-event type="button">Modifier</button><button class="del" data-del type="button">Supprimer</button>'}</div>
      </div>`;
  }

  async _deleteDetail(scope) {
    const d = this._detail;
    if (!d || !d.item) return;
    const ev = d.item.ev;
    /* HA n'expose pas l'uid des événements CalDAV : dans ce cas l'API retrouve
       l'événement côté serveur par son titre + son début. */
    const payload = { type: 'skylight_hub_family/cal_event', op: 'delete', entity_id: d.item.entity || d.item.prof.calendar, uid: ev.uid || '' };
    if (!ev.uid) {
      payload.match_summary = ev.summary || '';
      payload.match_start = d.item.allday
        ? dateKey(d.item.s)
        : dateKey(d.item.s) + 'T' + timeShort(d.item.s) + ':00';
    }
    /* `scope === 'one'` : on envoie le début de l'occurrence affichée ; l'API
       l'exclut de la série (EXDATE) au lieu de supprimer l'événement entier. */
    if (scope === 'one' && ev.rrule) {
      const day = dateKey(d.item.s);
      payload.recurrence_id = d.item.allday ? day : day + 'T' + timeShort(d.item.s) + ':00';
    } else if (ev.recurrence_id) {
      payload.recurrence_id = ev.recurrence_id;
    }
    try {
      await this._hass.callWS(payload);
      this._detail = null;
      this._key = '';
      await this._refresh(true);
    } catch (err) {
      d.err = (err && err.message) || 'Suppression impossible sur ce calendrier.';
      this._render();
    }
  }

  _bind() {
    const root = this.shadowRoot;
    if (!root) return;
    const on = (sel, ev, fn) => root.querySelectorAll(sel).forEach((el) => el.addEventListener(ev, fn));
    on('[data-prev]', 'click', () => this._shift(-this._dayCount()));
    on('[data-next]', 'click', () => this._shift(this._dayCount()));
    on('[data-today]', 'click', () => { this._offset = 0; this._key = ''; this._refresh(true); });
    on('[data-add]', 'click', () => this._openDialog());
    on('[data-close]', 'click', () => this._closeDialog());
    on('[data-create]', 'click', () => this._create());
    on('[data-ev]', 'click', (e) => this._openDetail(Number(e.currentTarget.getAttribute('data-ev'))));
    on('[data-edit-event]', 'click', () => this._openEdit());
    on('[data-scope]', 'click', (e) => {
      if (!this._edit) return;
      this._edit.scope = e.currentTarget.getAttribute('data-scope');
      root.querySelectorAll('[data-scope]').forEach((b) => {
        b.classList.toggle('on', b.getAttribute('data-scope') === this._edit.scope);
      });
    });
    on('[data-del]', 'click', () => {
      if (!this._detail) return;
      if (!this._detail.confirm) { this._detail.confirm = true; this._render(); return; }
      this._deleteDetail('all');
    });
    on('[data-del-one]', 'click', () => this._deleteDetail('one'));
    on('[data-del-all]', 'click', () => this._deleteDetail('all'));
    const allday = root.getElementById('evt-allday');
    if (allday) {
      const sync = () => root.querySelectorAll('#evt-start,#evt-end').forEach((el) => {
        el.disabled = allday.checked;
        el.style.opacity = allday.checked ? '.4' : '1';
      });
      allday.addEventListener('change', sync);
      sync();
    }
    on('[data-addcal]', 'click', (e) => {
      const id = e.currentTarget.getAttribute('data-addcal');
      const p = this._profiles().find((x) => x.id === id);
      this.dispatchEvent(new CustomEvent('skylight-calendar-config', {
        detail: { profile: id, name: (p && p.name) || '' },
        bubbles: true,
        composed: true,
      }));
    });
    on('[data-profiles]', 'click', () => {
      try { window.dispatchEvent(new CustomEvent('skylight-navigate', { detail: { view: 'profils' } })); } catch (e) { /* ignore */ }
    });
    on('[data-cal]', 'click', (e) => {
      const id = e.currentTarget.getAttribute('data-cal');
      if (this._draft) this._draft.profile = id;
      root.querySelectorAll('[data-cal]').forEach((b) => b.classList.toggle('on', b === e.currentTarget));
    });
  }
}

if (!customElements.get('skylight-hub-calendar-card')) {
  customElements.define('skylight-hub-calendar-card', SkylightCalendarCard);
}
