/* Thème « Apple 2026 » — Liquid Glass, SF, accent unique, formes concentriques.
 *
 * Source des valeurs (aucune n'est inventée) :
 *   - typographie : HIG `foundations/typography` (Dynamic Type « Large » +
 *     table de tracking SF Pro), relevé dans DA-APPLE.md §Annexe ;
 *   - couleurs : UIKit (label / secondaryLabel / tertiaryLabel / separator /
 *     systemGroupedBackground) et couleurs système iOS ;
 *   - matériaux : HIG `foundations/materials` — « Don't use Liquid Glass in the
 *     content layer » et « Use Liquid Glass effects sparingly ». D'où la règle
 *     appliquée ici : le verre va sur le CHROME uniquement (barre latérale,
 *     barre du bas, feuilles), jamais sur une carte de contenu ;
 *   - rayons : concentration (rayon intérieur = extérieur − inset), DA-APPLE §3.6 ;
 *   - mouvement : ressorts amortis, DA-APPLE §Annexe (damping / response),
 *     échantillonnés en `linear()` CSS pour que le mouvement soit un vrai
 *     ressort et pas un cubic-bezier d'approximation.
 *
 * Contrat (THEMES.md) : ce fichier ne touche NI `skylight.js`, NI le CSS de
 * base du panneau, NI les cartes. Il pose des `--theme-*` sur l'hôte du panneau
 * (hérités par les cartes via le pont `var()` de `famille-core.js`) et ne
 * surcharge que le chrome, qui vit dans le même shadow root.
 */

/* ------------------------------------------------------------------ ressorts
 * Un ressort amorti n'a pas de durée : il a une `response` (temps caractéristique)
 * et un `damping ratio`. On l'échantillonne en `linear()` pour que le CSS se
 * comporte comme le ressort, y compris l'interruption (la courbe repart de la
 * valeur courante). Formule : x(t) = 1 − e^(−ζωt)·(cos(ω_d t) + ζω/ω_d · sin(ω_d t)).
 *   ω  = 2π / response   ·   ω_d = ω·√(1−ζ²)
 */
function springLinear(response, damping = 1, steps = 24) {
  const w = (2 * Math.PI) / response;
  const z = damping;
  /* temps de stabilisation : 6τ, τ = 1/(ζω) — au-delà, l'écart est invisible */
  const tEnd = Math.min(6 / (z * w), 1.2);
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * tEnd;
    let x;
    if (z < 1) {
      const wd = w * Math.sqrt(1 - z * z);
      x = 1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + ((z * w) / wd) * Math.sin(wd * t));
    } else {
      x = 1 - Math.exp(-w * t) * (1 + w * t);
    }
    pts.push(Number(x.toFixed(4)));
  }
  pts[0] = 0;
  pts[pts.length - 1] = 1;
  return `linear(${pts.join(',')})`;
}

/* Les trois ressorts de l'app (DA-APPLE §Annexe). */
const SPRING = {
  /* déplacement / lentille : critiquement amorti, réponse 0,4 s */
  move: springLinear(0.4, 1.0),
  /* appui : réponse 0,2 s, sans rebond */
  press: springLinear(0.2, 1.0),
  /* relâchement / feuille : léger dépassement (~1 %) car il y a eu un élan */
  settle: springLinear(0.3, 0.8),
};

export const APPLE = {
  id: 'apple',
  name: 'Apple',
  description: 'Liquid Glass sur le chrome seulement, SF Pro, accent unique, formes concentriques.',

  /* `ready` : le thème est sélectionnable. Le CSS de carte viendra ensuite,
   * carte par carte, chacune vérifiée au banc avant publication. */
  status: 'ready',

  tokens: {
    /* Pile système D'ABORD. « SF Pro Text » n'est pas installée par défaut sur
       macOS : la mettre en tête ferait retomber la pile sur Inter même sur Mac
       (DA-APPLE §7). Sur iPad, `-apple-system` donne SF Pro. */
    sans: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", system-ui, sans-serif',
    /* Le thème Skylight met ici une serif (Literata / Iowan). Une app iOS
       n'utilise PAS de serif pour ses titres d'interface : on aligne le jeton
       sur la pile sans. C'est le changement visuel le plus fort du thème, et il
       se fait à un seul endroit, sans toucher une carte. */
    serif: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", system-ui, sans-serif',

    /* UIKit, apparence claire. */
    ink: '#000000',                    /* label */
    inkSoft: 'rgba(60,60,67,.60)',     /* secondaryLabel */
    muted: 'rgba(60,60,67,.34)',       /* tertiaryLabel (0,30 est illisible sur pastel) */
    line: 'rgba(60,60,67,.29)',        /* separator */
    surface: '#FFFFFF',                /* secondarySystemGroupedBackground */
    rail: '#F2F2F7',                   /* systemGroupedBackground */
    brand: '#007AFF',                  /* systemBlue */
    brandSoft: 'rgba(0,122,255,.15)',  /* systemBlue à 15 % (fill) */
    star: '#FF9500',                   /* systemOrange */
    today: '#FF3B30',                  /* systemRed */
  },

  css: `
:host{
  /* ---- jetons partagés avec les cartes (pont var() de famille-core.js) ----
     Chaque valeur porte sa source UIKit en commentaire. */
  --theme-sans:-apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI",system-ui,sans-serif;
  --theme-serif:-apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",system-ui,sans-serif;

  --theme-ink:#000;--theme-ink-soft:rgba(60,60,67,.6);--theme-muted:rgba(60,60,67,.34);
  --theme-line:rgba(60,60,67,.29);
  --theme-surface:#fff;--theme-rail:#F2F2F7;
  --theme-rail-ink:rgba(60,60,67,.6);--theme-logo-ink:#fff;
  --theme-chip:rgba(118,118,128,.12);
  --theme-brand:#007AFF;--theme-brand-soft:rgba(0,122,255,.15);
  --theme-star:#FF9500;--theme-today:#FF3B30;

  /* ---- formes concentriques (DA-APPLE §3.6) -------------------------------
     colonne 28  − inset 8  = carte 20
     carte   20  − inset 6  = tuile 14
     feuille 28  ·  capsule 999 */
  --theme-r-col:28px;--theme-r-tile:14px;--theme-r-card:20px;--theme-r-sheet:28px;
  --theme-r-nav:12px;--theme-r-logo:9px;

  /* ---- ressort exposé aux cartes qui voudront s'en servir ---- */
  --apple-spring-move:${SPRING.move};
  --apple-spring-press:${SPRING.press};
  --apple-spring-settle:${SPRING.settle};

  /* ---- le panneau lui-même ---- */
  background:#F2F2F7;color:#000;
  font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI",system-ui,sans-serif;
  -webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;
}
.app{background:#F2F2F7}

/* ================================ CHROME ==================================
   HIG materials : le verre est réservé à la couche fonctionnelle. La barre
   latérale et la barre du bas en sont ; le contenu, non. */

/* Barre latérale. iPadOS : sélection = capsule grise, pas une ombre. */
.rail{
  background:rgba(249,249,249,.80);
  -webkit-backdrop-filter:saturate(180%) blur(24px);
  backdrop-filter:saturate(180%) blur(24px);
  border-right:.5px solid rgba(60,60,67,.22);
}
.logo{background:#1C1C1E;color:#fff;box-shadow:none;border-radius:9px}
.ri{
  color:rgba(60,60,67,.6);
  border-radius:12px;
  /* Une teinte de sélection n'est pas un déplacement : elle se pose vite (0,25 s,
     ressort de relâchement). Le ressort de « déplacement » (response 0,4 s) est
     réservé aux éléments qui bougent — il est exposé aux cartes en
     --apple-spring-move. Jamais de transition sur "all". */
  transition:background-color 250ms ${SPRING.settle},color 180ms ease-out,transform 200ms ${SPRING.press};
}
.ri:hover{background:rgba(120,120,128,.10)}
/* Feedback au pointer-down, pas au relâchement (DA-APPLE §3.8). */
.ri:active{transform:scale(.96)}
/* Légende du rail : 11 px, 500, tracking +0,006 em (Caption 2 HIG). */
.rail .ri .tx,.tabbar .ri .tx{
  font-size:11px;letter-spacing:.006em;font-weight:500;
  font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI",system-ui,sans-serif;
}
.ri.on{background:rgba(120,120,128,.16);color:#000;box-shadow:none}

/* Barre du bas (mobile) : même matière, même hiérarchie, sélection en bleu. */
.tabbar{
  background:rgba(249,249,249,.82);
  -webkit-backdrop-filter:saturate(180%) blur(24px);
  backdrop-filter:saturate(180%) blur(24px);
  border-top:.5px solid rgba(60,60,67,.22);
}
.tabbar .ri.on{background:transparent;color:#007AFF}

/* Titres du panneau : Dynamic Type « Large », tracking par taille (HIG).
   Large Title 34/41 +0,012 · Title 2 22/28 −0,012 · Body 17/22 −0,026. */
.hdr.title .name,.hdr .name{letter-spacing:-.012em;font-weight:600}
.hdr.title .sub,.hdr .sub{letter-spacing:-.026em}

/* ============================ ACCESSIBILITÉ ==============================
   Trois signaux indépendants (DA-APPLE §3.8, HIG accessibility). */

/* Mouvement réduit : on garde le feedback, on retire le déplacement. */
@media (prefers-reduced-motion:reduce){
  .ri,.tabbar .ri{transition:background-color 120ms linear,color 120ms linear}
  .ri:active{transform:none}
}

/* Transparence réduite : le verre devient opaque, bordure définie. */
@media (prefers-reduced-transparency:reduce){
  .rail{background:#F9F9F9;-webkit-backdrop-filter:none;backdrop-filter:none;border-right:1px solid rgba(60,60,67,.29)}
  .tabbar{background:#F9F9F9;-webkit-backdrop-filter:none;backdrop-filter:none;border-top:1px solid rgba(60,60,67,.29)}
}

/* Contraste augmenté : texte au label plein, séparateurs visibles. */
@media (prefers-contrast:more){
  :host{--theme-ink-soft:rgba(60,60,67,.9);--theme-muted:rgba(60,60,67,.6);--theme-line:rgba(60,60,67,.55)}
  .ri{color:rgba(60,60,67,.9)}
  .ri.on{background:rgba(120,120,128,.26);color:#000}
}
`,
};
