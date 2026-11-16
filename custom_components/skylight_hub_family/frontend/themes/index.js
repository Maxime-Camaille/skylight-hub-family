/* Registre des thèmes de l'application.
 *
 * Un thème = un module `./<id>.js` + une entrée ici. Le thème actif est le seul
 * dont le CSS est injecté dans le shadow root du panneau (`#skylight-theme`).
 * Le thème inactif n'est jamais appliqué, ses animations ne tournent pas et son
 * éventuel `setup()` n'est pas appelé.
 *
 * Isolation : ne jamais mettre de CSS/JS spécifique à un thème dans le panneau
 * de base ou dans les cartes. Les composants consomment des custom properties ;
 * un thème les redéfinit. Voir ../../../../THEMES.md (racine du dépôt) et
 * ./README.md.
 */
import { SKYLIGHT } from './skylight.js';
import { APPLE } from './apple.js';

export const THEMES = { skylight: SKYLIGHT, apple: APPLE };
export const DEFAULT_THEME = 'skylight';

/** Liste légère pour le sélecteur de Réglages. */
export function themeList() {
  return Object.values(THEMES).map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    status: t.status,
  }));
}

/** Thème demandé s'il existe et n'est pas masqué, sinon le thème par défaut.
 *  Un thème `coming` retombe sur Skylight tant qu'il n'est pas prêt. */
export function resolveTheme(id) {
  const t = THEMES[id];
  if (t && t.status === 'ready') return t;
  return THEMES[DEFAULT_THEME];
}

/** Applique un thème au panneau. Retourne le thème réellement appliqué. */
export function applyTheme(host, id) {
  const t = resolveTheme(id);
  if (!t) return null;
  /* La garde vérifie AUSSI que le <style> est encore là : le panneau reconstruit
     son shadow root (`_paint()`), ce qui détruit la feuille du thème. Sans ce
     test, `applyTheme` sortait tôt et le thème restait perdu jusqu'au rechargement
     — constaté en fin d'onboarding et à la fermeture du panneau calendriers. */
  const hasStyle = !!(host.shadowRoot && host.shadowRoot.getElementById('skylight-theme'));
  if (host._themeId === t.id && hasStyle) return t;

  const prev = THEMES[host._themeId];
  if (prev && prev !== t && typeof prev.teardown === 'function') {
    try { prev.teardown(host); } catch (e) { /* un thème ne casse pas l'app */ }
  }

  host._themeId = t.id;
  host.setAttribute('data-theme', t.id);

  if (host.shadowRoot) {
    let style = host.shadowRoot.getElementById('skylight-theme');
    if (!style) {
      style = document.createElement('style');
      style.id = 'skylight-theme';
      /* après le CSS de base : les :host du thème gagnent */
      host.shadowRoot.appendChild(style);
    }
    style.textContent = t.css || '';
  }

  if (typeof t.setup === 'function') {
    try { t.setup(host); } catch (e) { /* idem */ }
  }

  watchShadowRoot(host);
  return t;
}

/* Le CSS du thème actif, posé dans une carte AU MOMENT où elle est montée.
 *
 * Le panneau appelle ceci depuis `_card()`, juste après avoir créé la carte.
 * Sans ce point d'entrée, le thème des cartes était posé par un balayage
 * périodique : la carte s'affichait d'abord dans le style de base, puis
 * basculait — le « thème superposé » visible au chargement.
 */
export function onCard(host, el) {
  const t = host && THEMES[host._themeId];
  if (!t || typeof t.cardStyle !== 'function') return;
  const apply = () => {
    const sr = el && el.shadowRoot;
    if (!sr) return false;
    if (sr.querySelector('style[data-theme="' + t.id + '"]')) return true;
    const st = document.createElement('style');
    st.setAttribute('data-theme', t.id);
    st.textContent = t.cardStyle();
    sr.appendChild(st);
    return true;
  };
  if (apply()) return;
  /* la carte n'a pas encore de shadow root : on repasse au frame suivant */
  requestAnimationFrame(() => { apply(); });
}

/* ---------------------------------------------------------------------------
 * Filet de sécurité : le panneau remplace son innerHTML (`_paint()`), ce qui
 * supprime la feuille du thème ET le CSS injecté dans les cartes. On surveille
 * donc le shadow root de l'hôte : si la feuille disparaît, on la remet, puis on
 * relance `setup()` qui réinjecte le CSS de carte (idempotent par construction).
 * C'est le registre qui tient cette promesse, pas les cartes ni le panneau.
 */
const OBS = new WeakMap();

function watchShadowRoot(host) {
  if (!host.shadowRoot || OBS.has(host)) return;
  const mo = new MutationObserver(() => {
    const t = THEMES[host._themeId];
    if (!t || !host.shadowRoot) return;
    if (host.shadowRoot.getElementById('skylight-theme')) return;
    const style = document.createElement('style');
    style.id = 'skylight-theme';
    style.textContent = t.css || '';
    host.shadowRoot.appendChild(style);
    if (typeof t.setup === 'function') {
      try { t.setup(host); } catch (e) { /* idem */ }
    }
  });
  /* childList seulement : le contenu des cartes vit dans leurs propres shadow
     roots, donc cette surveillance ne voit rien de leur activité. */
  mo.observe(host.shadowRoot, { childList: true });
  OBS.set(host, mo);
}
