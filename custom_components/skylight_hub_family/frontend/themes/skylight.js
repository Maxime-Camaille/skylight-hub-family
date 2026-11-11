/* Thème « Skylight Calendar » — thème historique et validé de l'application.
 *
 * ⚠️  NE PAS MODIFIER CE FICHIER POUR CONSTRUIRE LE THÈME APPLE.
 *     Le thème Apple vit dans `apple.js`. Ce fichier est la référence visuelle
 *     de l'app actuelle ; toute retouche ici doit être une correction du thème
 *     Skylight lui-même, jamais une adaptation pour un autre thème.
 *
 * Contrat : les composants (panneau, cartes) lisent les variables ci-dessous.
 * Un thème = un fichier + une entrée dans `index.js` + un `status`.
 */
export const SKYLIGHT = {
  id: 'skylight',
  name: 'Skylight Calendar',
  description: 'Le tableau familial chaleureux, proche de Skylight Calendar.',
  status: 'ready',

  /* Valeurs de référence. Elles sont injectées dans le shadow root du panneau
     via `css` ; les cartes héritent des custom properties. */
  tokens: {
    sans: 'Figtree, system-ui, -apple-system, "Segoe UI", sans-serif',
    serif: 'Literata, "Iowan Old Style", Georgia, serif',
    ink: '#1F2328',
    inkSoft: '#2B2F38',
    muted: '#8A8F9C',
    line: '#D8DEE8',
    surface: '#FFFFFF',
    rail: '#EDF1F5',
    brand: '#007AFF',
    brandSoft: '#B3D4FA',
    star: '#F5B93E',
    today: '#F66951',
  },

  css: `
:host{
  --skylight-sans:Figtree,system-ui,-apple-system,"Segoe UI",sans-serif;
  --skylight-serif:Literata,"Iowan Old Style",Georgia,serif;
  --f-ink:#1F2328;--f-ink-soft:#2B2F38;--f-muted:#8A8F9C;--f-line:#D8DEE8;
  --f-surface:#FFFFFF;--f-rail:#EDF1F5;--f-rail-ink:#4A5464;--f-logo-ink:#4E5A6B;
  --f-chip:#F2F3F5;--f-brand:#007AFF;--f-brand-soft:#B3D4FA;--f-star:#F5B93E;
  --f-today:#F66951;--f-warn-bg:#FFF4E2;--f-warn-ink:#8A5A00;
  --theme-radius:18px;--theme-radius-lg:24px;
}
`,
};
