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

const CORE_URL = '/skylight-static/famille-core.js?v=0.5.6';
const DASH = 'famille-home';
const PROFILES = 'todo.profils';

const FALLBACK = {
  'daylight-calendar-card': '/hacsfiles/daylight-calendar-card/skylight-calendar-card.js',
  'skylight-tasks-card': '/local/v68/skylight-tasks-card.js?v=33',
};

let CORE = null;
const ready = import(CORE_URL).then((m) => { CORE = m; return m; }).catch(() => null);

/* Le nuancier de l'application (14 teintes vives, mêmes valeurs que
 * `COLORS` dans skylight-profiles-card.js). L'ordre est celui de la fiche
 * profil, pour qu'une couleur choisie ici se retrouve au même endroit. */
const OB_COLORS = [
  '#2E9E63', '#A8D46A', '#4FC3D0', '#0F5F6E', '#4677A8', '#8E5BD9', '#D9548C',
  '#C2185B', '#C22F2F', '#E0622A', '#7A4B2A', '#A9762F', '#F5A623', '#2B3038',
];

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
/* ---------- installation (onboarding) ----------
   DA Apple. Les valeurs viennent de DA-APPLE.md §« Annexe » (pages HIG
   typography et color : table Dynamic Type « Large », couleurs système iOS).
   Inter remplace SF Pro hors Apple, et le tracking SF est multiplié par 0,72
   (l'annexe le prévoit : les valeurs SF étouffent Inter). */
@font-face{font-family:"InterVar";src:url("/skylight-static/fonts/InterVariable.woff2") format("woff2");font-weight:100 900;font-style:normal;font-display:swap}
.onb{height:100vh;overflow:auto;background:#F2F2F7;color:#000;
  font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","InterVar","Segoe UI",system-ui,sans-serif;
  -webkit-font-smoothing:antialiased;
  --ob-blue:#007AFF;--ob-blue-ring:rgba(0,122,255,.35);
  --ob-label2:rgba(60,60,67,.6);--ob-sep:rgba(60,60,67,.12);
  --ob-card:#FFFFFF;--ob-r:28px;--ob-r-in:18px}
.ob-shell{max-width:1120px;margin:0 auto;padding:clamp(24px,4vw,56px) clamp(20px,4.5vw,56px) 48px;min-height:100%;display:flex;flex-direction:column;box-sizing:border-box}
.ob-top{display:flex;align-items:center;gap:14px;margin-bottom:clamp(28px,4vw,56px)}
.ob-mark{width:44px;height:44px;border-radius:12px;overflow:hidden;flex:0 0 44px;box-shadow:0 1px 2px rgba(0,0,0,.08)}
.ob-mark img{width:100%;height:100%;display:block;object-fit:cover}
.ob-brand{font-size:17px;font-weight:600;letter-spacing:-.0187em}
.ob-progress{margin-left:auto;display:flex;align-items:center;gap:12px;color:var(--ob-label2);font-size:13px;letter-spacing:-.0043em}
.ob-progress .short{display:none}
.ob-bar{width:88px;height:4px;border-radius:999px;background:rgba(60,60,67,.16);overflow:hidden}
.ob-bar i{display:block;height:100%;border-radius:999px;background:var(--ob-blue);transition:width .32s cubic-bezier(.32,.72,0,1)}
.ob-main{flex:1 1 auto;display:grid;grid-template-columns:minmax(0,1fr) minmax(320px,440px);gap:clamp(28px,4vw,64px);align-items:center}
.ob-main.solo{grid-template-columns:minmax(0,720px);justify-content:center}
.ob-copy{min-width:0}
.ob-step{animation:obIn .32s cubic-bezier(.32,.72,0,1)}
@keyframes obIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
.ob-kicker{font-size:13px;font-weight:600;letter-spacing:-.0043em;color:var(--ob-blue);margin:0 0 10px}
.ob-h1{font-size:clamp(30px,3.4vw,40px);line-height:1.08;font-weight:600;letter-spacing:.006em;margin:0 0 14px;text-wrap:balance}
.ob-lead{font-size:17px;line-height:1.32;letter-spacing:-.0187em;color:var(--ob-label2);max-width:46ch;margin:0}
.ob-actions{display:flex;align-items:center;gap:8px;margin-top:clamp(28px,3.4vw,40px);flex-wrap:wrap}
.ob-actions .end{margin-left:auto}
.ob-btn{min-height:52px;padding:0 24px;border:0;border-radius:999px;font:inherit;font-size:17px;font-weight:600;letter-spacing:-.0187em;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:8px;-webkit-tap-highlight-color:transparent;transition:transform .1s cubic-bezier(.2,.7,.3,1),background-color .16s ease}
.ob-btn:active{transform:scale(.97)}
.ob-btn.primary{background:var(--ob-blue);color:#fff}
.ob-btn.primary:disabled{background:rgba(60,60,67,.18);color:rgba(255,255,255,.9);cursor:default;transform:none}
.ob-btn.ghost{background:transparent;color:var(--ob-blue);font-weight:500}
.ob-btn.ghost:active{background:rgba(0,122,255,.1)}
.ob-btn:focus-visible{outline:3px solid var(--ob-blue-ring);outline-offset:2px}
.ob-foot{margin-top:16px;font-size:13px;letter-spacing:-.0043em;color:var(--ob-label2)}
.ob-hero{background:var(--ob-card);border-radius:var(--ob-r);aspect-ratio:1;display:grid;place-items:center;position:relative;overflow:hidden;box-shadow:0 24px 60px rgba(0,0,0,.08)}
.ob-hero::before{content:'';position:absolute;inset:-20%;background:radial-gradient(circle at 50% 45%,#EAF3FF 0%,rgba(234,243,255,0) 62%)}
.ob-hero img{width:44%;max-width:200px;border-radius:26%;position:relative;box-shadow:0 18px 40px rgba(0,0,0,.16)}
.ob-field{display:block;margin-top:28px}
.ob-field span{display:block;font-size:13px;letter-spacing:-.0043em;color:var(--ob-label2);margin:0 0 8px 4px}
.ob-input{width:100%;box-sizing:border-box;height:56px;border:0;border-radius:var(--ob-r-in);background:#fff;padding:0 18px;font:inherit;font-size:17px;letter-spacing:-.0187em;color:#000;outline:none;box-shadow:0 0 0 1px rgba(60,60,67,.08)}
.ob-input:focus{box-shadow:0 0 0 3px var(--ob-blue-ring)}
.ob-preview{margin-top:28px;background:var(--ob-card);border-radius:var(--ob-r);padding:22px;box-shadow:0 12px 30px rgba(0,0,0,.06)}
.ob-preview .initial{width:44px;height:44px;border-radius:12px;display:grid;place-items:center;background:#EAF3FF;color:var(--ob-blue);font-size:20px;font-weight:600;margin-bottom:14px}
.ob-preview .nm{font-family:inherit;font-size:28px;line-height:1.21;letter-spacing:-.0086em;font-weight:600;overflow-wrap:anywhere}
.ob-preview .cap{margin-top:10px;font-size:13px;color:var(--ob-label2);letter-spacing:-.0043em}
.ob-group{background:var(--ob-card);border-radius:var(--ob-r);overflow:hidden;margin-top:28px}
.ob-row{display:flex;align-items:center;gap:14px;min-height:64px;padding:10px 16px}
.ob-row + .ob-row{box-shadow:inset 0 1px 0 var(--ob-sep)}
.ob-av{width:44px;height:44px;border-radius:50%;display:grid;place-items:center;color:#fff;font-size:17px;font-weight:600;flex:0 0 44px;letter-spacing:0}
.ob-row .txt{min-width:0;display:flex;flex-direction:column;gap:1px}
.ob-row .nm{display:block;font-family:inherit;font-size:17px;font-weight:600;line-height:1.29;letter-spacing:-.0187em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ob-row .sub{display:block;font-size:13px;line-height:1.38;color:var(--ob-label2);letter-spacing:-.0043em}
.ob-del{margin-left:auto;width:44px;height:44px;border:0;background:transparent;border-radius:50%;color:rgba(60,60,67,.45);display:grid;place-items:center;cursor:pointer}
.ob-del:hover{background:rgba(60,60,67,.08)}
.ob-empty{padding:20px 16px;font-size:15px;letter-spacing:-.0115em;color:var(--ob-label2)}
.ob-editor{margin-top:16px;background:var(--ob-card);border-radius:var(--ob-r);padding:20px}
.ob-editor .row{display:flex;gap:12px;align-items:center}
.ob-editor .row .ob-input{flex:1 1 auto}
.ob-editor .row .ob-btn{flex:0 0 auto}
.ob-swatches{display:flex;gap:10px;flex-wrap:wrap;margin:18px 0 4px}
.ob-sw{width:30px;height:30px;border-radius:50%;border:0;padding:0;cursor:pointer;position:relative;-webkit-tap-highlight-color:transparent}
.ob-sw.on::after{content:'';position:absolute;inset:-5px;border:2.5px solid var(--ob-blue);border-radius:50%}
.ob-switch{display:flex;align-items:center;gap:12px;margin-top:18px;font-size:15px;letter-spacing:-.0115em;color:#000;background:none;border:0;padding:0;font-family:inherit;cursor:pointer;text-align:left}
.ob-track{width:44px;height:26px;border-radius:999px;background:rgba(60,60,67,.22);position:relative;flex:0 0 44px;border:0;padding:0;transition:background-color .2s cubic-bezier(.32,.72,0,1)}
.ob-track::after{content:'';position:absolute;top:2px;left:2px;width:22px;height:22px;border-radius:50%;background:#fff;box-shadow:0 2px 4px rgba(0,0,0,.2);transition:transform .22s cubic-bezier(.32,.72,0,1)}
.ob-track.on{background:#34C759}
.ob-track.on::after{transform:translateX(18px)}
.ob-cards{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:28px}
.ob-card{background:var(--ob-card);border-radius:var(--ob-r);padding:20px;display:flex;gap:14px;align-items:flex-start}
.ob-card.wide{grid-column:1/-1;align-items:center}
.ob-tile{width:44px;height:44px;border-radius:12px;display:grid;place-items:center;flex:0 0 44px;color:var(--ob-blue);background:#EAF3FF;font-size:22px}
.ob-tile svg{width:22px;height:22px;display:block;fill:currentColor}
.ob-card h3{font-family:inherit;font-size:17px;font-weight:600;letter-spacing:-.0187em;margin:0 0 2px}
.ob-card p{font-size:15px;line-height:1.3;letter-spacing:-.0115em;color:var(--ob-label2);margin:0}
.ob-ready{margin:auto;text-align:center;max-width:560px}
.ob-ready .avs{display:flex;justify-content:center;gap:10px;margin-bottom:24px;flex-wrap:wrap}
.ob-ready .av{width:64px;height:64px;border-radius:50%;display:grid;place-items:center;color:#fff;font-size:24px;font-weight:600;box-shadow:0 0 0 4px #fff,0 6px 16px rgba(0,0,0,.12);letter-spacing:0}
.ob-ready h1{font-family:inherit;font-size:clamp(30px,3.4vw,40px);line-height:1.08;font-weight:600;letter-spacing:.006em;margin:0 0 12px}
.ob-ready p{font-size:17px;letter-spacing:-.0187em;color:var(--ob-label2);margin:0}
.ob-ready .sum{margin-top:8px;font-size:13px;letter-spacing:-.0043em;color:var(--ob-label2)}
.ob-err{background:#FFE5E3;color:#8A1F1A;border-radius:14px;padding:12px 14px;font-size:15px;letter-spacing:-.0115em;margin-top:16px}
@media (max-width:899px){
  .ob-main{grid-template-columns:1fr;gap:28px}
  .ob-hero{aspect-ratio:16/10;order:-1}
  .ob-cards{grid-template-columns:1fr}
  .ob-actions{flex-direction:column;align-items:stretch}
  .ob-actions .end{margin-left:0}
  .ob-btn{width:100%}
  .ob-top{gap:10px}
  .ob-brand{font-size:15px;white-space:nowrap}
  .ob-progress{font-size:12px;gap:8px}
  .ob-progress .long{display:none}
  .ob-progress .short{display:inline}
  .ob-bar{width:56px}
  .ob-editor .row{flex-wrap:nowrap}
  .ob-editor .row .ob-input{flex:1 1 auto;min-width:0;width:auto}
  .ob-editor .row .ob-btn{width:auto;flex:0 0 auto;padding:0 16px}
}
@media (prefers-reduced-motion:reduce){
  .ob-step{animation:none!important}
  .ob-btn,.ob-track,.ob-track::after,.ob-bar i{transition:none!important}
}
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

  /* ---------- installation (onboarding) ---------- */

  _renderOnboarding() {
    this.shadowRoot.innerHTML = `<style>${CORE.coreCss()}${CSS}</style>
      <div class="onb"><div class="ob-shell" id="ob"></div></div>`;
    this._ob = {
      step: (this._app && this._app.existing) ? 'existing' : 0,
      family: '',
      people: [],
      draft: { name: '', color: OB_COLORS[0], cal: true },
      err: null,
      busy: false,
      report: null,
    };
    this._obPaint();
  }

  _icon(name) {
    const ic = CORE && CORE.NAV_ICON && CORE.NAV_ICON[name];
    return ic ? ic.p : '';
  }

  _obTop(step) {
    const total = 3;
    const on = step >= 1 && step <= total;
    return `<div class="ob-top">
      <div class="ob-mark"><img src="/skylight-static/icon.png" alt=""></div>
      <span class="ob-brand">Skylight Hub Family</span>
      ${on ? `<div class="ob-progress"><span class="long">Étape ${step} sur ${total}</span><span class="short">${step}/${total}</span><span class="ob-bar"><i style="width:${Math.round(step / total * 100)}%"></i></span></div>` : ''}
    </div>`;
  }

  _obPaint() {
    const root = this.shadowRoot.getElementById('ob');
    if (!root) return;
    const ob = this._ob;
    const step = ob.step;

    if (step === 'existing') {
      root.innerHTML = `${this._obTop(0)}
        <div class="ob-main solo">
          <div class="ob-step ob-copy">
            <p class="ob-kicker">Données trouvées</p>
            <h1 class="ob-h1">Des données existent déjà</h1>
            <p class="ob-lead">Cette installation contient déjà des profils Skylight. Reprenez-les, ou repartez de zéro : dans ce cas l'application crée ses propres objets, sans toucher aux anciens.</p>
            <div class="ob-actions">
              <button class="ob-btn primary" id="reuse" type="button">Reprendre mes données</button>
              <button class="ob-btn ghost" id="fresh" type="button">Repartir de zéro</button>
            </div>
          </div>
        </div>`;
      root.querySelector('#reuse').addEventListener('click', () => this._obInstall(true));
      root.querySelector('#fresh').addEventListener('click', () => { ob.step = 1; this._obPaint(); });
      return;
    }

    if (step === 0) {
      root.innerHTML = `${this._obTop(0)}
        <div class="ob-main">
          <div class="ob-step ob-copy">
            <p class="ob-kicker">Bienvenue</p>
            <h1 class="ob-h1">Votre famille,<br>au même endroit.</h1>
            <p class="ob-lead">Les tâches de chacun, les étoiles gagnées, les repas de la semaine et les rendez-vous — réunis dans une seule application, sur votre Home Assistant.</p>
            <div class="ob-actions"><button class="ob-btn primary" id="go" type="button">Commencer</button></div>
            <p class="ob-foot">2 minutes · tout reste chez vous</p>
          </div>
          <div class="ob-hero"><img src="/skylight-static/icon.png" alt="Skylight Hub Family"></div>
        </div>`;
      root.querySelector('#go').addEventListener('click', () => { ob.step = 1; this._obPaint(); });
      return;
    }

    if (step === 1) {
      const name = ob.family || 'Ma famille';
      root.innerHTML = `${this._obTop(1)}
        <div class="ob-main">
          <div class="ob-step ob-copy">
            <h1 class="ob-h1">Comment s'appelle<br>votre famille ?</h1>
            <p class="ob-lead">C'est le nom affiché en haut de chaque écran. Vous pourrez le changer plus tard.</p>
            <label class="ob-field"><span>Nom de la famille</span>
              <input class="ob-input" id="fam" maxlength="40" value="${esc(ob.family)}" placeholder="Ma famille" autocomplete="off">
            </label>
            <div class="ob-actions">
              <button class="ob-btn ghost" id="back" type="button">Retour</button>
              <button class="ob-btn primary end" id="next" type="button">Continuer</button>
            </div>
          </div>
          <div class="ob-preview ob-step">
            <div class="initial" id="pvInit">${esc((name[0] || 'M').toUpperCase())}</div>
            <div class="nm" id="pvName">${esc(name)}</div>
            <p class="cap">Aperçu en direct — le nom se met à jour ici.</p>
          </div>
        </div>`;
      const inp = root.querySelector('#fam');
      const pvN = root.querySelector('#pvName');
      const pvI = root.querySelector('#pvInit');
      inp.addEventListener('input', () => {
        const v = inp.value.trim() || 'Ma famille';
        pvN.textContent = v;
        pvI.textContent = (v[0] || 'M').toUpperCase();
      });
      inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') root.querySelector('#next').click(); });
      root.querySelector('#back').addEventListener('click', () => { ob.family = inp.value.trim(); ob.step = 0; this._obPaint(); });
      root.querySelector('#next').addEventListener('click', () => {
        ob.family = inp.value.trim() || 'Ma famille';
        ob.step = 2;
        this._obPaint();
      });
      setTimeout(() => inp.focus(), 40);
      return;
    }

    if (step === 2) {
      const rows = ob.people.map((p, i) => `<div class="ob-row">
        <span class="ob-av" style="background:${p.color}">${esc((p.name[0] || '?').toUpperCase())}</span>
        <span class="txt"><span class="nm">${esc(p.name)}</span><span class="sub">${p.cal ? 'Calendrier créé' : 'Sans calendrier'}</span></span>
        <button class="ob-del" data-rm="${i}" type="button" aria-label="Retirer ${esc(p.name)}">×</button>
      </div>`).join('');
      root.innerHTML = `${this._obTop(2)}
        <div class="ob-main solo">
          <div class="ob-step">
            <h1 class="ob-h1">Qui vit ici ?</h1>
            <p class="ob-lead">Chaque personne aura sa colonne, sa couleur et son solde d'étoiles. Vous pourrez en ajouter d'autres plus tard.</p>
            <div class="ob-group">${rows || `<p class="ob-empty">Aucune personne pour l'instant. Ajoutez la première ci-dessous.</p>`}</div>
            <div class="ob-editor">
              <div class="row">
                <input class="ob-input" id="pname" maxlength="20" placeholder="Prénom" autocomplete="off" value="${esc(ob.draft.name)}">
                <button class="ob-btn primary" id="add" type="button" ${ob.draft.name.trim() ? '' : 'disabled'}>Ajouter</button>
              </div>
              <div class="ob-swatches">${OB_COLORS.map((c) => `<button class="ob-sw${c === ob.draft.color ? ' on' : ''}" type="button" data-color="${c}" style="background:${c}" aria-label="Couleur ${c}"></button>`).join('')}</div>
              <button class="ob-switch" id="cal" type="button" aria-pressed="${ob.draft.cal ? 'true' : 'false'}">
                <span class="ob-track${ob.draft.cal ? ' on' : ''}"></span>
                Créer un calendrier pour cette personne
              </button>
            </div>
            ${ob.err ? `<div class="ob-err">${esc(ob.err)}</div>` : ''}
            <div class="ob-actions">
              <button class="ob-btn ghost" id="back" type="button">Retour</button>
              <button class="ob-btn primary end" id="next" type="button" ${ob.people.length ? '' : 'disabled'}>Continuer</button>
            </div>
          </div>
        </div>`;
      const name = root.querySelector('#pname');
      const addBtn = root.querySelector('#add');
      name.addEventListener('input', () => { ob.draft.name = name.value; addBtn.disabled = !name.value.trim(); });
      const add = () => {
        const v = name.value.trim();
        if (!v) return;
        ob.people.push({ name: v, color: ob.draft.color, cal: ob.draft.cal });
        ob.draft.name = '';
        this._obPaint();
      };
      addBtn.addEventListener('click', add);
      name.addEventListener('keydown', (e) => { if (e.key === 'Enter') add(); });
      root.querySelectorAll('.ob-sw').forEach((b) => b.addEventListener('click', () => {
        ob.draft.color = b.dataset.color;
        root.querySelectorAll('.ob-sw').forEach((x) => x.classList.toggle('on', x === b));
      }));
      const cal = root.querySelector('#cal');
      cal.addEventListener('click', () => {
        ob.draft.cal = !ob.draft.cal;
        cal.setAttribute('aria-pressed', ob.draft.cal ? 'true' : 'false');
        cal.querySelector('.ob-track').classList.toggle('on', ob.draft.cal);
      });
      root.querySelectorAll('.ob-del').forEach((b) => b.addEventListener('click', () => {
        ob.people.splice(Number(b.dataset.rm), 1);
        this._obPaint();
      }));
      root.querySelector('#back').addEventListener('click', () => { ob.step = 1; this._obPaint(); });
      root.querySelector('#next').addEventListener('click', () => { ob.step = 3; this._obPaint(); });
      setTimeout(() => name.focus(), 40);
      return;
    }

    if (step === 3) {
      const cards = [
        ['cal', 'Le calendrier', 'La semaine de chacun, avec les vrais calendriers de Home Assistant.'],
        ['check', 'Les tâches', 'Une colonne par personne, les routines du matin et du soir.'],
        ['star', 'Les récompenses', 'Chaque tâche cochée rapporte des étoiles à échanger.'],
        ['meals', 'Les repas', 'La semaine entière, midi et soir, avec vos plats.'],
      ].map(([ic, t, d]) => `<div class="ob-card"><span class="ob-tile">${this._icon(ic)}</span><span><h3>${t}</h3><p>${d}</p></span></div>`).join('');
      root.innerHTML = `${this._obTop(3)}
        <div class="ob-main solo">
          <div class="ob-step">
            <h1 class="ob-h1">Voilà ce que vous aurez</h1>
            <p class="ob-lead">Rien d'autre à configurer. Chaque écran explique son fonctionnement la première fois.</p>
            <div class="ob-cards">
              ${cards}
              <div class="ob-card wide"><span class="ob-tile">${this._icon('people')}</span><span><h3>Les profils</h3><p>Un prénom, une couleur : toute l'application suit, sans rien reconfigurer.</p></span></div>
            </div>
            ${ob.err ? `<div class="ob-err">${esc(ob.err)}</div>` : ''}
            <div class="ob-actions">
              <button class="ob-btn ghost" id="back" type="button" ${ob.busy ? 'disabled' : ''}>Retour</button>
              <button class="ob-btn primary end" id="install" type="button" ${ob.busy ? 'disabled' : ''}>${ob.busy ? 'Installation…' : 'Installer'}</button>
            </div>
          </div>
        </div>`;
      root.querySelector('#back').addEventListener('click', () => { ob.step = 2; this._obPaint(); });
      root.querySelector('#install').addEventListener('click', () => this._obInstall(false));
      return;
    }

    const rep = ob.report || {};
    const profs = (rep.config && rep.config.profiles) || [];
    const cals = profs.filter((p) => p.calendar).length;
    const avs = profs.map((p) => `<span class="ob-av" style="background:${p.color}">${esc((p.name[0] || '?').toUpperCase())}</span>`).join('');
    root.innerHTML = `${this._obTop(0)}
      <div class="ob-ready ob-step">
        <div class="avs">${avs}</div>
        <h1>Votre famille est prête</h1>
        <p>Les tâches, les étoiles et les repas vous attendent.</p>
        <p class="sum">${esc((rep.config && rep.config.family_name) || ob.family)} · ${profs.length} personne${profs.length > 1 ? 's' : ''} · ${cals} calendrier${cals > 1 ? 's' : ''}</p>
        <div class="ob-actions" style="justify-content:center"><button class="ob-btn primary" id="enter" type="button">Entrer dans Skylight Hub Family</button></div>
      </div>`;
    root.querySelector('#enter').addEventListener('click', () => this._obEnter());
  }

  async _obInstall(keep) {
    const ob = this._ob;
    if (ob.busy) return;
    ob.busy = true;
    ob.err = null;
    this._obPaint();
    try {
      const res = await this._hass.callWS({
        type: 'skylight_hub_family/onboard',
        family_name: keep ? ((this._app && this._app.family_name) || 'Ma famille') : (ob.family || 'Ma famille'),
        people: keep ? [] : ob.people.map((p) => ({ name: p.name, color: p.color, create_calendar: !!p.cal })),
        keep: !!keep,
      });
      if (res && res.ok === false) throw new Error("L'installation a renvoyé une erreur.");
      ob.report = res || {};
      ob.busy = false;
      ob.step = 4;
      this._obPaint();
    } catch (e) {
      ob.busy = false;
      ob.err = 'Installation impossible : ' + ((e && e.message) || e);
      this._obPaint();
    }
  }

  async _obEnter() {
    this._mounted = {};
    await this._load();
    this._paint();
    await this._show(this._view);
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
          throw new Error('Ce calendrier autorise seulement la création depuis Home Assistant (Google, par exemple) : supprimez l\'événement depuis l\'application du calendrier.');
        }
        if (!d.uid) {
          throw new Error('Home Assistant ne transmet pas l\'identifiant de cet événement à l\'application : supprimez-le depuis l\'application Calendrier de Home Assistant.');
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
