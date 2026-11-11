/* skylight-rewards-card — écran « Récompenses » façon Skylight Calendar 2
 *
 * type: custom:skylight-rewards-card
 * rewards_entity: todo.recompenses      # 1 item = 1 récompense
 * profiles_entity: todo.profils         # registre des profils (source de vérité)
 * time_entity: sensor.heure_actuelle
 * weather_entity: weather.forecast_maison
 * family_initial: C
 * profiles: []                          # secours si le registre est vide
 *
 * Modèle
 * ------
 * Une récompense est un item de `todo.recompenses` :
 *   summary     = le libellé (« Glace au choix »)
 *   description = {"e":"🍦","c":60,"o":"elena"}
 *     e = emoji   c = coût en étoiles   o = propriétaire (id du profil)
 *     une fois échangée, on ajoute by (id) et d (AAAA-MM-JJ), et le statut
 *     passe à « completed ». L'historique EST la liste : aucune structure en
 *     plus, et un item peut redevenir disponible (« Réutiliser »).
 *
 * Le solde de chaque personne est un `counter.etoiles_<id>` (surchargeable par
 * `stars_entity` du profil). L'échange débite via `script.etoiles` (nom
 * surchargeable par `stars_script`) : jamais une écriture de valeur absolue.
 */

const SERIF = "var(--skylight-serif, Literata, Georgia, serif)";
const SANS = "var(--skylight-sans, Figtree, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif)";
const INK = "#1F2328";
const MUTED = "#7C8494";
const GOLD = "#F5B93E";

const SVG = {
  star: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12,17.27L18.18,21L16.54,13.97L22,9.24L14.81,8.62L12,2L9.19,8.62L2,9.24L7.45,13.97L5.82,21L12,17.27Z"/></svg>`,
  starOut: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12,15.39L8.24,17.66L9.23,13.38L5.91,10.5L10.29,10.13L12,6.09L13.71,10.13L18.09,10.5L14.77,13.38L15.76,17.66M22,9.24L14.81,8.63L12,2L9.19,8.63L2,9.24L7.45,13.97L5.82,21L12,17.27L18.18,21L16.54,13.97L22,9.24Z"/></svg>`,
  back: `<svg viewBox="0 0 24 24"><path d="M20,11V13H8L13.5,18.5L12.08,19.92L4.16,12L12.08,4.08L13.5,5.5L8,11H20Z"/></svg>`,
  plus: `<svg viewBox="0 0 24 24"><path d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z"/></svg>`,
  trash: `<svg viewBox="0 0 24 24"><path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z"/></svg>`,
  check: `<svg viewBox="0 0 24 24"><path d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z"/></svg>`,
  gift: `<svg viewBox="0 0 24 24"><path d="M22,12V20A2,2 0 0,1 20,22H4A2,2 0 0,1 2,20V12A1,1 0 0,1 1,11V8A2,2 0 0,1 3,6H6.17C6.06,5.69 6,5.35 6,5C6,3.34 7.34,2 9,2C10,2 10.88,2.5 11.43,3.24V3.23L12,4L12.57,3.23V3.24C13.12,2.5 14,2 15,2C16.66,2 18,3.34 18,5C18,5.35 17.94,5.69 17.83,6H21A2,2 0 0,1 23,8V11A1,1 0 0,1 22,12M4,20H11V12H4V20M20,20H13V12H20V20M13,10H20V8H13V10M4,10H11V8H4V10M9,4C8.45,4 8,4.45 8,5C8,5.55 8.45,6 9,6C9.55,6 10,5.55 10,5C10,4.45 9.55,4 9,4M15,4C14.45,4 14,4.45 14,5C14,5.55 14.45,6 15,6C15.55,6 16,5.55 16,5C16,4.45 15.55,4 15,4Z"/></svg>`,
};

const EMOJI_PICKS = ["🎁", "🍦", "🍕", "🎮", "🎬", "🧸", "🍫", "⚽", "🎨", "📚", "🎡", "💰"];

/* à incrémenter À CHAQUE dépôt, en même temps que le ?v= de la ressource */
const CARD_VERSION = 'v12';

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

function parseMeta(it) {
  try {
    const m = JSON.parse((it && it.description) || '{}');
    return (m && typeof m === 'object') ? m : {};
  } catch (e) { return {}; }
}

function alpha(hex, a) {
  const h = String(hex || '#7A8596').replace('#', '');
  const n = h.length === 3
    ? h.split('').map((c) => c + c).join('')
    : h.slice(0, 6);
  const r = parseInt(n.slice(0, 2), 16) || 0;
  const g = parseInt(n.slice(2, 4), 16) || 0;
  const b = parseInt(n.slice(4, 6), 16) || 0;
  return `rgba(${r},${g},${b},${a})`;
}

/* mélange linéaire de deux couleurs, comme la carte Tâches : c'est ce qui donne
   l'échelle de tons mesurée sur Skylight (colonne 20 %, tuile 32 %, bande 40 %) */
function mix(a, b, p) {
  const pa = [1, 3, 5].map((i) => parseInt(String(a).substr(i, 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(String(b).substr(i, 2), 16));
  return '#' + pa.map((v, i) => Math.round(v * (1 - p) + pb[i] * p).toString(16).padStart(2, '0')).join('');
}

/* échelle de tons : colonne < bande/pastille, identique à la vue Tâches pour que
   les deux écrans se lisent de la même façon */
function tones(p) {
  const fill = (p && p.color) || '#DDE3EA';
  return {
    col: mix('#ffffff', fill, 0.20),
    band: mix('#ffffff', fill, 0.40),
  };
}

function slug(s) {
  return String(s || '').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

/* ---------- tronc commun ----------
 * Jetons, en-tête et calculs viennent de famille-core.js : cette carte n'en
 * garde plus de copie. `CORE_URL` porte la version — l'incrémenter en même
 * temps que la ressource `famille-core` (ETAT-CHANTIER.md §9.2). */
const CORE_URL = '/skylight-static/famille-core.js?v=0.5.31';
let CORE = null;
let localDay;
const coreReady = import((typeof window !== 'undefined' && window.FAMILLE_CORE_URL) || CORE_URL)
  .then((m) => { CORE = m; localDay = m.localDay; return m; });

const CSS = `
:host{display:block;height:100%;max-height:100vh;overflow:hidden;font-family:${SANS};color:${INK};background:#fff}
*,*::before,*::after{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
.page{display:flex;flex-direction:column;height:100%;min-width:0;overflow:hidden;background:#fff}

/* ---- en-tête : même mesure que les autres vues (70 px, Literata 26) ---- */
/* l'en-tête (.hdr, .date, .time, .wx, .sp) est dans famille-core.js */
/* exception de cet écran : pas de météo en poche (la place est comptée) */

/* ---- plateau ---- */
.board{flex:1 1 auto;min-height:0;display:flex;gap:12px;padding:6px 14px 14px;overflow-x:auto;overflow-y:hidden;scrollbar-width:none}
.board::-webkit-scrollbar{display:none}
.col{flex:1 1 0;min-width:250px;min-height:0;overflow:hidden;border-radius:30px;background:var(--col);display:flex;flex-direction:column;padding:14px 14px 0}

.head{flex:0 0 auto;display:flex;align-items:center;gap:11px;padding:1px 3px 0}
.ava{width:54px;height:54px;flex:0 0 54px;border-radius:50%;overflow:hidden;background:var(--accent);display:grid;place-items:center;color:#fff;font-size:21px;font-weight:700;box-shadow:0 0 0 2.5px var(--halo),0 2px 9px var(--halo)}
.ava img{width:100%;height:100%;object-fit:cover;display:block}
.who{min-width:0;flex:1}
.nm{font-family:${SERIF};font-size:26px;line-height:1.18;letter-spacing:-.01em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.solde{display:flex;align-items:center;gap:7px;margin-top:5px;height:32px;padding:0 13px 0 11px;border-radius:999px;background:var(--band);font-size:19px;font-weight:800;line-height:1;width:fit-content;max-width:100%}
.solde svg{width:18px;height:18px;flex:0 0 18px;fill:${GOLD};display:block}
.solde .n{display:inline-block;line-height:1;transform:translateY(.5px)}

/* ---- zone défilante ---- */
.scroll{flex:1 1 auto;min-height:0;overflow-y:auto;overflow-x:hidden;padding:2px 3px 12px;scrollbar-width:none}
.scroll::-webkit-scrollbar{display:none}
.sect{font-family:${SERIF};font-size:20px;margin:16px 2px 9px;flex:0 0 auto}
.sect:first-child{margin-top:14px}

/* ---- carte récompense ---- */
.rlist{display:flex;flex-direction:column;gap:9px}
/* l'enveloppe porte le bouton de gestion posé en coin : une carte reste un
   <button> (Échanger), on ne peut donc pas imbriquer le bouton dedans */
.rw{position:relative}
.mng{position:absolute;top:7px;right:9px;z-index:2;width:26px;height:26px;padding:0;border:0;border-radius:50%;background:transparent;color:#8A8F9C;font:inherit;font-size:17px;line-height:1;font-weight:600;display:grid;place-items:center;cursor:pointer;opacity:.5;transition:opacity .12s ease,color .12s ease}
.mng:hover{opacity:1;color:#1F2328}
.rw>.mng:active{opacity:1;color:#1F2328;transform:scale(.9)}
/* un bouton volontairement discret ne s'assombrit pas : il s'ALLUME quand on appuie
   (l'assombrissement global du tronc le rendait invisible). */
.addrow:active{background:rgba(20,24,40,.07)}
.rc{position:relative;border:0;width:100%;border-radius:22px;background:#fff;color:inherit;font:inherit;text-align:center;cursor:pointer;padding:12px 12px 11px;display:flex;flex-direction:column;gap:6px;overflow:hidden;transition:transform .07s ease}
.rc:active{transform:scale(.985)}
.rc .em{font-size:42px;line-height:1.05}
.rc .ttl{font-size:14.5px;font-weight:700;line-height:1.2;word-break:break-word}
.rc .bar{position:relative;width:100%;height:26px;border-radius:999px;background:var(--band);overflow:hidden;display:flex;align-items:center;justify-content:center;font-size:12.5px;font-weight:700;line-height:1;margin-top:2px}
.rc .bar .fill{position:absolute;left:0;top:0;bottom:0;background:var(--accent);opacity:.62;border-radius:999px;transition:width .48s cubic-bezier(.32,.72,0,1)}
.rc .bar .txt{position:relative;display:flex;align-items:center;gap:4px;height:26px;line-height:1}
.rc .bar svg{width:13px;height:13px;flex:0 0 13px;fill:#A89B84;display:block}
.rc .bar .n{display:inline-block;line-height:1;transform:translateY(.5px)}
.rc.can .bar{display:none}
.rc .go{display:flex;align-items:center;justify-content:center;gap:6px;width:100%;height:30px;border-radius:999px;background:var(--accent);color:#fff;font-size:13px;font-weight:800;letter-spacing:.01em;margin-top:2px}
.rc .go svg{width:14px;height:14px;flex:0 0 14px;fill:#fff;display:block}
.rc .need{display:none}
.rc.lack .bar{background:var(--band)}

/* ---- déjà gagnées ---- */
.dlist{display:flex;flex-direction:column;gap:7px}
.dr{display:flex;align-items:center;gap:9px;width:100%;border-radius:999px;background:var(--band);padding:7px 8px 7px 12px;min-height:42px}
.dr .em{font-size:19px;line-height:1;flex:0 0 auto}
.dr .dtx{flex:1 1 auto;min-width:0;display:flex;flex-direction:column;gap:2px}
.dr .lb{font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dr .sub{font-size:10.5px;font-weight:600;color:#6C7382;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dr .undo{border:0;background:#fff;border-radius:999px;padding:6px 10px;font:inherit;font-size:10.5px;font-weight:800;color:#3A4050;cursor:pointer;flex:0 0 auto;box-shadow:0 1px 2px rgba(31,35,40,.08)}

/* ---- ajouts ---- */
.addrow{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;margin-top:11px;border:0;border-radius:999px;background:transparent;border:1.5px dashed var(--halo);color:#5A6074;font:inherit;font-size:13px;font-weight:700;padding:10px;cursor:pointer}
.addrow:hover{background:rgba(255,255,255,.55)}
.addrow .plus{width:20px;height:20px;flex:0 0 20px;border-radius:50%;background:#fff;display:grid;place-items:center;box-shadow:0 1px 2px rgba(31,35,40,.10)}
.addrow .plus svg{width:13px;height:13px;fill:currentColor;display:block}

.empty{display:flex;flex-direction:column;align-items:center;gap:10px;padding:26px 6px;color:#7C8494;font-size:13px;font-weight:600;text-align:center;line-height:1.35}
.empty .e{font-size:40px;line-height:1;opacity:.9}

/* ---- feuille ---- */
.scrim{position:fixed;inset:0;background:rgba(20,24,40,.34);display:none;z-index:98}
.scrim.on{display:block}
.panel{position:fixed;top:0;right:0;bottom:0;width:390px;max-width:92vw;background:#fff;z-index:99;border-radius:24px 0 0 24px;box-shadow:-18px 0 44px rgba(20,24,40,.20);display:none;flex-direction:column;padding:max(16px,env(safe-area-inset-top,0px)) max(16px,env(safe-area-inset-right,0px)) 0 max(16px,env(safe-area-inset-left,0px))}
.panel.on{display:flex}
.ptop{display:flex;align-items:center;gap:10px;padding:4px 2px 6px;flex:0 0 auto}
.pback{width:38px;height:38px;flex:0 0 38px;border:0;border-radius:50%;background:transparent;color:${INK};cursor:pointer;display:grid;place-items:center;margin-left:-8px}
.pback svg{width:22px;height:22px;fill:currentColor}
.pttl{font-family:${SERIF};font-size:25px;font-weight:600;letter-spacing:-.01em}
.pbody{flex:1 1 auto;overflow-y:auto;padding:8px 2px;scrollbar-width:none}
.pbody::-webkit-scrollbar{display:none}
.pfoot{flex:0 0 auto;padding:8px 2px 16px}
.fld{margin-bottom:11px}
.fld label{display:block;font-size:11.5px;font-weight:800;color:#7C8494;text-transform:uppercase;letter-spacing:.04em;margin:0 2px 6px}
.fld input{width:100%;height:52px;border:0;border-radius:14px;background:#F4F6F8;padding:0 16px;font:inherit;font-size:16px;color:${INK}}
.fld input:focus{outline:none;background:#fff;box-shadow:inset 0 0 0 2px var(--f-blue-line,rgba(0,122,255,.42))}
.erow{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
.erow button{width:40px;height:40px;border:0;border-radius:12px;background:#F4F6F8;font-size:20px;line-height:1;cursor:pointer;display:grid;place-items:center}
.erow button[data-on="1"]{background:var(--f-blue-soft,#E5F0FF);box-shadow:inset 0 0 0 2px var(--f-blue,#007AFF)}
.glist{display:flex;flex-direction:column;gap:8px}
.grow{display:flex;align-items:center;gap:14px;border:0;background:#F7F8FB;border-radius:20px;padding:8px 14px 8px 8px;font:inherit;cursor:pointer;text-align:left;width:100%}
.grow .ga{width:40px;height:40px;flex:0 0 40px;border-radius:50%;overflow:hidden;background:var(--accent);display:grid;place-items:center;font-weight:700;color:#fff;font-size:16px;box-shadow:0 0 0 3px var(--halo),0 2px 9px var(--halo)}
.grow .ga img{width:100%;height:100%;object-fit:cover;display:block}
.grow[data-on="1"] .ga{box-shadow:0 0 0 3px #fff,0 0 0 6px var(--accent)}
.grow .gn{flex:1 1 auto;font-size:15.5px;font-weight:600;color:#2B2F38}
.grow .radio{width:24px;height:24px;flex:0 0 24px;border-radius:50%;border:2px solid #C7CEDA;display:grid;place-items:center;transition:border-color .15s ease,background .15s ease}
.grow[data-on="1"] .radio{border-color:var(--accent);background:var(--accent)}
.grow[data-on="1"] .radio::after{content:'';width:8px;height:8px;border-radius:50%;background:#fff}
.go{width:100%;height:54px;border-radius:16px;border:0;background:var(--f-blue,#007AFF);color:#fff;font:inherit;font-size:17px;font-weight:700;cursor:pointer}
.go[data-on="0"]{background:#C7D6E2;cursor:default}
.go.danger{background:transparent;color:var(--f-danger,#FF3B30);margin-top:8px;height:46px;font-size:15px}

/* ---- célébration ---- */
.celebrate{position:fixed;inset:0;z-index:10001;display:none;align-items:center;justify-content:center;pointer-events:none;overflow:hidden;background:rgba(20,24,40,.30)}
.celebrate.on{display:flex;pointer-events:auto}
.cel-card{position:relative;z-index:2;background:#fff;border-radius:26px;padding:26px 34px 22px;text-align:center;box-shadow:0 18px 50px rgba(20,24,40,.22);animation:celin .42s cubic-bezier(.34,1.5,.64,1);max-width:min(420px,86vw)}
.cel-em{font-size:56px;line-height:1}
.cel-ttl{font-family:${SERIF};font-size:25px;font-weight:600;margin-top:8px}
.cel-sub{font-size:15px;font-weight:600;color:#2B2F38;margin-top:4px}
.cel-meta{font-size:12.5px;color:${MUTED};margin-top:5px}
.cel-go{margin-top:16px;width:100%;height:46px;border-radius:999px;border:0;background:var(--f-blue,#007AFF);color:#fff;font:inherit;font-size:15px;font-weight:700;cursor:pointer}
.cel-again{margin-top:10px;border:0;background:none;color:${MUTED};font:inherit;font-size:12.5px;font-weight:700;cursor:pointer;text-decoration:underline;padding:4px}
.cel-piece{position:absolute;top:-28px;color:${GOLD};will-change:transform;animation:fall linear forwards;text-shadow:0 1px 2px rgba(120,80,0,.20)}
@keyframes celin{from{transform:scale(.82);opacity:0}to{transform:scale(1);opacity:1}}
@keyframes fall{0%{transform:translate3d(0,-10px,0) rotate(0);opacity:0}8%{opacity:1}100%{transform:translate3d(var(--dx,0),105vh,0) rotate(var(--rot,540deg));opacity:1}}

/* ---- mobile : une colonne à la fois ---- */
@media (max-width:900px){
  .hdr .wx{display:none}
  .board{padding:6px 12px 12px;gap:10px}
  .col{flex:0 0 min(88%,320px);min-width:0}
  .nm{font-size:22px}
  .panel{width:100%;max-width:100%;border-radius:0}
}
`;

class SkylightRewardsCard extends HTMLElement {
  setConfig(config) {
    const cfg = Object.assign({
      rewards_entity: 'todo.recompenses',
      profiles_entity: 'todo.profils',
      family_initial: 'C',
    }, config || {});
    cfg.profiles = (cfg.profiles || []).slice();
    this._cfg = cfg;
    this._data = this._data || {};
    this._rewards = this._rewards || [];
    if (this._built) this._render();
  }

  getCardSize() { return 12; }

  set hass(hass) {
    this._hass = hass;
    /* le tronc commun est un module : on démarre dès qu'il est là */
    if (!CORE) {
      if (!this._coreAsked) {
        this._coreAsked = true;
        coreReady.then(() => { if (this._hass) this.hass = this._hass; }).catch(() => {});
      }
      return;
    }
    if (!this._built) { this._build(); return; }
    /* relit les listes quand leur état change (nombre d'items, mise à jour) */
    const sig = [this._cfg.rewards_entity, this._cfg.profiles_entity].map((id) => {
      const s = hass.states[id];
      return s ? s.state + '|' + s.last_updated : '-';
    }).join('~');
    if (sig !== this._sig) {
      this._sig = sig;
      /* même précaution que la carte Tâches : ne pas perdre l'événement quand la
         fenêtre anti-animation est ouverte */
      const wait = (this._skipLoadUntil || 0) - Date.now();
      if (wait <= 0) this._load();
      else {
        clearTimeout(this._deferLoad);
        this._deferLoad = setTimeout(() => this._load(), wait + 30);
      }
    }
    /* Le plateau n'est reconstruit que si un SOLDE change (c'est ce qui fait
       passer une jauge en bouton « Échanger ») — et non à chaque état de la
       maison, ce qui reconstruisait 4 colonnes pour un capteur de température. */
    const ssig = this._starsSig(hass);
    if (ssig !== this._ssig) {
      this._ssig = ssig;
      this._render();
    }
  }

  _starsSig(hass) {
    return this._profiles().map((p) => {
      const e = this._soldeEntity(p);
      const s = e && hass && hass.states[e];
      return s ? s.state : '-';
    }).join(',');
  }

  connectedCallback() {
    /* marqueur de version : permet de distinguer « bug » de « copie en cache » */
    if (this.dataset) this.dataset.skylightVer = CARD_VERSION;
    if (!window.__SKYLIGHT_REWARDS_VER) {
      window.__SKYLIGHT_REWARDS_VER = CARD_VERSION;
      console.log('[skylight-rewards-card] ' + CARD_VERSION);
    }
    this._onResize = () => this._fit();
    window.addEventListener('resize', this._onResize);
    [0, 80, 300, 900, 2000].forEach((t) => setTimeout(() => this._fit(), t));
    this._timer = setInterval(() => this._fit(), 30000);
    this._fit();
  }

  disconnectedCallback() {
    if (this._timer) clearInterval(this._timer);
    this._timer = null;
    if (this._onResize) window.removeEventListener('resize', this._onResize);
    this._onResize = null;
  }

  /* la vue est `panel` : sans hauteur explicite la carte se contenterait de son
     contenu et déborderait de l'écran */
  _fit() {
    if (!this.isConnected) return;
    const par = this.parentElement;
    const ph = par ? par.clientHeight : 0;
    const top = this.getBoundingClientRect().top;
    let h = ph > 60 ? ph : (window.innerHeight - top - 10);
    h = Math.max(320, Math.min(h, window.innerHeight));
    if (Math.abs((parseFloat(this.style.height) || 0) - h) > 1) this.style.height = h + 'px';
  }

  _build() {
    if (this._built) return;
    this._root = this.attachShadow({ mode: 'open' });
    this._root.innerHTML = `<style>${CORE.coreCss()}${CSS}</style>
      <div class="page">
        ${CORE.headerHtml({ variant: 'flat', dayNav: false })}
        <div class="board" id="board"></div>
      </div>
      <div class="scrim" id="scrim"></div>
      <div class="panel" id="panel"></div>
      <div class="celebrate" id="celebrate"></div>`;
    this._board = this._root.getElementById('board');
    this._built = true;
    this._load();
    this._fit();
  }

  /* ---------- données ---------- */

  _fetchItems(ent) {
    const h = this._hass;
    if (!h) return Promise.resolve([]);
    return h.callWS({ type: 'todo/item/list', entity_id: ent })
      .then((r) => ((r && r.items) || []))
      /* repli par service : le schéma attend `status`, et son défaut est
         « needs_action » seul — sans les deux valeurs, les récompenses déjà
         gagnées disparaîtraient de la liste */
      .catch(() => h.callService('todo', 'get_items',
        { status: ['needs_action', 'completed'] }, { entity_id: ent }, false, true)
        .then((r) => {
          const resp = (r && r.response) || {};
          const own = resp[ent] && resp[ent].items;
          if (own) return own;
          const k = Object.keys(resp)[0];
          return (k && resp[k] && resp[k].items) || [];
        })
        .catch(() => []));
  }

  _load() {
    const h = this._hass;
    if (!h || !h.callWS) return;
    /* jeton de course : sans l'initialiser, ++undefined vaut NaN et NaN !== NaN
       ferait sortir de la promesse à chaque fois */
    this._loadToken = (this._loadToken || 0) + 1;
    const token = this._loadToken;
    Promise.all([
      this._fetchItems(this._cfg.rewards_entity),
      this._fetchItems(this._cfg.profiles_entity || 'todo.profils'),
    ]).then(([rewards, profiles]) => {
      if (token !== this._loadToken) return;
      this._rewards = rewards || [];
      this._profilesRaw = profiles || [];
      this._render();
    });
  }

  /* les profils vivent dans `todo.profils` et nulle part ailleurs ; la config de
     la carte ne sert que de secours si le registre est vide.
     L'ordre est celui du champ `ord` (réglé depuis l'écran Profils). */
  _profiles() {
    const list = (this._profilesRaw || []).map((it, i) => {
      const m = parseMeta(it);
      const id = m.i || slug(it.summary);
      const face = m.p || '';
      const p = {
        id,
        name: it.summary || id,
        color: m.c || '#DDE3EA',
        accent: m.a || '#7A8596',
        stars: m.s === undefined ? true : !!m.s,
        photo: '',
        glyph: '',
        _ord: Number.isFinite(Number(m.ord)) && m.ord !== '' && m.ord !== null ? Number(m.ord) : i,
        _i: i,
      };
      if (face) {
        if (face.charAt(0) === ':') p.glyph = face.slice(1);
        else p.photo = face;
      }
      return p;
    }).filter((p) => p.id)
      .sort((a, b) => (a._ord - b._ord) || (a._i - b._i))
      .map((p) => { delete p._ord; delete p._i; return p; });
    if (list.length) return list;
    return (this._cfg.profiles || []).map((p) => Object.assign({
      color: '#DDE3EA', accent: '#7A8596', stars: true, photo: '', glyph: '',
    }, p));
  }

  _soldeEntity(p) {
    if (!p) return null;
    if (p.stars_entity) return p.stars_entity;
    if (!p.id || p.id.indexOf('__') === 0) return null;
    return `counter.etoiles_${p.id}`;
  }

  _solde(p) {
    const ent = this._soldeEntity(p);
    const st = ent && this._hass ? this._hass.states[ent] : null;
    if (!st) return null;
    const v = Number(st.state);
    return isFinite(v) ? v : null;
  }

  _items() {
    const profs = this._profiles();
    return (this._rewards || []).map((it) => {
      const m = parseMeta(it);
      return {
        uid: it.uid,
        title: it.summary || '',
        done: it.status === 'completed',
        emoji: m.e || '🎁',
        cost: Math.max(1, Number(m.c) || 10),
        owner: m.o || '',
        by: m.by || '',
        date: m.d || '',
        meta: m,
      };
    }).filter((r) => profs.some((p) => p.id === r.owner) || !r.owner);
  }

  /* ---------- rendu ---------- */

  _render() {
    if (!this._built || !this._cfg) return;
    const profs = this._profiles();
    const items = this._items();
    const keep = {};
    this._board.querySelectorAll('[data-scroll]').forEach((s) => { keep[s.dataset.scroll] = s.scrollTop; });
    this._renderHeader(profs, items);
    this._board.innerHTML = profs.map((p) => this._col(p, items)).join('')
      || `<div class="empty" style="margin:auto"><span class="e">🎁</span>Aucun profil.<br>Créez-en un depuis l’écran Profils.</div>`;
    this._board.querySelectorAll('[data-scroll]').forEach((s) => {
      if (keep[s.dataset.scroll] != null) s.scrollTop = keep[s.dataset.scroll];
    });
    this._bind();
    this._fit();
  }

  _renderHeader(profs) {
    const h = this._hass;
    const t = new Date();
    const DAYS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet',
      'août', 'septembre', 'octobre', 'novembre', 'décembre'];
    const date = `${DAYS[t.getDay()]} ${t.getDate()} ${MONTHS[t.getMonth()]}`;

    const timeEnt = this._cfg.time_entity && h && h.states[this._cfg.time_entity];
    const time = timeEnt ? timeEnt.state : t.toTimeString().slice(0, 5);

    let wx = '';
    const wEnt = this._cfg.weather_entity && h && h.states[this._cfg.weather_entity];
    if (wEnt) {
      const attrs = wEnt.attributes || {};
      const EM = {
        'clear-night': '🌙', cloudy: '☁️', fog: '🌫️', hail: '🌨️', lightning: '🌩️',
        'lightning-rainy': '⛈️', partlycloudy: '⛅', pouring: '🌧️', rainy: '🌦️',
        snowy: '❄️', 'snowy-rainy': '🌨️', sunny: '☀️', windy: '🌬️', 'windy-variant': '🌬️',
      };
      const em = EM[wEnt.state] || '⛅';
      const temp = attrs.temperature != null ? `${Math.round(attrs.temperature)}°` : '';
      /* on ne rend que le CONTENU du bloc météo : le conteneur `.wx` est fourni
         par l'en-tête du tronc commun */
      wx = `<span class="wemo">${em}</span>${esc(temp)}`;
    }

    /* l'en-tête est peint par le tronc commun : date, heure, météo. Chaque
       écran fournit son propre texte (format de date, emoji météo). */
    CORE.paintHeader(this._root, { date, time, weather: wx });
  }

  _col(p, items) {
    const acc = p.accent || '#7A8596';
    const tk = tones(p);
    const style = `--col:${esc(tk.col)};--band:${esc(tk.band)};--accent:${esc(acc)};--halo:${esc(alpha(acc, 0.30))}`;

    const solde = this._solde(p) || 0;
    const mine = items.filter((r) => r.owner === p.id);
    const open = mine.filter((r) => !r.done).sort((a, b) => (a.cost - b.cost) || a.title.localeCompare(b.title));
    const won = mine.filter((r) => r.done)
      .sort((a, b) => String(b.date).localeCompare(String(a.date)));

    const avatar = p.photo
      ? `<img src="${esc(p.photo)}" alt="">`
      : (p.glyph ? esc(p.glyph) : esc((p.name || '?').trim().charAt(0).toUpperCase()));

    const cards = open.map((r) => {
      const can = solde >= r.cost;
      /* un solde peut être négatif (on a décocché une tâche dont les étoiles
         étaient déjà dépensées) : sans borne, la largeur calculée serait invalide */
      const pct = Math.max(0, Math.min(100, Math.round((solde / r.cost) * 100)));
      return `<div class="rw">
      <button class="rc${can ? ' can' : ' lack'}" data-r="${esc(r.uid)}">
        <span class="em">${esc(r.emoji)}</span>
        <span class="ttl">${esc(r.title)}</span>
        ${can
    ? `<span class="go">Échanger ${SVG.star}<span class="n">${r.cost}</span></span>`
    : `<span class="bar"><span class="fill" style="width:${pct}%"></span><span class="txt">${SVG.star}<span class="n">${solde}/${r.cost}</span></span></span>`}
      </button>
      <button class="mng" data-mng="${esc(r.uid)}" aria-label="Modifier ou supprimer cette récompense" title="Modifier ou supprimer">⋯</button>
    </div>`;
    }).join('');

    const wonHtml = won.length
      ? `<div class="sect">Déjà gagnées</div>
         <div class="dlist">${won.map((r) => `<div class="dr">
            <span class="em">${esc(r.emoji)}</span>
            <span class="dtx"><span class="lb">${esc(r.title)}</span>
              <span class="sub">${esc(this._relDate(r.date))} · ${r.cost} ★</span></span>
            <button class="undo" data-u="${esc(r.uid)}">Réutiliser</button>
          </div>`).join('')}</div>`
      : '';

    const body = cards
      ? `<div class="sect">Récompenses</div><div class="rlist">${cards}</div>${wonHtml}`
      : `<div class="empty"><span class="e">🎁</span>${won.length
        ? 'Tout est gagné !' : 'Aucune récompense pour le moment.'}</div>${wonHtml}`;

    return `<section class="col" data-prof="${esc(p.id)}" style="${style}">
      <div class="head">
        <div class="ava">${avatar}</div>
        <div class="who">
          <div class="nm">${esc(p.name)}</div>
          <div class="solde" data-solde="${esc(p.id)}">${SVG.star}<span class="n">${solde}</span></div>
        </div>
      </div>
      <div class="scroll" data-scroll="${esc(p.id)}">
        ${body}
        <button class="addrow" data-add="${esc(p.id)}"><span class="plus">${SVG.plus}</span>Ajouter une récompense</button>
      </div>
    </section>`;
  }

  _relDate(iso) {
    if (!iso) return 'Gagnée';
    const d = new Date(iso + 'T12:00:00');
    if (isNaN(d.getTime())) return 'Gagnée';
    const t = new Date();
    t.setHours(12, 0, 0, 0);
    const diff = Math.round((t - d) / 86400000);
    if (diff === 0) return "Aujourd'hui";
    if (diff === 1) return 'Hier';
    if (diff > 1 && diff < 7) return `Il y a ${diff} jours`;
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  }

  _fmtDate(iso) {
    const d = iso ? new Date(iso + 'T12:00:00') : new Date();
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  /* ---------- interactions ---------- */

  _bind() {
    const root = this._root;
    root.querySelectorAll('[data-r]').forEach((el) => {
      const uid = el.dataset.r;
      let timer = null;
      let long = false;
      const start = () => {
        long = false;
        timer = setTimeout(() => { long = true; this._editPanel(uid); }, 550);
      };
      const end = () => { if (timer) { clearTimeout(timer); timer = null; } };
      el.addEventListener('pointerdown', start);
      el.addEventListener('pointerup', end);
      el.addEventListener('pointerleave', end);
      el.addEventListener('pointercancel', end);
      el.addEventListener('click', (ev) => {
        ev.preventDefault();
        if (long) { long = false; return; }
        this._redeem(uid);
      });
    });
    /* bouton « ⋯ » : le seul chemin VISIBLE vers modifier/supprimer. L'appui
       long reste un raccourci, mais il ne peut plus être le seul moyen. */
    root.querySelectorAll('[data-mng]').forEach((el) => {
      el.addEventListener('click', (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        this._editPanel(el.dataset.mng);
      });
    });
    root.querySelectorAll('[data-u]').forEach((el) => {
      el.addEventListener('click', (ev) => { ev.stopPropagation(); this._unredeem(el.dataset.u); });
    });
    root.querySelectorAll('[data-add]').forEach((el) => {
      el.addEventListener('click', () => this._addPanel(el.dataset.add));
    });
  }

  _sheet(title, bodyHtml, footHtml) {
    const root = this._root;
    const panel = root.getElementById('panel');
    const scrim = root.getElementById('scrim');
    panel.innerHTML = `<div class="ptop">
        <button class="pback" id="p-back" aria-label="Retour">${SVG.back}</button>
        <div class="pttl">${esc(title)}</div>
      </div>
      <div class="pbody">${bodyHtml}</div>
      <div class="pfoot">${footHtml || ''}</div>`;
    panel.classList.add('on');
    scrim.classList.add('on');
    const close = () => {
      panel.classList.remove('on');
      scrim.classList.remove('on');
      panel.innerHTML = '';
    };
    /* même piège que dans Tâches : le voile arrive SOUS le doigt pendant
       l'appui long, et le relâchement le viserait → le panneau se refermait. */
    scrim.onpointerdown = () => { this._scrimTouched = true; };
    scrim.onclick = () => {
      const touched = this._scrimTouched;
      this._scrimTouched = false;
      if (touched) close();
    };
    root.getElementById('p-back').onclick = close;
    return close;
  }

  _profileRow(p) {
    const acc = p.accent || '#7A8596';
    const face = p.photo ? `<img src="${esc(p.photo)}" alt="">`
      : (p.glyph ? esc(p.glyph) : esc((p.name || '?').charAt(0).toUpperCase()));
    return `<button class="grow" data-pick="${esc(p.id)}" style="--accent:${esc(acc)};--halo:${esc(alpha(acc, 0.3))}">
      <span class="ga">${face}</span><span class="gn">${esc(p.name)}</span><span class="radio"></span></button>`;
  }

  _addPanel(profId) {
    const profs = this._profiles();
    const close = this._sheet('Nouvelle récompense', `
      <div class="fld"><label>Récompense</label><input id="f-title" type="text" placeholder="Glace au choix" autocomplete="off"></div>
      <div class="fld"><label>Emoji</label><input id="f-emoji" type="text" value="🎁" maxlength="4">
        <div class="erow" id="f-picks">${EMOJI_PICKS.map((e) => `<button type="button" data-em="${e}">${e}</button>`).join('')}</div>
      </div>
      <div class="fld"><label>Coût en étoiles</label><input id="f-cost" type="number" min="1" step="10" value="100" inputmode="numeric"></div>
      <div class="fld"><label>Pour qui</label><div class="glist" id="f-owners">${profs.map((p) => this._profileRow(p)).join('')}</div></div>
    `, '<button class="go" id="f-go" data-on="0">Ajouter</button>');

    const root = this._root;
    let owner = profId || (profs[0] && profs[0].id) || '';
    const go = root.getElementById('f-go');
    const emojiInput = root.getElementById('f-emoji');
    const title = root.getElementById('f-title');
    const cost = root.getElementById('f-cost');

    root.querySelectorAll('[data-pick]').forEach((b) => {
      b.dataset.on = b.dataset.pick === owner ? '1' : '0';
      b.addEventListener('click', () => {
        owner = b.dataset.pick;
        root.querySelectorAll('[data-pick]').forEach((x) => { x.dataset.on = x === b ? '1' : '0'; });
        this._checkAddForm(go, title);
      });
    });
    root.querySelectorAll('[data-em]').forEach((b) => {
      b.addEventListener('click', () => {
        if (emojiInput) emojiInput.value = b.dataset.em;
        root.querySelectorAll('[data-em]').forEach((x) => { x.dataset.on = x === b ? '1' : '0'; });
      });
    });
    if (title) {
      title.addEventListener('input', () => this._checkAddForm(go, title));
      setTimeout(() => title.focus(), 120);
    }
    this._markEmoji(emojiInput && emojiInput.value);
    if (emojiInput) {
      emojiInput.addEventListener('input', () => this._markEmoji(emojiInput.value));
    }
    if (go) {
      go.addEventListener('click', () => {
        const name = (title && title.value || '').trim();
        if (!name || !owner) return;
        const em = (emojiInput && emojiInput.value || '🎁').trim() || '🎁';
        const c = Math.max(1, Number(cost && cost.value) || 10);
        close();
        this._addReward(name, em, c, owner);
      });
    }
    this._checkAddForm(go, title);
  }

  _checkAddForm(go, title) {
    if (!go) return;
    go.dataset.on = (title && title.value.trim()) ? '1' : '0';
  }

  /* met en évidence l'emoji courant dans la rangée de propositions */
  _markEmoji(value) {
    const root = this._root;
    const v = String(value || '').trim();
    root.querySelectorAll('[data-em]').forEach((x) => {
      x.dataset.on = x.dataset.em === v ? '1' : '0';
    });
  }

  _editPanel(uid) {
    const r = this._items().find((x) => x.uid === uid);
    if (!r) return;
    const profs = this._profiles();
    const close = this._sheet('Modifier', `
      <div class="fld"><label>Récompense</label><input id="f-title" type="text" value="${esc(r.title)}"></div>
      <div class="fld"><label>Emoji</label><input id="f-emoji" type="text" value="${esc(r.emoji)}" maxlength="4">
        <div class="erow" id="f-picks">${EMOJI_PICKS.map((e) => `<button type="button" data-em="${e}">${e}</button>`).join('')}</div>
      </div>
      <div class="fld"><label>Coût en étoiles</label><input id="f-cost" type="number" min="1" step="10" value="${r.cost}" inputmode="numeric"></div>
      <div class="fld"><label>Pour qui</label><div class="glist" id="f-owners">${profs.map((p) => this._profileRow(p)).join('')}</div></div>
    `, `<button class="go" id="f-go" data-on="1">Enregistrer</button>
        <button class="go danger" id="f-del">Supprimer</button>`);

    const root = this._root;
    let owner = r.owner || (profs[0] && profs[0].id) || '';
    const emojiInput = root.getElementById('f-emoji');
    const title = root.getElementById('f-title');
    const cost = root.getElementById('f-cost');

    root.querySelectorAll('[data-pick]').forEach((b) => {
      b.dataset.on = b.dataset.pick === owner ? '1' : '0';
      b.addEventListener('click', () => {
        owner = b.dataset.pick;
        root.querySelectorAll('[data-pick]').forEach((x) => { x.dataset.on = x === b ? '1' : '0'; });
      });
    });
    root.querySelectorAll('[data-em]').forEach((b) => {
      b.addEventListener('click', () => {
        if (emojiInput) emojiInput.value = b.dataset.em;
        root.querySelectorAll('[data-em]').forEach((x) => { x.dataset.on = x === b ? '1' : '0'; });
      });
    });
    if (emojiInput) {
      this._markEmoji(emojiInput.value);
      emojiInput.addEventListener('input', () => this._markEmoji(emojiInput.value));
    }
    root.getElementById('f-go').addEventListener('click', () => {
      const name = (title.value || '').trim();
      if (!name) return;
      close();
      this._updateReward(uid, name, (emojiInput.value || '🎁').trim() || '🎁',
        Math.max(1, Number(cost.value) || 10), owner);
    });
    /* suppression en deux temps : le premier appui arme, le second supprime.
       Avant, un seul appui effaçait la récompense sans retour possible. */
    root.getElementById('f-del').addEventListener('click', (ev) => {
      const b = ev.currentTarget;
      if (!b.dataset.armed) {
        b.dataset.armed = '1';
        b.textContent = 'Confirmer la suppression';
        return;
      }
      close();
      this._deleteReward(uid);
    });
  }

  /* ---------- écritures ---------- */

  _afterWrite() {
    this._skipLoadUntil = Date.now() + 900;
    this._render();
    setTimeout(() => this._load(), 900);
  }

  _addReward(name, emoji, cost, owner) {
    const h = this._hass;
    if (!h) return;
    const desc = JSON.stringify({ e: emoji, c: cost, o: owner });
    this._afterWrite();
    h.callService('todo', 'add_item', { item: name, description: desc },
      { entity_id: this._cfg.rewards_entity });
  }

  _updateReward(uid, name, emoji, cost, owner) {
    const h = this._hass;
    if (!h) return;
    const raw = (this._rewards || []).find((x) => x.uid === uid);
    const meta = raw ? parseMeta(raw) : {};
    meta.e = emoji;
    meta.c = cost;
    if (owner) meta.o = owner;
    const desc = JSON.stringify(meta);
    if (raw) { raw.summary = name; raw.description = desc; }
    this._afterWrite();
    /* le champ de renommage s'appelle `rename` dans todo.update_item
       (`summary` est refusé : le service valide ses clés) */
    h.callService('todo', 'update_item', { item: uid, rename: name, description: desc },
      { entity_id: this._cfg.rewards_entity });
  }

  _deleteReward(uid) {
    const h = this._hass;
    if (!h) return;
    this._rewards = (this._rewards || []).filter((x) => x.uid !== uid);
    this._afterWrite();
    h.callService('todo', 'remove_item', { item: uid }, { entity_id: this._cfg.rewards_entity });
  }

  /* échange : débit atomique du compteur + item marqué « completed » avec sa
     date et son bénéficiaire (l'historique est porté par l'item) */
  _redeem(uid) {
    const h = this._hass;
    if (!h) return;
    const r = this._items().find((x) => x.uid === uid);
    if (!r || r.done) return;
    const p = this._profiles().find((x) => x.id === r.owner);
    if (!p) return;
    const solde = this._solde(p);
    if (solde === null || solde < r.cost) return;

    const raw = (this._rewards || []).find((x) => x.uid === uid);
    const meta = raw ? parseMeta(raw) : {};
    meta.by = p.id;
    meta.d = localDay();
    const desc = JSON.stringify(meta);

    /* débit par `script.etoiles` : `counter.increment` n'accepte pas de valeur
       sur HA 2026.10, et un set_value calculé ici serait faux sur deux appareils.
       Le script boucle côté serveur, chaque pas est atomique. */
    const ent = this._soldeEntity(p);
    if (ent && h.states[ent]) {
      const pr = h.callService('script', this._cfg.stars_script || 'etoiles',
        { profil: p.id, delta: -r.cost });
      if (pr && pr.catch) pr.catch((e) => console.warn('[skylight-rewards-card] débit étoiles :', e));
    }
    if (raw) { raw.status = 'completed'; raw.description = desc; }
    this._celebrate(r, p);
    this._afterWrite();
    h.callService('todo', 'update_item',
      { item: uid, status: 'completed', description: desc },
      { entity_id: this._cfg.rewards_entity });
  }

  /* « Réutiliser » : la récompense redevient disponible. Les étoiles dépensées
     ne sont pas rendues — il faudra les regagner (c'est le sens du geste). */
  _unredeem(uid) {
    const h = this._hass;
    if (!h) return;
    const raw = (this._rewards || []).find((x) => x.uid === uid);
    if (!raw) return;
    const meta = parseMeta(raw);
    delete meta.by;
    delete meta.d;
    const desc = JSON.stringify(meta);
    raw.status = 'needs_action';
    raw.description = desc;
    this._afterWrite();
    h.callService('todo', 'update_item',
      { item: uid, status: 'needs_action', description: desc },
      { entity_id: this._cfg.rewards_entity });
  }

  /* ---------- célébration ---------- */

  _celebrate(r, p) {
    const box = this._root.getElementById('celebrate');
    if (!box) return;
    box.innerHTML = '';
    for (let i = 0; i < 42; i++) {
      const el = document.createElement('span');
      el.className = 'cel-piece';
      el.textContent = '★';
      el.style.left = (Math.random() * 100).toFixed(1) + '%';
      el.style.fontSize = (11 + Math.random() * 15).toFixed(0) + 'px';
      el.style.animationDuration = (2.1 + Math.random() * 1.6).toFixed(2) + 's';
      el.style.animationDelay = (Math.random() * 0.7).toFixed(2) + 's';
      el.style.setProperty('--dx', (Math.random() * 170 - 85).toFixed(0) + 'px');
      el.style.setProperty('--rot', (Math.random() * 720 - 360).toFixed(0) + 'deg');
      box.appendChild(el);
    }
    const card = document.createElement('div');
    card.className = 'cel-card';
    card.innerHTML = `<div class="cel-em">${esc(r.emoji)}</div>
      <div class="cel-ttl">Bravo ${esc(p.name)} !</div>
      <div class="cel-sub">${esc(r.title)} — échangée</div>
      <div class="cel-meta">Pour ${r.cost} étoiles, le ${esc(this._fmtDate(r.date || localDay()))}</div>
      <button class="cel-go" id="cel-go">Terminé</button>
      <div><button class="cel-again" id="cel-again">Réutiliser cette récompense</button></div>`;
    box.appendChild(card);
    box.classList.add('on');
    const close = () => {
      box.classList.remove('on');
      box.innerHTML = '';
    };
    box.onclick = (ev) => { if (ev.target === box) close(); };
    setTimeout(() => {
      const g = this._root.getElementById('cel-go');
      if (g) g.onclick = close;
      const a = this._root.getElementById('cel-again');
      if (a) a.onclick = () => { close(); this._unredeem(r.uid); };
    }, 0);
    clearTimeout(this._celTimer);
    this._celTimer = setTimeout(close, 12000);
  }
}

customElements.define('skylight-rewards-card', SkylightRewardsCard);
