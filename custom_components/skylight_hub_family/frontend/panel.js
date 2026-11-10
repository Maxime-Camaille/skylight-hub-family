/* Skylight Hub Family — panneau applicatif (v0.3.0)
 *
 * Page plein écran enregistrée par l'intégration `famille`. Elle réutilise le
 * tronc commun (barre, jetons, profils) et monte les cartes réelles SANS
 * Lovelace : les modules sont importés directement.
 *
 * Principe : pour chaque vue, on lit la configuration de la carte dans le
 * dashboard `famille-home` (on déballe la coque si la vue en a une), puis on
 * monte cette carte telle quelle. Une seule mécanique pour les six vues.
 * C'est une transition : ces configurations deviendront des réglages de l'app.
 */

const CORE_URL = '/skylight-static/famille-core.js?v=0.5.0';
const DASH = 'famille-home';
const PROFILES = 'todo.profils';

const FALLBACK = {
  'daylight-calendar-card': '/hacsfiles/daylight-calendar-card/skylight-calendar-card.js',
  'skylight-tasks-card': '/local/v68/skylight-tasks-card.js?v=33',
};

let CORE = null;
const ready = import(CORE_URL).then((m) => { CORE = m; return m; }).catch(() => null);

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function toDataUri(url) {
  if (!url) return Promise.resolve(null);
  if (String(url).indexOf('data:') === 0) return Promise.resolve(url);
  return fetch(url, { credentials: 'same-origin' })
    .then((r) => r.blob())
    .then((b) => new Promise((res) => {
      const fr = new FileReader();
      fr.onload = () => res(fr.result);
      fr.onerror = () => res(null);
      fr.readAsDataURL(b);
    }))
    .catch(() => null);
}

const CSS = `
@import url("https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700&family=Literata:opsz,wght@7..72,400;7..72,600&display=block");
:host{--skylight-sans:Figtree,system-ui,-apple-system,"Segoe UI",sans-serif;
  --skylight-serif:Literata,"Iowan Old Style",Georgia,serif;
  display:block;height:100vh;overflow:hidden;background:#fff;color:#1F2328;
  font-family:var(--skylight-sans)}
.app{display:flex;height:100vh;overflow:hidden;background:#fff}
/* En kiosque, l'app se pose par-dessus la mise en page de HA : masquer la
   sidebar ne suffit pas, son conteneur garde une colonne de 255 px. */
:host(.skylight-kiosk){position:fixed;inset:0;width:100vw;height:100vh;z-index:9999}
.main{flex:1 1 auto;min-width:0;height:100%;display:flex;flex-direction:column;overflow:hidden}
.body{position:relative;flex:1 1 auto;min-height:0;overflow:hidden}
.view{position:absolute;inset:0;display:none}
.view.on{display:block}
.placeholder{height:100%;display:grid;place-items:center;padding:32px;text-align:center;color:#8A8F9C;font-size:14px;line-height:1.5}
.err{padding:24px;color:#D9534F;font-size:13px;line-height:1.5}
.loading{height:100%;display:grid;place-items:center;color:#8A8F9C;font-size:13px}
.logo img{width:100%;height:100%;display:block;object-fit:cover;border-radius:inherit}
/* Le tronc commun ne bascule contour/plein que sous 900 px : sur grand écran,
   les deux dessins s'afficheraient l'un sous l'autre. */
.rail .ri svg.fl,.tabbar .ri svg.fl{display:none}
.rail .ri.on svg.fl,.tabbar .ri.on svg.fl{display:block}
.rail .ri.on svg.ov,.tabbar .ri.on svg.ov{display:none}
/* ---------- écran d'accueil ---------- */
.onb{height:100vh;display:grid;place-items:center;background:linear-gradient(180deg,#f7f9fc,#eef2f8);padding:24px;box-sizing:border-box;overflow:auto}
.onb-card{width:min(560px,100%);background:#fff;border-radius:24px;box-shadow:0 18px 50px rgba(20,24,40,.12);padding:28px 26px 22px;box-sizing:border-box}
.onb-card h1{font-family:var(--skylight-serif,Georgia,serif);font-size:25px;margin:0 0 10px;line-height:1.2}
.onb-card p{font-size:14px;line-height:1.55;color:#5A6074;margin:0 0 18px}
.onb-card .ico{width:64px;height:64px;border-radius:18px;display:block;margin:0 0 18px}
.onb-card label{display:block;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#8A8F9C;margin:0 0 6px}
.onb-card input{width:100%;box-sizing:border-box;border:1px solid #E2E6EE;border-radius:14px;padding:13px 14px;font:inherit;font-size:16px;margin-bottom:14px}
.onb-card .btn{width:100%;border:0;border-radius:14px;padding:14px;font:inherit;font-size:15px;font-weight:600;background:#007AFF;color:#fff;margin-top:8px;cursor:pointer}
.onb-card .btn.ghost{background:#F1F4F8;color:#2B2F38}
.onb-card .btn:disabled{opacity:.4;cursor:default}
.onb-card .row{display:flex;gap:8px;align-items:flex-start}
.onb-card .row input{margin-bottom:0}
.onb-card .row .btn{width:auto;padding:13px 18px;margin-top:0}
.onb-card .check{display:flex;gap:8px;align-items:center;font-size:13.5px;color:#2B2F38;margin:0 0 14px;text-transform:none;letter-spacing:0}
.onb-card .check input{width:auto;margin:0}
.swatches{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0 16px}
.sw{width:30px;height:30px;border-radius:50%;border:2px solid transparent;cursor:pointer;padding:0}
.sw.on{border-color:#1F2328}
.people{list-style:none;padding:0;margin:0 0 14px;display:grid;gap:8px}
.people li{display:flex;align-items:center;gap:10px;background:#F6F8FB;border-radius:12px;padding:8px 12px;font-size:14px}
.people .dot{width:22px;height:22px;border-radius:50%;flex:0 0 22px}
.people .rm{margin-left:auto;border:0;background:none;color:#B0B6C2;font-size:20px;line-height:1;cursor:pointer}
.onb-err{background:#FDECEA;color:#8A1F1A;border-radius:12px;padding:10px 12px;font-size:13px;margin:0 0 14px}
/* ---------- v2 : pages provisoires ---------- */
.v2page{height:100%;overflow:auto;padding:28px 24px;box-sizing:border-box}
.v2page h1{font-family:var(--skylight-serif,Georgia,serif);font-size:26px;margin:0 0 6px}
.v2note{font-size:12.5px;color:#8A8F9C;margin:16px 0 0;line-height:1.5}
.v2list{list-style:none;padding:0;margin:18px 0 0;display:grid;gap:8px;max-width:720px}
.v2list li{display:flex;align-items:center;gap:12px;background:#F6F8FB;border-radius:14px;padding:12px 16px;font-size:15px}
.v2list .dot{width:26px;height:26px;border-radius:50%;flex:0 0 26px}
.v2list .cal{margin-left:auto;font-size:12px;color:#8A8F9C;font-family:ui-monospace,monospace}
.v2empty{color:#8A8F9C;margin:18px 0}
`;

class FamillePanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._built = false;
    this._view = 'calendrier';
    this._mounted = {};
    this._profiles = [];
    this._cfgs = {};
  }

  set panel(v) { this._panel = v; }
  set route(v) { this._route = v; }
  set narrow(v) { this._narrow = v; }

  _trace(msg) {
    try { (window.__familleTrace = window.__familleTrace || []).push(String(msg)); } catch (e) { /* ignore */ }
  }

  set hass(h) {
    this._hass = h;
    this._proxy = null;
    if (!this._built) { this._built = true; this._init(); }
    const ph = this._appHass();
    for (const m of Object.values(this._mounted)) {
      if (m && m.el) { try { m.el.hass = ph; } catch (e) { /* ignore */ } }
    }
    this._syncKiosk();
  }

  /* ---------- mode kiosque ----------
   * Kiosk Mode est un plugin Lovelace : il n'est pas chargé sur un panneau, et
   * sa règle vit dans la configuration d'un dashboard — elle ne peut donc rien
   * faire ici. On masque nous-mêmes la barre de HA, dans le shadow root qui la
   * contient, et on retire la règle en quittant la page. */
  _drawerRoot() {
    if (this._kioskRoot) return this._kioskRoot;
    const seen = [];
    const walk = (r) => {
      try {
        r.querySelectorAll('*').forEach((n) => {
          if (n.tagName === 'HA-DRAWER' || n.tagName === 'HA-SIDEBAR') seen.push(n);
          if (n.shadowRoot) walk(n.shadowRoot);
        });
      } catch (e) { /* ignore */ }
    };
    walk(document);
    const first = seen[0];
    this._kioskRoot = first ? first.getRootNode() : null;
    return this._kioskRoot;
  }

  _syncKiosk() {
    const on = !!(this._app && this._app.kiosk);
    if (on === this._kioskOn) return;
    this._kioskOn = on;
    this.classList.toggle('skylight-kiosk', on);
    const root = this._drawerRoot();
    if (!root || !root.getElementById) return;
    let style = root.getElementById('skylight-kiosk');
    if (!on) {
      if (style) style.remove();
      return;
    }
    if (!style) {
      style = document.createElement('style');
      style.id = 'skylight-kiosk';
      root.appendChild(style);
    }
    style.textContent = 'ha-sidebar{display:none!important}'
      + 'ha-drawer{--mdc-drawer-width:0px!important}';
  }

  _removeKiosk() {
    try {
      this.classList.remove('skylight-kiosk');
      const root = this._kioskRoot;
      const style = root && root.getElementById ? root.getElementById('skylight-kiosk') : null;
      if (style) style.remove();
      this._kioskOn = null;
    } catch (e) { /* ignore */ }
  }

  disconnectedCallback() {
    this._removeKiosk();
    if (this._onLoc) window.removeEventListener('location-changed', this._onLoc);
    if (this._onNav) window.removeEventListener('skylight-navigate', this._onNav);
  }

  async _init() {
    await ready;
    if (!CORE) {
      this.shadowRoot.innerHTML = `<div class="err">Tronc commun introuvable (${esc(CORE_URL)}).</div>`;
      return;
    }
    this._paint();
    /* Les cartes sont du code d'époque dashboard : certaines poussent l'URL
       `/famille-home/<vue>`. Dans la V2, on ne quitte pas l'app : on change de
       vue et on remet l'URL du panneau. */
    this._onLoc = () => {
      if (!this.isConnected) return;
      const m = String(location.pathname).match(/^\/famille-home(?:\/([^/?#]+))?/);
      if (!m) return;
      try { history.replaceState(null, '', '/skylight'); } catch (e) { /* ignore */ }
      this._show(m[1] || 'calendrier');
    };
    window.addEventListener('location-changed', this._onLoc);
    this._onNav = (e) => {
      const v = e && e.detail && e.detail.view;
      if (v) this._show(v);
    };
    window.addEventListener('skylight-navigate', this._onNav);
    await this._load();
    if (!this._app || !this._app.onboarding_done) { this._renderOnboarding(); return; }
    await this._show(this._view);
  }

  /* ---------- coquille ---------- */

  _items() {
    return CORE.NAV.map((n) => Object.assign({}, n, {
      view: n.view || String(n.path || '').split('/').pop(),
    }));
  }

  _btn(n) {
    const ic = CORE.NAV_ICON[n.icon] || CORE.NAV_ICON.check;
    const on = n.view === this._view;
    return `<button class="ri${on ? ' on' : ''}" type="button" data-view="${esc(n.view)}" aria-current="${on ? 'page' : 'false'}">${ic.o}${ic.f}<span class="tx">${esc(n.label)}</span></button>`;
  }

  _paint() {
    const items = this._items();
    const main = items.filter((n) => !n.last);
    const bottom = items.filter((n) => n.last);
    this.shadowRoot.innerHTML = `<style>${CORE.coreCss()}
${CORE.NAV_CSS}
${CSS}</style>
      <div class="app">
        <nav class="rail" aria-label="Navigation">
          <div class="logo"><img src="/skylight-static/icon.png" alt="Skylight Hub Family"></div>
          ${main.map((n) => this._btn(n)).join('')}
          ${bottom.length ? `<div class="sp"></div><div class="rule"></div>${bottom.map((n) => this._btn(n)).join('')}` : ''}
        </nav>
        <div class="main">
          <div class="body" id="body"><div class="loading">Chargement…</div></div>
        </div>
        <nav class="tabbar" aria-label="Navigation">${items.map((n) => this._btn(n)).join('')}</nav>
      </div>`;
    this.shadowRoot.querySelectorAll('button[data-view]').forEach((b) => {
      b.addEventListener('click', () => this._show(b.dataset.view));
    });
  }

  _active() {
    this.shadowRoot.querySelectorAll('button[data-view]').forEach((b) => {
      const on = b.dataset.view === this._view;
      b.classList.toggle('on', on);
      b.setAttribute('aria-current', on ? 'page' : 'false');
    });
  }

  /* ---------- écran d'accueil ---------- */

  _renderOnboarding() {
    this.shadowRoot.innerHTML = `<style>${CORE.coreCss()}${CSS}</style>
      <div class="onb"><div class="onb-card" id="onb"></div></div>`;
    this._ob = { step: 0, family: '', people: [], fresh: false, color: '#2E9E63', cal: true, err: null };
    this._obPaint();
  }

  _obPaint() {
    const el = this.shadowRoot.getElementById('onb');
    if (!el) return;
    const ob = this._ob;
    const existing = !!(this._app && this._app.existing);
    const colors = ['#2E9E63', '#D9548C', '#4677A8', '#A9762F', '#7C5CBF', '#C0392B', '#E07B39', '#4A5464'];

    if (ob.step === 0) {
      el.innerHTML = `<img class="ico" src="/skylight-static/icon.png" alt="">
        <h1>Bienvenue dans Skylight Hub Family</h1>
        <p>Cette application garde ses données chez vous, dans Home Assistant — sans créer de listes, de compteurs ni d'automatisations. Tout reste local.</p>
        <button class="btn" id="go" type="button">Commencer</button>`;
      el.querySelector('#go').addEventListener('click', () => { ob.step = existing ? 1 : 2; this._obPaint(); });
      return;
    }

    if (ob.step === 1) {
      el.innerHTML = `<h1>Des données existent déjà</h1>
        <p>Cette installation contient déjà des listes ou des profils Skylight. Vous pouvez les réutiliser, ou repartir de zéro : l'application créera alors ses propres objets, sans toucher aux anciens.</p>
        <button class="btn" id="reuse" type="button">Réutiliser mes données</button>
        <button class="btn ghost" id="fresh" type="button">Repartir de zéro (créer de nouveaux objets)</button>`;
      el.querySelector('#reuse').addEventListener('click', () => { ob.fresh = false; ob.step = 2; this._obPaint(); });
      el.querySelector('#fresh').addEventListener('click', () => { ob.fresh = true; ob.step = 2; this._obPaint(); });
      return;
    }

    if (ob.step === 2) {
      el.innerHTML = `<h1>Votre famille</h1>
        <p>Quel nom voulez-vous donner à ce foyer ?</p>
        <label>Nom de la famille</label>
        <input id="fam" maxlength="40" value="${esc(ob.family)}" placeholder="Ma famille">
        <button class="btn" id="go" type="button">Continuer</button>`;
      const inp = el.querySelector('#fam');
      inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') el.querySelector('#go').click(); });
      el.querySelector('#go').addEventListener('click', () => {
        ob.family = inp.value.trim() || 'Ma famille';
        ob.step = 3;
        this._obPaint();
      });
      setTimeout(() => inp.focus(), 30);
      return;
    }

    const list = ob.people.map((p, i) => `<li><span class="dot" style="background:${p.color}"></span>${esc(p.name)}<button class="rm" data-rm="${i}" type="button" aria-label="Retirer">×</button></li>`).join('');
    el.innerHTML = `<h1>Qui vit ici ?</h1>
      <p>Ajoutez les personnes du foyer. Vous pourrez en ajouter d'autres plus tard depuis l'écran Profils.</p>
      ${list ? `<ul class="people">${list}</ul>` : ''}
      <label>Prénom</label>
      <div class="row"><input id="pname" maxlength="20" placeholder="Prénom"><button class="btn" id="add" type="button">Ajouter</button></div>
      <div class="swatches" id="sw">${colors.map((c) => `<button class="sw${c === ob.color ? ' on' : ''}" type="button" data-color="${c}" style="background:${c}" aria-label="${c}"></button>`).join('')}</div>
      <label class="check"><input type="checkbox" id="cal" ${ob.cal ? 'checked' : ''}> Créer un calendrier par personne</label>
      ${ob.err ? `<div class="onb-err">${esc(ob.err)}</div>` : ''}
      <button class="btn" id="finish" type="button" ${ob.people.length ? '' : 'disabled'}>Terminer l'installation</button>`;

    el.querySelectorAll('.sw').forEach((b) => b.addEventListener('click', () => {
      ob.color = b.dataset.color;
      el.querySelectorAll('.sw').forEach((x) => x.classList.toggle('on', x === b));
    }));
    el.querySelectorAll('.rm').forEach((b) => b.addEventListener('click', () => {
      ob.people.splice(Number(b.dataset.rm), 1);
      this._obPaint();
    }));
    const name = el.querySelector('#pname');
    const cal = el.querySelector('#cal');
    cal.addEventListener('change', () => { ob.cal = cal.checked; });
    const add = () => {
      const v = name.value.trim();
      if (!v) return;
      ob.people.push({ name: v, color: ob.color, create_calendar: ob.cal });
      name.value = '';
      this._obPaint();
    };
    el.querySelector('#add').addEventListener('click', add);
    name.addEventListener('keydown', (e) => { if (e.key === 'Enter') add(); });
    el.querySelector('#finish').addEventListener('click', () => this._obFinish());
    setTimeout(() => name.focus(), 30);
  }

  async _obFinish() {
    const ob = this._ob;
    const btn = this.shadowRoot.getElementById('finish');
    if (btn) btn.disabled = true;
    const existing = !!(this._app && this._app.existing);
    try {
      const res = await this._hass.callWS({
        type: 'skylight_hub_family/onboard',
        family_name: ob.family || 'Ma famille',
        people: ob.people.map((p) => ({
          name: p.name,
          color: p.color,
          create_calendar: !!p.create_calendar,
        })),
        keep: !ob.fresh && existing && ob.people.length === 0,
      });
      const report = res || {};
      if (report.ok === false) {
        ob.err = 'L\'installation a renvoyé une erreur.';
        this._obPaint();
        return;
      }
      this._mounted = {};
      await this._load();
      this._paint();
      await this._show(this._view);
    } catch (e) {
      ob.err = 'Installation impossible : ' + ((e && e.message) || e);
      this._obPaint();
    }
  }

  /* ---------- données ---------- */

  async _load() {
    /* 1. La configuration de l'application : réglages, listes, repas, profils.
       C'est la seule source de vérité — plus aucun dashboard n'est requis. */
    let app = null;
    try {
      app = await this._hass.callWS({ type: 'skylight_hub_family/config' });
    } catch (e) {
      this._trace('app-err ' + (e && e.message));
    }
    this._app = app || {};
    this._profiles = (app && app.profiles) || [];

    /* 2. Plus de repli sur un dashboard : chez un nouvel arrivant il n'existe
       pas, et une application qui marche ici mais pas là-bas ne vaut rien. */
    const inner = null;

    this._cfgs = this._buildConfigs(this._app, this._profiles, inner);
    this._trace('cfgs:' + Object.keys(this._cfgs).join(','));
    this._applyProfiles();
  }

  /* Fabrique la configuration de chaque vue à partir des réglages de l'app. */
  _buildConfigs(app, profiles, inner) {
    const lists = (app && app.lists) || {};
    const meals = (app && app.meals) || {};
    const time = (app && app.time_entity) || 'sensor.heure_actuelle';
    const weather = (app && app.weather_entity) || 'weather.forecast_maison';
    const stars = (app && app.stars_per_task) || 10;
    const evening = (app && app.evening_from) || 16;
    const profs = (profiles || []).map((p) => ({
      id: p.id, name: p.name, color: p.color, accent: p.accent,
      routine_entity: p.routine_entity, photo: p.photo, glyph: p.glyph, stars: p.stars,
      /* le compteur réellement créé : sans ça, une installation « de zéro » qui
         suffixe les noms afficherait les soldes de l'ancienne installation */
      stars_entity: p.stars_entity || '',
    }));

    const cal = Object.assign({
      type: 'custom:daylight-calendar-card',
      default_view: 'week-compact',
      first_day_of_week: 1,
      rolling_days_week_compact: 3,
      rolling_days_agenda: 5,
      rolling_days_schedule: 4,
      hide_year: true,
      show_current_time_bar: true,
      show_daily_weather_forecast: false,
      enable_event_management: true,
      disable_event_creation: false,
      combine_calendars: true,
      combine_style: 'stripes',
      event_color_mode: 'classic',
      language: 'fr',
      locale: 'fr-FR',
      color_scheme: 'light',
      time_zone: '',
      calendar_person_entities: {},
    }, inner || {});
    cal.entities = (profiles || []).map((p) => p.calendar).filter(Boolean);
    cal.colors = cal.colors || {};
    cal.calendar_names = cal.calendar_names || {};
    cal.calendar_badge_icons = cal.calendar_badge_icons || {};
    for (const p of profiles || []) {
      if (!p.calendar) continue;
      if (p.color) cal.colors[p.calendar] = p.color;
      if (p.name) cal.calendar_names[p.calendar] = p.name;
      const face = p.photo || (p.glyph ? ':glyph:' + p.glyph : '');
      if (face) cal.calendar_badge_icons[p.calendar] = face;
    }
    if (inner && inner.uix) cal.uix = inner.uix;

    const DAYS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
    /* Les jours sont TOUJOURS les sept mêmes clés : le magasin de l'app stocke
       `entité -> valeur`, jamais l'inverse. */
    const days = DAYS.map((d) => ({ label: d.charAt(0).toUpperCase() + d.slice(1), entity: 'input_text.repas_' + d }));

    return {
      calendrier: cal,
      taches: {
        type: 'custom:skylight-tasks-card',
        chores_entity: lists.chores || 'todo.taches_famille',
        profiles_entity: lists.profiles || 'todo.profils',
        time_entity: time,
        weather_entity: weather,
        stars_per_task: stars,
        evening_from: evening,
        family_initial: (app && app.initial) || 'M',
        profiles: profs,
      },
      recompenses: {
        type: 'custom:skylight-rewards-card',
        rewards_entity: lists.rewards || 'todo.recompenses',
        profiles_entity: lists.profiles || 'todo.profils',
        time_entity: time,
        weather_entity: weather,
        stars_per_task: stars,
        profiles: profs,
      },
      'repas-test': {
        type: 'custom:skylight-meals-v2',
        days,
        rows: [{ label: 'Midi', band: '#EEF6F6', pill: '#D3E9E9' }, { label: 'Soir', band: '#FFF3E2', pill: '#FEE1B6' }],
        library: lists.recipes || 'todo.plats',
        rows_entity: 'input_text.repas_lignes',
        colors_entity: 'input_text.repas_couleurs',
        report_entity: 'input_text.repas_report',
        time_entity: time,
        weather_entity: weather,
        profiles: profs,
      },
      profils: {
        type: 'custom:skylight-profiles-card',
        entity: lists.profiles || 'todo.profils',
        avatars: [],
      },
      reglages: {
        type: 'custom:skylight-settings-card',
        profiles_entity: lists.profiles || 'todo.profils',
        kiosk_entity: (app && app.kiosk_entity) || 'input_boolean.mode_kiosque',
        family_name: (app && app.family_name) || 'Ma famille',
        evening_from: evening,
        stars_per_task: stars,
        version: (app && app.version) || '',
      },
    };
  }

  /* les profils pilotent les calendriers, comme dans la coque actuelle */
  _applyProfiles() {
    const c = this._cfgs && this._cfgs.calendrier;
    if (!c) return;
    const cals = this._profiles.map((p) => p.calendar).filter((k) => k && String(k).indexOf('calendar.') === 0);
    if (cals.length) c.entities = cals;
    c.colors = c.colors || {};
    c.calendar_names = c.calendar_names || {};
    c.calendar_badge_icons = c.calendar_badge_icons || {};

    for (const p of this._profiles) {
      if (!p.calendar) continue;
      if (p.color) c.colors[p.calendar] = p.color;
      if (p.name) c.calendar_names[p.calendar] = p.name;
      if (p.photo) c.calendar_badge_icons[p.calendar] = p.photo;
    }

    const jobs = Object.keys(c.calendar_badge_icons).map((k) => {
      const v = c.calendar_badge_icons[k];
      if (!v || String(v).indexOf(':glyph:') === 0 || String(v).indexOf('data:') === 0) return null;
      return toDataUri(v).then((d) => { if (d) c.calendar_badge_icons[k] = d; });
    });
    this._badges = Promise.all(jobs);
  }

  /* ---------- modules ---------- */

  async _resources() {
    if (this._resList) return this._resList;
    let list = [];
    try {
      list = await Promise.race([
        this._hass.callWS({ type: 'lovelace/resources' }),
        new Promise((r) => setTimeout(() => r([]), 3000)),
      ]);
    } catch (e) { list = []; }
    this._resList = (list || []).map((r) => String(r.url || '')).filter((u) => u && u.indexOf('[inline]') !== 0);
    return this._resList;
  }

  async _urlFor(tag) {
    if (tag === 'daylight-calendar-card') {
      const list = await this._resources();
      const hit = list.find((u) => u.indexOf('skylight-calendar-card.js') >= 0);
      return hit || FALLBACK[tag] || '';
    }
    /* Nos cartes sont servies par l'intégration : l'utilisateur n'a aucune
       ressource Lovelace à installer. Seule Daylight reste externe. */
    const v = (this._app && this._app.version) || '';
    return `/skylight-static/${tag}.js${v ? '?v=' + v : ''}`;
  }

  async _ensure(tag, importUrl) {
    if (customElements.get(tag)) return true;
    if (!importUrl) return false;
    this._trace('import ' + importUrl);
    try {
      await Promise.race([
        import(importUrl),
        new Promise((_r, rej) => setTimeout(() => rej(new Error('import trop long')), 8000)),
      ]);
    } catch (e) { this._trace('import-err ' + (e && e.message)); }
    return !!customElements.get(tag);
  }

  /* Certaines cartes (Tâches, Récompenses…) dessinent leur propre barre : elle
     pointe vers /famille-home/… et ferait double emploi ici. */
  _stripCardNav(el) {
    try {
      const root = el.shadowRoot;
      if (!root) return;
      const add = () => {
        if (root.querySelector('style[data-skylight-nav]')) return;
        const st = document.createElement('style');
        st.setAttribute('data-skylight-nav', '1');
        st.textContent = '.rail,.tabbar,.logo{display:none!important}.f-navscrim,.f-navsheet{display:none!important}';
        root.appendChild(st);
      };
      add();
      this._navObs = this._navObs || [];
      this._navObs.push(new MutationObserver(add));
      this._navObs[this._navObs.length - 1].observe(root, { childList: true });
    } catch (e) { this._trace('strip-err ' + (e && e.message)); }
  }

  async _card(wrap, tag, cfg, url) {
    const ok = await this._ensure(tag, url);
    if (!ok) {
      wrap.innerHTML = `<div class="err">Le module « ${esc(tag)} » n'est pas disponible (${esc(url)}).</div>`;
      return null;
    }
    const el = document.createElement(tag);
    if (typeof el.setConfig !== 'function') {
      wrap.innerHTML = `<div class="err">Élément « ${esc(tag)} » non défini après import.</div>`;
      return null;
    }
    el.style.height = '100%';
    el.style.display = 'block';
    try { el.setConfig(cfg); } catch (e) {
      wrap.innerHTML = `<div class="err">Configuration refusée par « ${esc(tag)} » : ${esc(e && e.message)}</div>`;
      this._trace('setconfig-err ' + (e && e.message));
      return null;
    }
    wrap.appendChild(el);
    try { el.hass = this._appHass(); } catch (e) { this._trace('hass-err ' + (e && e.message)); }
    this._trace('ok ' + tag);
    return el;
  }

  /* ---------- vues ---------- */

  async _show(view) {
    this._view = view;
    this._active();
    const body = this.shadowRoot.getElementById('body');
    if (!body) return;
    if (!this._mounted[view]) {
      try {
        const m = await this._mount(body, view);
        this._mounted[view] = m;
      } catch (e) {
        this._trace('mount-err ' + (e && e.message));
        let wrap = body.querySelector('.view');
        if (!wrap) { wrap = document.createElement('div'); wrap.className = 'view'; body.appendChild(wrap); }
        wrap.innerHTML = `<div class="err">Vue « ${esc(view)} » : ${esc(e && e.message)}</div>`;
        this._mounted[view] = { wrap };
      }
    }
    /* une navigation plus récente a pu prendre la main pendant le montage */
    if (this._view !== view) return;
    for (const [k, m] of Object.entries(this._mounted)) {
      if (m && m.wrap) m.wrap.classList.toggle('on', k === view);
    }
    setTimeout(() => window.dispatchEvent(new Event('resize')), 40);
  }

  /* ---------- adaptateur : les cartes parlent à Home Assistant, la V2 répond ---------- */

  _virtualStates() {
    const st = Object.assign({}, this._hass.states);
    const app = this._app || {};
    /* Masque les entités d'une éventuelle installation v1 : la V2 ne lit QUE
       ses propres données, même sur une instance qui contient déjà tout. */
    for (const key of Object.keys(st)) {
      if (/^(input_text\.repas_|input_number\.ordre_colonne|counter\.etoiles_|input_boolean\.mode_kiosque)/.test(key)) {
        delete st[key];
      }
    }
    const DAYS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
    for (const day of DAYS) {
      const key = 'input_text.repas_' + day;
      st[key] = { entity_id: key, state: String((app.meals || {})[key] || ''), attributes: {} };
    }
    for (const extra of ['lignes', 'couleurs', 'report']) {
      const key = 'input_text.repas_' + extra;
      st[key] = { entity_id: key, state: String((app.meals || {})[key] || ''), attributes: {} };
    }
    for (const p of app.profiles || []) {
      const id = 'counter.etoiles_' + p.id;
      st[id] = { entity_id: id, state: String((app.stars || {})[p.id] || 0), attributes: {} };
    }
    for (const [ent, val] of Object.entries(app.meals || {})) {
      st[ent] = { entity_id: ent, state: String(val == null ? '' : val), attributes: {} };
    }
    st['input_boolean.mode_kiosque'] = {
      entity_id: 'input_boolean.mode_kiosque',
      state: app.kiosk ? 'on' : 'off',
      attributes: {},
    };
    st['input_number.ordre_colonne_a_faire'] = {
      entity_id: 'input_number.ordre_colonne_a_faire',
      state: String(app.order || 0),
      attributes: { min: 0, max: 20, step: 1 },
    };
    const now = new Date();
    st['sensor.heure_actuelle'] = {
      entity_id: 'sensor.heure_actuelle',
      state: String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0'),
      attributes: {},
    };
    return st;
  }

  _appHass() {
    if (this._proxy) return this._proxy;
    const self = this;
    const real = this._hass;
    this._proxy = new Proxy(real, {
      get(target, prop) {
        if (prop === 'states') return self._virtualStates();
        if (prop === 'callWS') return (msg) => self._routeWS(msg);
        if (prop === 'callService') return (d, s, data, tgt, ...rest) => self._routeService(d, s, data, tgt, ...rest);
        const v = target[prop];
        return typeof v === 'function' ? v.bind(target) : v;
      },
    });
    return this._proxy;
  }

  async _routeWS(msg) {
    if (msg && msg.type === 'todo/item/list') {
      const r = await this._hass.callWS({ type: 'skylight_hub_family/list', entity: msg.entity_id });
      return { items: (r && r.items) || [] };
    }
    return this._hass.callWS(msg);
  }

  async _routeService(domain, service, data, target, notifyOnError, returnResponse) {
    const d = data || {};
    let ent = d.entity_id || (target && target.entity_id) || '';
    if (Array.isArray(ent)) ent = ent[0];
    try {
      if (domain === 'todo' && service === 'get_items') {
        const r = await this._hass.callWS({ type: 'skylight_hub_family/list', entity: ent });
        const items = (r && r.items) || [];
        if (returnResponse === true) return { response: { [ent]: { items } } };
        return { response: { [ent]: { items } } };
      }
      if (domain === 'input_number' && ent === 'input_number.ordre_colonne_a_faire') {
        await this._hass.callWS({ type: 'skylight_hub_family/settings', order: Number(d.value || 0) });
        await this._refreshData();
        return;
      }
      if (domain === 'todo') {
        const op = service === 'add_item' ? 'add'
          : service === 'update_item' ? 'update'
            : service === 'remove_item' ? 'remove'
              : service === 'remove_completed_items' ? 'remove_completed' : null;
        if (op) {
          await this._hass.callWS({
            type: 'skylight_hub_family/todo',
            entity: ent,
            op,
            item: d.item,
            item_uid: d.item,
            rename: d.rename,
            description: d.description,
            status: d.status,
          });
          await this._refreshData();
          return;
        }
      }
      if (domain === 'script' && (service === 'etoiles' || service === 'turn_on') && d.profil) {
        await this._hass.callWS({ type: 'skylight_hub_family/stars', profile: d.profil, delta: Number(d.delta || 0) });
        await this._refreshData();
        return;
      }
      if (domain === 'counter') {
        const m = /^counter\.etoiles_(.+)$/.exec(ent);
        if (m) {
          if (service === 'set_value') {
            await this._hass.callWS({ type: 'skylight_hub_family/stars', profile: m[1], value: Number(d.value || 0) });
          } else {
            const delta = service === 'increment' ? 1 : service === 'decrement' ? -1 : 0;
            await this._hass.callWS({ type: 'skylight_hub_family/stars', profile: m[1], delta });
          }
          await this._refreshData();
          return;
        }
      }
      if (domain === 'calendar' && service === 'delete_event') {
        /* Home Assistant n'a pas de service `calendar.delete_event` : la
           suppression passe par WebSocket. Si le calendrier ne l'autorise pas
           (Google, par exemple), on le dit clairement au lieu de laisser
           remonter « Service not found ». */
        const st = this._hass.states && this._hass.states[ent];
        const flags = st && st.attributes ? Number(st.attributes.supported_features || 0) : 0;
        if (!(flags & 2)) {
          throw new Error('Ce calendrier ne permet pas la suppression depuis Home Assistant. Supprimez l\'événement depuis l\'application du calendrier.');
        }
        const payload = { type: 'calendar/event/delete', entity_id: ent, uid: d.uid };
        if (d.recurrence_id) payload.recurrence_id = d.recurrence_id;
        if (d.recurrence_range) payload.recurrence_range = d.recurrence_range;
        await this._hass.callWS(payload);
        await this._refreshData();
        return;
      }
      if (domain === 'input_text' && service === 'set_value') {
        /* Garde-fou : seules les clés de repas connues sont acceptées. Une carte
           qui se tromperait d'`entity_id` ne doit pas créer de clé parasite. */
        if (!/^input_text\.repas_(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|lignes|couleurs|report)$/.test(ent)) {
          this._trace('input_text ignore ' + ent);
          return;
        }
        await this._hass.callWS({ type: 'skylight_hub_family/text', entity: ent, value: String(d.value == null ? '' : d.value) });
        await this._refreshData();
        return;
      }
      if (domain === 'input_boolean' && ent === 'input_boolean.mode_kiosque'
        && (service === 'turn_on' || service === 'turn_off')) {
        await this._hass.callWS({ type: 'skylight_hub_family/settings', kiosk: service === 'turn_on' });
        await this._refreshData();
        return;
      }
    } catch (e) {
      this._trace('route-err ' + (e && e.message));
    }
    return this._hass.callService(domain, service, data, target);
  }

  async _refreshData() {
    try {
      this._app = await this._hass.callWS({ type: 'skylight_hub_family/config' });
      this._cfgs = this._buildConfigs(this._app, this._app.profiles || [], null);
      this._proxy = null;
      const ph = this._appHass();
      for (const m of Object.values(this._mounted)) {
        if (m && m.el) { try { m.el.hass = ph; } catch (e) { /* ignore */ } }
      }
      this._syncKiosk();
    } catch (e) {
      this._trace('refresh-err ' + (e && e.message));
    }
  }

  async _mount(body, view) {
    const wrap = document.createElement('div');
    wrap.className = 'view';
    wrap.dataset.view = view;
    body.appendChild(wrap);

    const cfg = this._cfgs[view];
    if (!cfg || !cfg.type) {
      wrap.innerHTML = `<div class="placeholder">${CORE.emptyHtml('\u{1F6A7}', 'Cette vue n\u2019a pas encore de configuration.')}</div>`;
      return { wrap };
    }
    const type = String(cfg.type);
    if (type.indexOf('custom:') !== 0) {
      wrap.innerHTML = `<div class="placeholder">${CORE.emptyHtml('\u{1F6A7}', 'Carte standard non gérée par le panneau.')}</div>`;
      return { wrap };
    }
    const tag = type.slice(7);
    if (view === 'calendrier' && this._badges) await this._badges;
    const url = await this._urlFor(tag);
    const el = await this._card(wrap, tag, cfg, url);
    if (el) this._stripCardNav(el);
    return { wrap, el };
  }
}

if (!customElements.get('skylight-hub-panel')) customElements.define('skylight-hub-panel', FamillePanel);
