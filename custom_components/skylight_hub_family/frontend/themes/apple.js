/* Thème « Apple 2026 » — Liquid Glass sur le chrome, SF Pro, surfaces neutres.
 *
 * Source des valeurs (aucune n'est inventée) :
 *   - typographie : HIG `foundations/typography` (Dynamic Type « Large » + table
 *     de tracking SF Pro), relevé dans DA-APPLE.md §Annexe ;
 *   - couleurs : UIKit — label, secondaryLabel, tertiaryLabel, separator,
 *     systemGroupedBackground, et les couleurs système iOS ;
 *   - matériaux : HIG `foundations/materials` — « Don't use Liquid Glass in the
 *     content layer » et « Use Liquid Glass effects sparingly ». D'où la règle :
 *     le verre va sur le CHROME seulement (rail, barre du bas, feuilles), jamais
 *     sur une carte de contenu ;
 *   - rayons : concentration (intérieur = extérieur − inset), DA-APPLE §3.6 ;
 *   - mouvement : ressorts amortis (damping / response), échantillonnés en
 *     `linear()` CSS.
 *
 * DÉCISION DE DA (traitement des pastels, option B) :
 *   la teinte de la personne reste l'identité, mais elle ne s'étale plus sur des
 *   surfaces imbriquées. Elle est portée par
 *     1. le fond de colonne (déjà très clair, laissé tel quel) ;
 *     2. l'avatar et la pastille de validation (inchangés, vifs) ;
 *     3. une arête de 3 px en tête de colonne.
 *   Tout ce qui était « teinté » à l'intérieur (tuiles, corvées, barres, boutons
 *   pointillés) devient blanc + filet. C'est ce qui fait passer l'écran de
 *   « tableau colorié » à « contenu calme, chrome qui flotte ».
 *
 * ISOLATION (condition de tout le reste) :
 *   - le CSS des cartes n'est injecté QUE par `setup(host)` et retiré par
 *     `teardown(host)`, avec l'attribut `data-theme="apple"` ;
 *   - aucun sélecteur n'est global : tout vit dans le shadow root de la carte ;
 *   - `skylight.js` n'est jamais touché.
 */

/* ------------------------------------------------------------------ ressorts
 * Un ressort amorti n'a pas de durée : il a une `response` et un `damping ratio`.
 * On l'échantillonne en `linear()` pour que le CSS se comporte comme le ressort.
 *   ω = 2π/response · ω_d = ω√(1−ζ²) · x(t) = 1 − e^(−ζωt)(cos ω_d t + ζω/ω_d sin ω_d t)
 */
function springLinear(response, damping = 1, steps = 24) {
  const w = (2 * Math.PI) / response;
  const z = damping;
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

const SPRING = {
  move: springLinear(0.4, 1.0),
  press: springLinear(0.2, 1.0),
  settle: springLinear(0.3, 0.8),
};

/* ------------------------------------------------------------------ la police
 * SF Pro d'abord : sur iPad/iPhone `-apple-system` donne SF, la vraie police de
 * l'OS — c'est le seul rendu juste. Ailleurs (Windows, Android) on embarque Inter,
 * déjà livré dans le dépôt mais déclaré nulle part. La famille est unique
 * (« Skylight Inter ») pour ne pas entrer en collision.
 *
 * `@font-face` doit vivre dans le DOCUMENT : une déclaration posée dans le shadow
 * root du panneau ne serait pas visible depuis les shadow roots des cartes.
 */
const FONT_ID = 'apple-theme-font';
/* Plage resserrée à 400–700 : c'est tout ce que l'app utilise, et la HIG
   déconseille explicitement les graisses inférieures à 400. */
const FONT_CSS = `
@font-face{
  font-family:"Skylight Inter";
  src:url("/skylight-static/fonts/InterVariable.woff2") format("woff2");
  font-weight:400 700;font-style:normal;font-display:swap;
}`;
const SANS = '-apple-system,BlinkMacSystemFont,"SF Pro Text","Skylight Inter","Segoe UI",system-ui,sans-serif';
const DISPLAY = '-apple-system,BlinkMacSystemFont,"SF Pro Display","Skylight Inter","Segoe UI",system-ui,sans-serif';

/* ============================================================== CSS DES CARTES
 * Une seule feuille, injectée dans le shadow root de CHAQUE carte. Les
 * sélecteurs viennent de l'inventaire réel du DOM (`_tmp/dom-outline.mjs`),
 * pas d'une supposition.
 */
const CARD_CSS = `
/* ---------- socle : la police et la couleur d'encre de tout l'écran ---------- */
:host{
  font-family:${SANS};
  color:#000;
  -webkit-font-smoothing:antialiased;
  text-rendering:optimizeLegibility;
  /* chiffres alignés dans les compteurs, les heures et les soldes */
  font-variant-numeric:tabular-nums;
}
*,*::before,*::after{box-sizing:border-box}

/* ============================ EN-TÊTE (tous les écrans) ====================
   Large Title = 34/41, mais un tableau de bord familial n'est pas un écran
   d'accueil : on tient Title 2 (22/28) et on laisse le titre respirer par
   l'espace, pas par la graisse. Une seule graisse de titre : 600. */
header.hdr{background:transparent!important}
header.hdr .date,
header.hdr h1.date{
  font-family:${DISPLAY}!important;
  font-size:22px!important;line-height:28px!important;
  font-weight:600!important;letter-spacing:-.012em!important;
  color:#000!important;
}
header.hdr .time,
header.hdr span.time{
  font-family:${SANS}!important;
  font-size:17px!important;line-height:22px!important;
  font-weight:400!important;letter-spacing:-.026em!important;
  color:rgba(60,60,67,.6)!important;
  font-variant-numeric:tabular-nums;
}
header.hdr .wx,
header.hdr span.weather,
header.hdr .wemo{
  font-family:${SANS}!important;
  font-size:17px!important;line-height:22px!important;
  font-weight:400!important;letter-spacing:-.026em!important;
  color:rgba(60,60,67,.6)!important;
}

/* Contrôles de l'en-tête : capsules neutres, plus de bordure fantôme. */
header.hdr button,
header.hdr .chip,
header.hdr .ar,
header.hdr .rep,
header.hdr .gear{
  border:0!important;
  background:rgba(118,118,128,.12)!important;
  color:#000!important;
  font-family:${SANS}!important;
  font-weight:500!important;
  letter-spacing:-.006em!important;
  box-shadow:none!important;
}
header.hdr .chip{font-size:15px!important;padding:0 15px!important;height:34px!important}
header.hdr .ar{width:34px!important;height:34px!important;font-size:17px!important}
header.hdr .rep{background:rgba(255,149,0,.14)!important;color:#8A4B00!important}
header.hdr .wemo{background:transparent!important}

/* Segments S1/S2 : la capsule segmentée d'iOS. */
.wk{background:rgba(118,118,128,.12)!important;border-radius:9px!important;padding:2px!important}
.wkb{background:transparent!important;box-shadow:none!important;color:rgba(60,60,67,.7)!important;
  font-family:${SANS}!important;font-weight:500!important;font-size:13px!important;letter-spacing:-.006em!important}
.wkb.on{background:#fff!important;color:#000!important;box-shadow:0 1px 2px rgba(0,0,0,.10),0 0 0 .5px rgba(0,0,0,.04)!important;font-weight:600!important}

/* ================================ COLONNES ================================= */
.board{background:transparent}
/* Le fond de colonne (teinte de la personne) est laissé TEL QUEL : c'est
   l'identité. On ne change que la forme et la respiration. */
section.col{
  border-radius:24px!important;
  padding:16px 14px 0!important;
  box-shadow:none!important;
}
/* L'arête d'identité a été retirée : en CSS on n'a PAS accès à la couleur de la
   personne (elle vit dans un style inline calculé en JS). currentColor donnait
   un filet noir, ce qui est pire que rien. L'identité est déjà portée par le fond
   de colonne et par l'avatar. */
section.col .head{padding:2px 4px 0!important}

/* Avatar : la couleur vive reste, le halo disparaît (il « collait » au pastel). */
.ava{
  box-shadow:none!important;
  font-family:${SANS}!important;
  font-weight:600!important;
}
/* Nom de la personne : Headline 17/22 600, aligné sur l'avatar. */
.nm{
  font-family:${SANS}!important;
  font-size:17px!important;line-height:22px!important;
  font-weight:600!important;letter-spacing:-.026em!important;
  color:#000!important;
}

/* Les deux compteurs de la colonne : capsules neutres, chiffres tabulaires. */
.bar,.bar.st{
  background:rgba(255,255,255,.72)!important;
  box-shadow:inset 0 0 0 .5px rgba(60,60,67,.10)!important;
  font-family:${SANS}!important;
  font-size:11px!important;line-height:13px!important;
  font-weight:600!important;letter-spacing:.006em!important;
  color:rgba(60,60,67,.85)!important;
  border-radius:999px!important;
}

/* Sections (« Matin », « Après-midi », « Soir ») : en-tête de groupe iOS.
   13/18, secondaire, capitales — et non plus 22 px en serif. */
.sect,.sect2{
  font-family:${SANS}!important;
  font-size:12px!important;line-height:16px!important;
  font-weight:600!important;letter-spacing:.06em!important;
  text-transform:uppercase!important;
  color:rgba(60,60,67,.6)!important;
  margin:16px 2px 8px!important;
}

/* ---------- TUILES (tâches d'une routine) : surface blanche + filet ---------- */
.tile{
  background:#fff!important;
  border-radius:16px!important;
  box-shadow:0 0 0 .5px rgba(60,60,67,.10),0 1px 2px rgba(0,0,0,.04)!important;
  color:#000!important;
}
.tile *{font-family:${SANS}!important}
/* « faite » : surface DÉLAVÉE (blanc translucide), pas grisée. Sur un pastel, un
   gris neutre vire au beige boueux ; un blanc translucide se contente d'éclaircir
   la teinte de la personne, ce qui lit « fait » sans salir. */
.tile.done{background:rgba(255,255,255,.55)!important;box-shadow:none!important}
.tile.done *{color:rgba(60,60,67,.55)!important}
.tile .ttl,.tile .ti,.tile .t{font-size:15px!important;line-height:20px!important;font-weight:500!important;letter-spacing:-.016em!important}
.tile .emo,.tile .e{filter:saturate(.9)}

/* ---------- CORVÉES (pastilles de tâches partagées) ---------- */
.chore{
  background:#fff!important;
  border-radius:14px!important;
  box-shadow:0 0 0 .5px rgba(60,60,67,.10)!important;
  color:#000!important;
}
.chore.tall{border-radius:16px!important}
.chore.done{background:rgba(255,255,255,.55)!important;box-shadow:none!important}
.chore .ctxt{font-family:${SANS}!important;font-size:15px!important;line-height:20px!important;font-weight:500!important;letter-spacing:-.016em!important}
/* le libellé, la ligne secondaire (« il y a 6 jours ») et le prix : trois niveaux
   de libellé, comme une ligne de liste iOS. */
.chore .lb{font-family:${SANS}!important;font-size:15px!important;line-height:20px!important;font-weight:500!important;letter-spacing:-.016em!important;color:#000!important}
.chore .sub,.chore .rel{font-family:${SANS}!important;font-size:13px!important;line-height:18px!important;font-weight:400!important;letter-spacing:-.006em!important;color:rgba(60,60,67,.55)!important}
.chore .gtag{background:rgba(255,255,255,.85)!important;border-radius:999px!important}
.chore .cchip .n{font-family:${SANS}!important;font-size:11px!important;font-weight:600!important;letter-spacing:.006em!important;color:rgba(60,60,67,.8)!important}
.chore.done .ctxt{color:rgba(60,60,67,.6)!important}
/* le prix en étoiles : capsule discrète, jamais un bloc coloré */
.chore .cchip{
  background:rgba(118,118,128,.10)!important;
  color:rgba(60,60,67,.8)!important;
  font-family:${SANS}!important;font-size:11px!important;font-weight:600!important;
  letter-spacing:.006em!important;
  border-radius:999px!important;
}
.chore .cchip.filled{background:#fff!important;box-shadow:0 0 0 .5px rgba(60,60,67,.08)!important}
/* la pastille de validation garde SA couleur (identité de la personne) */
.chore .chk,.tile .chk,.chk{box-shadow:none!important}
/* le bouton « ⋯ » : discret, cible tactile respectée */
.mng{color:rgba(60,60,67,.45)!important;border-radius:50%!important}

/* ---------- état vide : emoji en contenu, pas en illustration ---------- */
.empty .e{font-size:44px!important;line-height:1!important;filter:saturate(.85)}
.empty{font-family:${SANS}!important;font-size:15px!important;line-height:20px!important;
  font-weight:400!important;letter-spacing:-.016em!important;color:rgba(60,60,67,.5)!important}

/* ---------- bandeau d'information (« Revenir à aujourd'hui ») ---------- */
.pvband{background:rgba(118,118,128,.08)!important;border-radius:12px!important}
.pvband button{
  background:#fff!important;border:0!important;
  box-shadow:0 0 0 .5px rgba(60,60,67,.12),0 1px 2px rgba(0,0,0,.04)!important;
  color:#007AFF!important;font-family:${SANS}!important;font-weight:600!important;
  font-size:13px!important;letter-spacing:-.006em!important;border-radius:9px!important;
}

/* ================================ RÉCOMPENSES ==============================
   La carte récompense devient une ligne de liste iOS : surface blanche, filet,
   progression fine. L'emoji reste (c'est le contenu choisi par l'enfant). */
.rc{
  background:#fff!important;
  border-radius:16px!important;
  box-shadow:0 0 0 .5px rgba(60,60,67,.10),0 1px 2px rgba(0,0,0,.04)!important;
  padding:14px 14px 12px!important;
}
.rc .em{font-size:34px!important;line-height:40px!important;height:40px!important;filter:saturate(.92)}
.rc .ttl{
  font-family:${SANS}!important;font-size:15px!important;line-height:20px!important;
  font-weight:600!important;letter-spacing:-.016em!important;color:#000!important;
}
/* Piste fine de 4 px : la barre devient une jauge, plus un bloc. La classe .bar
   sert à la fois de piste ET de conteneur au texte (structure de la carte) ; on
   garde le conteneur, on ne repeint que la piste en bas. */
.rc .bar{
  background:transparent!important;
  overflow:visible!important;
  position:relative!important;
  height:22px!important;
  margin-top:8px!important;
}
.rc .bar::after{
  content:"";position:absolute;left:0;right:0;bottom:0;height:4px;
  border-radius:999px;background:rgba(118,118,128,.18);
}
.rc .fill{
  height:4px!important;top:auto!important;bottom:0!important;
  border-radius:999px!important;z-index:1;
}
.rc .txt{
  position:static!important;height:auto!important;
  margin-left:auto!important;
  display:flex!important;align-items:center;gap:4px;
  font-family:${SANS}!important;font-size:11px!important;font-weight:600!important;
  letter-spacing:.006em!important;color:rgba(60,60,67,.7)!important;
}
.rc .txt svg{fill:currentColor;opacity:.75}
/* « Ajouter une récompense » : plus de pointillés — une ligne d'action, comme
   « Ajouter un élément » dans une app système. Le fond est du BLANC translucide
   et non un bleu à 8 % : sur une colonne ambre, un bleu dilué vire à l'olive. */
.addrow{
  border:0!important;
  background:rgba(255,255,255,.75)!important;
  color:#007AFF!important;
  border-radius:14px!important;
  font-family:${SANS}!important;font-size:15px!important;
  font-weight:500!important;letter-spacing:-.016em!important;
  padding:12px 14px!important;
}
.addrow svg{opacity:.9}

/* ---------- REPAS ----------
   DÉCISION : les cellules repas perdent leur couleur. La teinte y est purement
   décorative (elle ne désigne ni une personne ni un état) — 14 blocs colorés ne
   portent aucune information et font du bruit. Le rythme de la semaine vient de
   la grille et des filets, pas de la couleur. La seule couleur de l'écran est le
   rouge du jour courant. */
button.cell{
  background:#fff!important;
  border-radius:16px!important;
  box-shadow:inset 0 0 0 .5px rgba(60,60,67,.12)!important;
}
button.cell.single{background:#fff!important}
/* Repas : le plat est le CONTENU de la cellule, pas une surface de plus. Il était
   peint en gris et remplissait la cellule — la case « remplie » devenait un bloc
   gris. On retire sa surface : la cellule blanche reste, le texte est direct. */
span.dish{
  background:transparent!important;
  border-radius:12px!important;
  font-family:${SANS}!important;
  color:#000!important;
}
/* le « + » des cellules vides : discret */
.cell.empty::before,.cell .plus{color:rgba(60,60,67,.22)!important}
/* bouton natif jamais stylé par la carte (fond #F0F0F0, bordure outset, Arial) */
.mcell{
  background:#fff!important;border:.5px solid rgba(60,60,67,.14)!important;
  border-radius:10px!important;
  font-family:${SANS}!important;font-size:13px!important;color:#000!important;
}

/* ================================ CALENDRIER ============================== */
.cal .hdr,.hdr .hl{background:transparent}
h1.title{font-family:${DISPLAY}!important}
h1.title{
  font-size:22px!important;line-height:28px!important;font-weight:600!important;
  letter-spacing:-.012em!important;color:#000!important;
}
span.time,span.weather{
  font-family:${SANS}!important;font-size:17px!important;line-height:22px!important;
  font-weight:400!important;letter-spacing:-.026em!important;color:rgba(60,60,67,.6)!important;
}
button.nav{
  background:rgba(118,118,128,.12)!important;border:0!important;
  box-shadow:none!important;color:#000!important;
}
button.todaybtn{
  background:rgba(118,118,128,.12)!important;border:0!important;box-shadow:none!important;
  color:#000!important;font-family:${SANS}!important;font-size:13px!important;
  font-weight:600!important;letter-spacing:-.006em!important;
}
span.range{
  font-family:${SANS}!important;font-size:15px!important;font-weight:600!important;
  letter-spacing:-.016em!important;color:#000!important;
}
/* En-tête de jour. La classe .dh sert aux DEUX écrans (repas et calendrier) : on
   ne touche donc pas à sa bordure — chacune garde la sienne, réglée par sa carte. */
.dh{font-family:${SANS}!important;color:#000!important}
.dh .dow{font-family:${SANS}!important;font-weight:400!important;color:rgba(60,60,67,.6)!important}
.dh .num{font-family:${SANS}!important;font-weight:600!important;font-size:15px!important}
.dh.today .num{background:#FF3B30!important;color:#fff!important;border-radius:999px!important}

/* Pastilles de personne. Deux états : la classe pill sur un div (calendrier relié,
   pastel plein + bordure) et la variante ghost (pointillés + « + Ajouter »). Les
   pointillés sont un motif de wireframe, pas d'interface finie : on les remplace
   par une capsule neutre. L'avatar porte la couleur, le nom le rôle de libellé. */
.pills{padding:4px 22px 8px!important;gap:8px!important}
div.pill,button.pill.ghost{
  background:rgba(255,255,255,.85)!important;
  border:0!important;
  border-radius:999px!important;
  box-shadow:0 0 0 .5px rgba(60,60,67,.14)!important;
  padding:3px 12px 3px 3px!important;
  flex:0 0 auto!important;
}
.pill .pa{box-shadow:none!important}
.pill .pn{
  font-family:${SANS}!important;font-size:15px!important;line-height:20px!important;
  font-weight:600!important;letter-spacing:-.016em!important;color:#000!important;
}
.pill .plus{
  background:#007AFF!important;
  width:20px!important;height:20px!important;
  font-size:13px!important;line-height:1!important;
}
.pill .addlbl{
  font-family:${SANS}!important;font-size:13px!important;line-height:18px!important;
  font-weight:600!important;letter-spacing:-.006em!important;color:#007AFF!important;
}
/* Bandeau d'erreur : une teinte d'alerte douce, pas un aplat rose. */
.note.err{
  background:rgba(255,59,48,.10)!important;
  border-radius:12px!important;
  font-family:${SANS}!important;font-size:13px!important;
  color:#B3261E!important;
}
/* Grille : la couleur de fond du conteneur sert de filet entre les jours. On la
   ramène à un trait, et on retire le cadre. */
.grid{background:rgba(60,60,67,.14)!important;border:0!important}
.day .dh{
  font-size:15px!important;line-height:20px!important;font-weight:600!important;
  letter-spacing:-.016em!important;padding:12px 8px 10px!important;
}
.day .dh .dn{font-family:${SANS}!important;font-weight:400!important;color:rgba(60,60,67,.6)!important}
.day .dh .dd{font-family:${SANS}!important;font-weight:600!important;font-size:15px!important}
.day.today .dh .dd{background:#FF3B30!important;color:#fff!important;border-radius:999px!important}
.de .empty{
  font-family:${SANS}!important;font-size:13px!important;
  color:rgba(60,60,67,.4)!important;
}
.stitle{font-family:${SANS}!important;font-size:13px!important;font-weight:600!important;letter-spacing:.06em!important;text-transform:uppercase!important;color:rgba(60,60,67,.6)!important}

/* ================================= PROFILS ================================
   Les lignes étaient pleines de couleur saturée avec une ombre colorée : deux
   tells à la fois. Elles deviennent des lignes de liste ; l'avatar garde la
   couleur vive, c'est lui l'identité. */
button.row{
  background:#fff!important;
  border-radius:14px!important;
  box-shadow:0 0 0 .5px rgba(60,60,67,.10)!important;
}
span.grip{background:rgba(118,118,128,.14)!important;border-radius:8px!important}
span.nm{
  font-family:${SANS}!important;font-size:17px!important;line-height:22px!important;
  font-weight:600!important;letter-spacing:-.026em!important;color:#000!important;
}
span.av{box-shadow:none!important}
.rows button.row + button.row,.row + .row{}

/* ================================ RÉGLAGES ================================
   Réglages = liste groupée encastrée, la forme la plus reconnaissable d'iOS. */
.gt{
  font-family:${SANS}!important;font-size:13px!important;line-height:18px!important;
  font-weight:400!important;letter-spacing:-.006em!important;
  text-transform:uppercase!important;color:rgba(60,60,67,.6)!important;
  margin:0 0 7px 4px!important;
}
.card{
  background:#fff!important;
  border:0!important;
  border-radius:12px!important;
  box-shadow:none!important;
  overflow:hidden;
}
.card .row,.card button.row{border-top:.5px solid rgba(60,60,67,.14)!important}
.card .row:first-child,.card button.row:first-child{border-top:0!important}
.card .row{padding:12px 16px!important}
.card b,.card .rl b{
  font-family:${SANS}!important;font-size:17px!important;line-height:22px!important;
  font-weight:400!important;letter-spacing:-.026em!important;color:#000!important;
}
.card .rl span,.card small{
  font-family:${SANS}!important;font-size:13px!important;line-height:18px!important;
  color:rgba(60,60,67,.6)!important;
}
h1{
  font-family:${DISPLAY}!important;font-size:26px!important;line-height:32px!important;
  font-weight:600!important;letter-spacing:-.012em!important;color:#000!important;
}
span.sub{font-family:${SANS}!important;font-size:13px!important;color:rgba(60,60,67,.6)!important}

/* ------------------------------ bouton flottant --------------------------- */
.fab{
  background:#007AFF!important;
  color:#fff!important;
  width:56px!important;height:56px!important;
  box-shadow:0 6px 20px rgba(0,122,255,.34),0 1px 3px rgba(0,0,0,.12)!important;
  transition:transform 200ms ${SPRING.press},box-shadow 200ms ease-out!important;
}
.fab:active{transform:scale(.94)!important}

/* ================================ FEUILLES =================================
   Les feuilles sont du CHROME : c'est le seul endroit où la matière est permise.
   (Les classes .scrim/.panel/.celebrate de la carte Récompenses.) */
.panel{
  border-radius:24px!important;
  background:rgba(255,255,255,.86)!important;
  -webkit-backdrop-filter:saturate(180%) blur(24px);
  backdrop-filter:saturate(180%) blur(24px);
  box-shadow:-8px 0 40px rgba(0,0,0,.16)!important;
}
.scrim,.celebrate{background:rgba(0,0,0,.28)!important}

/* ============================== ACCESSIBILITÉ ==============================
   Trois signaux indépendants. */
@media (prefers-reduced-transparency:reduce){
  .panel{background:#fff!important;-webkit-backdrop-filter:none;backdrop-filter:none}
}
@media (prefers-contrast:more){
  .sect,.sect2,header.hdr .time,header.hdr .wx{color:rgba(60,60,67,.9)!important}
  .tile,.chore{box-shadow:0 0 0 1px rgba(60,60,67,.45)!important}
}
@media (prefers-reduced-motion:reduce){
  *,*::before,*::after{transition-duration:1ms!important;animation-duration:1ms!important}
}
`;

/* ============================================================== LE THÈME */

export const APPLE = {
  id: 'apple',
  name: 'Apple',
  description: 'Liquid Glass sur le chrome seulement, SF Pro, surfaces neutres, couleur de la personne en arête.',

  status: 'ready',

  tokens: {
    sans: SANS,
    serif: DISPLAY,
    ink: '#000000',
    inkSoft: 'rgba(60,60,67,.60)',
    muted: 'rgba(60,60,67,.34)',
    line: 'rgba(60,60,67,.29)',
    surface: '#FFFFFF',
    rail: '#F2F2F7',
    brand: '#007AFF',
    brandSoft: 'rgba(0,122,255,.15)',
    star: '#FF9500',
    today: '#FF3B30',
  },

  get css() {
    return `:host{
  --theme-sans:${SANS};
  --theme-serif:${DISPLAY};

  --theme-ink:#000;--theme-ink-soft:rgba(60,60,67,.6);--theme-muted:rgba(60,60,67,.34);
  --theme-line:rgba(60,60,67,.29);
  --theme-surface:#fff;--theme-rail:#F2F2F7;
  --theme-rail-ink:rgba(60,60,67,.6);--theme-logo-ink:#fff;
  --theme-chip:rgba(118,118,128,.12);
  --theme-brand:#007AFF;--theme-brand-soft:rgba(0,122,255,.15);
  --theme-star:#FF9500;--theme-today:#FF3B30;

  /* formes concentriques : colonne 24 − inset 8 = carte 16 − inset 2 = tuile 14 */
  --theme-r-col:24px;--theme-r-tile:14px;--theme-r-card:16px;--theme-r-sheet:24px;
  --theme-r-nav:12px;--theme-r-logo:9px;

  --apple-spring-move:${SPRING.move};
  --apple-spring-press:${SPRING.press};
  --apple-spring-settle:${SPRING.settle};

  background:#F2F2F7;color:#000;
  font-family:${SANS};
  -webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;
}
.app{background:#F2F2F7}

/* ================================ CHROME ==================================
   HIG materials : verre réservé à la couche fonctionnelle. */
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
  transition:background-color 250ms ${SPRING.settle},color 180ms ease-out,transform 200ms ${SPRING.press};
}
.ri:hover{background:rgba(120,120,128,.10)}
.ri:active{transform:scale(.96)}
.rail .ri .tx,.tabbar .ri .tx{
  font-size:11px;letter-spacing:.006em;font-weight:500;font-family:${SANS};
}
.ri.on{background:rgba(120,120,128,.16);color:#000;box-shadow:none}

.tabbar{
  background:rgba(249,249,249,.82);
  -webkit-backdrop-filter:saturate(180%) blur(24px);
  backdrop-filter:saturate(180%) blur(24px);
  border-top:.5px solid rgba(60,60,67,.22);
}
.tabbar .ri.on{background:transparent;color:#007AFF}

.hdr.title .name,.hdr .name{letter-spacing:-.012em;font-weight:600}
.hdr.title .sub,.hdr .sub{letter-spacing:-.026em}

@media (prefers-reduced-motion:reduce){
  .ri,.tabbar .ri{transition:background-color 120ms linear,color 120ms linear}
  .ri:active{transform:none}
}
@media (prefers-reduced-transparency:reduce){
  .rail{background:#F9F9F9;-webkit-backdrop-filter:none;backdrop-filter:none;border-right:1px solid rgba(60,60,67,.29)}
  .tabbar{background:#F9F9F9;-webkit-backdrop-filter:none;backdrop-filter:none;border-top:1px solid rgba(60,60,67,.29)}
}
@media (prefers-contrast:more){
  :host{--theme-ink-soft:rgba(60,60,67,.9);--theme-muted:rgba(60,60,67,.6);--theme-line:rgba(60,60,67,.55)}
  .ri{color:rgba(60,60,67,.9)}
  .ri.on{background:rgba(120,120,128,.26);color:#000}
}
`;
  },

  /* ------------------------------------------------------------- setup/teardown
   * Le seul endroit où le thème touche les cartes. Tout ce qui est posé ici est
   * retiré par `teardown` : c'est la condition pour que le retour à Skylight
   * soit identique (THÈMES.md).
   */
  setup(host) {
    if (!host) return;
    /* 1. la police embarquée, dans le document (les shadow roots des cartes ne
          voient pas une @font-face déclarée dans le panneau) */
    if (!document.getElementById(FONT_ID)) {
      const st = document.createElement('style');
      st.id = FONT_ID;
      st.textContent = FONT_CSS;
      document.head.appendChild(st);
    }
    /* 2. la feuille de carte, injectée dans chaque shadow root de carte */
    const scan = () => {
      const root = host.shadowRoot;
      if (!root) return;
      for (const el of root.querySelectorAll('.view *')) {
        const sr = el.shadowRoot;
        if (!sr || sr.querySelector('style[data-theme="apple"]')) continue;
        const st = document.createElement('style');
        st.setAttribute('data-theme', 'apple');
        st.textContent = CARD_CSS;
        sr.appendChild(st);
      }
    };
    scan();
    /* les cartes se montent à la première visite d'une vue : on repasse après.
       Le balayage est trivial (les enfants du .view sont les cartes, pas leur
       contenu, qui vit dans leur shadow root). */
    if (host.__appleTimer) clearInterval(host.__appleTimer);
    host.__appleTimer = setInterval(scan, 500);
  },

  teardown(host) {
    if (!host) return;
    if (host.__appleTimer) { clearInterval(host.__appleTimer); host.__appleTimer = null; }
    const f = document.getElementById(FONT_ID);
    if (f) f.remove();
    const root = host.shadowRoot;
    if (!root) return;
    for (const el of root.querySelectorAll('.view *')) {
      const sr = el.shadowRoot;
      if (!sr) continue;
      const st = sr.querySelector('style[data-theme="apple"]');
      if (st) st.remove();
    }
  },
};
