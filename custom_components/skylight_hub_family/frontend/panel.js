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

const CORE_URL = '/skylight-static/famille-core.js?v=0.5.15';
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
const OB_KEY = 'skylight.onboarding.v1';
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
/* ---------- installation (onboarding) — porté de maquettes/onboarding_exemple ---------- */
.onb{min-height:100vh;background:#FAF9F7;color:#1B1B1D;
  font-family:Figtree,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
  -webkit-font-smoothing:antialiased;
  --o-ink:#1B1B1D;--o-ink2:#3C3C3E;--o-muted:#8B8B90;--o-muted2:#A8A8AC;
  --o-line:#EBE8E3;--o-line2:#E4E1DB;--o-blue:#007AFF;--o-blue2:#0A66D6;
  --o-blue050:#F4F8FE;--o-blue100:#E3EDFD;--o-blue200:#CFE0FB;--o-lav:#E4DBFC;
  --o-sand:#FDE2CB;--o-mint:#D6F0DE;--o-green:#34C759;--o-red:#F66951;
  --o-card:#fff;--o-shadow:0 1px 2px rgba(28,28,30,.04),0 10px 30px rgba(28,32,45,.06);
  --o-soft:0 18px 50px rgba(30,55,110,.10)}
.onb .nm,.onb .nm b{font-family:inherit;letter-spacing:inherit}\n.o-wrap{min-height:100vh;display:flex;flex-direction:column;max-width:1024px;margin:0 auto;width:100%}
.o-screen{flex:1 1 auto;display:flex;flex-direction:column;min-height:0}
.o-left{display:none}
.o-right{flex:1 1 auto;display:flex;flex-direction:column;min-height:0;padding:0 24px}
.o-content{flex:1 1 auto;display:flex;flex-direction:column;min-height:0}
.o-prog{display:flex;gap:6px;justify-content:center;padding:14px 0 4px}
.o-prog.left{justify-content:flex-start;padding-left:0}
.o-prog i{display:block;width:26px;height:4px;border-radius:2px;background:#DEDBD6}
.o-prog i.on{background:var(--o-blue)}
.o-h1{font-size:34px;line-height:1.206;letter-spacing:.006em;font-weight:700;margin:0;color:var(--o-ink)}
.o-h1.sm{font-size:30px}
.o-sub{font-size:17px;line-height:1.38;letter-spacing:-.01em;color:var(--o-muted);margin:12px 0 0;font-weight:400}
.o-sub.tight{font-size:15.5px;line-height:1.4}
.o-eyebrow{font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:var(--o-muted2);font-weight:600}
.o-appicon{border-radius:22%;overflow:hidden;box-shadow:0 6px 18px rgba(0,90,220,.18);display:block}
.o-btn{display:flex;align-items:center;justify-content:center;height:52px;border-radius:26px;background:var(--o-blue);color:#fff;
  font:inherit;font-size:17px;font-weight:600;letter-spacing:-.01em;box-shadow:0 1px 2px rgba(16,24,40,.08);width:100%;border:0;cursor:pointer}
.o-btn:active{transform:scale(.985)}
.o-btn.ghost{background:transparent;color:var(--o-blue);box-shadow:none;font-weight:500}
.o-btn.dim{background:#E8E6E2;color:#A9A7A4;box-shadow:none}
.o-btn.soft{background:var(--o-blue100);color:var(--o-blue2);box-shadow:none}
.o-btnrow{display:flex;gap:10px;align-items:center}
.o-back{flex:0 0 auto;width:96px;height:52px;display:flex;align-items:center;justify-content:center;font-size:17px;color:var(--o-muted);font-weight:500;letter-spacing:-.01em;background:none;border:0;font-family:inherit;cursor:pointer}
.o-foot{flex:0 0 auto;padding:0;margin-top:auto}
.o-legal{text-align:center;font-size:13px;color:var(--o-muted2);margin-top:12px;letter-spacing:-.005em}
.o-link{display:block;text-align:center;font-size:15px;color:var(--o-blue);font-weight:500;margin-top:14px;background:none;border:0;font-family:inherit;cursor:pointer;width:100%}
.o-benefits{display:flex;flex-direction:column;gap:16px;margin-top:22px;text-align:left;width:100%}
.o-ben{display:flex;gap:13px;align-items:flex-start}
.o-ben .ic{flex:0 0 auto;width:38px;height:38px;border-radius:12px;background:var(--o-blue100);display:flex;align-items:center;justify-content:center}
.o-ben .tx{font-size:15px;line-height:1.32;color:var(--o-ink2);letter-spacing:-.008em}
.o-ben .tx b{font-weight:650;color:var(--o-ink);font-size:15.5px;display:block;margin-bottom:1px;letter-spacing:-.012em}
.o-field{margin-top:22px}
.o-field .lab{font-size:13px;font-weight:600;color:var(--o-ink2);letter-spacing:-.005em;margin:0 0 7px 2px}
.o-input{height:54px;border-radius:15px;background:#fff;border:1.5px solid var(--o-line2);display:flex;align-items:center;padding:0 16px;
  font-family:inherit;font-size:17px;letter-spacing:-.012em;color:var(--o-ink);box-shadow:0 1px 2px rgba(28,28,30,.03);width:100%;outline:none}
.o-input:focus{border-color:var(--o-blue);box-shadow:0 0 0 3.5px rgba(0,122,255,.12)}
.o-input::placeholder{color:#B4B2AE}
.o-preview{margin-top:14px;background:#fff;border:1px solid var(--o-line);border-radius:16px;padding:13px 15px;display:flex;align-items:center;gap:12px;box-shadow:0 6px 18px rgba(28,32,45,.045)}
.o-preview .meta{font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--o-muted2);font-weight:600;margin-top:2px}
.o-preview .nm{font-size:16px;font-weight:650;letter-spacing:-.015em}
.o-av{border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:650;letter-spacing:-.01em;flex:0 0 auto}
.o-people{display:flex;flex-direction:column;gap:8px;margin-top:16px}
.o-prow{display:flex;align-items:center;gap:11px;background:#fff;border:1px solid var(--o-line);border-radius:15px;padding:8px 12px 8px 10px;box-shadow:0 1px 2px rgba(28,28,30,.025);cursor:pointer;transition:border-color .15s,box-shadow .15s}
.o-prow.editing{border-color:var(--o-blue);box-shadow:0 0 0 3px rgba(10,124,255,.12)}
.o-prow .edit{width:26px;height:26px;border-radius:50%;background:#F2F0EC;display:grid;place-items:center;flex:0 0 26px;border:0;cursor:pointer;padding:0}
.o-prow .edit:hover{background:#E8E6E2}
.o-edithead{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;font-size:13px;color:#5B6472;letter-spacing:-.005em}
.o-edithead button{background:none;border:0;color:var(--o-blue);font:inherit;font-size:13px;font-weight:600;cursor:pointer;padding:4px}
.plus.save{background:var(--o-blue)}
.plus:disabled{opacity:.45;cursor:default}
.o-prow .nm{font-size:15.5px;font-weight:650;letter-spacing:-.012em;line-height:1.15}
.o-prow .sub{font-size:12.5px;color:var(--o-muted);letter-spacing:-.004em;margin-top:2px}
.o-prow .x{width:26px;height:26px;border-radius:50%;background:#F2F0EC;display:flex;align-items:center;justify-content:center;flex:0 0 auto;border:0;cursor:pointer}
.o-addzone{margin-top:14px;background:#fff;border:1px solid var(--o-line);border-radius:18px;padding:14px;box-shadow:0 8px 24px rgba(28,32,45,.05)}
.o-addzone .row1{display:flex;gap:10px;align-items:center}
.o-addzone .mini{height:44px;border-radius:12px;border:1.5px solid var(--o-line2);display:flex;align-items:center;padding:0 13px;font-size:15.5px;color:var(--o-ink);flex:1 1 auto;letter-spacing:-.01em;background:none;font-family:inherit;outline:none;min-width:0}
.o-addzone .mini::placeholder{color:#B4B2AE}
.o-addzone .mini:focus{border-color:var(--o-blue)}
.o-addzone .plus{width:32px;height:32px;border-radius:50%;background:var(--o-blue100);display:grid;place-items:center;border:0;cursor:pointer;flex:0 0 32px}
.o-addzone .plus.save{background:var(--o-blue)}
.o-addzone .plus.save svg path{stroke:#fff}
.o-addzone .plus:disabled{opacity:.45;cursor:default}
.o-swatches{display:flex;gap:6px;margin-top:12px;flex-wrap:wrap;align-items:center}

.o-sw{width:26px;height:26px;border-radius:50%;flex:0 0 auto;display:flex;align-items:center;justify-content:center;position:relative;border:0;cursor:pointer;padding:0}
.o-sw.on::after{content:"";width:26px;height:26px;border-radius:50%;border:2px solid rgba(255,255,255,.95);position:absolute;inset:0;box-shadow:0 0 0 2px rgba(28,28,30,.10)}
.o-togglerow{display:flex;align-items:center;justify-content:space-between;margin-top:14px;padding-top:12px;border-top:1px solid #F1EFEB;gap:12px}
.o-togglerow .lab{font-size:13.5px;color:var(--o-ink2);letter-spacing:-.008em;max-width:210px;line-height:1.25;text-align:left}
.o-tg{width:48px;height:29px;border-radius:15px;background:#E3E1DD;position:relative;flex:0 0 auto;border:0;cursor:pointer;padding:0}
.o-tg.on{background:var(--o-blue)}
.o-tg::after{content:"";position:absolute;top:2.5px;left:2.5px;width:24px;height:24px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.2)}
.o-tg.on::after{left:21.5px}
.o-selrow{display:flex;align-items:center;gap:10px;background:#fff;border:1px solid var(--o-line);border-radius:15px;padding:11px 12px;box-shadow:0 1px 2px rgba(28,28,30,.025);position:relative;flex-wrap:wrap}
.o-selrow .nm{font-size:15.5px;font-weight:650;letter-spacing:-.012em}
.o-selrow .sub{font-size:12px;color:var(--o-muted);margin-top:1px}
.o-select{-webkit-appearance:none;appearance:none;border:1px solid #DCE8FA;background:var(--o-blue050);color:var(--o-blue2);border-radius:11px;
  padding:7px 26px 7px 9px;font-family:inherit;font-size:12.5px;font-weight:600;letter-spacing:-.008em;cursor:pointer;
  background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='9' height='6' viewBox='0 0 9 6'><path d='M1 1.2 4.5 4.8 8 1.2' stroke='%230A66D6' stroke-width='1.7' fill='none' stroke-linecap='round'/></svg>");
  background-repeat:no-repeat;background-position:right 9px center}
.o-select.alt{background-color:#F7F5F1;border-color:#EAE7E2;color:#8B8B90;background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='9' height='6' viewBox='0 0 9 6'><path d='M1 1.2 4.5 4.8 8 1.2' stroke='%238B8B90' stroke-width='1.7' fill='none' stroke-linecap='round'/></svg>")}
.o-callist{flex:1 1 100%;display:flex;gap:8px;align-items:center;margin-top:2px}
.o-callist .o-select{flex:1 1 auto;font-size:13px;padding:8px 26px 8px 10px}
.o-table{margin-top:22px;background:#fff;border:1px solid var(--o-line);border-radius:18px;overflow:hidden;box-shadow:0 10px 30px rgba(28,32,45,.055)}
.o-table .r{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-top:1px solid #F2F0EC;font-size:15px;letter-spacing:-.01em;color:var(--o-ink2)}
.o-table .r:first-child{border-top:0}
.o-table .n{font-size:15px;font-weight:650;color:var(--o-ink);font-variant-numeric:tabular-nums;background:#F5F3EF;border-radius:8px;min-width:30px;height:26px;display:flex;align-items:center;justify-content:center;padding:0 7px}
.o-pillsum{display:inline-flex;align-items:center;gap:8px;background:#fff;border:1px solid var(--o-line);border-radius:999px;padding:10px 16px;font-size:14.5px;color:var(--o-ink2);letter-spacing:-.01em;box-shadow:0 4px 14px rgba(28,32,45,.05);white-space:nowrap}
.o-pillsum b{font-weight:650;color:var(--o-ink)}
.o-dotsep{width:3px;height:3px;border-radius:50%;background:#CFCCC7;flex:0 0 3px}
.o-check{width:84px;height:84px;border-radius:50%;background:var(--o-green);display:flex;align-items:center;justify-content:center;box-shadow:0 14px 34px rgba(52,199,89,.28);position:relative}
.o-check::after{content:"";position:absolute;inset:-14px;border-radius:50%;background:rgba(52,199,89,.10)}
.o-err{background:#FDECEA;color:#8A1F1A;border-radius:12px;padding:10px 12px;font-size:13px;margin-top:14px}
.o-footrow{display:flex;gap:10px;align-items:center}
.o-phone-only{display:flex;flex-direction:column;align-items:center}
.o-welcome{flex:1 1 auto;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;padding-top:22px}
.o-welcome-foot{margin-top:28px;width:100%;max-width:420px;display:flex;flex-direction:column;align-items:center}

/* illustrations (tablette) */
.o-appprev{background:#fff;border:1px solid var(--o-line);border-radius:20px;box-shadow:var(--o-shadow);padding:15px 16px 14px;overflow:hidden;width:100%}
.o-appprev .top{display:flex;align-items:flex-start;justify-content:space-between}
.o-appprev .nm{font-size:19px;font-weight:700;letter-spacing:-.02em}
.o-appprev .clock{font-size:19px;font-weight:600;letter-spacing:-.02em;color:var(--o-muted2);font-variant-numeric:tabular-nums}
.o-appprev .pills{display:flex;gap:6px;margin-top:11px;flex-wrap:wrap}
.o-ppill{display:flex;align-items:center;gap:6px;background:#F7F5F1;border-radius:999px;padding:4px 9px 4px 4px;font-size:11.5px;color:var(--o-ink2);letter-spacing:-.005em}
.o-appprev .cols{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:13px}
.o-daycol{background:#FBFAF8;border:1px solid #F1EFEB;border-radius:12px;padding:8px}
.o-daycol .d{font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:var(--o-muted2);font-weight:600;margin-bottom:7px;display:flex;justify-content:space-between}
.o-ev{height:20px;border-radius:6px;margin-bottom:5px}
.o-ev:last-child{margin-bottom:0}
.o-cols3{display:grid;grid-template-columns:repeat(3,1fr);gap:11px;padding:16px;border-radius:22px;background:linear-gradient(180deg,#F4F8FE,#EEF4FD);width:100%}
.o-col3{display:flex;flex-direction:column;gap:7px;align-items:stretch}
.o-col3 .h{display:flex;align-items:center;gap:5px;font-size:10.5px;font-weight:650;letter-spacing:-.005em;color:var(--o-ink2);opacity:.9}
.o-col3 .tile{background:#fff;border-radius:11px;padding:7px;box-shadow:0 6px 16px rgba(28,40,70,.07);display:flex;flex-direction:column;gap:4px}
.o-col3 .star{align-self:flex-start;background:#fff;border-radius:999px;padding:3px 7px;font-size:10px;font-weight:650;color:var(--o-ink2);box-shadow:0 4px 10px rgba(28,40,70,.08);display:flex;align-items:center;gap:3px}
.o-week{background:#fff;border:1px solid var(--o-line);border-radius:20px;box-shadow:var(--o-shadow);padding:14px;width:100%}
.o-week .head{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:8px}
.o-week .hd{text-align:center;font-size:10px;letter-spacing:.07em;text-transform:uppercase;color:var(--o-muted2);font-weight:600}
.o-week .med{width:26px;height:26px;border-radius:50%;background:var(--o-red);color:#fff;font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:center;margin:4px auto 0;box-shadow:0 5px 12px rgba(246,105,81,.32)}
.o-week .cells{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
.o-week .c{background:#FBFAF8;border:1px solid #F2F0EC;border-radius:10px;height:74px;padding:6px;display:flex;flex-direction:column;gap:4px}
.o-week .c.hi{background:#F6FAFF;border-color:#E3EDFD}
.o-illu-panel{background:linear-gradient(180deg,#F4F8FE,#EDF4FD);border-radius:24px;padding:16px;width:100%}

@media (min-width:900px){
  .o-phone-only{display:none}
  .o-welcome{align-items:flex-start;text-align:left}
  .o-welcome-foot{align-items:flex-start}
  .o-welcome-foot .o-btn{max-width:300px}
  .o-welcome-foot .o-legal{text-align:left;margin-left:4px}
  .o-content{justify-content:center}
  .o-wrap{max-width:1120px}
  .o-screen{display:grid;grid-template-columns:minmax(0,1fr) 440px;gap:clamp(24px,4vw,56px);align-items:stretch;padding:0 clamp(24px,3vw,48px);min-height:calc(100vh - 24px)}
  .o-left{display:flex;align-items:center;justify-content:center;min-width:0}
  .o-right{padding:36px 0 8px;justify-content:flex-start;min-height:0}
  .o-foot{padding:0}
  .o-h1{font-size:35px}
}
@media (max-width:899px){
  .o-split-phone{display:flex;flex-direction:column}
}
@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}

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

  /* ---------- installation (onboarding) — porté de maquettes/onboarding_exemple ---------- */

  _oIcon(name, c = '#007AFF', s = 20) {
    const open = `<svg viewBox="0 0 24 24" width="${s}" height="${s}" xmlns="http://www.w3.org/2000/svg" fill="none">`;
    const paths = {
      spark: `<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" fill="${c}"/><path d="M18.2 15.6l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z" fill="${c}" opacity=".55"/>`,
      bolt: `<path d="M13.4 2.5 4.8 13.2c-.5.6-.1 1.5.7 1.5h4.9l-1.6 6.6c-.2.9.9 1.4 1.5.7l8.6-10.7c.5-.6.1-1.5-.7-1.5h-4.9l1.6-6.6c.2-.9-.9-1.4-1.5-.7z" fill="${c}"/>`,
      people: `<circle cx="9" cy="8.6" r="3.4" stroke="${c}" stroke-width="1.9"/><path d="M3 19.4c.6-3.2 3-4.9 6-4.9s5.4 1.7 6 4.9" stroke="${c}" stroke-width="1.9" stroke-linecap="round"/><circle cx="17.6" cy="9.6" r="2.5" stroke="${c}" stroke-width="1.7" opacity=".55"/><path d="M16.4 14.8c2.4.2 4 1.7 4.6 4.2" stroke="${c}" stroke-width="1.7" stroke-linecap="round" opacity=".55"/>`,
      cal: `<rect x="3" y="4.5" width="18" height="16.5" rx="4" stroke="${c}" stroke-width="1.9"/><path d="M3.5 9.5h17" stroke="${c}" stroke-width="1.9"/><path d="M8 2.8v3.4M16 2.8v3.4" stroke="${c}" stroke-width="1.9" stroke-linecap="round"/><circle cx="8.6" cy="14" r="1.5" fill="${c}"/><circle cx="13" cy="14" r="1.5" fill="${c}"/>`,
      check: `<rect x="3" y="3" width="18" height="18" rx="5.5" stroke="${c}" stroke-width="1.9"/><path d="M7.8 12.3l2.9 2.9 5.6-6" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`,
      star: `<path d="M12 3.2l2.5 5.3 5.8.8-4.2 4.1 1 5.8-5.1-2.8-5.1 2.8 1-5.8L3.7 9.3l5.8-.8z" stroke="${c}" stroke-width="1.8" stroke-linejoin="round"/>`,
      meal: `<rect x="3.2" y="11.6" width="17.6" height="3.4" rx="1.7" fill="${c}" opacity=".28"/><path d="M4.6 11.2c.9-3.4 3.7-5.4 7.4-5.4s6.5 2 7.4 5.4" stroke="${c}" stroke-width="1.9" stroke-linecap="round"/><path d="M5.4 15.4c0 2.9 2.9 5.2 6.6 5.2s6.6-2.3 6.6-5.2" stroke="${c}" stroke-width="1.9" stroke-linecap="round"/>`,
    };
    return open + (paths[name] || '') + '</svg>';
  }

  _oAv(init, color, size = 36) {
    return `<span class="o-av" style="width:${size}px;height:${size}px;background:${esc(color)};font-size:${Math.round(size * 0.42)}px">${esc(init)}</span>`;
  }

  _oAppIcon(size) {
    return `<img class="o-appicon" src="/skylight-static/icon.png" width="${size}" height="${size}" style="width:${size}px;height:${size}px" alt="">`;
  }

  _oProgress(n, total = 3, left = false) {
    return `<div class="o-prog${left ? ' left' : ''}">${Array.from({ length: total }, (_, i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('')}</div>`;
  }

  _oBenefits() {
    return `<div class="o-benefits">
      <div class="o-ben"><span class="ic">${this._oIcon('check', '#007AFF', 21)}</span><span class="tx"><b>Chacun ses tâches</b>Les routines du matin et du soir, pour chaque personne.</span></div>
      <div class="o-ben"><span class="ic">${this._oIcon('star', '#007AFF', 21)}</span><span class="tx"><b>Des étoiles à gagner</b>Chaque tâche cochée en rapporte ; elles s'échangent.</span></div>
      <div class="o-ben"><span class="ic">${this._oIcon('cal', '#007AFF', 21)}</span><span class="tx"><b>Les repas et le calendrier</b>La semaine entière, et les rendez-vous de tous.</span></div>
    </div>`;
  }

  _oPreviewApp(name) {
    const people = (this._ob.people || []).slice(0, 3);
    const fallback = [{ name: 'Camille', color: '#7FA9E8' }, { name: 'Léo', color: '#79CBA6' }];
    const list = people.length ? people : fallback;
    return `<div class="o-appprev">
      <div class="top"><div class="nm">${esc(name || 'Ma famille')}</div><div class="clock">9:35</div></div>
      <div class="pills">${list.map((p) => `<span class="o-ppill">${this._oAv((p.name || '?')[0], p.color, 18)}${esc(p.name)}</span>`).join('')}</div>
      <div class="cols">
        <div class="o-daycol"><div class="d"><span>Lun.</span><span>9</span></div>
          <div class="o-ev" style="background:#CFE0FB;width:100%"></div><div class="o-ev" style="background:#E4DBFC;width:72%"></div><div class="o-ev" style="background:#EAF1FC;width:88%"></div><div class="o-ev" style="background:#D6F0DE;width:64%"></div><div class="o-ev" style="background:#EAF1FC;width:80%"></div></div>
        <div class="o-daycol"><div class="d"><span>Mar.</span><span>10</span></div>
          <div class="o-ev" style="background:#FDE2CB;width:84%"></div><div class="o-ev" style="background:#D6F0DE;width:100%"></div><div class="o-ev" style="background:#EAF1FC;width:64%"></div><div class="o-ev" style="background:#CFE0FB;width:74%"></div><div class="o-ev" style="background:#EAF1FC;width:52%"></div></div>
      </div>
    </div>`;
  }

  _oBoard() {
    const bcol = (ini, name, pastel, accent, pills) => `
      <div style="background:${pastel};border-radius:12px;padding:7px;display:flex;flex-direction:column;gap:6px">
        <div style="display:flex;align-items:center;gap:5px">
          <span style="width:19px;height:19px;border-radius:50%;background:#fff;color:${accent};display:grid;place-items:center;font-size:9px;font-weight:700">${ini}</span>
          <span style="font-size:10.5px;font-weight:600;color:#1F2328">${name}</span>
          <span style="margin-left:auto;display:flex;gap:3px">${pills.map((p) => `<i style="font-style:normal;background:rgba(255,255,255,.9);border-radius:999px;padding:1px 5px;font-size:8px;font-weight:700;color:#1F2328">${p}</i>`).join('')}</span>
        </div>
        <div style="font-size:8.5px;font-weight:600;color:rgba(31,35,40,.5)">Matin</div>
        ${[[14, 'rgba(255,255,255,.95)'], [10, 'rgba(255,255,255,.7)']].map(([h, c]) => `<div style="background:#fff;border-radius:9px;padding:5px 6px;display:flex;flex-direction:column;gap:3px"><span style="height:${h}px;border-radius:4px;background:${c}"></span><span style="height:5px;width:70%;border-radius:3px;background:#F1F4F9"></span></div>`).join('')}
      </div>`;
    return `<div style="width:100%;max-width:420px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 10px 26px rgba(24,44,84,.14),0 1px 2px rgba(24,44,84,.08);text-align:left">
      <div style="display:flex;align-items:baseline;gap:8px;padding:10px 12px 8px"><b style="font-size:12.5px;letter-spacing:-.01em">Ma famille</b><span style="font-size:11px;color:#8B8B90">9:41</span></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:7px;padding:0 10px 10px">
        ${bcol('C', 'Camille', '#CFE0FB', '#4677A8', ['✓ 1/3', '★ 320'])}
        ${bcol('L', 'Léo', '#D6F0DE', '#2E9E63', ['✓ 0/2', '★ 45'])}
      </div>
    </div>`;
  }

  _oColumns() {
    const list = (this._ob.people && this._ob.people.length ? this._ob.people : [
      { name: 'Camille', color: '#7FA9E8' }, { name: 'Léo', color: '#79CBA6' }, { name: 'Papa', color: '#F0A0B4' },
    ]).slice(0, 3);
    return `<div class="o-cols3">${list.map((p) => {
      const tone = (CORE && CORE.pastelOf) ? CORE.pastelOf(p.color) : '#EAF1FC';
      return `
      <div class="o-col3">
        <div class="h">${this._oAv((p.name || '?')[0].toUpperCase(), p.color, 20)} ${esc(p.name)}</div>
        <div class="tile"><div style="height:16px;border-radius:5px;background:${tone}"></div><div style="height:10px;border-radius:4px;background:#F1F4F9;width:70%"></div></div>
        <div class="tile"><div style="height:10px;border-radius:4px;background:#F1F4F9;width:60%"></div><div style="height:16px;border-radius:5px;background:${tone}"></div></div>
        <div class="star">${this._oIcon('star', '#8A6A16', 10)} <span style="opacity:.7">2</span></div>
      </div>`;
    }).join('')}</div>`;
  }

  _oWeek() {
    return `<div class="o-week">
      <div class="head"><div class="hd">Lun.</div><div class="hd">Mar.</div><div class="hd">Mer.</div><div class="hd">Jeu.</div></div>
      <div class="head" style="margin:0 0 10px"><div style="text-align:center;font-size:12px;color:#9B9990">7</div><div class="med">8</div><div style="text-align:center;font-size:12px;color:#9B9990">9</div><div style="text-align:center;font-size:12px;color:#9B9990">10</div></div>
      <div class="cells">
        <div class="c"><div class="o-ev" style="background:#CFE0FB;height:16px;border-radius:5px;width:100%"></div><div class="o-ev" style="background:#EAF1FC;height:12px;border-radius:4px;width:76%"></div></div>
        <div class="c hi"><div class="o-ev" style="background:#D6F0DE;height:16px;border-radius:5px;width:94%"></div><div class="o-ev" style="background:#FDE2CB;height:12px;border-radius:4px;width:70%"></div><div class="o-ev" style="background:#E4DBFC;height:12px;border-radius:4px;width:86%"></div></div>
        <div class="c"><div class="o-ev" style="background:#E4DBFC;height:16px;border-radius:5px;width:88%"></div></div>
        <div class="c"><div class="o-ev" style="background:#FDE2CB;height:16px;border-radius:5px;width:100%"></div><div class="o-ev" style="background:#EAF1FC;height:12px;border-radius:4px;width:64%"></div></div>
      </div>
    </div>`;
  }

  _oShapes() {
    return `<svg viewBox="0 0 340 200" width="100%" height="auto" style="display:block" xmlns="http://www.w3.org/2000/svg">
      <circle cx="170" cy="100" r="82" fill="#F1F6FD"/>
      <rect x="112" y="112" width="116" height="34" rx="17" fill="#E3EDFD"/>
      <rect x="100" y="80" width="100" height="34" rx="17" fill="#EAF1FC"/>
      <rect x="126" y="48" width="132" height="34" rx="17" fill="#CFE0FB" opacity=".85"/>
      <circle cx="228" cy="60" r="9" fill="#E4DBFC"/>
      <circle cx="112" cy="134" r="7" fill="#D6F0DE"/>
    </svg>`;
  }

  _oCheckAvatars() {
    const list = (this._ob.people && this._ob.people.length ? this._ob.people : [{ color: '#7FA9E8' }, { color: '#79CBA6' }, { color: '#F0A0B4' }, { color: '#B3A0EA' }]).slice(0, 4);
    return `<div style="display:flex;flex-direction:column;align-items:center;gap:26px">
      <div class="o-check"><svg viewBox="0 0 24 24" width="40" height="40" xmlns="http://www.w3.org/2000/svg" fill="none"><path d="M5 12.6l4.6 4.6L19 6.8" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
      <div style="display:flex;justify-content:center;padding-left:6px">${list.map((p) => `<div style="margin-left:-8px">${this._oAv((p.name || '?')[0], p.color, 64)}</div>`).join('')}</div>
    </div>`;
  }

  _oCalendars() {
    const st = (this._hass && this._hass.states) || {};
    return Object.values(st)
      .filter((s) => s.entity_id && s.entity_id.indexOf('calendar.') === 0 && s.state !== 'unavailable')
      .map((s) => ({ id: s.entity_id, name: (s.attributes && s.attributes.friendly_name) || s.entity_id }))
      .sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  }

  _obClearDraft() {
    try { localStorage.removeItem(OB_KEY); } catch (e) { /* stockage indisponible */ }
  }

  _obSave() {
    const ob = this._ob;
    if (!ob || ob.step === 'existing') return;
    try {
      if (typeof ob.step === 'number' && ob.step >= 5) { localStorage.removeItem(OB_KEY); return; }
      localStorage.setItem(OB_KEY, JSON.stringify({
        step: ob.step,
        family: ob.family || '',
        people: ob.people || [],
        draft: ob.draft || { name: '', color: OB_COLORS[0], cal: true },
        updated: Date.now(),
      }));
    } catch (e) { /* stockage indisponible */ }
  }

  _obRestore() {
    if (this._app && this._app.existing) { this._obClearDraft(); return null; }
    try {
      const raw = localStorage.getItem(OB_KEY);
      if (!raw) return null;
      const d = JSON.parse(raw);
      if (!d || typeof d !== 'object' || typeof d.step !== 'number') return null;
      if (d.updated && Date.now() - d.updated > 7 * 86400000) { this._obClearDraft(); return null; }
      if (d.step >= 5) { this._obClearDraft(); return null; }
      d.step = Math.max(0, Math.min(4, d.step));
      if (typeof d.family !== 'string') d.family = '';
      if (!Array.isArray(d.people)) d.people = [];
      d.people = d.people.filter((p) => p && typeof p.name === 'string' && p.name.trim()).map((p) => ({
        name: String(p.name).slice(0, 20),
        color: typeof p.color === 'string' ? p.color : OB_COLORS[0],
        cal: !!p.cal,
        mode: ['create', 'link', 'later'].indexOf(p.mode) >= 0 ? p.mode : (p.cal ? 'create' : 'later'),
        calendar: typeof p.calendar === 'string' ? p.calendar : '',
      }));
      if (!d.draft || typeof d.draft !== 'object') d.draft = { name: '', color: OB_COLORS[0], cal: true };
      d.draft = {
        name: String(d.draft.name || '').slice(0, 20),
        color: typeof d.draft.color === 'string' ? d.draft.color : OB_COLORS[0],
        cal: d.draft.cal !== false,
      };
      return d;
    } catch (e) { return null; }
  }

  _renderOnboarding() {
    this.shadowRoot.innerHTML = `<style>${CORE.coreCss()}${CSS}</style><div class="onb"><div class="o-wrap" id="ob"></div></div>`;
    const saved = this._obRestore();
    this._ob = {
      step: saved ? saved.step : ((this._app && this._app.existing) ? 'existing' : 0),
      family: saved ? saved.family : '',
      people: saved ? saved.people : [],
      draft: saved ? saved.draft : { name: '', color: OB_COLORS[0], cal: true },
      edit: -1,
      err: null,
      busy: false,
      report: null,
    };
    this._obPaint();
  }

  _oboFoot(html) {
    return `<div class="o-foot">${html}</div>`;
  }

  _obPaint() {
    const root = this.shadowRoot.getElementById('ob');
    if (!root) return;
    const ob = this._ob;
    this._obSave();
    const step = ob.step;
    const family = ob.family || 'Ma famille';
    let left = '';
    let body = '';
    let foot = '';

    if (step === 'existing') {
      const profs = (this._app && this._app.profiles) || [];
      const stars = Object.values((this._app && this._app.stars) || {}).reduce((a, b) => a + (Number(b) || 0), 0);
      let tasks = 0;
      for (const items of Object.values((this._app && this._app.lists) || {})) tasks += (items || []).length;
      body = `<div style="padding-top:24px"><h2 class="o-h1 sm">Des données<br>existent déjà</h2>
        <p class="o-sub tight">Vous avez déjà une famille sur cet appareil. Reprenez-la, ou partez d'une famille vide.</p>
        <div class="o-table"><div class="r"><span>${esc((this._app && this._app.family_name) || 'Ma famille')}</span><span class="n">${profs.length}</span></div>
          <div class="r"><span>Profils</span><span class="n">${profs.length}</span></div>
          <div class="r"><span>Tâches et routines</span><span class="n">${tasks}</span></div>
          <div class="r"><span>Étoiles cumulées</span><span class="n">${stars}</span></div></div></div>`;
      foot = this._oboFoot(`<button class="o-btn soft" id="o-reuse" type="button">Reprendre mes données</button><button class="o-btn ghost" id="o-fresh" type="button" style="margin-top:6px">Repartir de zéro</button>`);
      root.innerHTML = `<div class="o-screen"><div class="o-left"></div><div class="o-right"><div class="o-content">${body}</div>${foot}</div></div>`;
      root.querySelector('#o-reuse').addEventListener('click', () => this._obInstall(true));
      root.querySelector('#o-fresh').addEventListener('click', () => { ob.step = 1; this._obPaint(); });
      return;
    }

    if (step === 0) {
      left = this._oBoard();
      body = `<div class="o-welcome">
        ${this._oAppIcon(52)}<h2 class="o-h1" style="margin-top:16px">Votre famille,<br>au même endroit.</h2>
        <p class="o-sub" style="max-width:420px">Les tâches de chacun, les étoiles gagnées, les repas de la semaine et les rendez-vous.</p>
        <div style="width:100%;text-align:left;margin-top:20px">${this._oBenefits()}</div>
        <div class="o-welcome-foot"><button class="o-btn" id="o-go" type="button">Commencer</button><div class="o-legal">2 minutes · tout reste chez vous</div></div>
      </div>`;
      foot = '';
      root.innerHTML = `<div class="o-screen"><div class="o-left">${left}</div><div class="o-right"><div class="o-content">${body}</div>${foot}</div></div>`;
      root.querySelector('#o-go').addEventListener('click', () => { ob.step = 1; this._obPaint(); });
      return;
    }

    if (step === 1) {
      left = `<div class="o-illu-panel" style="max-width:446px;padding:20px">${this._oPreviewApp(family)}</div>`;
      body = `${this._oProgress(1)}<div style="padding-top:26px"><h2 class="o-h1">Comment s'appelle<br>votre famille ?</h2>
        <p class="o-sub">C'est le nom affiché en haut de chaque écran.</p></div>
        <div class="o-field"><div class="lab">Nom de la famille</div><input class="o-input" id="o-fam" maxlength="40" placeholder="Ma famille" autocomplete="off" value="${esc(ob.family)}"></div>
        <div class="o-preview"><span id="o-prev-av">${this._oAv((family[0] || 'M').toUpperCase(), '#B4A6E6', 38)}</span><div><div class="nm" id="o-prev-nm">${esc(family)}</div></div></div>`;
      foot = this._oboFoot(`<div class="o-btnrow"><button class="o-back" id="o-back" type="button">Retour</button><button class="o-btn" id="o-next" type="button">Continuer</button></div>`);
      root.innerHTML = `<div class="o-screen"><div class="o-left">${left}</div><div class="o-right"><div class="o-content">${body}</div>${foot}</div></div>`;
      const inp = root.querySelector('#o-fam');
      const nm = root.querySelector('#o-prev-nm');
      const av = root.querySelector('#o-prev-av');
      const sync = () => {
        ob.family = inp.value;
        this._obSave();
        const v = inp.value.trim() || 'Ma famille';
        nm.textContent = v;
        av.innerHTML = this._oAv((v[0] || 'M').toUpperCase(), '#B4A6E6', 38);
        const pv = root.querySelector('.o-appprev .nm');
        if (pv) pv.textContent = v;
      };
      inp.addEventListener('input', sync);
      inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') root.querySelector('#o-next').click(); });
      root.querySelector('#o-back').addEventListener('click', () => { ob.family = inp.value.trim(); ob.step = 0; this._obPaint(); });
      root.querySelector('#o-next').addEventListener('click', () => { ob.family = inp.value.trim() || 'Ma famille'; ob.step = 2; this._obPaint(); });
      setTimeout(() => inp.focus(), 40);
      return;
    }

    if (step === 2) {
      left = this._oColumns();
      const editing = (ob.edit != null && ob.edit >= 0 && ob.edit < ob.people.length) ? ob.edit : -1;
      const rows = ob.people.map((p, i) => `<div class="o-prow${i === editing ? ' editing' : ''}" data-row="${i}">
        ${this._oAv((p.name[0] || '?').toUpperCase(), p.color, 34)}
        <div style="flex:1 1 auto;min-width:0"><div class="nm">${esc(p.name)}</div><div class="sub">${i === editing ? 'Modification en cours' : (p.mode === 'create' ? 'Calendrier à créer' : (p.mode === 'link' ? 'Calendrier relié' : 'Sans calendrier'))}</div></div>
        <button class="edit" data-edit="${i}" type="button" aria-label="Modifier ${esc(p.name)}"><svg viewBox="0 0 24 24" width="13" height="13" xmlns="http://www.w3.org/2000/svg" fill="none"><path d="M4 20l4.3-1 10-10a2.1 2.1 0 0 0-3-3l-10 10L4 20z" stroke="#8B8B90" stroke-width="1.8" stroke-linejoin="round"/></svg></button>
        <button class="x" data-rm="${i}" type="button" aria-label="Retirer ${esc(p.name)}"><svg viewBox="0 0 24 24" width="12" height="12" xmlns="http://www.w3.org/2000/svg" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="#8B8B90" stroke-width="2.4" stroke-linecap="round"/></svg></button>
      </div>`).join('');
      const canNext = ob.people.length > 0 && editing < 0;
      body = `${this._oProgress(2)}<div style="padding-top:22px"><h2 class="o-h1 sm">Qui vit ici ?</h2>
        <p class="o-sub tight">Ajoutez les personnes du foyer. Vous pourrez en ajouter d'autres plus tard.</p></div>
        <div class="o-people">${rows || ''}</div>
        <div class="o-addzone">
          ${editing >= 0 ? `<div class="o-edithead"><span>Modifier ${esc(ob.people[editing].name)}</span><button id="o-cancel" type="button">Annuler</button></div>` : ''}
          <div class="row1"><input class="mini" id="o-pname" maxlength="20" placeholder="Prénom" autocomplete="off" value="${esc(ob.draft.name)}"><button class="plus${editing >= 0 ? ' save' : ''}" id="o-add" type="button" aria-label="${editing >= 0 ? 'Enregistrer' : 'Ajouter'}">${editing >= 0 ? '<svg viewBox="0 0 24 24" width="15" height="15" xmlns="http://www.w3.org/2000/svg" fill="none"><path d="M5 12.5l4.2 4.2L19 7" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>' : '<svg viewBox="0 0 24 24" width="14" height="14" xmlns="http://www.w3.org/2000/svg" fill="none"><path d="M12 5v14M5 12h14" stroke="#007AFF" stroke-width="2.6" stroke-linecap="round"/></svg>'}</button></div>
          <div class="o-swatches">${OB_COLORS.map((c) => `<button class="o-sw${c === ob.draft.color ? ' on' : ''}" type="button" data-color="${c}" style="background:${c}" aria-label="Couleur ${c}">${c === ob.draft.color ? '<svg viewBox="0 0 24 24" width="13" height="13" xmlns="http://www.w3.org/2000/svg" fill="none"><path d="M5 12.5l4.2 4.2L19 7" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>' : ''}</button>`).join('')}</div>

        </div>
        ${ob.err ? `<div class="o-err">${esc(ob.err)}</div>` : ''}`;
      foot = this._oboFoot(`<div class="o-btnrow"><button class="o-back" id="o-back" type="button">Retour</button><button class="o-btn${canNext ? '' : ' dim'}" id="o-next" type="button" ${canNext ? '' : 'disabled'}>Continuer</button></div>`);
      root.innerHTML = `<div class="o-screen"><div class="o-left">${left}</div><div class="o-right"><div class="o-content">${body}</div>${foot}</div></div>`;
      const name = root.querySelector('#o-pname');
      const addBtn = root.querySelector('#o-add');
      const commit = () => {
        const v = name.value.trim();
        if (!v) return;
        if (editing >= 0) {
          const p = ob.people[editing];
          p.name = v;
          p.color = ob.draft.color;
        } else {
          ob.people.push({ name: v, color: ob.draft.color, cal: false, mode: 'later', calendar: '' });
        }
        ob.edit = -1;
        ob.draft = { name: '', color: OB_COLORS[0], cal: true };
        this._obPaint();
      };
      addBtn.disabled = !name.value.trim();
      name.addEventListener('input', () => { ob.draft.name = name.value; this._obSave(); addBtn.disabled = !name.value.trim(); });
      name.addEventListener('keydown', (e) => { if (e.key === 'Enter') commit(); });
      addBtn.addEventListener('click', commit);
      root.querySelectorAll('.o-sw').forEach((b) => b.addEventListener('click', () => {
        ob.draft.color = b.dataset.color;
        this._obSave();
        const tick = '<svg viewBox="0 0 24 24" width="13" height="13" xmlns="http://www.w3.org/2000/svg" fill="none"><path d="M5 12.5l4.2 4.2L19 7" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        root.querySelectorAll('.o-sw').forEach((x) => {
          const on = x === b;
          x.classList.toggle('on', on);
          x.innerHTML = on ? tick : '';
        });
      }));

      root.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); this._obStartEdit(Number(b.dataset.edit)); }));
      root.querySelectorAll('[data-rm]').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); ob.people.splice(Number(b.dataset.rm), 1); ob.edit = -1; this._obPaint(); }));
      root.querySelectorAll('[data-row]').forEach((r) => r.addEventListener('click', (e) => { if (e.target.closest('button')) return; this._obStartEdit(Number(r.dataset.row)); }));
      const cancel = root.querySelector('#o-cancel');
      if (cancel) cancel.addEventListener('click', () => { ob.edit = -1; ob.draft = { name: '', color: OB_COLORS[0], cal: true }; this._obPaint(); });
      root.querySelector('#o-back').addEventListener('click', () => {
        if (editing >= 0) { ob.edit = -1; ob.draft = { name: '', color: OB_COLORS[0], cal: true }; this._obPaint(); return; }
        ob.step = 1;
        this._obPaint();
      });
      root.querySelector('#o-next').addEventListener('click', () => { if (!canNext) return; ob.step = 3; this._obPaint(); });
      setTimeout(() => { name.focus(); name.select(); }, 40);
      return;
    }

    if (step === 3) {
      left = this._oWeek();
      const cals = this._oCalendars();
      const LABEL = { create: 'Créer un calendrier', link: 'Relier un calendrier', later: 'Plus tard' };
      const rows = ob.people.map((p, i) => `<div class="o-selrow">${this._oAv((p.name[0] || '?').toUpperCase(), p.color, 32)}
        <div style="flex:1 1 auto;min-width:0"><div class="nm">${esc(p.name)}</div><div class="sub">${esc(LABEL[p.mode || 'later'])}${p.mode === 'link' && p.calendar ? ' · ' + esc((cals.find((c) => c.id === p.calendar) || {}).name || p.calendar) : ''}</div></div>
        <select class="o-select${(p.mode || 'later') === 'later' ? ' alt' : ''}" data-mode="${i}" aria-label="Calendrier de ${esc(p.name)}">
          <option value="create"${p.mode === 'create' ? ' selected' : ''}>Créer</option>
          <option value="link"${p.mode === 'link' ? ' selected' : ''}>Relier</option>
          <option value="later"${(p.mode || 'later') === 'later' ? ' selected' : ''}>Plus tard</option>
        </select>
        ${p.mode === 'link' ? `<div class="o-callist"><select class="o-select" data-cal="${i}" aria-label="Calendrier de ${esc(p.name)}">
          <option value="">Choisir un calendrier</option>${cals.length ? '' : '<option value="" disabled>Aucun calendrier connecté</option>'}
          ${cals.map((c) => `<option value="${esc(c.id)}"${p.calendar === c.id ? ' selected' : ''}>${esc(c.name)}</option>`).join('')}
        </select></div>` : ''}
      </div>`).join('');
      body = `${this._oProgress(3)}<div style="padding-top:22px"><h2 class="o-h1 sm">Les calendriers</h2>
        <p class="o-sub tight">Choisissez pour chaque personne : créer un calendrier, relier un calendrier déjà connecté à Home Assistant (Google, Apple, CalDAV…), ou plus tard.</p></div>
        <div class="o-people" style="margin-top:18px;gap:10px">${rows}</div>
        ${ob.err ? `<div class="o-err">${esc(ob.err)}</div>` : ''}`;
      foot = this._oboFoot(`<div class="o-btnrow"><button class="o-back" id="o-back" type="button">Retour</button><button class="o-btn" id="o-next" type="button">Continuer</button></div>`);
      root.innerHTML = `<div class="o-screen"><div class="o-left">${left}</div><div class="o-right"><div class="o-content">${body}</div>${foot}</div></div>`;
      root.querySelectorAll('[data-mode]').forEach((s) => s.addEventListener('change', () => {
        const i = Number(s.dataset.mode);
        ob.people[i].mode = s.value;

        if (s.value !== 'link') ob.people[i].calendar = '';
        this._obPaint();
      }));
      root.querySelectorAll('[data-cal]').forEach((s) => s.addEventListener('change', () => {
        ob.people[Number(s.dataset.cal)].calendar = s.value;
        this._obPaint();
      }));
      root.querySelector('#o-back').addEventListener('click', () => { ob.step = 2; this._obPaint(); });
      root.querySelector('#o-next').addEventListener('click', () => {
        const missing = ob.people.find((p) => p.mode === 'link' && !p.calendar);
        if (missing) { ob.err = 'Choisissez un calendrier pour ' + missing.name + ', ou passez à « Plus tard ».'; this._obPaint(); return; }
        ob.err = null;
        ob.step = 4;
        this._obPaint();
      });
      return;
    }

    if (step === 4) {
      left = this._oShapes();
      const create = ob.people.filter((p) => p.mode === 'create').length;
      const link = ob.people.filter((p) => p.mode === 'link' && p.calendar).length;
      body = `${this._oProgress(3)}<div style="padding-top:22px"><h2 class="o-h1 sm">Voilà ce qui va<br>être créé</h2>
        <p class="o-sub tight">Les personnes vivent dans l'application. Seuls les calendriers demandés deviennent des objets Home Assistant.</p></div>
        <div class="o-table">
          <div class="r"><span>Personnes</span><span class="n">${ob.people.length}</span></div>
          <div class="r"><span>Calendriers à créer</span><span class="n">${create}</span></div>
          <div class="r"><span>Calendriers reliés</span><span class="n">${link}</span></div>
          <div class="r"><span>Autres entités</span><span class="n">0</span></div>
        </div>
        ${ob.err ? `<div class="o-err">${esc(ob.err)}</div>` : ''}`;
      foot = this._oboFoot(`<div class="o-btnrow"><button class="o-back" id="o-back" type="button" ${ob.busy ? 'disabled' : ''}>Retour</button><button class="o-btn" id="o-install" type="button" ${ob.busy ? 'disabled' : ''}>${ob.busy ? 'Installation…' : 'Installer'}</button></div>`);
      root.innerHTML = `<div class="o-screen"><div class="o-left">${left}</div><div class="o-right"><div class="o-content">${body}</div>${foot}</div></div>`;
      root.querySelector('#o-back').addEventListener('click', () => { ob.step = 3; this._obPaint(); });
      root.querySelector('#o-install').addEventListener('click', () => this._obInstall(false));
      return;
    }

    /* prêt */
    const rep = ob.report || {};
    const profs = (rep.config && rep.config.profiles) || [];
    const cals = profs.filter((p) => p.calendar).length;
    left = this._oCheckAvatars();
    body = `<div style="display:flex;flex-direction:column;align-items:center;text-align:center;padding-top:18px">
      <div class="o-phone-only" style="gap:18px">${this._oCheckAvatars()}</div>
      <h2 class="o-h1" style="margin-top:30px">Votre famille<br>est prête.</h2>
      <p class="o-sub" style="max-width:318px">Les tâches, les étoiles et les repas vous attendent.</p>
      <div class="o-pillsum" style="margin-top:22px"><b>${esc((rep.config && rep.config.family_name) || ob.family || 'Ma famille')}</b><span class="o-dotsep"></span>${profs.length} personne${profs.length > 1 ? 's' : ''}<span class="o-dotsep"></span>${cals} calendrier${cals > 1 ? 's' : ''}</div>
    </div>`;
    foot = this._oboFoot(`<button class="o-btn" id="o-enter" type="button">Entrer dans Skylight Hub Family</button>`);
    root.innerHTML = `<div class="o-screen"><div class="o-left">${left}</div><div class="o-right"><div class="o-content">${body}</div>${foot}</div></div>`;
    root.querySelector('#o-enter').addEventListener('click', () => this._obEnter());
  }

  _obStartEdit(i) {
    const ob = this._ob;
    const p = ob.people[i];
    if (!p) return;
    ob.edit = i;
    ob.draft = { name: p.name, color: p.color, cal: p.cal };
    this._obPaint();
    setTimeout(() => {
      const el = this.shadowRoot.getElementById('o-pname');
      if (el) { el.focus(); el.select(); }
    }, 40);
  }

  async _obInstall(keep) {
    const ob = this._ob;
    if (ob.busy) return;
    if (!keep) {
      const missing = ob.people.find((p) => p.mode === 'link' && !p.calendar);
      if (missing) { ob.err = 'Choisissez un calendrier pour ' + missing.name + '.'; ob.step = 3; this._obPaint(); return; }
    }
    ob.busy = true;
    ob.err = null;
    this._obPaint();
    try {
      const res = await this._hass.callWS({
        type: 'skylight_hub_family/onboard',
        family_name: keep ? ((this._app && this._app.family_name) || 'Ma famille') : (ob.family || 'Ma famille'),
        people: keep ? [] : ob.people.map((p) => ({
          name: p.name,
          color: p.color,
          create_calendar: p.mode === 'create',
          calendar: p.mode === 'link' ? (p.calendar || '') : '',
        })),
        keep: !!keep,
      });
      if (res && res.ok === false) throw new Error("L'installation a renvoyé une erreur.");
      ob.report = res || {};
      ob.busy = false;
      ob.step = 5;
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
    if (this._app && this._app.onboarding_done) this._obClearDraft();
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
