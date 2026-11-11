/* Thème « Apple » — À DÉVELOPPER DANS UNE CONVERSATION DÉDIÉE.
 *
 * Ce fichier est un SCAFFOLD, pas un thème fini. Il existe pour que :
 *   1. le sélecteur de Réglages montre l'option (badge « Bientôt ») ;
 *   2. le jour où on développe Apple, on sache exactement où écrire ;
 *   3. Skylight reste intact : on ne touche NI à `skylight.js`, NI au CSS de
 *      base du panneau, NI aux cartes pour construire Apple.
 *
 * Pour développer le thème :
 *   - remplir `css` (tokens + overrides scopés au thème) ;
 *   - éventuellement `setup(host)` / `teardown(host)` pour le JS/animations ;
 *   - passer `status` à `'ready'` ;
 *   - vérifier que le sélecteur l'active, que l'app le persiste, et que le
 *     retour à Skylight est pixel-identique.
 *
 * Les composants qui ont encore des couleurs codées en dur doivent être
 * convertis en variables (ou recevoir un override dans ce fichier) — jamais
 * en modifiant le thème Skylight.
 */
export const APPLE = {
  id: 'apple',
  name: 'Apple',
  description: 'Une DA Apple, plus sobre, plus aérée. En préparation.',
  status: 'coming',

  tokens: {
    sans: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif',
    serif: '"New York", "Iowan Old Style", Georgia, serif',
    ink: '#1D1D1F',
    inkSoft: '#424245',
    muted: '#86868B',
    line: '#D2D2D7',
    surface: '#FFFFFF',
    rail: '#F5F5F7',
    brand: '#0071E3',
    brandSoft: '#B9DAFF',
    star: '#FF9F0A',
    today: '#FF3B30',
  },

  css: `
:host{
  --skylight-sans:-apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI",sans-serif;
  --skylight-serif:"New York","Iowan Old Style",Georgia,serif;
  --f-ink:#1D1D1F;--f-ink-soft:#424245;--f-muted:#86868B;--f-line:#D2D2D7;
  --f-surface:#FFFFFF;--f-rail:#F5F5F7;--f-rail-ink:#1D1D1F;--f-logo-ink:#1D1D1F;
  --f-chip:#F5F5F7;--f-brand:#0071E3;--f-brand-soft:#B9DAFF;--f-star:#FF9F0A;
  --f-today:#FF3B30;--f-warn-bg:#FFF8E1;--f-warn-ink:#8A5A00;
  --theme-radius:20px;--theme-radius-lg:28px;
}
/* TODO Apple : styles scopés, animations, setup() … */
`,
};
