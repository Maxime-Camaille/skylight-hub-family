/* famille-core — le tronc commun de l'app Famille / « Tribu »
 *
 * Un seul fichier pour ce que les cinq écrans partagent. Objectif : changer un
 * rayon, une couleur, l'en-tête ou la barre se fait ICI, et toutes les vues
 * suivent. Aucun écran ne doit réécrire sa copie.
 *
 * Il contient quatre choses :
 *   1. les JETONS (typo, couleurs, rayons, espacements, ombres, durées) ;
 *   2. l'ACCÈS AUX DONNÉES (profils de `todo.profils`, items d'une liste `todo`,
 *      soldes `counter.etoiles_<id>`), avec cache et remontée d'erreur ;
 *   3. l'EN-TÊTE et la BARRE DE NAVIGATION, uniques ;
 *   4. les COMPOSANTS partagés : feuille, toast, bouton, avatar, état vide.
 *
 * Servi comme ressource Lovelace `module` (/local/famille-core.js?v=N) et importé
 * par les cartes. Un import et une ressource sur la MÊME URL : le module n'est
 * évalué qu'une fois (registre des modules du navigateur).
 *
 * Règle de dépôt : incrémenter `CORE_VERSION` en même temps que le `?v=` de la
 * ressource, puis le `?v=` des cartes qui l'importent (il est dans `CORE_URL`).
 */

export const CORE_VERSION = 'v69';

/* Les icônes vivent dans leur propre module, GÉNÉRÉ depuis les .svg SF Symbols. */
import { SF_ICON } from './skylight-icons.js?v=0.5.42';

/* =========================================================================
 * 1. JETONS
 * ========================================================================= */

/* Les valeurs de l'app, à un seul endroit. `CSS_TOKENS` les publie en variables
 * CSS dans le shadow root de chaque carte ; le code peut aussi les lire en JS. */
export const TOKENS = {
  font: {
    sans: 'Figtree,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif',
    serif: 'Literata,Georgia,serif',
  },
  color: {
    ink: '#1F2328',
    inkSoft: '#2B2F38',
    muted: '#8A8F9C',
    line: '#D8DEE8',
    surface: '#FFFFFF',
    rail: '#EDF1F5',
    railInk: '#4A5464',
    logoInk: '#4E5A6B',
    chip: '#F2F3F5',
    brand: '#007AFF',
    brandSoft: '#B3D4FA',
    star: '#F5B93E',
    today: '#F66951',
    warnBg: '#FFF4E2',
    warnLine: '#F0DDBB',
    warnInk: '#6B4E20',
    danger: '#FF3B30',
  },
  radius: {
    column: 30,
    tile: 22,
    card: 26,
    sheet: 24,
    nav: 13,
    logo: 11,
    pill: 999,
  },
  space: {
    gap: 12,
    page: '6px 14px 14px',
    headerLeft: 22,
  },
  shadow: {
    raised: '0 1px 3px rgba(31,35,40,.10)',
    floating: '0 8px 22px rgba(31,35,40,.26)',
    sheet: '-18px 0 44px rgba(20,24,40,.20)',
  },
  duration: {
    fast: 150,
    base: 180,
    slow: 480,
  },
  ease: {
    out: 'cubic-bezier(.32,.72,0,1)',
    spring: 'cubic-bezier(.34,1.5,.64,1)',
  },
  layout: {
    header: 70,
    headerPhone: 60,
    rail: 74,
    railIcon: 22,
    tap: 40,
    /* hauteur de la barre du bas sur mobile, hors zone gestuelle iOS */
    tabbar: 64,
  },
};

/* Variables CSS : c'est ce que les feuilles de style des cartes utilisent.
 * Les noms `--skylight-*` sont conservés : ils sont déjà écrits dans tous les
 * écrans (et dans la ressource de polices globale), donc on ne casse rien. */
export function tokensCss() {
  const c = TOKENS.color;
  const r = TOKENS.radius;
  const l = TOKENS.layout;
  /* `var(--theme-x, valeur)` : le thème actif peut redéfinir chaque jeton sur le
   * panneau ; sans `--theme-*` (thème Skylight), le repli est la valeur d'origine,
   * donc le rendu Skylight reste identique au pixel près. */
  return `:host{
--skylight-sans:var(--theme-sans,${TOKENS.font.sans});--skylight-serif:var(--theme-serif,${TOKENS.font.serif});
--f-ink:var(--theme-ink,${c.ink});--f-ink-soft:var(--theme-ink-soft,${c.inkSoft});--f-muted:var(--theme-muted,${c.muted});--f-line:var(--theme-line,${c.line});
--f-surface:var(--theme-surface,${c.surface});--f-rail:var(--theme-rail,${c.rail});--f-rail-ink:var(--theme-rail-ink,${c.railInk});--f-logo-ink:var(--theme-logo-ink,${c.logoInk});--f-chip:var(--theme-chip,${c.chip});
--f-brand:var(--theme-brand,${c.brand});--f-brand-soft:var(--theme-brand-soft,${c.brandSoft});--f-star:var(--theme-star,${c.star});--f-today:var(--theme-today,${c.today});
--f-warn-bg:${c.warnBg};--f-warn-line:${c.warnLine};--f-warn-ink:${c.warnInk};--f-danger:${c.danger};
--f-r-col:var(--theme-r-col,${r.column}px);--f-r-tile:var(--theme-r-tile,${r.tile}px);--f-r-card:var(--theme-r-card,${r.card}px);--f-r-sheet:var(--theme-r-sheet,${r.sheet}px);
--f-r-nav:var(--theme-r-nav,${r.nav}px);--f-r-logo:var(--theme-r-logo,${r.logo}px);--f-r-pill:${r.pill}px;
--f-hdr-h:${l.header}px;--f-rail-w:${l.rail}px;--f-nav-icon:${l.railIcon}px;--f-tap:${l.tap}px;--f-tabbar-h:${l.tabbar}px;--f-dur:${TOKENS.duration.slow}ms;--f-ease:${TOKENS.ease.out};
box-sizing:border-box;
}*,*::before,*::after{box-sizing:border-box}`;
}

/* =========================================================================
 * 2. PETITS OUTILS PARTAGÉS (une seule implémentation pour toute l'app)
 * ========================================================================= */

export const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function mix(a, b, p) {
  const pa = [1, 3, 5].map((i) => parseInt(a.substr(i, 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.substr(i, 2), 16));
  return '#' + pa.map((v, i) => Math.round(v * (1 - p) + pb[i] * p).toString(16).padStart(2, '0')).join('');
}

export function alpha(hex, a) {
  const c = [1, 3, 5].map((i) => parseInt(hex.substr(i, 2), 16));
  return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')';
}

/* date du jour en heure LOCALE (toISOString est en UTC : à 00 h 30 à Paris il
   renvoie encore la veille) */
export function localDay(d) {
  const x = new Date(d || Date.now());
  x.setMinutes(x.getMinutes() - x.getTimezoneOffset());
  return x.toISOString().slice(0, 10);
}

export function hexToHsl(hex) {
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

/* ---------- teinte d'identité → déclinaison pastel ----------
   Teinte et saturation conservées, luminosité poussée à 82 %. C'est le SEUL
   sens de dérivation qui reproduise les quatre pastels calibrés à la main
   (voir ETAT-CHANTIER.md). Changer une couleur de profil recalcule son pastel ;
   re-cliquer la même teinte ne touche à rien. */
export function pastelOf(hex) {
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

/* échelle de tons mesurée sur Skylight : colonne < tuile < bande/pastille < cochée */
export function profileTones(p) {
  const fill = (p && p.color) || '#DDE3EA';
  const accent = (p && p.accent) || '#7A8596';
  const tile = mix('#ffffff', fill, 0.32);
  return {
    col: mix('#ffffff', fill, 0.20),
    tile,
    band: mix('#ffffff', fill, 0.40),
    done: mix(tile, accent, 0.40),
  };
}

/* =========================================================================
 * 3. LA BARRE DE NAVIGATION — définie une seule fois
 * ========================================================================= */

/* C'est la seule liste de navigation de l'app. L'onglet actif est déduit de
   l'URL : aucune vue ne porte de `on: true`. Ajouter une vue = une ligne ici.
 *
 * `bar: true` = cette destination a sa place dans la barre du bas. Elle en
 * accepte QUATRE, la cinquième case étant réservée au bouton « Plus » : au-delà,
 * les autres entrées glissent d'elles-mêmes dans cette feuille. Ajouter une
 * fonctionnalité ne casse donc plus la mise en page. Sur tablette, la barre
 * latérale garde TOUTES les entrées : la place verticale ne coûte rien. */
export const NAV = [
  { icon: 'cal', label: 'Calendrier', path: '/famille-home/calendrier', bar: true },
  { icon: 'check', label: 'Tâches', path: '/famille-home/taches', bar: true },
  { icon: 'star', label: 'Récompenses', path: '/famille-home/recompenses', bar: true },
  { icon: 'meals', label: 'Repas', path: '/famille-home/repas-test', bar: true },
  { icon: 'people', label: 'Profils', path: '/famille-home/profils' },
  /* `last: true` = détachée en bas, derrière un filet : ce n'est pas une vue de
     contenu, c'est la maison. Une seule entrée de ce type, par convention. */
  { icon: 'gear', label: 'Réglages', path: '/famille-home/reglages', last: true },
];

/* Icônes : SF Symbols (Apple), en deux remplissages du MÊME symbole.
 *   `o` = contour (au repos)   `f` = plein (onglet actif)
 * Les tracés sont dans `skylight-icons.js`, généré depuis les .svg du miroir
 * public. On ne dessine rien ici : on assemble. Deux dessins différents feraient
 * sauter l'icône au changement d'onglet, donc la paire vient toujours du même
 * symbole (`star` / `star.fill`, `gearshape` / `gearshape.fill`, …). */
const iconSvg = (ic, variant, strokeOnly) => '<svg class="ic ' + variant + '"' + (strokeOnly ? ' data-same="1"' : '') + ' viewBox="0 0 ' + ic.w + ' ' + ic.h + '"'
  + ' preserveAspectRatio="xMidYMid meet"><g transform="'
  + (variant === 'fl' ? ic.gf : ic.go) + '"><path d="'
  + (variant === 'fl' ? ic.f : ic.o) + '"/></g></svg>';

/* Symboles qui n'ont PAS de variante pleine chez Apple : calendar et
 * ork.knife. Les dessiner en contour donnait un trait trop fin, et le
 * calendrier n'était plus reconnaissable. Ils restent donc PLEINS dans les deux
 * états, et c'est la couleur (bleu Apple) qui marque l'onglet actif.
 * La liste est vide : aucun symbole n'est traité en contour. */
const STROKE_ONLY = {};

export const NAV_ICON = Object.fromEntries(Object.entries(SF_ICON).map(([k, ic]) => [k, {
  o: iconSvg(ic, 'ov', STROKE_ONLY[k]),
  f: iconSvg(ic, 'fl', STROKE_ONLY[k]),
  p: iconSvg(ic, 'fl', STROKE_ONLY[k]),
}]));

/* Compatibilité : la barre latérale et la feuille « Plus » rendent le plein. */
export const NAV_SVG = Object.fromEntries(Object.entries(NAV_ICON).map(([k, v]) => [k, v.p]));

/* __SKYLIGHT_PATH sert au banc d'essai local (hors Home Assistant) : il permet
   de prévisualiser l'onglet actif sans changer l'URL du fichier. */
export function currentPath() {
  let p = (typeof window !== 'undefined' && (window.__SKYLIGHT_PATH || (window.location && window.location.pathname))) || '/';
  p = String(p).replace(/\/+$/, '');
  return p || '/';
}

/* l'URL dit où on est ; à la racine du dashboard, la première vue est active */
export function isActive(item, path) {
  const target = String((item && item.path) || '').replace(/\/+$/, '');
  if (!target) return false;
  if (path === target) return true;
  if (path === '/famille-home' || path === '/') {
    return target === String(NAV[0].path).replace(/\/+$/, '');
  }
  return false;
}

/* quelle entrée est allumée : l'URL d'abord, `on` en secours (banc d'essai) */
export function activePath(path) {
  const p = path || currentPath();
  const hit = NAV.find((n) => isActive(n, p));
  if (hit) return String(hit.path);
  const forced = NAV.find((n) => n.on);
  return forced ? String(forced.path) : null;
}

/* La feuille « Plus » est-elle ouverte ? Cet état pilote le rendu de la barre :
   tant qu'elle est ouverte, AUCUNE destination n'est allumée et « Plus » l'est.
   C'est un état de module, pas une classe posée après coup, donc un re-rendu de
   la carte (hass, resize) ne peut plus rallumer l'onglet précédent. */
let navSheetOpen = false;

/* Combien de destinations la barre du bas accepte, « Plus » compris. Quatre
   destinations + le bouton = cinq cases, la limite d'une barre d'onglets. */
export const BAR_SLOTS = 5;

/* Répartit la liste entre la barre et le « Plus ». Une entrée sans `bar: true`
   (Profils, Réglages…) va directement dans le Plus ; au-delà de quatre
   destinations marquées, les suivantes y glissent aussi, toutes seules. */
export function navSplit(items = NAV) {
  const barables = items.filter((n) => n.bar && !n.last);
  const shown = barables.slice(0, BAR_SLOTS - 1);
  const rest = items.filter((n) => shown.indexOf(n) === -1);
  return { shown, rest };
}

export function navHtml(opts = {}) {
  const path = opts.path || currentPath();
  const on = opts.active || activePath(path);
  const initial = opts.initial == null ? 'F' : opts.initial;
  const items = opts.nav || NAV;
  const btn = (n) => {
    const hot = on ? String(n.path) === String(on) : false;
    /* contour au repos, plein quand l'onglet est actif — les deux dessins
       viennent du MÊME symbole Apple (voir NAV_ICON), le CSS choisit */
    const ic = NAV_ICON[n.icon] || NAV_ICON.check;
    return `<button class="ri${hot ? ' on' : ''}" data-nav="${esc(n.path)}" aria-current="${hot ? 'page' : 'false'}">${ic.o}${ic.f}<span class="tx">${esc(n.label)}</span></button>`;
  };
  /* Variante de poche : les DEUX remplissages du même dessin sont dans le
     balisage, le CSS n'en montre qu'un. Comme ils viennent du même fichier
     d'icônes, la forme est identique — rien ne « saute ». */
  const btnTab = (n) => {
    const hot = !navSheetOpen && on ? String(n.path) === String(on) : false;
    const ic = NAV_ICON[n.icon] || NAV_ICON.dots;
    return `<button class="ri${hot ? ' on' : ''}" data-nav="${esc(n.path)}" aria-current="${hot ? 'page' : 'false'}">${ic.o}${ic.f}<span class="tx">${esc(n.label)}</span></button>`;
  };
  const plusBtn = (hot) => `<button class="ri${hot ? ' on' : ''}" data-navmore="1" aria-label="Plus">`
    + `${NAV_ICON.dots.o}${NAV_ICON.dots.f}<span class="tx">Plus</span></button>`;
  const main = items.filter((n) => !n.last);
  const bottom = items.filter((n) => n.last);
  const rail = `<nav class="rail" aria-label="Navigation"><div class="logo">${esc(initial)}</div>${main.map(btn).join('')}`
    + (bottom.length ? `<div class="sp"></div><div class="rule"></div>${bottom.map(btn).join('')}` : '')
    + `</nav>`;
  /* En poche, la MÊME liste devient une barre flottante : mêmes entrées, même
     onglet actif, un seul endroit à tenir à jour. Au-delà de quatre
     destinations, la cinquième case devient « Plus ». */
  const { shown, rest } = navSplit(items);
  /* « Plus » est actif quand la feuille est ouverte, ou quand la vue courante
     fait partie de son contenu (Profils, Réglages…). */
  const plusHot = navSheetOpen
    || rest.some((n) => on && String(n.path).replace(/\/+$/, '') === String(on));
  const plus = rest.length ? plusBtn(plusHot) : '';
  const tabs = `<nav class="tabbar" aria-label="Navigation">${shown.map(btnTab).join('')}${plus}</nav>`;
  return rail + tabs;
}

export function go(path) {
  /* V2 : une carte peut encore demander une URL de dashboard ; on la traduit en
     vue de l'application, sans quitter le panneau. */
  const m = String(path || '').match(/^\/famille-home(?:\/([^/?#]+))?/);
  if (m && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('skylight-navigate', { detail: { view: m[1] || 'calendrier' } }));
    return;
  }
  history.pushState(null, '', path);
  window.dispatchEvent(new CustomEvent('location-changed', { detail: { replace: true } }));
}

/* ---------- la feuille « Plus » ----------
 * Autonome : elle se crée DANS le shadow root de la carte au moment du clic et
 * se retire au clic suivant, sans dépendre du panneau d'un écran particulier.
 * Elle doit être dans le shadow root, pas à côté : posée sur l'élément hôte,
 * elle existerait dans le DOM clair, que la carte n'affiche pas. */
export function closeNavSheet(root) {
  if (!root) return;
  navSheetOpen = false;
  root.querySelectorAll('.f-navscrim,.f-navsheet').forEach((n) => n.remove());
  refreshNavActive(root);
}

/* Recalcule l'onglet actif à partir de l'URL. Sert après la fermeture de la
   feuille : quand elle est ouverte, c'est « Plus » qui est allumé, et l'onglet
   de la vue courante doit s'éteindre — sinon deux cases sont bleues. */
export function refreshNavActive(root) {
  if (!root) return;
  const p = currentPath();
  const { rest } = navSplit();
  const norm = (s) => String(s || '').replace(/\/+$/, '');
  root.querySelectorAll('.tabbar .ri[data-nav]').forEach((b) => {
    b.classList.toggle('on', !navSheetOpen && norm(b.dataset.nav) === p);
  });
  const hot = navSheetOpen || rest.some((n) => norm(n.path) === p);
  root.querySelectorAll('[data-navmore]').forEach((b) => b.classList.toggle('on', hot));
}
export const syncPlusActive = refreshNavActive;

export function openNavSheet(root) {
  if (!root) return null;
  closeNavSheet(root);
  navSheetOpen = true;
  const { rest } = navSplit();
  if (!rest.length) return null;
  const scrim = document.createElement('div');
  scrim.className = 'f-navscrim';
  const sheet = document.createElement('div');
  sheet.className = 'f-navsheet';
  sheet.setAttribute('role', 'dialog');
  sheet.setAttribute('aria-label', 'Plus');
  sheet.innerHTML = rest.map((n) => `<button class="f-navrow" data-nav="${esc(n.path)}">`
    + `${(NAV_ICON[n.icon] || NAV_ICON.dots).o}<span>${esc(n.label)}</span></button>`).join('');
  root.appendChild(scrim);
  root.appendChild(sheet);
  /* feuille ouverte : c'est « Plus » qui est actif, l'onglet de la vue s'éteint */
  root.querySelectorAll('.tabbar .ri').forEach((b) => b.classList.remove('on'));
  root.querySelectorAll('[data-navmore]').forEach((b) => b.classList.add('on'));
  requestAnimationFrame(() => scrim.classList.add('on'));
  const close = () => closeNavSheet(root);
  scrim.addEventListener('click', close);
  sheet.querySelectorAll('[data-nav]').forEach((b) => {
    b.addEventListener('click', () => { close(); go(b.dataset.nav); });
  });
  return close;
}

export function bindNav(root) {
  if (!root) return;
  root.querySelectorAll('[data-nav]').forEach((b) => {
    b.addEventListener('click', () => go(b.dataset.nav));
  });
  root.querySelectorAll('[data-navmore]').forEach((b) => {
    b.addEventListener('click', (ev) => { ev.preventDefault(); openNavSheet(root); });
  });
  /* la carte vient de re-rendre : on réaligne l'état actif sur la réalité */
  refreshNavActive(root);
}

/* Styles de la barre. Une seule taille d'icône (`--f-nav-icon`) pour toutes les
   vues : la carte Tâches dessinait 21 px et la coque 22 px, et l'écart se voyait
   en passant d'un onglet à l'autre. 22 px = la valeur des quatre autres vues. */
export const NAV_CSS = `
.rail{flex:0 0 var(--f-rail-w,74px);background:var(--f-rail,#EDF1F5);display:flex;flex-direction:column;align-items:center;padding:13px 0 11px;gap:3px}
.rail .sp{flex:1 1 auto}
.rail .rule{width:38px;height:1px;background:#D7DDE5;margin:6px 0;flex:0 0 1px}
.logo{width:36px;height:36px;border-radius:var(--f-r-logo,11px);background:#DCE3EC;color:var(--f-logo-ink,#4E5A6B);display:grid;place-items:center;font-family:var(--skylight-serif,Literata,Georgia,serif);font-size:20px;margin-bottom:13px}
.ri{width:62px;padding:9px 0 7px;border-radius:var(--f-r-nav,13px);display:flex;flex-direction:column;align-items:center;gap:6px;color:var(--f-rail-ink,#4A5464);cursor:pointer;border:0;background:none;font:inherit}
.ri svg{width:var(--f-nav-icon,22px);height:var(--f-nav-icon,22px)}
.ic{display:block;fill:currentColor;stroke:currentColor;stroke-width:1;stroke-linejoin:round}
/* la réserve à laisser sous la dernière ligne quand la barre est flottante :
   UNE valeur, publiée ici, lue par toutes les zones qui défilent. Deux nombres
   différents = une vue où la dernière ligne reste coincée sous le verre. */
/* LE bleu de l'app : le systemBlue d'Apple. Tout ce qui est action — bouton
   principal, bascule, curseur, anneau de focus, onglet actif — prend cette
   valeur et rien d'autre. Les teintes d'identité des personnes ne sont PAS des
   bleus d'action : elles restent dans les palettes des cartes. */
/* la pastille (étoiles, compteur) : UNE taille pour toute l'app. Tâches la
   dessinait en 26 px / 12,5 px, Récompenses en 32 px / 19 px — deux pastilles
   côte à côte dans le même en-tête, ça se voit. */
:host{--f-pill-h:26px;--f-pill-fs:12.5px;--f-pill-fw:700;--f-pill-icon:16px;--f-pill-pad:0 10px;
  --f-tabbar-inset:calc(var(--f-tabbar-h,64px) + 40px);
  --f-blue:#007AFF;--f-blue-press:#0062CC;--f-blue-soft:#E5F0FF;
  --f-blue-line:rgba(0,122,255,.42)}
.ri .tx{font-size:11px;font-weight:500;line-height:1}
.ri.on{background:#fff;color:var(--f-ink,#1F2328);box-shadow:${TOKENS.shadow.raised}}

/* Contour au repos, plein quand l'onglet est actif : la règle doit valoir à
   TOUTES les largeurs. Elle vivait dans le bloc mobile ; sur grand écran les
   deux dessins s'affichaient donc l'un sous l'autre (constaté le 09/11). */
.ri svg.ov{display:block}
.ri svg.fl{display:none}
.ri.on svg.ov{display:none}
.ri.on svg.fl{display:block}

/* ---- la barre du bas : la même liste, en navigation de poche (< 900 px) ----
   Elle apparaît exactement là où la barre latérale disparaît. Sans elle, sur
   téléphone, il ne reste que les onglets de Home Assistant — c'est-à-dire
   précisément ce que l'app masque. Une seule liste (NAV), deux présentations. */
.tabbar{display:none}
@media (max-width:900px){
  .rail{display:none}
  /* ---- la barre FLOTTANTE (verre dépoli), 05/11 ----
     Elle ne touche plus le bord : elle flotte au-dessus du contenu, avec des
     marges, et le contenu défile derrière. C'est la forme de référence de
     « Liquid Glass ». Les valeurs viennent des recettes publiées, pas d'un
     réglage au hasard :
       - verre clair posé sur du contenu : blur 14-18 px, blanc à 0,10-0,14 ;
       - liseré lumineux en haut (inset 0 1px 0 blanc) + ombre large ;
       - saturate(180%) pour que la couleur du fond survive au flou.
     Réf. : https://raw.githubusercontent.com/iart-ai/web-animation-skills/main/skills/glassmorphism/references/glass-recipes.md
            https://html-in-canvas.dev/liquid-glass-effect/ */
  .app{flex-direction:column;position:relative}
  .main{order:1;padding-bottom:0}
  /* la dernière ligne de chaque zone qui défile garde de la place sous elle :
     elle peut donc remonter au-dessus de la barre. C'est l'équivalent d'un
     « content inset » natif, et c'est ce que font les apps à barre flottante. */
  .main .scroll,.main .body,.main .pbody{padding-bottom:var(--f-tabbar-inset);
    overscroll-behavior:contain;-webkit-overflow-scrolling:touch}
  .tabbar{order:2;position:absolute;left:16px;right:16px;z-index:20;
    bottom:calc(8px + env(safe-area-inset-bottom,0px));
    height:var(--f-tabbar-h,64px);display:flex;align-items:stretch;
    box-sizing:border-box;overflow:hidden;padding:0 8px;border-radius:32px;
    background:linear-gradient(180deg,rgba(255,255,255,.52) 0%,rgba(224,234,248,.32) 100%);
    -webkit-backdrop-filter:blur(38px) saturate(260%) brightness(1.12) contrast(1.04);
    backdrop-filter:blur(38px) saturate(260%) brightness(1.12) contrast(1.04);
    box-shadow:0 0 0 1px rgba(20,24,40,.06),
      0 26px 56px rgba(20,24,40,.24),0 8px 18px rgba(20,24,40,.10),
      inset 0 1px 0 rgba(255,255,255,1),
      inset 0 -18px 26px -22px rgba(20,24,40,.20)}
  /* la « loupe » : une lumière qui accroche le haut du verre, en mode screen
     pour ne pas laver les icônes */
  .tabbar::before{content:'';position:absolute;inset:0;border-radius:inherit;pointer-events:none;
    background:linear-gradient(180deg,rgba(255,255,255,.85) 0%,rgba(255,255,255,.20) 34%,rgba(255,255,255,0) 62%,rgba(20,24,40,.06) 100%);
    mix-blend-mode:screen;opacity:.55}
  .tabbar .ri{flex:1 1 0;min-width:0;width:auto;height:100%;position:relative;z-index:1;
    padding:7px 2px 6px;gap:4px;justify-content:center;align-items:center;overflow:hidden;
    background:none;box-shadow:none;color:#2A2F38;border-radius:24px}
  /* Même HAUTEUR pour tous : les symboles Apple n'ont pas le même
     encombrement (le calendrier est carré, l'étoile et les couverts sont
     étroits). Les caler sur une case carrée rendait le calendrier plus gros. */
  .tabbar .ri svg.ic{height:23px;width:auto;max-width:25px}
  .ri svg.ov{display:block}
  .ri svg.fl{display:none}
  .tabbar .ri .tx{font-size:9.5px;font-weight:500;letter-spacing:.01em;max-width:100%;
    overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  /* Deux remplissages du MÊME dessin : contour au repos, plein quand l'onglet
     est actif. Même fichier source, même géométrie, donc rien ne saute. */
  /* bleu système Apple (#007AFF, systemBlue en clair) pour l'onglet actif */
  .tabbar .ri.on{background:none;box-shadow:none;color:#007AFF}
  .ri.on svg.ov{display:none}
  .ri.on svg.fl{display:block}
  /* pas de variante pleine chez Apple (calendrier, couverts, points) : on
     épaissit le trait — c'est le seul signal possible sans inventer un dessin. */
  .tabbar .ri.on .tx{font-weight:700}
  /* le bouton flottant remonte au-dessus de la barre et de la zone gestuelle */
  .fab{bottom:calc(var(--f-tabbar-h,64px) + 34px + env(safe-area-inset-bottom,0px))!important}
}
/* sans flou (vieux moteur), le verre deviendrait transparent : on l'opacifie */
/* ---- la colonne « une personne » ----
   Tâches et Récompenses dessinaient la même colonne avec les mêmes valeurs sur
   grand écran, puis chacune la redéfinissait à sa façon en poche : 44 px
   d'avatar d'un côté, 54 de l'autre, et pas de palier 600 px côté Récompenses.
   Les règles mobiles vivent maintenant ICI, une seule fois. Une carte qui veut
   une autre taille change le jeton, pas la règle. */
/* ---- l'en-tête de colonne : avatar + nom + ce qui suit ----
   Les deux cartes avaient le MEME balisage (.head > .ava + .who > .nm) et
   deux copies de ces regles. Elles ne differaient que d'un pixel : .bars avait
   4 px de marge sous le nom, .solde 5 px. L'avatar etant centre, ce pixel le
   decalait d'un demi-pixel — le « petit decalage vertical » qu'on voyait en
   passant d'une vue a l'autre. Une seule definition, ici. */
:host .head{display:flex;align-items:center;gap:var(--f-col-gap-x,11px);padding:1px 3px 0;flex:0 0 auto}
:host .ava{width:var(--f-col-ava-big,54px);height:var(--f-col-ava-big,54px);flex:0 0 var(--f-col-ava-big,54px);
  border-radius:50%;overflow:hidden;background:var(--accent);display:grid;place-items:center;color:#fff;
  font-size:21px;font-weight:700;box-shadow:0 0 0 2.5px var(--halo),0 2px 9px var(--halo)}
:host .ava img{width:100%;height:100%;object-fit:cover;display:block}
:host .who{min-width:0;flex:1}
:host .nm{font-family:var(--skylight-serif,Literata,Georgia,serif);font-size:var(--f-col-nm,26px);line-height:1.18;
  letter-spacing:-.01em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
:host .bars,:host .solde{margin-top:var(--f-col-gap-y,4px)}
/* :host devant chaque selecteur : la carte pose SES regles APRES le tronc,
   donc a specificite egale c'est elle qui gagnerait. Ce prefixe remet le tronc
   devant, sans avoir a toucher l'ordre des feuilles de chaque carte. */
@media (max-width:900px){
  :host .col{flex:0 0 var(--f-col-basis,calc(50% - 12px));min-width:0;
    border-radius:var(--f-col-radius,24px);padding:var(--f-col-pad,12px) var(--f-col-pad,12px) 0}
  :host .ava{width:var(--f-col-ava,44px);height:var(--f-col-ava,44px);flex:0 0 var(--f-col-ava,44px)}
  :host .nm{font-size:var(--f-col-name,22px)}
}
@media (max-width:600px){
  :host .col{flex:0 0 calc(100% - 18px)}
  :host .ava{width:40px;height:40px;flex:0 0 40px}
  :host .nm{font-size:20px}
}@supports not ((backdrop-filter:blur(1px)) or (-webkit-backdrop-filter:blur(1px))){
  .tabbar{background:rgba(252,253,255,.97)}
  .f-navsheet{background:rgba(252,253,255,.98)}
}
@media (prefers-reduced-transparency:reduce){
  .tabbar{background:#fff;-webkit-backdrop-filter:none;backdrop-filter:none}
  .f-navsheet{background:#fff;-webkit-backdrop-filter:none;backdrop-filter:none}
}
/* sous 380 px, 9,5 px ne suffisent plus pour « Récompenses » : on perd un
   demi-point, on ne tronque pas. */
@media (max-width:380px){
  .tabbar .ri .tx{font-size:9px}
}

/* ---- la feuille « Plus » : EXACTEMENT le même verre que la barre ---- */
.f-navscrim{position:fixed;inset:0;z-index:900;background:rgba(16,20,32,.26);
  opacity:0;transition:opacity .18s ease}
.f-navscrim.on{opacity:1}
.f-navsheet{position:fixed;left:16px;right:16px;z-index:901;
  bottom:calc(var(--f-tabbar-h,64px) + 20px + env(safe-area-inset-bottom,0px));
  padding:12px 10px 14px;border-radius:32px;
  background:linear-gradient(180deg,rgba(255,255,255,.52) 0%,rgba(224,234,248,.32) 100%);
  -webkit-backdrop-filter:blur(38px) saturate(260%) brightness(1.12) contrast(1.04);
  backdrop-filter:blur(38px) saturate(260%) brightness(1.12) contrast(1.04);
  box-shadow:0 0 0 1px rgba(20,24,40,.06),
    0 26px 56px rgba(20,24,40,.24),0 8px 18px rgba(20,24,40,.10),
    inset 0 1px 0 rgba(255,255,255,1),
    inset 0 -18px 26px -22px rgba(20,24,40,.20);
  animation:f-navup .22s cubic-bezier(.32,.72,0,1)}
@keyframes f-navup{from{transform:translateY(14px);opacity:0}to{transform:none;opacity:1}}
.f-navrow{display:flex;align-items:center;gap:14px;width:100%;padding:14px 16px;border:0;
  background:none;font:inherit;font-size:15px;font-weight:600;color:var(--f-ink,#1F2328);
  border-radius:24px;text-align:left;cursor:pointer}
.f-navrow:active{background:rgba(20,24,40,.07)}
.f-navrow svg{width:24px;height:24px;flex:0 0 24px;fill:#2A2F38}
`;

/* =========================================================================
 * 4. L'EN-TÊTE — un seul, pour toutes les vues
 * ========================================================================= */

/* `actions` : HTML des boutons de droite (chaque vue les siens).
   `dayNav` : les trois boutons ‹ Aujourd'hui › (une vue sans jour passe false).
   Trois dispositions, une seule implémentation :
   - `flat`  (Tâches, Récompenses) : date / heure / météo / actions / jour ;
   - `split` (Repas)              : un bloc date+heure+météo, un bloc actions ;
   - `title` (Profils)            : retour + titre de sous-vue. */
export function headerHtml(opts = {}) {
  const ids = opts.ids || {};
  const variant = opts.variant || 'flat';
  /* `actions` accepte une chaîne ou une liste de chaînes */
  const actions = Array.isArray(opts.actions) ? opts.actions.join('') : (opts.actions || '');

  if (variant === 'title') {
    const back = opts.back
      ? `<button class="back" id="${esc(opts.back.id || 'back')}" aria-label="${esc(opts.back.label || 'Retour')}"${opts.back.hidden ? ' hidden' : ''}>${opts.back.icon || ''}</button>`
      : '';
    return `<div class="hdr title">${back}<h1 class="ttl" id="${esc(ids.title || 'title')}">${esc(opts.title || '')}</h1>${actions}</div>`;
  }

  if (variant === 'split') {
    return `<header class="hdr split">
        <div class="hdr-l">
          <h1 class="date" id="${esc(ids.date || 'd')}">${opts.date || ''}</h1>
          <span class="time" id="${esc(ids.time || 't')}"></span>
          <span class="weather" id="${esc(ids.wx || 'w')}"></span>
        </div>
        <div class="hdr-r">${actions}</div>
      </header>`;
  }

  const day = opts.dayNav === false ? '' : dayNavHtml(opts.dayLabels);
  return `<header class="hdr">
      <div class="date" id="${esc(ids.date || 'd')}"></div>
      <div class="time" id="${esc(ids.time || 't')}"></div>
      <div class="wx" id="${esc(ids.wx || 'w')}"></div>
      <div class="sp"></div>
      ${actions}
      ${day}
    </header>`;
}

export function dayNavHtml(labels = {}) {
  const prev = labels.prev || '\u2039';
  const next = labels.next || '\u203A';
  const today = labels.today || "Aujourd'hui";
  const id = labels.id || 'todayBtn';
  return `<div class="nav">
        <button class="ar" data-day="-1" aria-label="Jour précédent">${prev}</button>
        <button data-day="0" id="${esc(id)}">${esc(today)}</button>
        <button class="ar" data-day="1" aria-label="Jour suivant">${next}</button>
      </div>`;
}

/* Réécrit les trois zones de l'en-tête. On ne touche au DOM que si la valeur
   change : sans ces gardes, chaque `hass` (toutes les ~1 s) provoquerait un
   recalcul de mise en page. */
export function paintHeader(root, v = {}) {
  if (!root) return;
  const dEl = root.getElementById('d');
  if (dEl && v.date != null && dEl.textContent !== v.date) dEl.textContent = v.date;
  const tEl = root.getElementById('t');
  if (tEl && v.time != null && tEl.textContent !== v.time) tEl.textContent = v.time;
  const wEl = root.getElementById('w');
  if (wEl && v.weather != null && wEl.innerHTML !== v.weather) wEl.innerHTML = v.weather;
}

/* ---------- l'en-tête : date, heure, météo ----------
 * Le format de la date et la météo étaient recalculés DANS CHAQUE CARTE :
 * trois formats de date (« Jeu. 5 nov » ici, « Jeudi 5 novembre » là) et deux
 * tables d'emoji. Le tronc commun ne fournissait que le cadre, pas le contenu —
 * donc rien n'empêchait les écrans de diverger. C'est ici, et nulle part
 * ailleurs, maintenant. Une carte qui veut l'en-tête appelle paintHeaderLive. */
export const WEATHER_EMOJI = {
  'clear-night': '\u{1F319}', cloudy: '\u2601\uFE0F', fog: '\u{1F32B}\uFE0F',
  hail: '\u{1F328}\uFE0F', lightning: '\u{1F329}\uFE0F',
  'lightning-rainy': '\u26C8\uFE0F', partlycloudy: '\u26C5', pouring: '\u{1F327}\uFE0F',
  rainy: '\u{1F326}\uFE0F', snowy: '\u2744\uFE0F', 'snowy-rainy': '\u{1F328}\uFE0F',
  sunny: '\u2600\uFE0F', windy: '\u{1F32C}\uFE0F', 'windy-variant': '\u{1F32C}\uFE0F',
};

/* « Jeu. 5 nov. » — la forme courte, celle de l'en-tête. `long: true` donne
   « Jeudi 5 novembre » pour les endroits qui ont la place (titre d'écran). */
export function headerDate(date = new Date(), opts = {}) {
  const d = date instanceof Date ? date : new Date(date);
  const f = opts.long
    ? { weekday: 'long', day: 'numeric', month: 'long' }
    : { weekday: 'short', day: 'numeric', month: 'short' };
  const s = d.toLocaleDateString('fr-FR', f);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/* Choisit la météo de l'installation, sans réglage.
 *
 * L'app ne doit dépendre d'aucune entité nommée : on prend la première
 * `weather.*` utilisable, en privilégiant les noms que HA crée lui-même
 * (Met.no → `weather.forecast_home`) puis les noms courants. Un `weather.*`
 * en `unavailable`/`unknown` est écarté. Aucune météo trouvée → chaîne vide,
 * et l'en-tête n'affiche rien (pas d'erreur, pas de trou).
 */
export function autoWeatherEntity(hass) {
  const states = (hass && hass.states) || {};
  const ids = Object.keys(states).filter((id) => id.startsWith('weather.'));
  if (!ids.length) return '';
  const usable = ids.filter((id) => {
    const st = states[id];
    return st && st.state && st.state !== 'unavailable' && st.state !== 'unknown';
  });
  const pool = usable.length ? usable : ids;
  for (const pref of ['weather.forecast_home', 'weather.home', 'weather.forecast_maison', 'weather.meteo', 'weather.maison']) {
    if (pool.indexOf(pref) !== -1) return pref;
  }
  const withTemp = pool.find((id) => typeof ((states[id].attributes || {}).temperature) === 'number');
  return withTemp || pool[0];
}

/* La météo, en une seule formule pour tous les écrans. */
export function headerWeather(hass, cfg = {}) {
  const eid = (cfg && cfg.weather_entity) || autoWeatherEntity(hass);
  const st = hass && hass.states && hass.states[eid];
  if (!st || !st.state) return '';
  const em = WEATHER_EMOJI[st.state] || '';
  const t = st.attributes && st.attributes.temperature;
  return `<span class="wemo">${em}</span>${typeof t === 'number' ? Math.round(t) + '\u00B0' : ''}`;
}

/* Peint les trois zones de l'en-tête d'un coup, avec les règles communes.
   `cfg.header_long_date` n'existe pas par défaut : la forme courte est la
   règle, sinon les écrans recommencent à diverger. */
export function paintHeaderLive(root, hass, cfg = {}) {
  if (!root) return;
  /* `today: false` = on regarde un autre jour : l'heure et la météo n'ont plus
     de sens, on les vide. C'est une règle commune, pas un réglage par écran. */
  const today = cfg.today !== false;
  /* filet : une carte peut encore configurer une entité d'heure qui n'existe
     pas (l'ancien sensor.current_time). On retombe sur l'heure de l'app. */
  const states = (hass && hass.states) || {};
  const timeEnt = states[cfg.time_entity] || states['sensor.heure_actuelle'];
  paintHeader(root, {
    date: headerDate(new Date(), { long: !!cfg.header_long_date }),
    time: today && timeEnt ? timeEnt.state : '',
    weather: today ? headerWeather(hass, cfg) : '',
  });
}

const HEADER_BASE = 900;
const HEADER_PHONE = 600;

export const HEADER_CSS = `
.hdr{flex:0 0 auto;height:var(--f-hdr-h,70px);display:flex;align-items:center;gap:13px;padding:0 14px 0 ${TOKENS.space.headerLeft}px;background:#fff;overflow:hidden}
.date{font-family:var(--skylight-serif,Literata,Georgia,serif);font-size:26px;font-weight:700;letter-spacing:-.01em;white-space:nowrap;min-width:0;overflow:hidden;text-overflow:ellipsis;flex-shrink:1}
.time{font-family:var(--skylight-serif,Literata,Georgia,serif);font-size:26px;font-weight:500;opacity:1;white-space:nowrap}
.wx,.weather{font-family:var(--skylight-serif,Literata,Georgia,serif);font-size:26px;font-weight:500;display:inline-block;white-space:nowrap}
.wemo{display:inline;line-height:1.1;font-size:1em;margin-right:4px}
.wtemp{line-height:1.1;display:inline}
.sp{flex:1}
.chip{display:inline-flex;align-items:center;gap:8px;height:40px;padding:0 17px;border-radius:999px;border:0;background:#F2F3F5;font:inherit;font-size:15px;font-weight:600;color:#2B2F38;cursor:pointer}
.chip svg{width:18px;height:18px;fill:currentColor}
.nav{display:flex;align-items:center;gap:5px;flex:0 0 auto}
.nav button{height:40px;padding:0 13px;border-radius:999px;border:1px solid transparent;background:#F2F3F5;color:#2B2F38;font:inherit;font-size:15px;font-weight:600;cursor:pointer;white-space:nowrap}
.nav .ar{width:40px;padding:0;text-align:center}
.nav #todayBtn{width:134px;text-align:center}
.nav button.back{background:#FFF4E2;border-color:#F0DDBB;color:#6B4E20}
/* --- variante « split » (Repas) : un bloc titre+heure+météo, un bloc actions --- */
.hdr.split{justify-content:space-between;gap:16px;padding:0}
.hdr.split .hdr-l{display:flex;align-items:baseline;gap:18px;min-width:0}
.hdr.split .hdr-r{display:flex;align-items:center;gap:8px;flex:0 0 auto}
.hdr.split .date{margin:0}
/* --- variante « titre » (Profils) : sous-vue avec retour --- */
.hdr.title{gap:14px;padding:0 22px}
.hdr.title .ttl{margin:0;font-family:var(--skylight-serif,Literata,Georgia,serif);font-size:26px;font-weight:600;letter-spacing:-.01em}
.hdr.title .back{width:38px;height:38px;flex:0 0 38px;border:0;border-radius:50%;background:transparent;color:var(--f-ink,#1F2328);cursor:pointer;display:grid;place-items:center;margin-left:-8px}
.hdr.title .back[hidden]{display:none}
.hdr.title .back:hover{background:#F2F4F7}
.hdr.title .back svg{width:22px;height:22px;fill:currentColor}
@media (max-width:${HEADER_BASE}px){
  /* en-tête mobile commun aux trois vues : 60 px, 12 px de marge, écarts 8 px,
     date serif 18 px / 700, heure et météo 16 px / 500 — mêmes valeurs dans
     les Repas (skylight-meals-v2) et le Calendrier (uix.style) */
  .hdr{height:60px;padding:0 12px;gap:0!important}
  .date{font-size:18px;line-height:1.1;margin:0 8px 0 0!important}
  .time{font-size:16px;font-weight:500;line-height:1.1;margin:0 8px 0 0!important;transform:translateY(1px)}
  .wx,.weather{display:inline-block;font-size:16px;font-weight:500;line-height:1.1;margin:0 8px 0 0!important;transform:translateY(1px)}
  .nav{margin-left:auto}.chip{width:36px;height:36px;padding:0;justify-content:center}
  .chip .lbl{display:none}
  .nav button{height:34px;padding:0 10px;font-size:13px}
  .nav .ar{width:34px}
  .nav #todayBtn{width:auto;min-width:104px}
  /* la variante « split » gère ses écarts elle-même (blocs, pas d'éléments nus) */
  .hdr.split{height:60px;padding:0;gap:0!important;flex-wrap:nowrap;min-width:0}
  .hdr.split .hdr-l{flex:1 1 auto;min-width:0;overflow:visible;gap:0!important}
  .hdr.split .hdr-r{flex:0 0 auto;gap:6px}
  .hdr.split .weather{margin:0!important}
}
@media (max-width:${HEADER_PHONE}px){
  /* mêmes valeurs que le point de rupture 900 px : un second palier ne doit pas
     rapetisser l'en-tête, sinon Tâches et Repas divergent sur un téléphone */
  .hdr{gap:8px;padding:0 12px}
  .date{font-size:18px;line-height:1.1;margin:0 8px 0 0!important}
  .time{font-size:16px}
  .nav .ar{display:none}
}
/* le profil est une sous-vue : son en-tête reste à 62 px / 21 px plus longtemps
   (palier 720 px, celui de l'écran Profils depuis toujours) */
@media (max-width:720px){
  .hdr.title{height:62px;padding:0 14px}
  .hdr.title .ttl{font-size:21px}
}
`;

/* =========================================================================
 * 5. COMPOSANTS PARTAGÉS
 * ========================================================================= */

/* ---------- avatar ----------
   Un profil : une photo (`photo`, ou `/local/avatars/<id>.webp`), un emoji
   (`glyph`, préfixé `:` dans la description), sinon l'initiale du prénom.
   L'habillage (classe, variables --accent/--halo) reste à l'écran : les tailles
   et les halos diffèrent d'un endroit à l'autre, la logique non. */
export function avatarHtml(profile, opts = {}) {
  const p = profile || {};
  const face = p.photo || p.face || '';
  let inner;
  if (face && String(face).charAt(0) !== ':') inner = `<img src="${esc(face)}" alt="">`;
  else if (face) inner = esc(String(face).slice(1));
  else if (p.glyph) inner = esc(p.glyph);
  else inner = esc(initialOf(p.name, opts.upper !== false));
  /* sans `tag`, on ne rend que le CONTENU : la carte porte déjà son conteneur
     (.ava, .ga, .a). Avec, on rend le conteneur complet. */
  if (!opts.tag) return inner;
  const cls = opts.className ? ` class="${opts.className}"` : '';
  const attrs = opts.attrs || '';
  return `<${opts.tag}${cls}${attrs}>${inner}</${opts.tag}>`;
}

export function initialOf(name, upper) {
  const s = String(name == null ? '' : name).trim();
  const c = s.charAt(0) || '?';
  return upper ? c.toUpperCase() : c;
}

/* la pastille du geste : elle appartient a l'app, pas a une carte */
export const PTR_CSS = `
.f-ptr{position:fixed;left:50%;top:calc(10px + env(safe-area-inset-top,0px));transform:translate(-50%,-8px);
  z-index:10003;display:flex;align-items:center;gap:9px;padding:9px 16px;border-radius:999px;
  background:rgba(255,255,255,.94);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);
  box-shadow:0 8px 26px rgba(20,24,40,.18),inset 0 0 0 1px rgba(20,24,40,.06);
  font-family:var(--skylight-sans,Figtree,system-ui,sans-serif);font-size:13.5px;font-weight:600;color:#2B2F38;
  opacity:0;pointer-events:none;transition:opacity .16s ease,transform .16s ease}
.f-ptr.on{opacity:1}
.f-ptr .sp{width:15px;height:15px;border-radius:50%;border:2px solid var(--f-blue,#007AFF);
  border-right-color:transparent;transform:rotate(-45deg)}
.f-ptr.ready .sp{border-right-color:var(--f-blue,#007AFF);transform:rotate(0)}
.f-ptr.loading .sp{animation:f-ptrspin .7s linear infinite}
@keyframes f-ptrspin{to{transform:rotate(360deg)}}
`;
/* ---------- état vide ----------
   `text` est du HTML (une colonne y met un <br>). */
export function emptyHtml(emoji, text) {
  return `<div class="empty"><span class="e">${emoji}</span>${text}</div>`;
}

/* ---------- bouton ---------- */
export function buttonHtml(label, opts = {}) {
  const cls = opts.cls ? ` class="${opts.cls}"` : '';
  const attrs = opts.attrs ? ` ${opts.attrs}` : '';
  const type = opts.type ? ` type="${opts.type}"` : '';
  const aria = opts.ariaLabel ? ` aria-label="${esc(opts.ariaLabel)}"` : '';
  return `<button${cls}${type}${attrs}${aria}>${label}</button>`;
}

/* ---------- feuille (le panneau latéral) ---------- */
export function sheetHtml(opts = {}) {
  const closeIcon = opts.closeIcon || '\u2715';
  return `<aside class="panel" id="panel"><div class="ptop"><div class="pttl" id="pttl"></div><button class="back" id="pback" aria-label="Fermer">${closeIcon}</button></div><div class="pbody" id="pbody"></div><div class="pfoot" id="pfoot"></div></aside>`;
}

/* Ouvre la feuille : titre, contenu, pied, mode compact (centré) ou ancré sous
   un bouton (popover). C'est le seul code de panneau de l'app. */
export function openSheet(root, opts = {}) {
  if (!root) return null;
  const panel = root.getElementById('panel');
  const scrim = root.getElementById('scrim');
  const ttl = root.getElementById('pttl');
  if (!panel) return null;
  if (ttl) ttl.textContent = opts.title == null ? '' : opts.title;
  const body = root.getElementById('pbody');
  if (body) body.innerHTML = opts.body == null ? '' : opts.body;
  const foot = root.getElementById('pfoot');
  if (foot) foot.innerHTML = opts.foot == null ? '' : opts.foot;
  const anchorEl = opts.anchor || null;
  panel.classList.toggle('compact', !!opts.compact);
  panel.classList.toggle('anchor', !!anchorEl);
  if (anchorEl) {
    const r = anchorEl.getBoundingClientRect();
    const w = 336;
    panel.style.left = Math.max(12, Math.min(r.right - w, window.innerWidth - w - 12)) + 'px';
    panel.style.top = Math.round(r.bottom + 8) + 'px';
    panel.style.right = 'auto';
  } else {
    panel.style.left = '';
    panel.style.top = '';
    panel.style.right = '';
  }
  panel.classList.add('on');
  if (scrim) {
    scrim.classList.add('on');
    /* popover ancré : pas de fond assombri, un simple capteur de clic extérieur */
    scrim.classList.toggle('soft', !!anchorEl);
  }
  return { panel, body, foot };
}

export function closeSheet(root) {
  if (!root) return;
  const panel = root.getElementById('panel');
  const scrim = root.getElementById('scrim');
  if (panel) panel.classList.remove('on');
  if (scrim) scrim.classList.remove('on');
}

export const SHEET_CSS = `
.panel{position:fixed;top:0;right:0;bottom:0;width:390px;max-width:92vw;background:#fff;z-index:99;border-radius:var(--f-r-sheet,24px) 0 0 var(--f-r-sheet,24px);box-shadow:${TOKENS.shadow.sheet};display:none;flex-direction:column;padding:max(16px,env(safe-area-inset-top,0px)) max(16px,env(safe-area-inset-right,0px)) 0 max(16px,env(safe-area-inset-left,0px))}
.panel.on{display:flex}
.panel.compact{top:50%;left:50%;right:auto;bottom:auto;width:400px;height:auto;max-height:82vh;transform:translate(-50%,-50%);border-radius:22px;padding-bottom:0}
.panel.compact .pfoot{padding-bottom:16px}
/* panneau ancré sous son bouton (comportement attendu pour un « Filtrer ») */
.panel.anchor{top:auto;bottom:auto;right:auto;transform:none;width:336px;border-radius:16px;max-height:calc(100vh - 140px);padding-bottom:0}
.panel.anchor .ptop{padding:12px 14px 2px}
.panel.anchor .pttl{font-size:17px}
.panel.anchor .pbody{padding:8px 14px 14px}
.panel.anchor .pfoot{padding:0}
.ptop{display:flex;align-items:center;gap:12px;margin:2px 0 14px}
.pttl{font-family:var(--skylight-serif,Literata,Georgia,serif);font-size:25px;font-weight:500;flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.back{width:38px;height:38px;flex:0 0 38px;border-radius:50%;border:0;background:#F3F5F8;color:#2B2F38;cursor:pointer;display:grid;place-items:center}
.back svg{width:18px;height:18px;fill:currentColor}
.pbody{flex:1 1 auto;min-height:0;overflow-y:auto;padding-bottom:8px;scrollbar-width:none}
.pbody::-webkit-scrollbar{display:none}
.pfoot{flex:0 0 auto;padding:10px 0 min(24px,max(10px,env(safe-area-inset-bottom,0px)));background:#fff}
@media (max-width:900px){
  .panel{width:100%;max-width:100%;border-radius:0}
  .panel.compact{top:auto;bottom:0;left:0;right:0;width:100%;max-width:100%;height:auto;max-height:86vh;transform:none;border-radius:22px 22px 0 0;padding-top:16px;padding-bottom:min(24px,max(12px,env(safe-area-inset-bottom,0px)))}
}
`;

/* ---------- toast ----------
   Message court, non bloquant, qui se referme seul. Sert aux écrans qui ne
   peuvent pas écrire dans une liste (étoiles, profils). `tone` : info | ok | ko. */
let toastTimer = null;
export function toast(host, message, opts = {}) {
  if (!host) return null;
  let box = host.querySelector ? host.querySelector('.f-toast') : null;
  if (!box) {
    box = document.createElement('div');
    box.className = 'f-toast';
    (host.shadowRoot || host).appendChild(box);
  }
  box.textContent = String(message == null ? '' : message);
  box.dataset.tone = opts.tone || 'info';
  box.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => box.classList.remove('on'), opts.duration || 2600);
  return box;
}

export const TOAST_CSS = `
.f-toast{position:fixed;left:50%;bottom:calc(var(--f-tabbar-h,58px) + 34px + env(safe-area-inset-bottom,0px));transform:translate(-50%,12px);max-width:min(420px,88vw);padding:11px 16px;border-radius:14px;background:#1F2328;color:#fff;font-family:var(--skylight-sans,Figtree,system-ui,sans-serif);font-size:13.5px;font-weight:600;line-height:1.35;text-align:center;box-shadow:0 10px 28px rgba(20,24,40,.28);opacity:0;pointer-events:none;transition:opacity .18s ease,transform .18s ease;z-index:10002}
.f-toast.on{opacity:1;transform:translate(-50%,0)}
.f-toast[data-tone="ok"]{background:#1F6B45}
.f-toast[data-tone="ko"]{background:#8C1D18}
`;

/* Cibles tactiles — règle Apple : 44 × 44 pt au minimum.
 * Appliquée à TOUT bouton qui n'a qu'une icône (ils portent tous un aria-label),
 * et uniquement sur écran tactile : le bureau garde ses tailles. C'est une règle
 * de socle, pas un réglage par écran — sinon on l'oublie dans une carte sur six. */
export const TOUCH_CSS = `
@media (pointer:coarse){
  button[aria-label]{min-width:44px;min-height:44px}
  button[aria-label] > svg{width:22px;height:22px}
}`;

/* Retour d'appui — règle Apple : TOUT élément qu'on touche doit répondre
 * immédiatement, sinon on ne sait pas si le geste est passé (constat du 05/11 :
 * le « ⋯ » d'une récompense ne réagissait pas).
 * Une seule règle pour toutes les cartes : on touche l'opacité, jamais une
 * transformation — une transformation entrerait en conflit avec les animations
 * déjà posées par les écrans (coche, confettis, colonnes). */
export const PRESS_CSS = `
button,[role="button"]{-webkit-tap-highlight-color:transparent;touch-action:manipulation;transition:opacity .07s linear}
button:active:not(:disabled),[role="button"]:active{opacity:.72}`;

/* Tout ce qu'une carte doit injecter dans son shadow root pour avoir l'app. */
export function coreCss() {
  return tokensCss() + NAV_CSS + HEADER_CSS + SHEET_CSS + TOAST_CSS + EVENT_CSS + PTR_CSS + TOUCH_CSS + PRESS_CSS;
}

/* ---------- le formulaire d'événement ----------
 * Même grammaire que « Ajouter une tâche », qui est la référence : feuille
 * plein écran, titre en serif, champs en blocs gris clair SANS bordure, coins
 * de 18 px, bouton rond pour fermer, et un CTA pleine largeur qui passe du bleu
 * pâle (invalide) au bleu Apple (valide). Le formulaire de Daylight, lui, est
 * une carte blanche avec des champs bordés et des libellés à gauche : un autre
 * langage, sur le même écran. On ne le restyle pas, on le remplace. */
export const EVENT_CSS = `
.f-evt{position:fixed;inset:0;z-index:950;background:#fff;display:flex;flex-direction:column;
  overflow:hidden;overscroll-behavior:contain;box-sizing:border-box;

  padding:0;
  font-family:var(--skylight-sans,Figtree,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif);color:#1F2328}
/* les enfants d'une colonne flex se compriment : sans ca, la rangee d'avatars
   etait rognee en hauteur (on ne voyait que le haut des visages) */
.f-evt::-webkit-scrollbar{display:none}
.f-evt>*{flex:0 0 auto}
.f-evt-body{flex:1 1 auto;min-height:0;overflow-y:auto;padding:0 16px 8px;scrollbar-width:none}
.f-evt-body::-webkit-scrollbar{display:none}
.f-evt-head{flex:0 0 auto;display:flex;align-items:flex-start;justify-content:space-between;gap:12px;background:#fff;padding:max(16px,env(safe-area-inset-top,0px)) 16px 6px;margin:0}
.f-evt-title{margin:0;font-family:var(--skylight-serif,Literata,Georgia,serif);font-size:30px;
  line-height:1.12;font-weight:600;letter-spacing:-.01em;color:#1F2328}
.f-evt-x{flex:0 0 auto;width:44px;height:44px;border-radius:50%;border:0;background:#F1F2F4;
  color:#2B2F38;font-size:24px;line-height:1;display:grid;place-items:center;cursor:pointer}
.f-evt-x:active{background:#E6E8EC}
.f-evt-label{display:block;margin:14px 0 8px 4px;font-size:13px;font-weight:700;color:#5A6074;letter-spacing:.01em}
.f-evt-box{background:#F6F7F9;border:0;border-radius:18px;padding:14px 16px;display:block}
.f-evt-box input,.f-evt-box textarea{display:block;width:100%;border:0;background:none;font:inherit;
  font-size:16px;color:#1F2328;outline:none;padding:0;margin:0}
.f-evt-box textarea{min-height:76px;resize:none}
.f-evt-box input::placeholder,.f-evt-box textarea::placeholder{color:#8A8F9C}
.f-evt-line{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:2px 0}
.f-evt-line+.f-evt-line{border-top:1px solid #E7E9ED;margin-top:12px;padding-top:12px}
.f-evt-line b{font-size:14px;font-weight:600;color:#5A6074}
.f-evt-line input{width:auto;flex:1 1 auto;text-align:right;font-size:15.5px}
.f-evt-box:focus-within{box-shadow:inset 0 0 0 2px var(--f-blue-line,rgba(0,122,255,.42))}
/* Le halo de l'avatar selectionne fait 6 px de rayon (2 anneaux : 3 px blancs
   puis 3 px bleus). Avec 2 px de marge, il etait rogne par le defilement
   horizontal de la rangee — on le voyait coupe a gauche et en haut. 8 px de
   marge, et une marge negative egale pour que les visages restent alignes sur
   les libelles au-dessus. */
.f-evt-people{display:flex;gap:14px;overflow-x:auto;padding:8px;margin:0 -8px;
  scrollbar-width:none;-webkit-overflow-scrolling:touch}
.f-evt-people::-webkit-scrollbar{display:none}
.f-evt-p{flex:0 0 auto;display:flex;flex-direction:column;align-items:center;gap:7px;
  border:0;background:none;padding:0;cursor:pointer;font:inherit}
.f-evt-p .face{width:54px;height:54px;border-radius:50%;object-fit:cover;display:grid;place-items:center;
  font-size:27px;background:#EDEFF2;box-shadow:0 0 0 0 transparent;transition:box-shadow .15s ease}
.f-evt-p .nm{font-size:12.5px;font-weight:600;color:#5A6074}
.f-evt-p.on .face{box-shadow:0 0 0 3px #fff,0 0 0 6px var(--f-blue,#007AFF)}
.f-evt-p.on .nm{color:#1F2328;font-weight:700}
.f-evt-sw{display:flex;align-items:center;justify-content:space-between;gap:12px}
.f-evt-tog{width:52px;height:32px;border-radius:999px;border:0;background:#DDE1E7;position:relative;cursor:pointer;flex:0 0 auto}
.f-evt-tog i{position:absolute;top:3px;left:3px;width:26px;height:26px;border-radius:50%;background:#fff;
  box-shadow:0 1px 3px rgba(20,24,40,.25);transition:transform .16s ease}
.f-evt-tog.on{background:var(--f-blue,#007AFF)}
.f-evt-tog.on i{transform:translateX(20px)}
/* le bouton reste collé au bas, sur une bande OPAQUE : sans elle, le champ
   Description passait derriere et on lisait deux textes l'un sur l'autre */
/* PAS de position collante : le bouton flottait au-dessus du contenu, et un
   champ (le lieu ou la description) apparaissait sous lui — l'effet « barre de
   navigation » que ce n'est pas. Il est simplement le dernier element du
   formulaire, comme « Ajouter » dans le formulaire de tache. */
.f-evt-foot{flex:0 0 auto;background:#fff;padding:10px 16px min(24px,max(10px,env(safe-area-inset-bottom,0px)));margin:0}
/* le choix de repetition : meme grammaire que les puces de jour du formulaire
   de tache — bloc gris, selection entouree de bleu */
.f-evt-seg{display:flex;gap:6px}
.f-evt-seg button{flex:1 1 0;height:44px;border-radius:14px;border:0;background:#F6F7F9;
  font:inherit;font-size:14px;font-weight:600;color:#5A6074;cursor:pointer}
.f-evt-seg button.on{background:#fff;color:#1F2328;box-shadow:inset 0 0 0 2px var(--f-blue,#007AFF)}
.f-evt-cta{width:100%;height:56px;border:0;border-radius:18px;
  background:var(--f-blue,#007AFF);color:#fff;font:700 17px var(--skylight-sans,Figtree,system-ui,sans-serif);
  cursor:pointer;letter-spacing:.01em}
.f-evt-cta:active{background:var(--f-blue-press,#0062CC)}
.f-evt-cta[disabled]{background:var(--f-blue-soft,#E5F0FF);cursor:default}
`;

/* Ouvre le formulaire. `profiles` = profils déjà analysés (parseProfiles). */
export function closeEventSheet(root) {
  if (!root) return;
  root.querySelectorAll('.f-evt').forEach((n) => n.remove());
}

export function openEventSheet(root, hass, profiles, opts = {}) {
  if (!root || !hass) return null;
  closeEventSheet(root);
  const people = (profiles || []).filter((p) => p && p.calendar);
  if (!people.length) return null;

  const pad = (n) => (n < 10 ? '0' + n : '' + n);
  const asInput = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate())
    + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  const base = new Date();
  base.setSeconds(0, 0);
  /* `opts.date` : on part du jour cliqué dans la grille. Aujourd'hui, on
     propose « dans 30 minutes » ; un autre jour, 9 h du matin. */
  const picked = opts.date instanceof Date && !isNaN(opts.date.getTime()) ? opts.date : null;
  let startAt;
  if (picked && picked.toDateString() !== base.toDateString()) {
    startAt = new Date(picked);
    startAt.setHours(9, 0, 0, 0);
  } else {
    startAt = new Date(base.getTime() + 30 * 60000);
  }
  const endAt = new Date(startAt.getTime() + 60 * 60000);

  let cal = people[0].calendar;
  let allDay = false;

  const face = (p) => (p.photo
    ? '<img class="face" src="' + esc(p.photo) + '" alt="">'
    : '<span class="face"' + (p.color ? ' style="background:' + esc(p.color) + '"' : '') + '>'
      + esc(p.glyph || (p.name || '?').charAt(0)) + '</span>');

  const el = document.createElement('div');
  el.className = 'f-evt';
  el.innerHTML = '<div class="f-evt-head"><h1 class="f-evt-title">Nouvel événement</h1>'
    + '<button class="f-evt-x" type="button" aria-label="Fermer">\u00D7</button></div>'
    + '<div class="f-evt-body">'
    + '<span class="f-evt-label">Pour</span>'
    + '<div class="f-evt-people">' + people.map((p) => '<button class="f-evt-p" type="button" data-cal="'
      + esc(p.calendar) + '">' + face(p) + '<span class="nm">' + esc(p.name) + '</span></button>').join('') + '</div>'
    + '<span class="f-evt-label">Titre</span>'
    + '<label class="f-evt-box"><input id="evt-t" type="text" placeholder="Titre de l\'événement" autocomplete="off"></label>'
    + '<span class="f-evt-label">Quand</span>'
    + '<div class="f-evt-box"><div class="f-evt-line"><b>Début</b>'
      + '<input id="evt-s" type="datetime-local" value="' + asInput(startAt) + '"></div>'
      + '<div class="f-evt-line"><b>Fin</b>'
      + '<input id="evt-e" type="datetime-local" value="' + asInput(endAt) + '"></div></div>'
    + '<div class="f-evt-box f-evt-sw" style="margin-top:14px"><b style="font-size:14px;font-weight:600;color:#5A6074">Toute la journée</b>'
      + '<button class="f-evt-tog" id="evt-ad" type="button" aria-label="Toute la journée"><i></i></button></div>'
    + '<span class="f-evt-label">Répéter</span>'
    + '<div class="f-evt-seg" id="evt-rec">'
      + '<button type="button" class="on" data-rr="">Jamais</button>'
      + '<button type="button" data-rr="FREQ=DAILY">Jour</button>'
      + '<button type="button" data-rr="FREQ=WEEKLY">Semaine</button>'
      + '<button type="button" data-rr="FREQ=MONTHLY">Mois</button></div>'
    + '<span class="f-evt-label">Lieu</span>'
    + '<label class="f-evt-box"><input id="evt-l" type="text" placeholder="Facultatif" autocomplete="off"></label>'
    + '<span class="f-evt-label">Description</span>'
    + '<label class="f-evt-box"><textarea id="evt-d" placeholder="Facultatif"></textarea></label>'
    + '</div>'
    + '<div class="f-evt-foot"><button class="f-evt-cta" id="evt-go" type="button" disabled>Créer l\'événement</button></div>';

  root.appendChild(el);

  const $ = (id) => el.querySelector('#' + id);
  const title = $('evt-t'), sIn = $('evt-s'), eIn = $('evt-e'), go = $('evt-go');
  const tog = $('evt-ad');
  /* règle de répétition choisie ('' = aucune). Home Assistant n'accepte pas de
     rrule dans calendar.create_event : la création passe par la commande
     WebSocket calendar/event/create, comme le fait Daylight. */
  let rrule = '';
  el.querySelectorAll('#evt-rec button').forEach((b) => b.addEventListener('click', () => {
    rrule = b.dataset.rr || '';
    el.querySelectorAll('#evt-rec button').forEach((x) => x.classList.toggle('on', x === b));
  }));
  const refresh = () => {
    const ok = (title.value || '').trim().length > 0 && sIn.value && eIn.value;
    if (ok) go.removeAttribute('disabled'); else go.setAttribute('disabled', '');
  };
  const paint = () => { el.querySelectorAll('.f-evt-p').forEach((b) => b.classList.toggle('on', b.dataset.cal === cal)); };
  paint();
  el.querySelectorAll('.f-evt-p').forEach((b) => b.addEventListener('click', () => { cal = b.dataset.cal; paint(); }));
  title.addEventListener('input', refresh);
  sIn.addEventListener('input', refresh);
  eIn.addEventListener('input', refresh);
  tog.addEventListener('click', () => {
    allDay = !allDay;
    tog.classList.toggle('on', allDay);
    const type = allDay ? 'date' : 'datetime-local';
    sIn.type = type; eIn.type = type;
    if (allDay) { sIn.value = sIn.value.slice(0, 10); eIn.value = eIn.value.slice(0, 10); }
    else { sIn.value = asInput(startAt); eIn.value = asInput(endAt); }
    refresh();
  });
  const close = () => closeEventSheet(root);
  el.querySelector('.f-evt-x').addEventListener('click', close);
  go.addEventListener('click', () => {
    const data = { entity_id: cal, summary: (title.value || '').trim() };
    if (allDay) { data.start_date = sIn.value; data.end_date = eIn.value; }
    else { data.start_date_time = sIn.value; data.end_date_time = eIn.value; }
    const loc = ($('evt-l').value || '').trim();
    const desc = ($('evt-d').value || '').trim();
    if (loc) data.location = loc;
    if (desc) data.description = desc;
    go.setAttribute('disabled', '');
    let job;
    if (rrule && hass.connection && hass.connection.sendMessagePromise) {
      /* répétition : la seule voie qui porte un rrule */
      const event = {
        summary: data.summary,
        rrule,
        dtstart: allDay ? sIn.value : new Date(sIn.value).toISOString(),
        dtend: allDay ? eIn.value : new Date(eIn.value).toISOString(),
        description: data.description || '',
        location: data.location || '',
      };
      job = hass.connection.sendMessagePromise({
        type: 'calendar/event/create', entity_id: cal, event,
      });
    } else {
      job = hass.callService('calendar', 'create_event', data);
    }
    job
      .then(() => { close(); toast(root, 'Événement créé'); if (opts.onCreated) opts.onCreated(); })
      .catch((e) => { refresh(); toast(root, (e && e.message) || "Impossible de créer l'événement"); });
  });
  setTimeout(() => title.focus(), 60);
  return close;
}


/* ---------- la hauteur utile, sans le mensonge d'iOS ----------
 * Sur iPhone, window.innerHeight compte la zone que la barre d'outils de Safari
 * recouvre : la carte se croyait plus haute que l'écran et la barre du bas
 * sortait sous le bord (constaté sur une capture du 05/11). clientHeight est la
 * hauteur réellement visible, c'est lui qu'il faut lire. */
export function viewportHeight() {
  if (typeof document === 'undefined') return 0;
  const d = document.documentElement;
  return Math.round((d && d.clientHeight) || window.innerHeight || 0);
}

/* ---------- la bande d'état d'iOS ----------
 * Safari peint la zone de l'heure et de la batterie avec la balise `theme-color`
 * de Home Assistant (#2980b9, bleu) : la bande bleue au-dessus de l'app, qu'on ne
 * peut pas atteindre en CSS. On la repeint en blanc, et seulement dans l'app. */
export function paintStatusBar(color = '#ffffff') {
  if (typeof document === 'undefined') return;
  if (String(location.pathname).indexOf('/famille-home') !== 0) return;
  const m = document.querySelector('meta[name="theme-color"]');
  if (m) m.setAttribute('content', color);
}
paintStatusBar();

/* ---------- le rebond de la page ----------
 * Les zones qui défilent chez nous sont internes à la carte. Deux choses
 * faisaient bouger l'écran entier :
 *   1. Home Assistant ajoute un remplissage de zone sûre sous la vue, donc le
 *      document est plus haut que l'écran (886 px pour 852) : la page défile
 *      pour de vrai, ce n'est pas un simple rebond ;
 *   2. au-delà du dernier élément, iOS enchaînait le geste sur la page.
 * `overscroll-behavior` ne suffit pas tant que le document est réellement plus
 * haut : on le rend non défilant. Tout le défilement se passe dans les cartes,
 * qui se dimensionnent sur la hauteur visible. */
export function lockPageScroll() {
  if (typeof document === 'undefined') return;
  if (String(location.pathname).indexOf('/famille-home') !== 0) return;
  if (document.getElementById('f-scrollguard')) return;
  const st = document.createElement('style');
  st.id = 'f-scrollguard';
  /* On ne bloque PLUS la page : bloquer la racine (overflow:hidden +
     overscroll-behavior:none) supprimait aussi le tirer-pour-recharger, qui est
     un geste attendu. On retire plutôt la CAUSE du débordement — les 34 px de
     remplissage que Home Assistant ajoute sous la vue. La page fait alors
     exactement la hauteur de l'écran : rien à faire défiler, donc rien qui
     bouge, et le geste de rechargement reste disponible. */
  /* Les 34 px viennent de la variable --safe-area-inset-bottom de Home
     Assistant : la vue se rembourre de la zone gestuelle. Une feuille du
     document ne peut pas atteindre hui-view-container (il vit dans un shadow
     root), mais une VARIABLE personnalisée traverse les shadow roots. On la met
     à zéro dans l'app : la page fait alors exactement la hauteur de l'écran,
     donc rien à faire défiler — sans toucher au geste de rechargement, qui
     reste disponible. Nos propres marges utilisent env(), pas cette variable. */
  st.textContent = ':root{--safe-area-inset-bottom:0px!important}'
    + 'html,body{overflow:hidden!important;height:100%!important;overscroll-behavior:none!important;background:#fff!important}'
    + ':root{--primary-color:#007AFF!important;--slider-color:#007AFF!important;'
    + '--switch-checked-color:#007AFF!important;--switch-checked-button-color:#fff!important;'
    + '--state-active-color:#007AFF!important;--state-icon-color:#007AFF!important;'
    + '--md-sys-color-primary:#007AFF!important;--mdc-theme-primary:#007AFF!important;'
    + '--ha-card-header-color:inherit}';
  document.head.appendChild(st);
}
lockPageScroll();

/* ---------- recharger en tirant vers le bas ----------
 * Pourquoi c'est à nous : le geste natif d'iOS est symétrique. Le
 * « tirer pour recharger » du navigateur n'existe que si la page peut
 * rebondir, donc si elle monte AUSSI quand on pousse vers le haut — ce que
 * justement on ne veut pas. On coupe donc le rebond natif (page non défilante,
 * overscroll:none) et on refait le geste, dans un seul sens.
 * On ne l'arme que si la liste touchée est déjà en haut : sinon un simple
 * défilement vers le haut dans une colonne déclencherait un rechargement. */
export function installPullToRefresh(threshold = 96) {
  if (typeof document === 'undefined' || window.__fPtr) return;
  window.__fPtr = true;

  /* Bande du haut : le geste ne s'arme QUE si le doigt se pose dans les
     premiers 110 px de l'écran. Sans cette limite, un simple glissement vers
     le bas dans une liste déjà en haut (une colonne de routine, par exemple)
     déclenchait un rechargement — c'est exactement ce qu'il ne faut pas.
     On exige aussi un geste franchement vertical. */
  const TOP_BAND = 110;
  const VERTICAL = 1.6;   /* |dy| doit valoir au moins 1,6 fois |dx| */

  const pill = document.createElement('div');
  pill.className = 'f-ptr';
  pill.innerHTML = '<span class="sp"></span><span class="tx">Tirer pour recharger</span>';
  document.body.appendChild(pill);

  let startY = null;
  let startX = 0;
  let pulled = 0;
  let armed = false;

  const end = () => {
    const go = armed && pulled >= threshold;
    startY = null;
    pulled = 0;
    armed = false;
    pill.classList.remove('on', 'ready');
    pill.style.transform = '';
    if (go) { pill.classList.add('loading'); location.reload(); }
  };

  document.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1) { startY = null; return; }
    const y = e.touches[0].clientY;
    startX = e.touches[0].clientX;
    armed = y <= TOP_BAND;
    startY = armed ? y : null;
    pulled = 0;
  }, { passive: true });

  document.addEventListener('touchmove', (e) => {
    if (startY === null) return;
    const dy = e.touches[0].clientY - startY;
    const dx = Math.abs(e.touches[0].clientX - startX);
    if (dy <= 0 || dx > Math.abs(dy) * VERTICAL) {   /* vers le haut, ou geste horizontal */
      pulled = 0;
      pill.classList.remove('on', 'ready');
      return;
    }
    pulled = dy;
    if (dy < 16) return;
    pill.classList.add('on');
    pill.style.transform = 'translate(-50%,' + Math.min(dy * 0.45, 44) + 'px)';
    const ready = dy >= threshold;
    pill.classList.toggle('ready', ready);
    pill.querySelector('.tx').textContent = ready ? 'Relâcher pour recharger' : 'Tirer pour recharger';
  }, { passive: true });

  document.addEventListener('touchend', end, { passive: true });
  document.addEventListener('touchcancel', end, { passive: true });
}
installPullToRefresh();

/* Les mêmes jetons, publiés sur `:root` du document.
 *
 * Indispensable pour le CALENDRIER : la carte Daylight n'a pas de shadow root
 * (elle rend en DOM clair) et son CSS vit dans `uix.style`, côté configuration
 * du dashboard. Elle ne peut donc pas appeler `coreCss()` ; en revanche elle
 * hérite de `:root`. Ses règles peuvent désormais écrire `var(--f-*)` et suivre
 * le tronc commun (une seule feuille pour toute l'app).
 * Idempotent : un seul <style> quel que soit le nombre de cartes chargées. */
export function publishGlobalTokens() {
  if (typeof document === 'undefined' || !document.head) return;
  if (document.getElementById('famille-core-tokens')) return;
  const c = TOKENS.color;
  const l = TOKENS.layout;
  const st = document.createElement('style');
  st.id = 'famille-core-tokens';
  st.textContent = `:root{
--skylight-sans:${TOKENS.font.sans};--skylight-serif:${TOKENS.font.serif};
--f-ink:${c.ink};--f-ink-soft:${c.inkSoft};--f-muted:${c.muted};--f-line:${c.line};
--f-surface:${c.surface};--f-rail:${c.rail};--f-rail-ink:${c.railInk};--f-logo-ink:${c.logoInk};--f-chip:${c.chip};
--f-brand:${c.brand};--f-brand-soft:${c.brandSoft};--f-star:${c.star};--f-today:${c.today};
--f-warn-bg:${c.warnBg};--f-warn-line:${c.warnLine};--f-warn-ink:${c.warnInk};--f-danger:${c.danger};
--f-r-col:${TOKENS.radius.column}px;--f-r-tile:${TOKENS.radius.tile}px;--f-r-sheet:${TOKENS.radius.sheet}px;
--f-hdr-h:${l.header}px;--f-rail-w:${l.rail}px;--f-nav-icon:${l.railIcon}px;--f-tabbar-h:${l.tabbar}px;
}`;
  document.head.appendChild(st);
}

publishGlobalTokens();

/* =========================================================================
 * 6. L'ACCÈS AUX DONNÉES
 * ========================================================================= */

const STARS_PREFIX = 'counter.etoiles_';

function errCode(e) {
  if (!e) return 'refus';
  return e.code || e.message || e.error || 'refus';
}

/* Un seul point de lecture/écriture pour les listes `todo` et les soldes.
 * - cache par entité (`maxAge` en ms) : l'écran Profils et la coque relisent le
 *   registre sans casser la carte ;
 * - erreurs conservées dans `err` (et non avalées) : un écran peut les montrer ;
 * - repli par le service `todo.get_items` quand la commande websocket est
 *   refusée : chez certains navigateurs elle l'est, et sans ce repli les listes
 *   reviennent vides. */
export class FamilleData {
  constructor() {
    this.hass = null;
    this.err = '';
    this._cache = new Map();
  }

  attach(hass) {
    this.hass = hass;
    return this;
  }

  cached(entity, fallback) {
    const hit = this._cache.get(entity);
    return hit ? hit.items : (fallback || []);
  }

  /* Items d'une liste `todo`. `maxAge` > 0 réutilise une lecture récente. */
  items(entity, opts = {}) {
    const maxAge = opts.maxAge || 0;
    const hit = this._cache.get(entity);
    if (hit && maxAge > 0 && Date.now() - hit.at < maxAge) return Promise.resolve(hit.items);
    return this._fetch(entity).then((items) => {
      this._cache.set(entity, { items, at: Date.now() });
      return items;
    });
  }

  _fetch(entity) {
    const h = this.hass;
    if (!h) return Promise.resolve([]);
    if (!h.callWS) return this._fetchService(entity);
    return h.callWS({ type: 'todo/item/list', entity_id: entity })
      .then((r) => (r && r.items) || [])
      .catch((e) => {
        this.err = 'ws:' + errCode(e);
        return this._fetchService(entity);
      });
  }

  _fetchService(entity) {
    const h = this.hass;
    if (!h || !h.callService) return Promise.resolve([]);
    return h.callService('todo', 'get_items',
      { status: ['needs_action', 'completed'] }, { entity_id: entity }, false, true)
      .then((r) => {
        const resp = (r && r.response) || {};
        const own = resp[entity] && resp[entity].items;
        if (own) return own;
        const k = Object.keys(resp)[0];
        return (k && resp[k] && resp[k].items) || [];
      })
      .catch((e) => {
        this.err = (this.err ? this.err + ' | ' : '') + 'svc:' + errCode(e);
        throw e;
      });
  }

  /* Écriture d'un item : un seul chemin pour cocher, renommer, déplacer. */
  updateItem(entity, payload) {
    const h = this.hass;
    if (!h || !h.callService) return Promise.resolve();
    const pr = h.callService('todo', 'update_item', payload, { entity_id: entity });
    if (pr && pr.catch) pr.catch(() => {});
    return pr;
  }

  /* ---------- profils ----------
     `todo.profils` : un item par personne, métadonnées JSON compactes dans la
     description ({c pastel, a accent, p photo/emoji, s étoiles, i id, r liste de
     routines, k calendrier, ord position}). C'est la source unique : un profil
     supprimé disparaît des colonnes. */
  profiles(entity = 'todo.profils', opts = {}) {
    return this.items(entity, opts).then((items) => parseProfiles(items));
  }

  /* ---------- étoiles ----------
     Le ★ affiché est un SOLDE cumulatif (counter.etoiles_<id>), pas un total du
     jour : il monte au cochage, redescend au décochage. */
  starsEntity(profile) {
    if (!profile) return null;
    if (profile.stars_entity) return profile.stars_entity;
    if (!profile.id || String(profile.id).indexOf('__') === 0) return null;
    return STARS_PREFIX + profile.id;
  }

  /* solde lu sur HA ; null si le compteur n'existe pas encore */
  starsOf(profile) {
    const ent = this.starsEntity(profile);
    const st = ent && this.hass ? this.hass.states[ent] : null;
    if (!st) return null;
    const v = Number(st.state);
    return isFinite(v) ? v : null;
  }

  /* signature courte des soldes : comparée à chaque `hass` pour repeindre le ★ */
  starsSignature(profiles) {
    return (profiles || []).map((p) => {
      const e = this.starsEntity(p);
      const s = e && this.hass && this.hass.states[e];
      return s ? s.state : '-';
    }).join(',');
  }

  /* Crédit / débit d'étoiles.
     On passe par `script.etoiles` et non par `counter.increment` : sur HA
     2026.10 ce service n'accepte AUCUNE valeur (il ne sait faire que +1/-1), et
     un `counter.set_value` calculé ici serait faux dès deux cochages rapprochés.
     Le script boucle côté serveur : chaque pas est atomique. */
  credit(profId, n, opts = {}) {
    if (!profId || !n) return Promise.resolve();
    const h = this.hass;
    const ent = opts.entity || (STARS_PREFIX + profId);
    if (!h || !h.states[ent]) return Promise.resolve();
    const pr = h.callService('script', opts.script || 'etoiles', { profil: profId, delta: n });
    /* sans catch, un échec du service remonte en toast HA « Échec de l'exécution » */
    if (pr && pr.catch) pr.catch((e) => console.warn('[famille-core] crédit étoiles :', e));
    return pr;
  }
}

export const data = new FamilleData();

/* Parse + ordonne le registre des profils. L'ordre est une DONNÉE (champ `ord`),
 * pas la position dans la liste : on ne réordonne jamais `todo.profils`. */
export function parseProfiles(items) {
  return (items || []).map((it, i) => {
    let m = {};
    try { m = JSON.parse(it.description || '{}') || {}; } catch (e) { m = {}; }
    const id = m.i || (it.summary || '').toLowerCase().replace(/[^a-z0-9]+/g, '_');
    const face = m.p || '';
    const prof = {
      uid: it.uid,
      id,
      name: it.summary || id,
      color: m.c || '#DDE3EA',
      accent: m.a || '#7A8596',
      stars: m.s === undefined ? true : !!m.s,
      routine_entity: m.r || '',
      calendar: m.k || '',
      photo: '',
      glyph: '',
      ord: Number.isFinite(Number(m.ord)) && m.ord !== '' && m.ord !== null ? Number(m.ord) : null,
      _i: i,
    };
    if (face) {
      if (face.charAt(0) === ':') prof.glyph = face.slice(1);
      else prof.photo = face;
    }
    return prof;
  }).sort((a, b) => ((a.ord === null ? a._i : a.ord) - (b.ord === null ? b._i : b.ord)) || (a._i - b._i))
    .map((p) => { delete p._i; return p; });
}

/* =========================================================================
 * 7. EXPOSITION
 * ========================================================================= */

/* Raccroche pour les cartes chargées comme script classique (banc d'essai) et
 * pour la coque, qui publiait déjà SKYLIGHT_NAV. */
const API = {
  CORE_VERSION, TOKENS, tokensCss, coreCss,
  esc, mix, alpha, hexToHsl, pastelOf, localDay, profileTones,
  NAV, NAV_SVG, NAV_CSS, BAR_SLOTS, navSplit, navHtml, go, bindNav,
  openNavSheet, closeNavSheet, currentPath, isActive, activePath,
  viewportHeight, paintStatusBar, lockPageScroll,
  headerHtml, dayNavHtml, paintHeader, paintHeaderLive, headerDate, headerWeather, WEATHER_EMOJI, HEADER_CSS,
  openEventSheet, closeEventSheet, EVENT_CSS, installPullToRefresh,
  avatarHtml, initialOf, emptyHtml, buttonHtml,
  sheetHtml, openSheet, closeSheet, SHEET_CSS,
  toast, TOAST_CSS,
  FamilleData, data, parseProfiles,
};

if (typeof window !== 'undefined') {
  window.FAMILLE_CORE = window.FAMILLE_CORE || API;
  window.SKYLIGHT_NAV = window.SKYLIGHT_NAV || NAV;
  window.skylightPath = window.skylightPath || currentPath;
  window.skylightActive = window.skylightActive || isActive;
}

export default API;
