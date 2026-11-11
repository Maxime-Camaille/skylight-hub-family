/* skylight-profiles-card — gestion des profils de la famille
 *
 * type: custom:skylight-profiles-card
 * entity: todo.profils          # registre : 1 item = 1 profil
 * avatars: [/local/avatars/…]   # photos proposées (facultatif)
 *
 * Un profil vit dans un item de la liste `todo.profils` :
 *   summary     = prénom
 *   description = {"c":"#B7E4C7","a":"#2E9E63","p":"…","s":true,"i":"mateo","r":"todo.routines_mateo"}
 *     c = pastel (fond de colonne)   a = teinte d'identité (avatar, coches)
 *     p = photo (« /local/… »), emoji (« :🦊 ») ou image chargée (data URI webp)
 *     s = étoiles activées           i = identifiant technique
 *     r = liste de routines associée
 *
 * Pourquoi une liste `todo` : elle se crée, se modifie et se supprime par
 * service, sans écrire de fichier ni créer d'entité — donc installable chez
 * n'importe qui, et sauvegardée avec les sauvegardes Home Assistant.
 */

const SERIF = "var(--skylight-serif, Literata, Georgia, serif)";
const SANS = "var(--skylight-sans, Figtree, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif)";
const INK = "#1F2328";
const MUTED = "#7C8494";
const LINE = "#E9ECF1";
const FIELD = "#F4F6F8";
const BLUE = "var(--f-blue, #007AFF)";

/* Couleurs d'identité proposées, dans l'ordre où elles s'affichent.
 *
 * Ce sont des teintes VIVES : c'est la couleur qu'on « possède », celle qui
 * colore l'avatar, les coches, la jauge et l'anneau actif. Le pastel qui
 * remplit les colonnes et les tuiles n'est pas choisi : il s'en déduit
 * (voir `pastelOf`, mêmes teinte et saturation, luminosité 82 %).
 *
 * Les 14 ont été écartées d'au moins 50 unités RVB entre elles : à taille de
 * pastille, aucune ne se confond avec sa voisine. Les quatre premières de la
 * famille y figurent, donc chacun apparaît sélectionné chez lui. */
const COLORS = [
  "#2E9E63", /* vert     — Matéo  */
  "#A8D46A", /* lime              */
  "#4FC3D0", /* cyan              */
  "#0F5F6E", /* sarcelle         */
  "#4677A8", /* bleu     — Papa   */
  "#8E5BD9", /* violet           */
  "#D9548C", /* rose     — Elena  */
  "#C2185B", /* cramoisi         */
  "#C22F2F", /* rouge            */
  "#E0622A", /* orange           */
  "#7A4B2A", /* café             */
  "#A9762F", /* ocre     — Noémie */
  "#F5A623", /* ambre            */
  "#2B3038", /* charbon (neutre) */
];
/* couleur par défaut d'un profil qu'on crée (teinte libre de la palette) */
const DEFAULT_ACCENT = "#4FC3D0";
/* avatars « illustration » par défaut (à la place des animaux dessinés de Skylight) */
const ANIMALS = ["🦊", "🐰", "🐼", "🦄", "🐶", "🐱", "🐸", "🐨", "🦁", "🐵", "🐯", "🐷"];

const ICON = {
  back: '<svg viewBox="0 0 24 24"><path d="M20,11V13H8L13.5,18.5L12.08,19.92L4.16,12L12.08,4.08L13.5,5.5L8,11H20Z"/></svg>',
  chevron: '<svg viewBox="0 0 24 24"><path d="M8.59,16.58L13.17,12L8.59,7.41L10,6L16,12L10,18L8.59,16.58Z"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><path d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z"/></svg>',
  camera: '<svg viewBox="0 0 24 24"><path d="M4,4H7L9,2H15L17,4H20A2,2 0 0,1 22,6V18A2,2 0 0,1 20,20H4A2,2 0 0,1 2,18V6A2,2 0 0,1 4,4M12,7A5,5 0 0,0 7,12A5,5 0 0,0 12,17A5,5 0 0,0 17,12A5,5 0 0,0 12,7M12,9A3,3 0 0,1 15,12A3,3 0 0,1 12,15A3,3 0 0,1 9,12A3,3 0 0,1 12,9Z"/></svg>',
  person: '<svg viewBox="0 0 24 24"><path d="M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z"/></svg>',
  star: '<svg viewBox="0 0 24 24"><path d="M12,17.27L18.18,21L16.54,13.97L22,9.24L14.81,8.62L12,2L9.19,8.62L2,9.24L7.45,13.97L5.82,21L12,17.27Z"/></svg>',
  link: '<svg viewBox="0 0 24 24"><path d="M10.59,13.41C11,13.8 11,14.44 10.59,14.83C10.2,15.22 9.56,15.22 9.17,14.83C7.22,12.88 7.22,9.71 9.17,7.76L12.71,4.22C14.66,2.27 17.83,2.27 19.78,4.22C21.73,6.17 21.73,9.34 19.78,11.29L18.29,12.78C18.3,11.96 18.17,11.14 17.89,10.36L18.36,9.88C19.54,8.71 19.54,6.81 18.36,5.64C17.19,4.46 15.29,4.46 14.12,5.64L10.59,9.17C9.41,10.34 9.41,12.24 10.59,13.41M13.41,9.17C13.8,8.78 14.44,8.78 14.83,9.17C16.78,11.12 16.78,14.29 14.83,16.24L11.29,19.78C9.34,21.73 6.17,21.73 4.22,19.78C2.27,17.83 2.27,14.66 4.22,12.71L5.71,11.22C5.7,12.04 5.83,12.86 6.11,13.65L5.64,14.12C4.46,15.29 4.46,17.19 5.64,18.36C6.81,19.54 8.71,19.54 9.88,18.36L13.41,14.83C14.59,13.66 14.59,11.76 13.41,10.59C13,10.2 13,9.56 13.41,9.17Z"/></svg>',
  trash: '<svg viewBox="0 0 24 24"><path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z"/></svg>',
  close: '<svg viewBox="0 0 24 24"><path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"/></svg>',
  calendar: '<svg viewBox="0 0 24 24"><path d="M19,19H5V8H19M16,1V3H8V1H6V3H5C3.89,3 3,3.89 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5A2,2 0 0,0 19,3H18V1M17,12H12V17H17V12Z"/></svg>',
  google: '<svg viewBox="0 0 24 24"><path d="M21.35,11.1H12.18V13.83H18.69C18.36,17.64 15.19,19.27 12.19,19.27C8.36,19.27 5,16.25 5,12C5,7.9 8.2,4.73 12.2,4.73C15.29,4.73 17.1,6.7 17.1,6.7L19,4.72C19,4.72 16.56,2 12.1,2C6.42,2 2.03,6.8 2.03,12C2.03,17.05 6.16,22 12.25,22C17.6,22 21.5,18.33 21.5,12.91C21.5,11.76 21.35,11.1 21.35,11.1Z"/></svg>',
  apple: '<svg viewBox="0 0 24 24"><path d="M18.71,19.5C17.88,20.74 17,21.95 15.66,21.97C14.32,22 13.89,21.18 12.37,21.18C10.84,21.18 10.37,21.95 9.1,22C7.79,22.05 6.8,20.68 5.96,19.47C4.25,17 2.94,12.45 4.7,9.39C5.57,7.87 7.13,6.91 8.82,6.88C10.1,6.86 11.32,7.75 12.11,7.75C12.89,7.75 14.37,6.68 15.92,6.84C16.57,6.87 18.39,7.1 19.56,8.82C19.47,8.88 17.39,10.1 17.41,12.63C17.44,15.65 20.06,16.66 20.09,16.67C20.06,16.74 19.67,18.11 18.71,19.5M13,3.5C13.73,2.67 14.94,2.04 15.94,2C16.07,3.17 15.6,4.35 14.9,5.19C14.21,6.04 13.07,6.7 11.95,6.61C11.8,5.46 12.36,4.26 13,3.5Z"/></svg>',
  plus2: '<svg viewBox="0 0 24 24"><path d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z"/></svg>',
  grip: '<svg viewBox="0 0 24 24"><path d="M8,7h3v3H8V7M13,7h3v3h-3V7M8,11h3v3H8V11M13,11h3v3h-3V11M8,15h3v3H8V15M13,15h3v3h-3V15Z"/></svg>',
};

const CSS = `
:host{display:block;height:100%;min-width:0;font-family:${SANS};color:${INK};background:#fff}
*,*::before,*::after{box-sizing:border-box}
.page{display:flex;flex-direction:column;height:100%;min-width:0;overflow:hidden}
/* l'en-tête (.hdr, flèche retour, titre) est dans famille-core.js (variante « title ») */
.hdr .back:hover{background:#F2F4F7}
.hdr .back svg{width:22px;height:22px;fill:currentColor}
.body{flex:1 1 auto;min-height:0;overflow-y:auto;overflow-x:hidden;padding:6px 22px 28px;scrollbar-width:none}
.body::-webkit-scrollbar{width:0;height:0}
.sect{margin:22px 2px 4px;font-size:14px;font-weight:700}
.hint{margin:0 2px 14px;font-size:13.5px;color:${MUTED};line-height:1.4}
.rows{display:flex;flex-direction:column;gap:10px;max-width:820px}
.row{--rowcol:#F1F3F7;--rowaccent:#7A8596;--rowhalo:rgba(122,133,150,.16)}
.row{display:flex;align-items:center;gap:14px;width:100%;min-height:60px;padding:8px 16px 8px 12px;border:0;border-radius:14px;background:${FIELD};font:inherit;text-align:left;cursor:pointer;color:${INK}}
.row{background:var(--rowcol);box-shadow:0 2px 10px var(--rowhalo)}
.row:hover{filter:brightness(.985)}
.row .av{background:var(--rowaccent);color:#fff;width:34px;height:34px;flex:0 0 34px;border-radius:50%;overflow:hidden;display:grid;place-items:center;box-shadow:0 0 0 3px var(--rowhalo),0 2px 9px var(--rowhalo);border:none;place-items:center;font-size:19px}
.row .av img{width:100%;height:100%;object-fit:cover;display:block}
.row .nm{flex:1 1 auto;font-size:15.5px;font-weight:600}
.row .cv{width:18px;height:18px;flex:0 0 18px;fill:#AAB2BF}
/* poignée de réordonnancement : seule zone qui démarre un glissement, ce qui
   laisse le tap sur la ligne ouvrir la fiche (voir _startDrag). Elle doit se
   voir sans crier : un gris franc, lisible sur tous les pastels. */
.row .grip{width:30px;height:46px;flex:0 0 30px;margin-left:-6px;display:grid;place-items:center;color:rgba(31,35,40,.42);cursor:grab;touch-action:none;border-radius:11px;background:rgba(255,255,255,.62);transition:color .15s ease,background .15s ease,box-shadow .15s ease}
.row .grip svg{width:22px;height:22px;fill:currentColor}
.row .grip:hover{color:rgba(31,35,40,.62);background:#fff}
.row .grip:active{cursor:grabbing;color:rgba(31,35,40,.75);background:#fff;box-shadow:0 1px 3px rgba(31,35,40,.16)}
.row .grip:active{cursor:grabbing;color:rgba(31,35,40,.7);background:#fff;box-shadow:0 1px 3px rgba(31,35,40,.14)}
.row{position:relative}
.row.lift{z-index:6;cursor:grabbing;box-shadow:0 14px 30px rgba(31,35,40,.24)}
.rows.reordering{user-select:none;-webkit-user-select:none}
.hint b{color:#5D6573;font-weight:700}
.row.add{background:${FIELD}}
.row.add .av{background:#E7ECF1;color:#7C8494}
.row.add .av svg{width:20px;height:20px;fill:currentColor}
.row.add .nm{font-weight:600;color:#5D6573}
/* ---- fiche ---- */
/* écran de réglages : avatar + palette à gauche, champs à droite.
   L'avatar et les couleurs empilés, les champs en dessous : rien n'est repoussé
   sous la ligne de flottaison. Les propositions d'avatar vivent dans une feuille. */
.form{display:flex;flex-direction:column;align-items:stretch;gap:12px;max-width:820px;width:100%;min-width:0;margin-top:2px}
.avatarblock{display:flex;flex-direction:column;align-items:center;gap:2px}
.big{box-shadow:0 0 0 3px var(--bighalo,rgba(122,133,150,.18)),0 3px 12px var(--bighalo,rgba(122,133,150,.18));position:relative;width:118px;height:118px;border-radius:50%;display:grid;place-items:center;font-size:56px;line-height:1;overflow:visible;color:#fff;border:0;padding:0;cursor:pointer;box-shadow:0 0 0 1px rgba(31,35,40,.06)}
.big .face{position:absolute;inset:0;border-radius:50%;overflow:hidden;display:grid;place-items:center}
.big .face img{width:100%;height:100%;object-fit:cover;display:block}
.big .cam{position:absolute;right:0;bottom:0;width:34px;height:34px;border-radius:50%;background:#fff;border:1px solid #E3E7EC;display:grid;place-items:center;box-shadow:0 1px 3px rgba(31,35,40,.14)}
.big .cam svg{width:18px;height:18px;fill:#3A4050}
.linkbtn{border:0;background:none;color:${BLUE};font:600 13.5px ${SANS};cursor:pointer;padding:6px 10px;border-radius:9px}
.linkbtn:hover{background:#F2F5F8}
/* ---- ligne de couleurs : défile horizontalement s'il y en a trop, avec un
   dégradé + chevron à droite pour montrer qu'il en reste ---- */
.colorline{position:relative;min-width:0}
/* « safe center » : centré quand tout tient (tablette), aligné à gauche quand la
   rangée déborde (téléphone) — sinon le centrage rogne la première pastille et
   la rend inatteignable, le défilement ne pouvant pas aller à gauche de zéro. */
.swatches{display:flex;gap:10px;overflow-x:auto;scrollbar-width:none;padding:8px 6px;justify-content:center;justify-content:safe center;-webkit-overflow-scrolling:touch}
.swatches::-webkit-scrollbar{height:0}
.sw{width:26px;height:26px;flex:0 0 26px;border-radius:50%;border:0;cursor:pointer;position:relative;padding:0}
.sw[data-on="1"]{box-shadow:0 0 0 2px #fff,0 0 0 4px ${INK}}
/* en format poche, la pastille est aussi une cible tactile : 26 px est trop petit.
   Cette règle vient APRÈS .sw, sinon la déclaration de base l'écrase. */
@media (max-width:560px){
  .swatches{gap:8px}
  .sw{width:32px;height:32px;flex:0 0 32px}
}
.colorline .fade{position:absolute;top:0;right:0;bottom:0;width:46px;display:flex;align-items:center;justify-content:flex-end;padding-right:2px;background:linear-gradient(to right,rgba(255,255,255,0),#fff 60%);pointer-events:none;opacity:0;transition:opacity .15s ease;color:#8A8F9C;font-size:19px;font-weight:700}
.colorline.more .fade{opacity:1}
/* ---- propositions d'avatar (dans la feuille) ---- */
.strip{display:grid;grid-template-columns:repeat(8,44px);justify-content:center;gap:12px;max-width:100%;padding:9px 4px 7px;overflow:visible}
.pick{width:44px;height:44px;flex:0 0 44px;border-radius:50%;border:0;background:#E9EDF1;display:grid;place-items:center;font-size:22px;line-height:1;cursor:pointer;overflow:hidden;padding:0;box-shadow:0 0 0 1px rgba(31,35,40,.06)}
.pick img{width:100%;height:100%;object-fit:cover;display:block}
.pick[data-on="1"]{box-shadow:0 0 0 2px #fff,0 0 0 4px ${INK}}
.fields{display:flex;flex-direction:column;gap:10px;max-width:820px;min-width:0}
.field{display:flex;align-items:center;gap:14px;background:${FIELD};border-radius:14px;padding:0 16px;height:58px;border:1.5px solid transparent;transition:background .14s ease,border-color .14s ease}
/* champ en cours d'édition : anneau INTÉRIEUR, jamais rogné par un conteneur
   qui défile (le halo extérieur était coupé) */
.field:focus-within{background:#fff;border-color:transparent;box-shadow:inset 0 0 0 2px var(--f-blue-line,rgba(0,122,255,.42))}
.field .ic{width:20px;height:20px;flex:0 0 20px;fill:#7C8494;display:grid;place-items:center}
.field .ic svg{width:20px;height:20px;fill:currentColor}
.field input{flex:1 1 auto;min-width:0;border:0;background:transparent;font:inherit;font-size:15.5px;color:${INK};outline:none}
/* champ qui ouvre un choix (calendrier) : même gabarit qu'un champ de saisie */
.field.asbtn{cursor:pointer;text-align:left;font:inherit;width:100%}
.field .cv{width:16px;height:16px;flex:0 0 16px;fill:#AAB2BF}
.calrow{display:flex;align-items:center;gap:12px;width:100%;border:0;background:${FIELD};border-radius:14px;padding:12px 14px;font:inherit;text-align:left;cursor:pointer;color:${INK}}
.calrow:hover{background:#EFF2F5}
.calrow[data-on="1"]{box-shadow:inset 0 0 0 2px ${BLUE}}
.calrow .cn{flex:1 1 auto;font-size:15px;font-weight:600}
.calrow .cb{width:24px;height:24px;flex:0 0 24px;border-radius:7px;background:#EAEEF3;display:grid;place-items:center}
.calrow .cb svg{width:14px;height:14px;fill:#5D6573}
.calrow .csub{display:block;font-size:11.5px;font-weight:600;color:#8A8F9C;margin-top:2px}
.field .tg{display:flex;align-items:center;gap:10px}
.tgl{width:48px;height:28px;border-radius:999px;border:0;background:#CFD6DE;position:relative;cursor:pointer;transition:background .16s ease;flex:0 0 48px}
.tgl::after{content:'';position:absolute;top:3px;left:3px;width:22px;height:22px;border-radius:50%;background:#fff;transition:transform .16s ease;box-shadow:0 1px 2px rgba(0,0,0,.2)}
.tgl[data-on="1"]{background:${BLUE}}
.tgl[data-on="1"]::after{transform:translateX(20px)}
.foot{flex:0 0 auto;padding:14px 22px 20px;display:flex;flex-direction:column;gap:10px;max-width:864px;width:100%}
.btn{height:54px;border:0;border-radius:999px;font:inherit;font-size:15.5px;font-weight:700;cursor:pointer}
.btn:focus{outline:none}
.btn:focus-visible{outline:2px solid var(--f-blue-line,rgba(0,122,255,.42));outline-offset:2px}
.btn.go{background:${BLUE};color:#fff}
.btn.go[disabled]{background:var(--f-blue-soft,#E5F0FF);cursor:default}
.btn.soft{background:${FIELD};color:${INK}}
.btn.del{background:transparent;color:var(--f-danger,#FF3B30)}
.legend{text-align:center;font-size:12px;color:${MUTED};margin-top:2px}
.warn{background:#F4F6F8;color:#3A4050;border-radius:12px;padding:12px 14px;font-size:13.5px;line-height:1.45}
.btn.soft.deltext{color:#FF3B30}
/* ---- feuille de confirmation : on isole l'utilisateur sur l'action ---- */
.sheet{position:fixed;inset:0;z-index:60;background:rgba(24,28,34,.38);display:flex;align-items:center;justify-content:center;padding:20px;animation:sheetfade .15s ease}
.scard{width:100%;max-width:410px;background:#fff;border-radius:22px;padding:22px 22px 18px;box-shadow:0 18px 50px rgba(20,24,40,.3);display:flex;flex-direction:column;gap:10px}
.sttl{font-family:${SERIF};font-size:21px;font-weight:600;letter-spacing:-.01em}
/* en-tête de feuille : titre + croix de fermeture (une modale se ferme toujours) */
.shead{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
.sx{width:34px;height:34px;flex:0 0 34px;border:0;border-radius:50%;background:#F3F5F8;color:#3A4050;display:grid;place-items:center;cursor:pointer;margin:-3px -3px 0 0}
.sx:hover{background:#E9EDF2}
.sx svg{width:16px;height:16px;fill:currentColor}
.stxt{margin:0 0 6px;font-size:14px;color:#5D6573;line-height:1.45}
/* corps de feuille structuré : une phrase d'engagement, puis deux listes
   (« ce qui disparaît » / « ce qui reste ») lisibles par tous */
.lead{margin:0;font-size:14.5px;color:#2B2F38;line-height:1.45}
.sblock{margin-top:2px}
.slabel{font-size:10.5px;font-weight:700;letter-spacing:.09em;text-transform:uppercase;color:#8A8F9C;margin:0 0 7px}
.slist{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:5px}
.slist li{position:relative;padding-left:16px;font-size:14px;color:#2B2F38;line-height:1.4}
.slist li::before{content:'';position:absolute;left:3px;top:7px;width:5px;height:5px;border-radius:50%;background:#C7CEDA}
.sfine{margin:2px 0 0;font-size:12px;color:#8A8F9C;line-height:1.45}
@keyframes sheetfade{from{opacity:0}to{opacity:1}}
/* retour d'action : carte claire dans la DA de l'app (pas de bloc noir) */
.toast{position:fixed;left:50%;bottom:96px;transform:translate(-50%,10px);max-width:min(520px,calc(100vw - 32px));background:#fff;color:${INK};border:1px solid ${LINE};border-radius:16px;padding:13px 16px 13px 14px;display:flex;gap:11px;align-items:flex-start;box-shadow:0 14px 34px rgba(20,24,40,.16);opacity:0;transition:opacity .18s ease,transform .18s ease;pointer-events:none;z-index:80}
.toast.on{opacity:1;transform:translate(-50%,0)}
.toast .tic{width:26px;height:26px;flex:0 0 26px;border-radius:50%;background:rgba(46,158,99,.14);color:#2E8B57;display:grid;place-items:center;margin-top:1px}
.toast .tic svg{width:15px;height:15px;fill:currentColor}
.toast .tt{font-size:14px;font-weight:700;line-height:1.35}
.toast .hint{display:block;margin-top:4px;font-size:12.5px;font-weight:400;color:#6C7382;line-height:1.45}
/* feuille « Changer l'avatar » : 6 colonnes, tout visible dedans */
.sheet .strip{grid-template-columns:repeat(6,44px);gap:10px;padding:4px 0 8px}
@media (max-width:1000px){
  .swatches{justify-content:flex-start}
}
@media (max-width:720px){
  .body{padding:2px 14px 20px}
  .foot{padding:10px 14px 16px}
  .big{width:104px;height:104px;font-size:48px}
  .sheet .strip{grid-template-columns:repeat(5,42px)}
}
`;

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function hexToRgb(h) {
  const s = String(h || '').replace('#', '');
  if (s.length !== 6) return [140, 150, 165];
  return [0, 2, 4].map((i) => parseInt(s.substr(i, 2), 16));
}
function mix(a, b, p) {
  const pa = hexToRgb(a); const pb = hexToRgb(b);
  return '#' + pa.map((v, i) => Math.round(v * (1 - p) + pb[i] * p).toString(16).padStart(2, '0')).join('');
}

/* ---------- une teinte d'identité → sa déclinaison pastel ----------
 * La règle (même teinte, même saturation, luminosité 82 %) vit dans le tronc
 * commun : une seule implémentation pour l'écran Profils et la vue Tâches.
 * `CORE_URL` porte la version — l'incrémenter avec la ressource famille-core. */
const CORE_URL = '/skylight-static/famille-core.js?v=0.5.29';
let CORE = null;
let pastelOf;
const coreReady = import((typeof window !== 'undefined' && window.FAMILLE_CORE_URL) || CORE_URL)
  .then((m) => { CORE = m; pastelOf = m.pastelOf; return m; });

/* Repli pour un profil ancien enregistré sans teinte d'identité : on assombrit
   le pastel. Volontairement réservé à ce cas — ce n'est pas la règle normale. */
function accentOf(hex) { return mix(hex, '#101828', 0.42); }

/* couleur d'une fiche : m?mes r?gles que les colonnes de la vue T?ches */
function rowStyle(p) {
  const fill = p.color || '#DDE3EA';
  const acc = p.accent || '#7A8596';
  const col = mixHex('#ffffff', fill, 0.36);
  return '--rowcol:' + col + ';--rowaccent:' + acc + ';--rowhalo:' + rgba(acc, 0.34);
}

function mixHex(a, b, w) {
  const pa = [1, 3, 5].map((i) => parseInt(a.substr(i, 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.substr(i, 2), 16));
  const c = pa.map((v, i) => Math.round(v * w + pb[i] * (1 - w)));
  return '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');
}

function rgba(hex, a) {
  const c = [1, 3, 5].map((i) => parseInt(hex.substr(i, 2), 16));
  return 'rgba(' + c.join(',') + ',' + a + ')';
}

function parseProfile(item) {
  let m = {};
  try { m = JSON.parse(item.description || '{}') || {}; } catch (e) { m = {}; }
  return {
    uid: item.uid,
    name: item.summary || '',
    color: m.c || '#BBD5EF',
    accent: m.a || accentOf(m.c || '#BBD5EF'),
    face: m.p || '',
    stars: m.s === undefined ? true : !!m.s,
    id: m.i || (item.summary || '').toLowerCase().replace(/[^a-z0-9]+/g, '_'),
    routine: m.r || '',
    calendar: m.k || '',
    calendarOwned: m.kc === 'created',
    /* position d'affichage — `null` = jamais rangé, on retombe sur l'ordre de
       la liste (voir orderProfiles) */
    ord: Number.isFinite(Number(m.ord)) && m.ord !== '' && m.ord !== null ? Number(m.ord) : null,
  };
}

/* Ordre d'affichage des personnes. Il est porté par le champ `ord` de chaque
 * profil, et non par la position des items dans `todo.profils` : réordonner une
 * liste `todo` obligerait à supprimer puis recréer les items (donc à changer
 * leurs uid et à risquer une perte si un appel échoue en cours de route).
 * Un profil sans `ord` garde sa position dans la liste. */
function orderProfiles(list) {
  return list
    .map((p, i) => ({ p, i, o: p.ord === null ? i : p.ord }))
    .sort((a, b) => (a.o - b.o) || (a.i - b.i))
    .map((x) => x.p);
}

class SkylightProfilesCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._built = false;
    this._items = [];
    this._view = 'list';
    this._draft = null;
    this._sig = '';
  }

  setConfig(config) {
    this._cfg = config || {};
    this._entity = this._cfg.entity || 'todo.profils';
    this._built = false;
    this._view = 'list';
    this._draft = null;
    if (this.shadowRoot) this.shadowRoot.innerHTML = '';
  }

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
    if (!this._built) this._build();
    const st = hass.states[this._entity];
    const sig = st ? st.state + '|' + st.last_updated : '-';
    if (sig !== this._sig) { this._sig = sig; this._load(); }
  }

  getCardSize() { return 8; }

  connectedCallback() { this._fit(); this._onResize = () => this._fit(); window.addEventListener('resize', this._onResize); }
  disconnectedCallback() { if (this._onResize) window.removeEventListener('resize', this._onResize); }

  /* la carte ne doit pas dépasser l'écran (même correction que les autres cartes) */
  _fit() {
    try {
      const top = Math.max(this.getBoundingClientRect().top, 0);
      let h = Math.round(window.innerHeight - top - 8);
      const ph = this.parentElement ? Math.round(this.parentElement.clientHeight) : 0;
      if (ph > 200) h = Math.min(h, ph);
      if (h > 240) { this.style.height = h + 'px'; this.style.maxHeight = h + 'px'; }
    } catch (e) { /* ignore */ }
  }

  _notify() {
    /* les autres cartes de la page (Tâches, Calendrier) écoutent cet événement :
       une photo ou une couleur change sans modifier le nombre d'éléments, donc
       l'état de la liste ne bouge pas et elles ne verraient rien. */
    try { window.dispatchEvent(new CustomEvent('skylight-profiles-changed')); } catch (e) { /* ignore */ }
  }

  _load() {
    const h = this._hass;
    if (!h || !h.callWS) return;
    h.callWS({ type: 'todo/item/list', entity_id: this._entity })
      .then((r) => {
        const raw = (r && r.items) || [];
        const sig = raw.map((x) => x.uid + ':' + (x.summary || '') + ':' + (x.description || '')).join('|');
        if (this._sig !== undefined && sig !== this._sig) this._notify();
        this._sig = sig;
        /* description brute conservée : réordonner ne doit réécrire QUE `ord`,
           sans risquer de perdre une clé qu'on ne modélise pas */
        this._rawDesc = new Map(raw.map((x) => [x.uid, x.description || '']));
        this._items = orderProfiles(raw.map(parseProfile));
        /* une demande « ouvrir ce profil » ou « en créer un » venue de la vue Tâches */
        if (this._pendingNew) {
          this._pendingNew = false;
          this._pendingOpen = null;
          this._edit(null);
          return;
        }
        /* le profil a été modifié ailleurs : l'état enregistré fait foi */
        if (this._draftRestored && this._draft && this._draft.uid) {
          const fresh = this._items.find((x) => x.uid === this._draft.uid);
          this._draftRestored = false;
          if (fresh) {
            const d = this._draft;
            if (d.name !== fresh.name || d.face !== fresh.face || d.color !== fresh.color
              || d.accent !== fresh.accent
              || d.calendar !== fresh.calendar || d.stars !== fresh.stars) {
              this._draft = Object.assign({}, fresh);
              this._saveDraft();
              this._render();
              return;
            }
          }
        }
        if (this._pendingOpen) {
          const want = this._pendingOpen;
          this._pendingOpen = null;
          const hit = this._items.find((p) => p.id === want || p.uid === want);
          if (hit) { this._edit(hit); return; }
        }
        if (this._view === 'list') this._render();
      })
      .catch(() => { this._items = []; if (this._view === 'list') this._render(); });
  }

  /* le brouillon de la fiche survit à une sortie du dashboard : on le range
     dans localStorage à chaque frappe, et on le reprend au chargement. */
  _draftKey() { return 'skylight-profiles-card:draft'; }

  _saveDraft() {
    if (this._view !== 'edit' || !this._draft) return;
    try { localStorage.setItem(this._draftKey(), JSON.stringify(this._draft)); } catch (e) { /* ignore */ }
  }

  _clearDraft() {
    try { localStorage.removeItem(this._draftKey()); } catch (e) { /* ignore */ }
  }

  _readDraft() {
    try {
      const raw = localStorage.getItem(this._draftKey());
      if (!raw) return null;
      const d = JSON.parse(raw);
      return (d && (d.name || d.uid)) ? d : null;
    } catch (e) { return null; }
  }

  _build() {
    this.shadowRoot.innerHTML = `<style>${CORE.coreCss()}${CSS}</style>
<div class="page">
  ${CORE.headerHtml({ variant: 'title', title: 'Profils', back: { icon: ICON.back, label: 'Retour' } })}
  <div class="body" id="body"></div>
  <div class="foot" id="foot"></div>
</div>`;
    this._bodyEl = this.shadowRoot.getElementById('body');
    this._footEl = this.shadowRoot.getElementById('foot');
    this._titleEl = this.shadowRoot.getElementById('title');
    this.shadowRoot.getElementById('back').addEventListener('click', () => this._back());
    this._built = true;
    /* reprise d'une fiche interrompue : sortir du dashboard ne doit pas faire
       perdre un profil en cours de création */
    const dft = this._readDraft();
    if (dft) {
      this._draft = dft;
      this._view = 'edit';
      /* brouillon venu d'une session précédente : à revérifier à la première
         lecture, car la fiche a pu changer entre-temps (vue Tâches) */
      this._draftRestored = true;
    }
    /* demande venue de la vue Tâches : « ouvrir ce profil » ou « en créer un » */
    try {
      const want = localStorage.getItem('skylight-profiles-card:open');
      if (want) {
        localStorage.removeItem('skylight-profiles-card:open');
        this._pendingOpen = want;
      }
      if (localStorage.getItem('skylight-profiles-card:new')) {
        localStorage.removeItem('skylight-profiles-card:new');
        this._pendingNew = true;
      }
    } catch (e) { /* ignore */ }
    this._render();
  }

  _back() {
    if (this._view === 'edit') {
      this._view = 'list';
      this._draft = null;
      this._clearDraft();
      this._closeSheet();
      this._render();
      return;
    }
    if (history.length > 1) history.back();
    else this._go('/famille-home/calendrier');
  }

  _go(path) {
    /* V2 : les anciennes URL de dashboard deviennent des vues de l'application */
    const m = String(path || '').match(/^\/famille-home(?:\/([^/?#]+))?/);
    if (m) {
      window.dispatchEvent(new CustomEvent('skylight-navigate', { detail: { view: m[1] || 'calendrier' } }));
      return;
    }
    history.pushState(null, '', path);
    window.dispatchEvent(new CustomEvent('location-changed', { detail: { replace: true } }));
  }

  /* ---------- écran liste ---------- */
  _renderList() {
    this._titleEl.textContent = 'Profils';
    const rows = this._items.map((p) => `
      <button class="row" data-open="${esc(p.uid)}" style="${rowStyle(p)}">
        <span class="grip" data-grip="${esc(p.uid)}" title="Déplacer">${ICON.grip}</span>
        <span class="av">${this._faceHtml(p)}</span>
        <span class="nm">${esc(p.name)}</span>
        <span class="cv">${ICON.chevron}</span>
      </button>`).join('');
    this._bodyEl.innerHTML = `
      <p class="hint">Gérez les membres de la famille. <b>Glissez la poignée</b> pour changer leur ordre — il s’applique aux tâches, aux récompenses et au calendrier.</p>
      <div class="rows" id="rows">${rows}
        <button class="row add" id="add"><span class="av">${ICON.plus}</span><span class="nm">Ajouter un profil</span></button>
      </div>`;
    this._footEl.innerHTML = '';
    this._bodyEl.querySelectorAll('[data-open]').forEach((b) => {
      b.addEventListener('click', () => {
        if (this._justDragged) return;
        this._edit(this._items.find((p) => p.uid === b.dataset.open));
      });
    });
    this._bodyEl.querySelectorAll('[data-grip]').forEach((g) => {
      g.addEventListener('pointerdown', (ev) => this._startDrag(ev, g.closest('.row')));
    });
    const add = this._bodyEl.querySelector('#add');
    if (add) add.addEventListener('click', () => this._edit(null));
  }

  /* ---------- réordonner les personnes ----------
     Le geste ne déplace QUE le DOM (aucun rechargement pendant le doigt posé),
     sinon la ligne glissée serait remplacée et le geste perdrait son élément.
     Les autres lignes suivent en FLIP. On enregistre au lâcher. */

  _startDrag(ev, row) {
    if (!row || this._drag) return;
    const rowsEl = row.parentElement;
    const rows = Array.from(rowsEl.querySelectorAll('.row[data-open]'));
    const idx = rows.indexOf(row);
    if (idx < 0) return;
    ev.preventDefault();
    ev.stopPropagation();
    const r0 = row.getBoundingClientRect();
    const gap = parseFloat(getComputedStyle(rowsEl).rowGap) || 10;
    row.classList.add('lift');
    rowsEl.classList.add('reordering');
    this._drag = {
      row, rowsEl, rows, idx, h: r0.height, step: r0.height + gap,
      grab: ev.clientY - r0.top, ty: 0,
    };
    this._dragMove = (e) => this._onDragMove(e);
    this._dragEnd = () => {
      window.removeEventListener('pointermove', this._dragMove);
      window.removeEventListener('pointerup', this._dragEnd);
      window.removeEventListener('pointercancel', this._dragEnd);
      this._endDrag();
    };
    window.addEventListener('pointermove', this._dragMove);
    window.addEventListener('pointerup', this._dragEnd);
    window.addEventListener('pointercancel', this._dragEnd);
  }

  _onDragMove(ev) {
    const d = this._drag;
    if (!d) return;
    ev.preventDefault();
    /* baseTop = position de la ligne SANS son transform (elle change quand on
       la déplace dans le DOM) : le doigt reste ainsi collé à la ligne */
    const baseTop = d.row.getBoundingClientRect().top - d.ty;
    d.ty = (ev.clientY - d.grab) - baseTop;
    d.row.style.transform = `translateY(${d.ty}px) scale(1.02)`;
    const center = baseTop + d.ty + d.h / 2;
    const top0 = d.rowsEl.getBoundingClientRect().top;
    let to = Math.round((center - top0 - d.h / 2) / d.step);
    to = Math.max(0, Math.min(d.rows.length - 1, to));
    if (to !== d.idx) this._moveRow(d, to);
  }

  _moveRow(d, to) {
    const from = d.idx;
    if (from === to) return;
    const before = new Map(d.rows.map((r) => [r, r.getBoundingClientRect().top]));
    const el = d.rows[from];
    const ref = d.rows[to];
    if (to > from) ref.after(el); else ref.before(el);
    d.rows.forEach((r) => {
      if (r === el) return;
      const dy = before.get(r) - r.getBoundingClientRect().top;
      if (dy) {
        r.animate([{ transform: `translateY(${dy}px)` }, { transform: 'translateY(0)' }],
          { duration: 190, easing: 'cubic-bezier(.32,.72,0,1)' });
      }
    });
    d.idx = to;
  }

  _endDrag() {
    const d = this._drag;
    if (!d) return;
    this._drag = null;
    d.row.classList.remove('lift');
    d.row.style.transform = '';
    d.rowsEl.classList.remove('reordering');
    /* un clic peut suivre le relâchement : il ne doit pas ouvrir la fiche */
    this._justDragged = true;
    setTimeout(() => { this._justDragged = false; }, 260);
    const order = Array.from(d.rowsEl.querySelectorAll('.row[data-open]'))
      .map((r) => this._items.find((p) => p.uid === r.dataset.open))
      .filter(Boolean);
    if (order.length !== this._items.length) { this._renderList(); return; }
    this._items = order;
    this._renderList();
    this._saveOrder();
  }

  /* n'écrit que les profils dont la position change, et seulement la clé `ord`
     dans la description d'origine — rien d'autre n'est réécrit */
  _saveOrder() {
    const h = this._hass;
    if (!h) return;
    let n = 0;
    this._items.forEach((p, i) => {
      const ord = i + 1;
      if (p.ord === ord) return;
      p.ord = ord;
      let m = {};
      try {
        m = JSON.parse((this._rawDesc && this._rawDesc.get(p.uid)) || '{}') || {};
      } catch (e) { m = {}; }
      m.ord = ord;
      h.callService('todo', 'update_item',
        { item: p.uid, description: JSON.stringify(m) }, { entity_id: this._entity });
      n++;
    });
    if (n) this._toast('Ordre enregistré');
  }

  _faceHtml(p) {
    const f = p.face || '';
    if (f.startsWith(':')) return esc(f.slice(1));
    if (f) return `<img src="${esc(f)}" alt="">`;
    return ICON.person.replace('<svg', '<svg style="width:19px;height:19px;fill:#7C8494"');
  }

  /* ---------- écran fiche ---------- */
  _edit(profile) {
    this._closeSheet();
    this._view = 'edit';
    this._draft = profile ? Object.assign({}, profile) : {
      uid: null, name: '', color: pastelOf(DEFAULT_ACCENT), accent: DEFAULT_ACCENT,
      face: ':' + ANIMALS[0], stars: true, id: '', routine: '', calendar: '', calendarOwned: false,
    };
    this._render();
    setTimeout(() => { const i = this.shadowRoot.getElementById('f-name'); if (i && !profile) i.focus(); }, 80);
  }

  _renderEdit() {
    const d = this._draft;
    const isNew = !d.uid;
    this._titleEl.textContent = isNew ? 'Ajouter un profil' : 'Modifier le profil';
    /* chaque rendu de fiche enregistre le brouillon : couleur, avatar, étoiles,
       calendrier — tout est repris si on quitte le dashboard */
    this._saveDraft();

    /* c'est la teinte d'identité qui s'entoure, pas le pastel : la pastille
       sélectionnée est celle qu'on possède, le pastel n'est qu'une conséquence.
       Une teinte enregistrée hors palette (profil ancien) est réinjectée en
       tête pour rester visible et sélectionnable. */
    const same = (a, b) => String(a).toLowerCase() === String(b).toLowerCase();
    const palette = COLORS.slice();
    if (d.accent && !palette.some((c) => same(c, d.accent))) palette.unshift(d.accent);
    const sws = palette.map((c) => `<button class="sw" data-color="${c}" data-on="${same(d.accent, c) ? 1 : 0}" style="background:${c}" aria-label="${c}"></button>`).join('');

    /* avatar, puis couleurs, puis les champs : une seule colonne, tout visible.
       Les propositions d'avatar vivent dans une feuille, pas sur la page. */
    this._bodyEl.innerHTML = `
      <div class="form">
        <div class="avatarblock">
          <button class="big" id="pickav" style="background:${esc(d.accent)};box-shadow:0 0 0 3px ${rgba(d.accent, 0.34)},0 3px 12px ${rgba(d.accent, 0.2)}" aria-label="Changer l'avatar">
            <span class="face">${d.face && d.face.startsWith(':') ? esc(d.face.slice(1)) : (d.face ? `<img src="${esc(d.face)}" alt="">` : '')}</span>
            <span class="cam" aria-hidden="true">${ICON.camera}</span>
          </button>
          <button class="linkbtn" id="pickav2">Changer l'avatar</button>
        </div>
        <div class="colorline" id="colorline">
          <div class="swatches" id="swatches">${sws}</div>
          <span class="fade" aria-hidden="true">\u203A</span>
        </div>
        <div class="fields">
          <label class="field"><span class="ic">${ICON.person}</span>
            <input id="f-name" placeholder="Prénom" maxlength="24" value="${esc(d.name)}"></label>
          <div class="field"><span class="ic">${ICON.star}</span>
            <span style="flex:1 1 auto;font-size:15.5px">Étoiles et récompenses</span>
            <button class="tgl" id="f-stars" data-on="${d.stars ? 1 : 0}" aria-label="Étoiles"></button></div>
          <button class="field asbtn" id="f-cal"><span class="ic">${ICON.calendar}</span>
            <span style="flex:1 1 auto;font-size:15.5px;color:${d.calendar ? INK : '#8A8F9C'}">${d.calendar ? esc(this._calName(d.calendar)) : 'Aucun calendrier'}</span>
            <span class="cv">${ICON.chevron}</span></button>
        </div>
      </div>
      <input type="file" id="file" accept="image/*" style="display:none">`;

    /* bas de fiche : enregistrer, et la suppression qui ouvre une feuille dédiée
       (l'action est isolée, on ne la déclenche jamais depuis le bouton principal). */
    if (isNew) {
      this._footEl.innerHTML = `<button class="btn go" id="save" ${d.name.trim() ? '' : 'disabled'}>Créer le profil</button>
        <div class="legend">Vous pourrez modifier ces informations à tout moment.</div>`;
    } else {
      this._footEl.innerHTML = `<button class="btn go" id="save" ${d.name.trim() ? '' : 'disabled'}>Enregistrer</button>
        <button class="btn soft deltext" id="manage">Supprimer le profil…</button>`;
    }

    const root = this.shadowRoot;
    root.querySelectorAll('[data-color]').forEach((b) => {
      b.addEventListener('click', () => {
        const v = b.dataset.color;
        /* Garde-fou : si la teinte ne change pas, le pastel calibré à la main
           est conservé tel quel. Il n'est recalculé que sur un vrai changement
           de couleur — sinon « Enregistrer » sans rien toucher ferait dériver
           les quatre pastels de la famille. */
        if (!same(d.accent, v)) {
          d.accent = v;
          d.color = pastelOf(v);
        }
        this._saveDraft();
        this._render();
      });
    });
    const name = root.getElementById('f-name');
    name.addEventListener('input', () => {
      d.name = name.value;
      const s = root.getElementById('save');
      if (s) s.disabled = !d.name.trim();
      this._saveDraft();
    });
    root.getElementById('f-stars').addEventListener('click', (e) => {
      d.stars = !d.stars; e.currentTarget.dataset.on = d.stars ? 1 : 0;
      this._saveDraft();
    });
    /* l'avatar se choisit dans une feuille : rien ne prend la place des réglages */
    ['pickav', 'pickav2'].forEach((id) => {
      const b = root.getElementById(id);
      if (b) b.addEventListener('click', () => this._askAvatar());
    });
    const cal = root.getElementById('f-cal');
    if (cal) cal.addEventListener('click', () => this._askCalendar());
    root.getElementById('file').addEventListener('change', (e) => this._upload(e.target.files && e.target.files[0]));
    const save = root.getElementById('save');
    if (save) save.addEventListener('click', () => this._save());
    const manage = root.getElementById('manage');
    if (manage) manage.addEventListener('click', () => this._askDelete());
    this._syncColorFade();
  }

  /* signale qu'il reste des couleurs à droite (dégradé + chevron) */
  _syncColorFade() {
    const line = this.shadowRoot.getElementById('colorline');
    const sw = this.shadowRoot.getElementById('swatches');
    if (!line || !sw) return;
    const upd = () => {
      const rest = sw.scrollWidth - sw.clientWidth - sw.scrollLeft;
      line.classList.toggle('more', rest > 8);
    };
    sw.addEventListener('scroll', upd);
    upd();
    requestAnimationFrame(upd);
    setTimeout(upd, 120);
  }

  /* feuille « Changer l'avatar » : les 16 propositions + l'import d'une photo */
  _askAvatar() {
    const d = this._draft;
    if (!d) return;
    this._closeSheet();
    const photos = (this._cfg.avatars || []).map((src) => ({ key: src, src }))
      .concat(ANIMALS.map((a) => ({ key: ':' + a, src: a })));
    const cells = photos.map((o) => {
      const on = d.face === o.key;
      const inner = o.key.startsWith(':') ? esc(o.src) : `<img src="${esc(o.src)}" alt="">`;
      return `<button class="pick" data-face="${esc(o.key)}" data-on="${on ? 1 : 0}">${inner}</button>`;
    }).join('');
    const sheet = document.createElement('div');
    sheet.className = 'sheet';
    sheet.innerHTML = `<div class="scard" role="dialog" aria-modal="true" aria-labelledby="attl">
      <div class="shead">
        <div class="sttl" id="attl">Changer l'avatar</div>
        <button class="sx" id="s-x" aria-label="Fermer">${ICON.close}</button>
      </div>
      <p class="stxt">Une illustration, ou votre photo.</p>
      <div class="strip">${cells}</div>
      <button class="btn soft" id="a-photo">Importer une photo</button>
      <button class="btn go" id="a-done">Terminé</button>
    </div>`;
    this.shadowRoot.appendChild(sheet);
    sheet.addEventListener('click', (ev) => { if (ev.target === sheet) this._closeSheet(); });
    sheet.querySelector('#s-x').addEventListener('click', () => this._closeSheet());
    sheet.querySelectorAll('[data-face]').forEach((b) => {
      b.addEventListener('click', () => {
        d.face = b.dataset.face;
        this._render();
        sheet.querySelectorAll('[data-face]').forEach((x) => { x.dataset.on = x === b ? '1' : '0'; });
      });
    });
    sheet.querySelector('#a-photo').addEventListener('click', () => {
      this._closeSheet();
      const f = this.shadowRoot.getElementById('file');
      if (f) f.click();
    });
    sheet.querySelector('#a-done').addEventListener('click', () => this._closeSheet());
    this._esc = (ev) => { if (ev.key === 'Escape') this._closeSheet(); };
    document.addEventListener('keydown', this._esc);
  }

  /* image choisie par l'utilisateur : redimensionnée en 160 px webp, puis
     stockée dans la description du profil (aucun fichier à déposer) */
  _upload(file) {
    if (!file) return;
    const fr = new FileReader();
    fr.onload = () => {
      const img = new Image();
      img.onload = () => {
        const S = 160;
        const cv = document.createElement('canvas');
        cv.width = S; cv.height = S;
        const ctx = cv.getContext('2d');
        const r = Math.max(S / img.width, S / img.height);
        const w = img.width * r; const h = img.height * r;
        ctx.drawImage(img, (S - w) / 2, (S - h) / 2, w, h);
        this._draft.face = cv.toDataURL('image/webp', 0.82);
        this._render();
      };
      img.src = fr.result;
    };
    fr.readAsDataURL(file);
  }

  /* nom lisible d'une liste de routines (« Routines Mateo » plutôt que l'entité) */
  _routineName(id) {
    const st = this._hass && this._hass.states[id];
    const fn = st && st.attributes && st.attributes.friendly_name;
    return fn || id;
  }

  _calName(id) {
    const st = this._hass && this._hass.states[id];
    return (st && st.attributes && st.attributes.friendly_name) || id;
  }

  /* sources possibles d'un calendrier, pour l'afficher dans la liste */
  _loadPlatforms() {
    if (this._platforms) return Promise.resolve(this._platforms);
    const h = this._hass;
    if (!h || !h.callWS) return Promise.resolve({});
    return h.callWS({ type: 'config/entity_registry/list' }).then((list) => {
      const map = {};
      (Array.isArray(list) ? list : []).forEach((e) => { map[e.entity_id] = e.platform || ''; });
      this._platforms = map;
      return map;
    }).catch(() => ({}));
  }

  _providerOf(id) {
    const p = (this._platforms && this._platforms[id]) || '';
    if (p.indexOf('google') !== -1) return { icon: ICON.google, sub: 'Google Agenda' };
    if (p === 'caldav') return { icon: ICON.apple, sub: 'iCloud / CalDAV' };
    if (p === 'local_calendar') return { icon: ICON.calendar, sub: 'Dans l\u2019application' };
    return { icon: ICON.calendar, sub: p || 'Autre source' };
  }

  /* choisir le calendrier de la personne — avec une porte de sortie quand il
     n'est pas dans la liste (cas le plus fréquent chez un nouvel utilisateur) */
  _askCalendar() {
    const d = this._draft;
    if (!d) return;
    this._loadPlatforms().then(() => this._calendarSheet());
  }

  _calendarSheet() {
    const d = this._draft;
    if (!d) return;
    this._closeSheet();
    const h = this._hass;
    const list = Object.keys((h && h.states) || {})
      .filter((e) => e.indexOf('calendar.') === 0)
      .map((e) => ({ id: e, name: this._calName(e) }))
      .sort((a, b) => a.name.localeCompare(b.name));
    const rows = list.map((c) => {
      const pv = this._providerOf(c.id);
      return `<button class="calrow" data-cal="${esc(c.id)}" data-on="${d.calendar === c.id ? 1 : 0}">
        <span class="cb">${pv.icon}</span>
        <span class="cn">${esc(c.name)}<span class="csub">${esc(pv.sub)}</span></span>
      </button>`;
    }).join('');
    const sheet = document.createElement('div');
    sheet.className = 'sheet';
    sheet.innerHTML = `<div class="scard" role="dialog" aria-modal="true" aria-labelledby="cttl">
      <div class="shead">
        <div class="sttl" id="cttl">Calendrier</div>
        <button class="sx" id="c-x" aria-label="Fermer">${ICON.close}</button>
      </div>
      <p class="stxt">Sélectionnez le calendrier de cette personne.</p>
      <div style="display:flex;flex-direction:column;gap:8px;max-height:44vh;overflow-y:auto">
        <button class="calrow" data-cal="" data-on="${d.calendar ? 0 : 1}">
          <span class="cb">${ICON.close}</span><span class="cn">Aucun calendrier</span></button>
        ${rows}
      </div>
      <button class="btn soft" id="c-help" style="font-size:14px">Je ne trouve pas mon calendrier</button>
      <button class="btn go" id="c-done">Terminé</button>
    </div>`;
    this.shadowRoot.appendChild(sheet);
    const close = () => this._closeSheet();
    sheet.addEventListener('click', (ev) => { if (ev.target === sheet) close(); });
    sheet.querySelector('#c-x').addEventListener('click', close);
    sheet.querySelector('#c-done').addEventListener('click', close);
    sheet.querySelector('#c-help').addEventListener('click', () => this._calendarHelp());
    sheet.querySelectorAll('[data-cal]').forEach((b) => {
      b.addEventListener('click', () => {
        d.calendar = b.dataset.cal || '';
        d.calendarOwned = false;
        close();
        this._render();
      });
    });
    this._esc = (ev) => { if (ev.key === 'Escape') close(); };
    document.addEventListener('keydown', this._esc);
  }

  /* « je ne trouve pas » : deux chemins, une seule question */
  _calendarHelp() {
    this._closeSheet();
    const sheet = document.createElement('div');
    sheet.className = 'sheet';
    sheet.innerHTML = `<div class="scard" role="dialog" aria-modal="true" aria-labelledby="htl">
      <div class="shead">
        <div class="sttl" id="htl">Ajouter un calendrier</div>
        <button class="sx" id="h-x" aria-label="Fermer">${ICON.close}</button>
      </div>
      <p class="stxt">D'où vient le calendrier de cette personne&nbsp;?</p>
      <button class="calrow" id="h-phone">
        <span class="cb">${ICON.apple}</span>
        <span class="cn">De son téléphone ou de sa boîte mail<span class="csub">Google Agenda, iCloud, Outlook…</span></span>
      </button>
      <button class="calrow" id="h-local">
        <span class="cb">${ICON.plus2}</span>
        <span class="cn">Créer un calendrier ici<span class="csub">Il reste dans l'application</span></span>
      </button>
      <button class="btn soft" id="h-back">Retour</button>
    </div>`;
    this.shadowRoot.appendChild(sheet);
    const close = () => this._closeSheet();
    sheet.addEventListener('click', (ev) => { if (ev.target === sheet) close(); });
    sheet.querySelector('#h-x').addEventListener('click', close);
    sheet.querySelector('#h-back').addEventListener('click', () => this._calendarSheet());
    sheet.querySelector('#h-phone').addEventListener('click', () => this._calendarPhoneHelp());
    sheet.querySelector('#h-local').addEventListener('click', () => this._createCalendar());
    this._esc = (ev) => { if (ev.key === 'Escape') close(); };
    document.addEventListener('keydown', this._esc);
  }

  /* le calendrier existe déjà chez Google/Apple : c'est l'admin de HA qui branche */
  _calendarPhoneHelp() {
    this._closeSheet();
    const sheet = document.createElement('div');
    sheet.className = 'sheet';
    sheet.innerHTML = `<div class="scard" role="dialog" aria-modal="true" aria-labelledby="ptl">
      <div class="shead">
        <div class="sttl" id="ptl">Calendrier du téléphone</div>
        <button class="sx" id="p-x" aria-label="Fermer">${ICON.close}</button>
      </div>
      <p class="stxt">Ce calendrier doit d'abord être ajouté à Home Assistant. C'est la personne qui administre votre Home Assistant qui peut le faire.</p>
      <div class="sblock"><div class="slabel">Ce qu'il faut lui demander</div>
        <ul class="slist">
          <li>Ajouter l'intégration « Google Agenda » ou « CalDAV » (iPhone)</li>
          <li>Choisir le calendrier de cette personne</li>
          <li>Revenir ici une fois que c'est fait</li>
        </ul>
      </div>
      <p class="sfine">Chemin dans Home Assistant : Réglages → Appareils et services → Ajouter une intégration.</p>
      <button class="btn go" id="p-done">Compris</button>
    </div>`;
    this.shadowRoot.appendChild(sheet);
    const close = () => this._closeSheet();
    sheet.addEventListener('click', (ev) => { if (ev.target === sheet) close(); });
    sheet.querySelector('#p-x').addEventListener('click', close);
    sheet.querySelector('#p-done').addEventListener('click', close);
    this._esc = (ev) => { if (ev.key === 'Escape') close(); };
    document.addEventListener('keydown', this._esc);
  }

  /* crée un calendrier local : on demande son nom ici, dans la feuille —
     plus de renvoi vers un champ situé derrière, qui ne veut rien dire */
  _createCalendar() {
    const d = this._draft;
    if (!d) return;
    this._closeSheet();
    const pre = (d.name || '').trim();
    const sheet = document.createElement('div');
    sheet.className = 'sheet';
    sheet.innerHTML = `<div class="scard" role="dialog" aria-modal="true" aria-labelledby="ntl">
      <div class="shead">
        <div class="sttl" id="ntl">Créer un calendrier</div>
        <button class="sx" id="n-x" aria-label="Fermer">${ICON.close}</button>
      </div>
      <p class="stxt">Ses rendez-vous s'afficheront directement dans l'application. Le profil sera enregistré avec son calendrier.</p>
      <label class="field"><span class="ic">${ICON.calendar}</span>
        <input id="n-name" placeholder="Nom du calendrier" maxlength="40" value="${esc(pre)}"></label>
      <button class="btn go" id="n-go" ${pre ? '' : 'disabled'}>Créer le calendrier</button>
      <button class="btn soft" id="n-back">Retour</button>
    </div>`;
    this.shadowRoot.appendChild(sheet);
    const close = () => this._closeSheet();
    const input = sheet.querySelector('#n-name');
    const go = sheet.querySelector('#n-go');
    sheet.addEventListener('click', (ev) => { if (ev.target === sheet) close(); });
    sheet.querySelector('#n-x').addEventListener('click', close);
    sheet.querySelector('#n-back').addEventListener('click', () => this._calendarHelp());
    input.addEventListener('input', () => { go.disabled = !input.value.trim(); });
    go.addEventListener('click', () => {
      const name = (input.value || '').trim();
      if (name) this._doCreateCalendar(name);
    });
    this._esc = (ev) => { if (ev.key === 'Escape') close(); };
    document.addEventListener('keydown', this._esc);
    setTimeout(() => { input.focus(); input.select(); }, 60);
  }

  /* enregistre la fiche en cours (création ou mise à jour). Sert notamment à
     créer le profil AVANT son calendrier : sinon un calendrier peut rester
     orphelin si l'utilisateur quitte l'écran sans valider. */
  _commitDraft() {
    const d = this._draft;
    const name = (d.name || '').trim();
    if (!name) return Promise.resolve(false);
    const h = this._hass;
    const isNew = !d.uid;
    /* un nouveau profil arrive en fin de liste */
    if (isNew) d.ord = this._items.length + 1;
    h.callService('todo', isNew ? 'add_item' : 'update_item',
      isNew
        ? { item: name, description: this._desc(d) }
        : { item: d.uid, rename: name, description: this._desc(d) },
      { entity_id: this._entity });
    if (!isNew) return Promise.resolve(true);
    return this._createRoutineList(name).then((listId) => {
      if (!listId) return true;
      d.routine = listId;
      return this._attachRoutine(name, listId).then(() => true);
    });
  }

  /* création effective, puis enregistrement du profil avec son calendrier */
  _doCreateCalendar(name) {
    const d = this._draft;
    const h = this._hass;
    if (!d || !h || !h.callApi) return;
    this._toast('Création du calendrier…');
    h.callApi('POST', 'config/config_entries/flow', { handler: 'local_calendar' })
      .then((flow) => h.callApi('POST', 'config/config_entries/flow/' + flow.flow_id, { calendar_name: name }))
      .then((res) => {
        const entryId = res && res.result && res.result.entry_id;
        if (!entryId) throw new Error('no entry');
        return h.callWS({ type: 'config/entity_registry/list' }).then((list) => {
          const hit = (Array.isArray(list) ? list : [])
            .find((e) => e.config_entry_id === entryId && String(e.entity_id).indexOf('calendar.') === 0);
          return hit ? hit.entity_id : '';
        });
      })
      .then((entityId) => {
        if (!entityId) throw new Error('no entity');
        d.calendar = entityId;
        d.calendarOwned = true;
        /* pas encore de prénom : le nom du calendrier fait foi, sinon le profil
           serait créé sans nom et le calendrier resterait sans propriétaire */
        if (!(d.name || '').trim()) d.name = name;
        return this._commitDraft().then(() => {
          this._platforms = null;
          this._closeSheet();
          this._clearDraft();
          this._view = 'list';
          this._draft = null;
          this._render();
          this._toast('Profil «&nbsp;' + esc(d.name) + '&nbsp;» créé avec son calendrier.');
          setTimeout(() => this._load(), 1000);
        });
      })
      .catch(() => this._toast('Le calendrier n\u2019a pas pu être créé.'));
  }

  _desc(d) {
    const m = {
      c: d.color, a: d.accent, p: d.face, s: !!d.stars,
      i: d.id || d.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_'),
      r: d.routine || '', k: d.calendar || '',
      kc: d.calendarOwned ? 'created' : '',
    };
    /* `ord` est écrit seulement s'il est connu : un profil jamais rangé garde
       sa position dans la liste, et un simple « Enregistrer » ne le renumérote pas */
    if (Number.isFinite(d.ord)) m.ord = d.ord;
    return JSON.stringify(m);
  }

  _save() {
    const d = this._draft;
    const name = (d.name || '').trim();
    if (!name) return;
    const h = this._hass;
    if (!h) return;
    const isNew = !d.uid;
    /* un nouveau profil arrive en fin de liste */
    if (isNew) d.ord = this._items.length + 1;
    h.callService('todo', isNew ? 'add_item' : 'update_item',
      isNew
        ? { item: name, description: this._desc(d) }
        : { item: d.uid, rename: name, description: this._desc(d) },
      { entity_id: this._entity });
    this._clearDraft();
    this._view = 'list';
    this._draft = null;
    this._render();
    if (isNew) {
      /* un nouveau profil reçoit sa propre liste de routines : sans elle il ne
         pourrait pas avoir de routines dans la vue Tâches */
      this._createRoutineList(name).then((listId) => {
        if (listId) this._attachRoutine(name, listId);
      });
      setTimeout(() => this._load(), 1800);
    } else {
      setTimeout(() => this._load(), 700);
    }
  }

  /* crée une liste `local_todo` pour le profil et renvoie son entity_id */
  _createRoutineList(name) {
    const h = this._hass;
    if (!h || !h.callWS) return Promise.resolve('');
    /* V2 : la liste de routines est un objet de l'application, pas une entrée
       de configuration Home Assistant. */
    return h.callWS({ type: 'skylight_hub_family/listcreate', name })
      .then((r) => (r && r.entity_id) || '')
      .catch(() => '');
  }

  /* rattache la liste au profil : on retrouve l'item par son titre */
  _attachRoutine(name, listId) {
    const h = this._hass;
    return h.callWS({ type: 'todo/item/list', entity_id: this._entity })
      .then((r) => {
        const it = ((r && r.items) || []).find((x) => (x.summary || '') === name);
        if (!it) return null;
        let m = {};
        try { m = JSON.parse(it.description || '{}'); } catch (e) { m = {}; }
        m.r = listId;
        return h.callService('todo', 'update_item', { item: it.uid, description: JSON.stringify(m) }, { entity_id: this._entity });
      })
      .catch(() => null);
  }

  /* ---- feuille de confirmation de suppression ----
     L'action est isolée dans une feuille, et elle annonce exactement ce qui part :
     le profil, ses routines et ses tâches. Rien ne reste orphelin derrière. */
  _askDelete() {
    const d = this._draft;
    if (!d || !d.uid) return;
    const h = this._hass;
    const chores = this._cfg.chores_entity || 'todo.taches_famille';
    const nb = (ent, filter) => h.callWS({ type: 'todo/item/list', entity_id: ent })
      .then((r) => ((r && r.items) || []).filter(filter).length)
      .catch(() => 0);
    const isMine = (it) => {
      let m = {};
      try { m = JSON.parse(it.description || '{}'); } catch (e) { m = {}; }
      return !!m && m.o === d.id;
    };
    Promise.all([
      d.routine ? nb(d.routine, () => true) : Promise.resolve(0),
      nb(chores, isMine),
    ]).then(([nr, nc]) => this._deleteSheet(d, nr, nc)).catch(() => this._deleteSheet(d, 0, 0));
  }

  _deleteSheet(d, nr, nc) {
    this._closeSheet();
    const rout = d.routine || '';
    const shared = !!rout && this._items.some((p) => p.uid !== d.uid && p.routine === rout);
    const parts = [];
    if (nr) parts.push(nr + (nr > 1 ? ' routines' : ' routine'));
    if (nc) parts.push(nc + (nc > 1 ? ' tâches' : ' tâche'));
    /* deux listes courtes seulement s'il y a vraiment quelque chose à lister :
       pour un profil vide, une phrase suffit (pas de blabla administratif) */
    const gone = ['Le profil'];
    if (nr) gone.push(nr + (nr > 1 ? ' routines' : ' routine') + (rout && !shared ? ' et leur liste' : ''));
    if (nc) gone.push(nc + (nc > 1 ? ' tâches' : ' tâche'));
    const keep = [];
    if (d.calendar && !d.calendarOwned) keep.push('Son calendrier dans Home Assistant');
    if (rout && shared) keep.push('Sa liste de routines (partagée)');
    if (d.calendar && d.calendarOwned) gone.push('Le calendrier «&nbsp;' + esc(this._calName(d.calendar)) + '&nbsp;»');
    const ul = (arr) => `<ul class="slist">${arr.map((x) => `<li>${x}</li>`).join('')}</ul>`;
    const showGone = nr || nc || (d.calendar && d.calendarOwned);
    const blocks = (showGone ? `<div class="sblock"><div class="slabel">Ce qui disparaît</div>${ul(gone)}</div>` : '')
      + (keep.length ? `<div class="sblock"><div class="slabel">Ce qui reste</div>${ul(keep)}</div>` : '');
    /* le calendrier venu de Google/Apple n'est pas à nous : on explique où le retirer */
    const fine = (d.calendar && !d.calendarOwned)
      ? `<p class="sfine">Ce calendrier n'appartient pas à l'application : pour le supprimer aussi, passez par Réglages → Appareils et services.</p>`
      : '';
    const sheet = document.createElement('div');
    sheet.className = 'sheet';
    sheet.innerHTML = `<div class="scard" role="dialog" aria-modal="true" aria-labelledby="sttl">
      <div class="shead">
        <div class="sttl" id="sttl">Supprimer le profil</div>
        <button class="sx" id="s-x" aria-label="Fermer">${ICON.close}</button>
      </div>
      <p class="lead">«&nbsp;${esc(d.name)}&nbsp;» va être supprimé définitivement.${(showGone || keep.length) ? '' : ' Rien d\'autre n\'est touché.'}</p>
      ${blocks}
      ${fine}
      <button class="btn del" id="s-del">Supprimer le profil et son contenu</button>
      <button class="btn soft" id="s-cancel">Annuler</button>
    </div>`;
    this.shadowRoot.appendChild(sheet);
    const close = () => this._closeSheet();
    sheet.addEventListener('click', (ev) => { if (ev.target === sheet) close(); });
    sheet.querySelector('#s-x').addEventListener('click', close);
    sheet.querySelector('#s-cancel').addEventListener('click', close);
    sheet.querySelector('#s-del').addEventListener('click', () => { this._closeSheet(); this._remove(); });
    this._esc = (ev) => { if (ev.key === 'Escape') { close(); } };
    document.addEventListener('keydown', this._esc);
    setTimeout(() => { const c = this.shadowRoot.querySelector('#s-cancel'); if (c) c.focus(); }, 40);
  }

  _closeSheet() {
    if (this._esc) { document.removeEventListener('keydown', this._esc); this._esc = null; }
    const s = this.shadowRoot && this.shadowRoot.querySelector('.sheet');
    if (s) s.remove();
  }

  /* supprime le profil PUIS son contenu : ses routines, ses tâches familiales,
     et la liste de routines elle-même (sauf si un autre profil la partage).
     Vérifié dans le core de HA : DELETE /api/config/config_entries/entry/{id}
     retire vraiment l'entrée d'intégration, donc la liste et son entité. */
  _remove() {
    const d = this._draft;
    if (!d || !d.uid) return;
    const h = this._hass;
    const chores = this._cfg.chores_entity || 'todo.taches_famille';
    const rout = d.routine || '';
    const shared = !!rout && this._items.some((p) => p.uid !== d.uid && p.routine === rout);
    const isMine = (it) => {
      let m = {};
      try { m = JSON.parse(it.description || '{}'); } catch (e) { m = {}; }
      return !!m && m.o === d.id;
    };
    const purge = (ent, filter) => h.callWS({ type: 'todo/item/list', entity_id: ent })
      .then((r) => Promise.all(((r && r.items) || []).filter(filter)
        .map((it) => h.callService('todo', 'remove_item', { item: it.uid }, { entity_id: ent }))))
      .catch(() => {});
    const jobs = [purge(chores, isMine)];
    if (rout) jobs.push(purge(rout, () => true));
    Promise.all(jobs)
      .then(() => (rout && !shared ? this._dropEntry(rout) : null))
      /* un calendrier créé par l'application part avec le profil ; un calendrier
         venu de Google/Apple est seulement détaché, jamais supprimé */
      .then(() => (d.calendar && d.calendarOwned ? this._dropEntry(d.calendar) : null))
      .then(() => {
        h.callService('todo', 'remove_item', { item: d.uid }, { entity_id: this._entity });
        this._clearDraft();
        this._view = 'list';
        this._draft = null;
        this._render();
        this._toast(this._deletedToast(d));
        setTimeout(() => this._load(), 900);
      })
      .catch(() => { /* la liste est vidée au minimum ; le profil part quand même */ });
  }

  /* message de retour : carte claire, dans la DA, avec la marche à suivre calendrier */
  _deletedToast(d) {
    const cal = d.calendar
      ? (d.calendarOwned
        ? `<span class="hint">Son calendrier a été supprimé avec le profil.</span>`
        : `<span class="hint">Son calendrier n'apparaît plus ici. Pour le supprimer aussi de Home Assistant, passez par Réglages → Appareils et services.</span>`)
      : '';
    return `<span class="tic">${ICON.check}</span><span class="tt">Profil «&nbsp;${esc(d.name)}&nbsp;» supprimé.<span class="hint">Ses routines et ses tâches ont été supprimées.</span>${cal}</span>`;
  }

  _toast(html) {
    const root = this.shadowRoot;
    const old = root.querySelector('.toast');
    if (old) old.remove();
    const t = document.createElement('div');
    t.className = 'toast';
    t.innerHTML = html;
    root.appendChild(t);
    requestAnimationFrame(() => t.classList.add('on'));
    setTimeout(() => {
      t.classList.remove('on');
      setTimeout(() => t.remove(), 260);
    }, 7000);
  }

  /* retire l'entrée d'intégration qui porte une liste (entity -> config entry) */
  _dropEntry(entityId) {
    const h = this._hass;
    if (!h || !h.callApi) return Promise.resolve(null);
    return h.callWS({ type: 'config/entity_registry/get', entity_id: entityId })
      .then((e) => {
        const id = e && (e.config_entry_id || (e.entity_entry && e.entity_entry.config_entry_id));
        if (!id) return null;
        return h.callApi('DELETE', 'config/config_entries/entry/' + id);
      })
      .catch(() => null);
  }

  _render() {
    if (!this._built) return;
    const back = this.shadowRoot.getElementById('back');
    if (back) back.hidden = this._view !== 'edit';
    if (this._view === 'edit' && this._draft) this._renderEdit();
    else this._renderList();
  }
}

if (!customElements.get('skylight-profiles-card')) {
  customElements.define('skylight-profiles-card', SkylightProfilesCard);
}
window.customCards = window.customCards || [];
window.customCards.push({
  type: 'skylight-profiles-card',
  name: 'Skylight Profils',
  description: 'Gestion des profils de la famille (liste todo.profils)',
});
