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
  if (host._themeId === t.id) return t;

  const prev = THEMES[host._themeId];
  if (prev && typeof prev.teardown === 'function') {
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
  return t;
}
