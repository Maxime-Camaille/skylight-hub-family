/* skylight-settings-card — écran « Réglages »
 *
 * type: custom:skylight-settings-card
 * profiles_entity: todo.profils
 * kiosk_entity:    input_boolean.mode_kiosque
 *
 * Contenu : diagnostic d'installation (prérequis ✓ / ✗), mode kiosque, version.
 * La barre latérale vient de la coque (custom:skylight-shell-card).
 * Le mode kiosque est appliqué par kiosk-mode, branché sur le booléen dans la
 * config du dashboard (`kiosk_mode:` + template), pas ici.
 */

const CORE_URL = '/skylight-static/famille-core.js?v=0.5.19';
let CORE = null;
const coreReady = import((typeof window !== 'undefined' && window.FAMILLE_CORE_URL) || CORE_URL)
  .then((m) => { CORE = m; return m; })
  .catch(() => null);

/* Ce que CET appareil voit vraiment : version du tronc commun chargée, taille
   annoncée, taille réellement visible, densité. Deux bugs d'affichage sur trois
   venaient d'un désaccord entre ces nombres — et on ne peut pas les deviner. */
function displayProbe() {
  try {
    const w = Math.round(window.innerWidth);
    const h = Math.round(window.innerHeight);
    const cw = Math.round(document.documentElement.clientWidth);
    const ch = Math.round(document.documentElement.clientHeight);
    const ver = (CORE && CORE.CORE_VERSION) || '?';
    const dpr = Math.round((window.devicePixelRatio || 1) * 10) / 10;
    return ver + ' \u00b7 ' + w + '\u00d7' + h + ' \u00b7 visible ' + cw + '\u00d7' + ch + ' \u00b7 @' + dpr;
  } catch (e) { return '?'; }
}

const CSS = `
:host{display:block;height:100%;font-family:var(--skylight-sans,Figtree,system-ui,sans-serif);color:#1F2328;background:#fff}
*,*::before,*::after{box-sizing:border-box}
.page{height:100%;display:flex;flex-direction:column;background:#fff}
.hdr{flex:0 0 70px;display:flex;align-items:baseline;gap:14px;padding:0 22px}
.hdr h1{margin:0;font-family:var(--skylight-serif,Literata,Georgia,serif);font-size:26px;font-weight:600;letter-spacing:-.01em}
.hdr .sub{font-size:12.5px;color:#8A8F9C}
.body{flex:1 1 auto;min-height:0;overflow:auto;padding:0 22px 22px;display:flex;justify-content:center}
.wrap{width:100%;max-width:760px}
.grp{margin-bottom:16px}
.gt{font-family:var(--skylight-serif,Literata,Georgia,serif);font-size:17px;font-weight:600;letter-spacing:-.01em;margin:0 4px 9px}
.card{background:#fff;border:1px solid #E9EAF1;border-radius:20px;overflow:hidden}
.row{display:flex;align-items:center;gap:12px;padding:12px 16px;position:relative;min-height:52px;width:100%;border:0;background:none;font:inherit;color:inherit;text-align:left}
button.row{cursor:pointer}
.row+.row::before{content:'';position:absolute;left:16px;right:0;top:0;height:1px;background:#E9EAF1}
.rl{flex:1;min-width:0}
.rl b{display:block;font-size:15px;font-weight:600;letter-spacing:-.01em}
.rl span{display:block;font-size:12.5px;color:#8A8F9C;margin-top:2px}
.val{font-size:14px;color:#5A6074;font-weight:500;white-space:nowrap}
.sw{width:44px;height:26px;border-radius:999px;background:#D8DEE6;position:relative;flex:0 0 44px;transition:background .15s}
.sw::after{content:'';position:absolute;top:3px;left:3px;width:20px;height:20px;border-radius:50%;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.2);transition:left .15s}
.sw.on{background:var(--f-blue,#007AFF)}
.sw.on::after{left:21px}
.st{width:22px;height:22px;border-radius:50%;flex:0 0 22px;display:grid;place-items:center;font-size:12px;font-weight:800;color:#fff}
.st.ok{background:#2E9E63}
.st.ko{background:#D9534F}
.st.opt{background:#C7CEDA}
.acc{cursor:pointer}
.acc .chev{color:#C7CEDA;font-size:18px;line-height:1;transition:transform .18s ease;display:inline-block}
.acc.open .chev{transform:rotate(90deg)}
.accbody{display:none}
.accbody.open{display:block}
.tag{font-size:11px;font-weight:600;border-radius:999px;padding:3px 8px;background:#F1F4F7;color:#5A6074}
.tag.ko{background:#FDECEA;color:#FF3B30}
.foot{font-size:12px;color:#8A8F9C;text-align:center;margin-top:8px;line-height:1.5}
.empty{padding:18px;font-size:13px;color:#8A8F9C}
.err{margin:16px;padding:14px;border-radius:12px;background:#FDF2F0;color:#FF3B30;font-size:13px}
@media (max-width:600px){.hdr{flex:0 0 60px;padding:0 12px}.hdr h1{font-size:20px}.body{padding:0 12px 88px}.row{padding:11px 13px}}
`;

class SkylightSettingsCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._built = false;
    this._profiles = [];
    this._loaded = false;
    this._kioskMod = null;   /* Kiosk Mode présent ? (null = pas encore vérifié) */
    this._daylightMod = null; /* carte Daylight (calendrier) présente ? */
  }

  setConfig(config) {
    this._cfg = config || {};
    this._built = false;
    if (this.shadowRoot) this.shadowRoot.innerHTML = '';
    this._loaded = false;
  }

  getCardSize() { return 14; }

  set hass(hass) {
    this._hass = hass;
    if (!this._built) this._build();
    const st = hass && hass.states && hass.states[this._kioskEnt()];
    const sig = (st ? st.state : 'absent') + '|' + Object.keys((hass && hass.states) || {}).length;
    if (sig !== this._sig) { this._sig = sig; this._paint(); }
    if (!this._loaded) this._load();
  }

  _kioskEnt() { return (this._cfg && this._cfg.kiosk_entity) || 'input_boolean.mode_kiosque'; }
  _profEnt() { return (this._cfg && this._cfg.profiles_entity) || 'todo.profils'; }

  _load() {
    const h = this._hass;
    if (!h || !h.callWS) return;
    this._loaded = true;

    /* Deux modules HACS sont nécessaires : Kiosk Mode (immersion) et la carte
       Daylight (calendrier). On les détecte par le fichier qu'ils servent. */
    if (this._kioskMod === null) this._probe('/hacsfiles/kiosk-mode/kiosk-mode.js', '_kioskMod');
    if (this._daylightMod === null) this._probe('/hacsfiles/daylight-calendar-card/skylight-calendar-card.js', '_daylightMod');

    h.callWS({ type: 'todo/item/list', entity_id: this._profEnt() })
      .then((r) => {
        this._profiles = ((r && r.items) || []).map((it) => {
          let m = {};
          try { m = JSON.parse(it.description || '{}') || {}; } catch (e) { m = {}; }
          return { name: it.summary || '', id: m.i || '', cal: m.k || '' };
        });
        this._paint();
      })
      .catch(() => { this._loaded = false; });
  }

  _build() {
    try {
      this.shadowRoot.innerHTML = '<style>' + CSS + '</style>'
        + '<div class="page"><header class="hdr"><h1>Réglages</h1><span class="sub" id="sub"></span></header>'
        + '<div class="body"><div class="wrap" id="wrap"></div></div></div>';
      this._built = true;
      this._paint();
    } catch (e) {
      this.shadowRoot.innerHTML = '<div class="err">Réglages : ' + (e && e.message) + '</div>';
    }
  }

  _esc(s) { return CORE && CORE.esc ? CORE.esc(s) : String(s == null ? '' : s); }
  _st(e) { return this._hass && this._hass.states ? this._hass.states[e] : null; }

  /* présence d'un module HACS : on regarde s'il est défini, sinon s'il est servi */
  _probe(url, key) {
    const tag = key === '_daylightMod' ? 'daylight-calendar-card' : null;
    if (tag && typeof customElements !== 'undefined' && customElements.get(tag)) {
      this[key] = true; this._paint(); return;
    }
    fetch(url, { method: 'HEAD' })
      .then((r) => { this[key] = r.ok || r.status === 405 || r.status === 206; this._paint(); })
      .catch(() => { this[key] = false; this._paint(); });
  }

  _countStates(prefix) {
    const st = (this._hass && this._hass.states) || {};
    return Object.keys(st).filter((k) => k.indexOf(prefix) === 0).length;
  }

  _repasCount() {
    const j = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
    return j.filter((d) => !!this._st('input_text.repas_' + d)).length;
  }

  /* ---- diagnostic -------------------------------------------------- */
  _checks() {
    /* V2 : plus aucune entité à vérifier — les données vivent dans l'app. */
    const n = (this._profiles || []).length;
    return [
      { ok: n > 0, label: 'Registre des profils', hint: n ? n + ' personne' + (n > 1 ? 's' : '') : 'aucune personne enregistrée' },
      { ok: true, label: 'Données de l\u2019application', hint: 'stockées dans Home Assistant, sans aucune entité' },
      { ok: this._daylightMod === true, label: 'Carte calendrier (Daylight)', hint: this._daylightMod === null ? 'vérification…' : (this._daylightMod ? 'carte Daylight installée' : 'à installer depuis HACS (Daylight Calendar Card)') },
      { ok: this._countStates('calendar.') > 0, label: 'Calendriers', hint: this._countStates('calendar.') + ' calendrier(s) dans Home Assistant' },
      { ok: true, label: 'Remise à zéro des routines', hint: 'gérée par l\u2019intégration, chaque nuit à 4 h' },
      { ok: true, label: 'Mode kiosque', hint: 'géré par l\u2019application, sans plugin' },
    ];
    const ids = this._profiles.map((p) => p.id).filter(Boolean);
    const hasAll = (prefix, list) => list.length > 0 && list.every((id) => !!this._st(prefix + id));
    const routines = ids.filter((id) => this._st('todo.routines_' + id));
    const counters = ids.filter((id) => this._st('counter.etoiles_' + id));

    const out = [];
    out.push({
      ok: !!this._st('todo.profils') && n > 0,
      label: 'Registre des profils',
      hint: n ? n + ' personne' + (n > 1 ? 's' : '') : 'aucune personne enregistrée',
    });
    out.push({
      ok: !!this._st('todo.taches_famille') && !!this._st('todo.recompenses') && !!this._st('todo.plats'),
      label: 'Listes de l\u2019app',
      hint: 'tâches, récompenses, plats',
    });
    out.push({
      ok: n > 0 && routines.length === n,
      label: 'Listes de routines',
      hint: n ? routines.length + ' sur ' + n : 'à créer',
    });
    out.push({
      ok: n > 0 && counters.length === n,
      label: 'Compteurs d\u2019étoiles',
      hint: n ? counters.length + ' sur ' + n : 'à créer',
    });
    out.push({
      ok: !!this._st('input_number.ordre_colonne_a_faire'),
      label: 'Ordre des colonnes',
      hint: 'input_number.ordre_colonne_a_faire',
    });
    out.push({
      ok: !!this._st('sensor.heure_actuelle'),
      label: 'Capteur d\u2019heure',
      hint: 'sensor.heure_actuelle',
    });
    out.push({
      ok: !!this._st('script.etoiles') && !!this._st('script.taches_remise_a_zero'),
      label: 'Scripts (étoiles, remise à zéro)',
      hint: 'script.etoiles · script.taches_remise_a_zero',
    });
    out.push({
      ok: !!this._st('automation.taches_remise_a_zero_4h'),
      label: 'Remise à zéro automatique',
      hint: 'chaque nuit à 4 h',
    });
    out.push({
      ok: this._daylightMod === true,
      label: 'Carte calendrier (Daylight)',
      hint: this._daylightMod === null ? 'vérification…'
        : (this._daylightMod ? 'carte Daylight installée' : 'obligatoire — à installer depuis HACS (Daylight Calendar Card)'),
    });
    out.push({
      ok: this._countStates('calendar.') > 0,
      label: 'Calendriers',
      hint: this._countStates('calendar.') + ' calendrier(s) dans Home Assistant',
    });
    out.push({
      ok: this._repasCount() === 7,
      label: 'Champs des repas',
      hint: this._repasCount() + ' sur 7 (input_text.repas_*)',
    });
    out.push({
      ok: !!this._st(this._kioskEnt()),
      label: 'Entité du mode kiosque',
      hint: this._kioskEnt(),
    });
    out.push({
      ok: this._kioskMod === true,
      label: 'Kiosk Mode (plugin HACS)',
      hint: this._kioskMod === null ? 'vérification…'
        : (this._kioskMod ? 'immersion : la barre HA est masquée'
          : 'indispensable — c\u2019est lui qui empêche de sortir de l\u2019app vers Home Assistant'),
    });
    out.push({
      ok: !!this._st('weather.forecast_maison'),
      label: 'Météo (facultatif)',
      hint: 'weather.forecast_maison',
      opt: true,
    });
    return out;
  }

  _paint() {
    if (!this._built) return;
    const root = this.shadowRoot;
    const wrap = root.getElementById('wrap');
    const sub = root.getElementById('sub');
    if (!wrap) return;

    const checks = this._checks();
    const req = checks.filter((c) => !c.opt);
    const ok = req.filter((c) => c.ok).length;
    const allOk = ok === req.length;
    const kioskOn = this._st(this._kioskEnt()) && this._st(this._kioskEnt()).state === 'on';
    const name = (this._cfg && this._cfg.family_name) || 'Famille';

    if (sub) sub.textContent = name + ' · ' + ok + ' / ' + req.length + ' prérequis';

    const row = (c) => (
      '<div class="row"><span class="st ' + (c.ok ? 'ok' : (c.opt ? 'opt' : 'ko')) + '">'
      + (c.ok ? '✓' : (c.opt ? '·' : '✕')) + '</span>'
      + '<span class="rl"><b>' + this._esc(c.label) + '</b><span>' + this._esc(c.hint) + '</span></span>'
      + (c.ok ? '<span class="tag">OK</span>' : (c.opt ? '<span class="tag">option</span>' : '<span class="tag ko">manquant</span>'))
      + '</div>'
    );

    /* volet : fermé quand tout va bien, ouvert dès qu'il manque quelque chose */
    const autoOpen = !allOk;
    const open = (this._open === null || this._open === undefined) ? autoOpen : this._open;
    const missing = req.length - ok;

    wrap.innerHTML =
      '<div class="grp"><div class="gt">Installation</div><div class="card">'
      + '<button class="row acc' + (open ? ' open' : '') + '" id="acc">'
      + '<span class="st ' + (allOk ? 'ok' : 'ko') + '">' + (allOk ? '✓' : '!') + '</span>'
      + '<span class="rl"><b>Prérequis de l\u2019application</b>'
      + '<span>' + ok + ' sur ' + req.length + ' validé' + (ok > 1 ? 's' : '')
      + (allOk ? ' · tout est en place' : ' · ' + missing + ' manquant' + (missing > 1 ? 's' : ''))
      + '</span></span>'
      + '<span class="chev">›</span></button>'
      + '<div class="accbody' + (open ? ' open' : '') + '" id="accbody">' + checks.map(row).join('') + '</div>'
      + '</div></div>'

      + '<div class="grp"><div class="gt">Affichage</div><div class="card">'
      + (this._kioskMod === false
        ? '<div class="row"><span class="rl"><b>Mode kiosque</b>'
          + '<span>Kiosk Mode n\u2019est pas installé. Il est indispensable : c\u2019est lui qui garde l\u2019app en plein écran et empêche de revenir dans Home Assistant. À installer depuis HACS, puis recharger la page.</span></span>'
          + '<span class="sw" style="opacity:.4"></span></div>'
        : '<button class="row" id="kiosk"><span class="rl"><b>Mode kiosque</b>'
          + '<span>Masque la barre et le menu de Home Assistant</span></span>'
          + '<span class="sw' + (kioskOn ? ' on' : '') + '"></span></button>')
      + '</div></div>'

      + '<div class="grp"><div class="gt">Application</div><div class="card">'
      + '<div class="row"><span class="rl"><b>Version</b><span>App Famille</span></span>'
      + '<span class="val">' + this._esc(this._cfg.version || '0.1.0') + '</span></div>'
      /* témoin d'affichage : ce que CET appareil voit vraiment. Sert à savoir
         si le client a bien chargé la dernière version, et quelle taille il
         annonce — les deux causes de bug qu'on ne peut pas deviner à distance. */
      + '<div class="row"><span class="rl"><b>Affichage mesuré</b><span>Tronc commun, fenêtre, zone visible</span></span>'
      + '<span class="val" style="font-size:11px">' + this._esc(displayProbe()) + '</span></div>'
      + '</div></div>';

    const k = root.getElementById('kiosk');
    if (k) k.addEventListener('click', () => this._toggleKiosk());

    const acc = root.getElementById('acc');
    const accBody = root.getElementById('accbody');
    if (acc && accBody) {
      acc.addEventListener('click', () => {
        const isOpen = accBody.classList.contains('open');
        this._open = !isOpen;
        accBody.classList.toggle('open', !isOpen);
        acc.classList.toggle('open', !isOpen);
      });
    }
  }

  _toggleKiosk() {
    const h = this._hass;
    if (!h) return;
    const on = this._st(this._kioskEnt()) && this._st(this._kioskEnt()).state === 'on';
    h.callService('input_boolean', on ? 'turn_off' : 'turn_on', { entity_id: this._kioskEnt() });
  }
}

customElements.define('skylight-settings-card', SkylightSettingsCard);
coreReady.then(() => {
  document.querySelectorAll('skylight-settings-card').forEach((el) => {
    if (el && el._built && el._paint) el._paint();
  });
});
window.customCards = window.customCards || [];
window.customCards.push({ type: 'skylight-settings-card', name: 'Skylight Réglages', description: 'Diagnostic d’installation et réglages de l’app Famille' });
