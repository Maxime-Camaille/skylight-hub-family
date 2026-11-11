/* Thème « Apple » — sobre, aéré, une seule couleur d'accent.
 *
 * Source des valeurs : HIG canoniques (developer.apple.com/design/
 * human-interface-guidelines : typography, color, materials, layout) et
 * couleurs système UIKit. Chaque valeur porte sa source.
 *
 * Contrat : ce fichier ne touche NI `skylight.js`, NI le CSS de base du
 * panneau, NI les cartes. Il pose des `--theme-*` sur l'hôte du panneau
 * (héritées par les cartes) et surcharge le chrome du panneau, qui vit dans
 * le même shadow root — le CSS du thème est injecté après celui de base.
 */
export const APPLE = {
  id: 'apple',
  name: 'Apple',
  description: 'DA Apple : SF, accent unique, formes concentriques, matière sur le chrome seul.',
  status: 'ready',

  tokens: {
    /* Pile système d'abord : « SF Pro Text » n'est pas installée par défaut sur
       macOS, mettre -apple-system en tête (DA-APPLE §7). */
    sans: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Inter, sans-serif',
    serif: '"New York", "Iowan Old Style", Georgia, serif',
    /* Couleurs système UIKit (light) : label, secondaryLabel, tertiaryLabel. */
    ink: '#1D1D1F',
    inkSoft: '#424245',
    muted: '#86868B',
    line: '#D2D2D7',
    surface: '#FFFFFF',
    rail: '#F5F5F7',
    brand: '#007AFF', /* systemBlue (light) */
    brandSoft: '#CCE4FF',
    star: '#FF9F0A', /* systemOrange (light) */
    today: '#FF3B30', /* systemRed (light) */
  },

  css: `
:host{
  /* ---- jetons partagés avec les cartes (pont var() de famille-core.js) ---- */
  --theme-sans:-apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI",Inter,sans-serif;
  --theme-serif:"New York","Iowan Old Style",Georgia,serif;
  --theme-ink:#1D1D1F;--theme-ink-soft:#424245;--theme-muted:#86868B;--theme-line:#D2D2D7;
  --theme-surface:#FFFFFF;--theme-rail:#F5F5F7;--theme-rail-ink:#6E6E73;--theme-logo-ink:#FFFFFF;
  --theme-chip:#EDEDF0;--theme-brand:#007AFF;--theme-brand-soft:#CCE4FF;--theme-star:#FF9F0A;
  --theme-today:#FF3B30;
  /* Formes concentriques : rayon intérieur = extérieur − inset (DA-APPLE §3.6). */
  --theme-r-col:24px;--theme-r-tile:16px;--theme-r-card:20px;--theme-r-sheet:22px;
  --theme-r-nav:11px;--theme-r-logo:9px;

  /* ---- chrome du panneau ---- */
  background:#F5F5F7;color:#1D1D1F;
  font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI",Inter,sans-serif;
  -webkit-font-smoothing:antialiased;
}
.app{background:#F5F5F7}

/* Barre latérale : couche fonctionnelle, donc matière autorisée (DA-APPLE §3.7).
   Elle laisse passer le fond, ne mange pas de bande opaque. */
.rail{
  background:rgba(245,245,247,.82);
  -webkit-backdrop-filter:saturate(180%) blur(20px);
  backdrop-filter:saturate(180%) blur(20px);
  border-right:.5px solid rgba(60,60,67,.14);
}
.logo{background:#1D1D1F;color:#FFFFFF;box-shadow:0 1px 2px rgba(0,0,0,.12)}
.ri{
  color:#6E6E73;
  border-radius:11px;
  transition:background-color .32s cubic-bezier(.32,.72,0,1),color .18s ease-out;
}
.ri:hover{background:rgba(60,60,67,.06)}
/* Feedback au pointer-down, pas au relâchement (DA-APPLE §3.8). */
.ri:active{transform:scale(.97)}
/* 1 poids, 10,5 px, tracking −0,01 em : la légende du rail, pas un titre. */
.rail .ri .tx,.tabbar .ri .tx{font-size:10.5px;letter-spacing:-.01em;font-weight:500}
.ri.on{background:#FFFFFF;color:#1D1D1F;box-shadow:0 0 0 .5px rgba(60,60,67,.12),0 1px 2px rgba(0,0,0,.05)}
/* Barre du bas (mobile) : même matière, même hiérarchie. */
.tabbar{background:rgba(255,255,255,.78);-webkit-backdrop-filter:saturate(180%) blur(20px);backdrop-filter:saturate(180%) blur(20px);border-top:.5px solid rgba(60,60,67,.14)}
.tabbar .ri.on{color:#007AFF}

/* Titres et libellés du panneau : échelle Dynamic Type « Large » (HIG
   typography) — Large Title 34/41 +12, Title 2 22/28 −12, Body 17/22 −26. */
.hdr.title .name,.hdr .name{letter-spacing:-.012em}
.hdr.title .sub,.hdr .sub{letter-spacing:-.026em}

/* Mouvement : on coupe tout pour qui demande moins (DA-APPLE §3.8). */
@media (prefers-reduced-motion:reduce){
  .ri,.tabbar .ri{transition:none}
  .ri:active{transform:none}
}
`,
};
