/* skylight-meals-v2 — planning repas façon Skylight Calendar 2
 * type: custom:skylight-meals-v2
 * days · library (todo.*) · report_entity · time_entity · weather_entity · css · hold_ms
 *
 * Lignes et couleurs sont ÉDITABLES depuis la tablette :
 *   input_text.repas_lignes   -> "Midi=1,Goûter=0,Soir=1"   (1 = affichée)
 *   input_text.repas_couleurs -> "#F7C0D8,#FBD3A8,…"        (une par jour)
 * Les plats restent dans input_text.repas_<jour>, en segments "a|b|c"
 * indexés sur la position de la ligne (masquer ne supprime rien).
 */
const DEFAULT_PALETTE = ["#EA95B1","#E79F51","#E5D68F","#4DCE9C","#9AD7E0","#5582CC","#9E79E1"];
const SWATCHES = [
  "#2775A8", "#E76D5B", "#BD8241", "#E9D2A5", "#B2CECA",
  "#F33A2B", "#ED7741", "#E79F51", "#E5D68F", "#17655F",
  "#19A26C", "#4DCE9C", "#9AD7E0", "#ABC0CF", "#5582CC",
  "#9E79E1", "#C57CD6", "#EA95B1", "#CDCCCC"
];
const ROWS_ENTITY = "input_text.repas_lignes";
const COLORS_ENTITY = "input_text.repas_couleurs";
const REPORT = "input_text.repas_reporte";

const SANS = "var(--skylight-sans, Figtree, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif)";
const SERIF = "var(--skylight-serif, Literata, 'Iowan Old Style', Georgia, serif)";
const INK = "#1F2328";
const HDR = "#000000e0";
const MUTED = "#8A8F9C";
const TODAY = "#F66951";

const WMO = {
  "sunny": "\u2600\uFE0F", "clear-night": "\uD83C\uDF19", "partlycloudy": "\u26C5",
  "cloudy": "\u2601\uFE0F", "rainy": "\uD83C\uDF26\uFE0F", "pouring": "\uD83C\uDF27\uFE0F",
  "snowy": "\u2744\uFE0F", "snowy-rainy": "\uD83C\uDF28\uFE0F", "hail": "\uD83C\uDF28\uFE0F",
  "lightning": "\uD83C\uDF29\uFE0F", "lightning-rainy": "\u26C8\uFE0F", "windy": "\uD83C\uDF2C\uFE0F",
  "windy-variant": "\uD83C\uDF2C\uFE0F", "fog": "\uD83C\uDF2B\uFE0F", "exceptional": "\u26A0\uFE0F"
};
const FOOD = [
  ["poivron", "\uD83E\uDED1"], ["paprika", "\uD83E\uDED1"], ["aubergine", "\uD83C\uDF46"],
  ["courgette", "\uD83E\uDD52"], ["carotte", "\uD83E\uDD55"], ["tomate", "\uD83C\uDF45"],
  ["avocat", "\uD83E\uDD51"], ["champignon", "\uD83C\uDF44"], ["\u00E9pinard", "\uD83E\uDD6C"],
  ["brocoli", "\uD83E\uDD66"], ["haricot vert", "\uD83E\uDEDB"], ["petit pois", "\uD83E\uDEDB"],
  ["potiron", "\uD83C\uDF83"], ["citrouille", "\uD83C\uDF83"], ["legume", "\uD83E\uDD66"],
  ["lardon", "\uD83E\uDD53"], ["bacon", "\uD83E\uDD53"], ["jambon", "\uD83E\uDD53"], ["charcuterie", "\uD83E\uDD53"],
  ["saucisse", "\uD83C\uDF2D"], ["merguez", "\uD83C\uDF2D"], ["hot dog", "\uD83C\uDF2D"],
  ["steak", "\uD83E\uDD69"], ["boeuf", "\uD83E\uDD69"], ["escalope", "\uD83E\uDD69"],
  ["agneau", "\uD83E\uDD69"], ["porc", "\uD83E\uDD69"], ["canard", "\uD83E\uDD69"], ["dinde", "\uD83C\uDF57"],
  ["poulet", "\uD83C\uDF57"], ["roti", "\uD83C\uDF57"], ["boulette", "\uD83E\uDD69"],
  ["chevre", "\uD83E\uDDC0"], ["fromage", "\uD83E\uDDC0"], ["raclette", "\uD83E\uDDC0"],
  ["fondue", "\uD83E\uDDC0"], ["mozzarella", "\uD83E\uDDC0"], ["parmesan", "\uD83E\uDDC0"],
  ["poisson", "\uD83D\uDC1F"], ["saumon", "\uD83D\uDC1F"], ["thon", "\uD83D\uDC1F"],
  ["cabillaud", "\uD83D\uDC1F"], ["colin", "\uD83D\uDC1F"], ["crevette", "\uD83E\uDD90"],
  ["moule", "\uD83E\uDDAA"], ["sushi", "\uD83C\uDF63"],
  ["pates", "\uD83C\uDF5D"], ["spaghetti", "\uD83C\uDF5D"], ["lasagne", "\uD83C\uDF5D"],
  ["ravioli", "\uD83E\uDD5F"], ["gnocchi", "\uD83E\uDD5F"], ["nouille", "\uD83C\uDF5C"],
  ["ramen", "\uD83C\uDF5C"], ["riz", "\uD83C\uDF5A"], ["risotto", "\uD83C\uDF5A"], ["paella", "\uD83E\uDD58"],
  ["couscous", "\uD83C\uDF72"], ["tajine", "\uD83C\uDF72"], ["curry", "\uD83C\uDF5B"],
  ["gratin", "\uD83E\uDD58"], ["poelee", "\uD83E\uDD58"], ["wok", "\uD83E\uDD58"],
  ["quiche", "\uD83E\uDD67"], ["tarte", "\uD83E\uDD67"], ["tourte", "\uD83E\uDD67"],
  ["pizza", "\uD83C\uDF55"], ["burger", "\uD83C\uDF54"], ["frite", "\uD83C\uDF5F"],
  ["tacos", "\uD83C\uDF2E"], ["kebab", "\uD83E\uDD59"], ["wrap", "\uD83C\uDF2F"],
  ["croque", "\uD83E\uDD6A"], ["sandwich", "\uD83E\uDD6A"], ["toast", "\uD83C\uDF5E"],
  ["salade", "\uD83E\uDD57"], ["taboule", "\uD83E\uDD57"], ["crudite", "\uD83E\uDD57"],
  ["soupe", "\uD83C\uDF72"], ["potage", "\uD83C\uDF72"], ["veloute", "\uD83C\uDF72"], ["bouillon", "\uD83C\uDF72"],
  ["omelette", "\uD83C\uDF73"], ["oeuf", "\uD83E\uDD5A"],
  ["pain perdu", "\uD83C\uDF5E"], ["pain", "\uD83E\uDD56"], ["baguette", "\uD83E\uDD56"],
  ["brioche", "\uD83C\uDF5E"], ["croissant", "\uD83E\uDD50"], ["crepe", "\uD83E\uDD5E"],
  ["galette", "\uD83E\uDD5E"], ["gaufre", "\uD83E\uDDC7"], ["brunch", "\uD83C\uDF73"],
  ["puree", "\uD83E\uDD54"], ["pomme de terre", "\uD83E\uDD54"],
  ["dessert", "\uD83C\uDF70"], ["gateau", "\uD83C\uDF70"], ["cake", "\uD83C\uDF70"],
  ["glace", "\uD83C\uDF66"], ["chocolat", "\uD83C\uDF6B"], ["cookie", "\uD83C\uDF6A"],
  ["biscuit", "\uD83C\uDF6A"], ["yaourt", "\uD83E\uDD5B"], ["compote", "\uD83C\uDF4E"],
  ["fruit", "\uD83C\uDF4E"], ["pomme", "\uD83C\uDF4E"], ["banane", "\uD83C\uDF4C"],
  ["fraise", "\uD83C\uDF53"], ["framboise", "\uD83C\uDF53"], ["orange", "\uD83C\uDF4A"],
  ["citron", "\uD83C\uDF4B"], ["raisin", "\uD83C\uDF47"], ["poire", "\uD83C\uDF50"],
  ["peche", "\uD83C\uDF51"], ["melon", "\uD83C\uDF48"], ["kiwi", "\uD83E\uDD5D"],
  ["restes", "\uD83C\uDF7D\uFE0F"], ["restaurant", "\uD83C\uDF7D\uFE0F"],
  ["halloween", "\uD83C\uDF83"], ["noel", "\uD83C\uDF84"], ["reveillon", "\uD83C\uDF84"],
  ["anniversaire", "\uD83C\uDF82"], ["barbecue", "\uD83C\uDF56"], ["grillade", "\uD83C\uDF56"],
  ["pique nique", "\uD83E\uDDFA"], ["chili", "\uD83C\uDF36"], ["pad thai", "\uD83C\uDF5C"],
  ["thai", "\uD83C\uDF5C"], ["poke", "\uD83C\uDF71"], ["fish and chips", "\uD83C\uDF5F"],
  ["tartiflette", "\uD83E\uDD54"], ["raclette au reblochon", "\uD83E\uDDC0"]
];
const EMOJI_PICKER = [
  "\uD83C\uDF5D", "\uD83C\uDF55", "\uD83C\uDF2E", "\uD83C\uDF5A", "\uD83C\uDF72", "\uD83E\uDD57",
  "\uD83C\uDF57", "\uD83E\uDD69", "\uD83D\uDC1F", "\uD83E\uDDC0", "\uD83E\uDD6A", "\uD83C\uDF54",
  "\uD83C\uDF73", "\uD83E\uDD5A", "\uD83E\uDD66", "\uD83C\uDF4E", "\uD83C\uDF70", "\uD83C\uDF7D\uFE0F"
];

/* ---------- tronc commun ----------
 * En-tête, jetons et calculs dans famille-core.js. `CORE_URL` porte la version :
 * l'incrémenter en même temps que la ressource `famille-core`. */
const CORE_URL = '/skylight-static/famille-core.js?v=0.5.30';
let CORE = null;
const coreReady = import((typeof window !== 'undefined' && window.FAMILLE_CORE_URL) || CORE_URL)
  .then((m) => { CORE = m; return m; });

const STYLE = `
:host{display:block;height:100%}
*{box-sizing:border-box}
.page{height:100%;display:flex;flex-direction:column;gap:14px;padding:calc(20px + env(safe-area-inset-top,0px)) calc(24px + env(safe-area-inset-right,0px)) calc(20px + env(safe-area-inset-bottom,0px)) calc(24px + env(safe-area-inset-left,0px));background:#FFFFFF;color:${INK};color-scheme:light;font-family:${SANS};-webkit-font-smoothing:antialiased}
.hdr{flex:0 0 auto;display:flex;align-items:center;justify-content:space-between;gap:16px}
.hdr-l{display:flex;align-items:baseline;gap:18px;min-width:0}
.hdr-r{display:flex;align-items:center;gap:8px;flex:0 0 auto}
.rep{display:flex;align-items:center;gap:7px;max-width:26vw;border-radius:999px;background:#FFF3E2;color:#5C451A;font-size:13px;font-weight:500;padding:8px 14px;flex:0 0 auto}
.rep[hidden]{display:none}
.rep .t{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.clear{border:0;border-radius:999px;background:transparent;color:var(--f-danger,#FF3B30);font:inherit;font-size:13px;font-weight:600;padding:8px 13px;cursor:pointer;display:inline-flex;align-items:center;gap:6px}
.clear svg{width:17px;height:17px;display:block;fill:currentColor}
.clear.arm{background:var(--f-danger,#FF3B30);color:#fff}
.clear[hidden]{display:none}
.gear{border:0;border-radius:50%;background:#F4F5F7;color:#3A4050;width:34px;height:34px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto}
.gear:hover{background:#E9EBEF}
.gear svg{width:17px;height:17px;display:block;fill:currentColor}
.grid{flex:1 1 auto;min-height:0;display:grid;grid-template-columns:30px 1fr;column-gap:10px;row-gap:8px}
.labs{grid-row:2/-1;grid-column:1;display:flex;flex-direction:column;gap:8px;min-height:0}
.lab{flex:1 1 0;display:flex;align-items:center;justify-content:center;writing-mode:vertical-rl;transform:rotate(180deg);font-family:${SERIF};font-size:13px;font-weight:600;letter-spacing:.04em;color:#6E7480;text-transform:capitalize}
.dayheads{display:grid;gap:8px;padding:0;align-items:end;width:100%;box-sizing:border-box}
.dh{min-width:0;width:auto;display:flex;align-items:center;justify-content:center;gap:7px;font-family:${SERIF};font-size:21px;font-weight:600;color:${INK};line-height:1}
.dh .dow{font-weight:600;color:${INK}}
.dh .num{display:inline-flex;align-items:center;justify-content:center;width:2.05em;height:2.05em;padding:0;border-radius:999px;line-height:1}
.dh .num .nn{display:block;position:relative;top:0}
.dh.today .num{background:${TODAY};color:#FFFFFF}
.row{display:grid;gap:8px;padding:0;min-height:0;background:transparent;width:100%;box-sizing:border-box}
.cell{flex:1 1 0;min-width:0;display:flex;flex-direction:column;gap:0;border:0;border-radius:18px;padding:0;margin:0;background:var(--band,#F6F7F8);color:${INK};font:inherit;font-size:18px;line-height:1.22;cursor:pointer;overflow:hidden;-webkit-tap-highlight-color:transparent;transition:background .18s ease,opacity .12s ease;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none}
.cell.single .dish{border-radius:18px}
.cell.dragging{opacity:.32}
.cell.over{outline:2px dashed ${INK};outline-offset:-3px}
.dish{flex:1 1 0;min-height:0;display:flex;align-items:center;justify-content:center;background:var(--pill,#E9EDEF);border-radius:14px;padding:8px 10px;overflow:hidden}
.dish .em{font-size:16px;margin-right:5px}
.dish .ln{text-align:left;font-weight:500;line-height:1.22;overflow-wrap:anywhere;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.cell.multi{padding:0;gap:6px;font-size:13.5px;background:#FFFFFF}
.cell.multi .dish{border-radius:18px}
.cell.multi .dish .em{font-size:14px}
.cell .plus{display:none}
.cell.empty{padding:9px 11px;align-items:center;justify-content:center;text-align:center}
.cell.empty .plus{display:inline;font-size:20px;opacity:.13;font-weight:300}
.ghost{position:fixed;left:0;top:0;z-index:10001;pointer-events:none;display:flex;align-items:center;gap:7px;border-radius:14px;padding:9px 13px;background:var(--pill,#E9EDEF);color:${INK};font-size:14px;font-weight:500;box-shadow:0 10px 26px rgba(16,20,32,.28);transform:translate(-50%,-50%) scale(1.03)}
.ghost[hidden]{display:none}
.scrim,.pscrim{position:fixed;inset:0;z-index:10000;display:flex;align-items:stretch;justify-content:flex-end;background:rgba(20,24,40,.26)}
.pscrim[hidden]{display:none}
.scrim[hidden]{display:none}
.sheet{width:min(420px,94vw);height:100%;overflow:auto;background:#FFFFFF;color:${INK};color-scheme:light;border-radius:22px 0 0 22px;padding:calc(20px + env(safe-area-inset-top,0px)) calc(20px + env(safe-area-inset-right,0px)) calc(16px + env(safe-area-inset-bottom,0px)) calc(20px + env(safe-area-inset-left,0px));display:flex;flex-direction:column;gap:12px;box-shadow:-14px 0 44px rgba(16,20,32,.18);font-family:${SANS}}
.sheet-top{display:flex;align-items:flex-start;gap:10px}
.sheet-title{flex:1 1 auto;font-family:${SERIF};font-size:21px;font-weight:600;line-height:1.2}
.sheet-title .when{display:block;font-family:${SANS};font-size:13px;font-weight:400;color:${MUTED};margin-top:3px}
.close{flex:0 0 auto;width:34px;height:34px;border:0;border-radius:50%;background:#F4F5F7;color:${INK};font-size:17px;line-height:1;cursor:pointer}
.back{flex:0 0 auto;width:34px;height:34px;border:0;border-radius:50%;background:#F4F5F7;color:${INK};font-size:19px;line-height:1;cursor:pointer}
.back[hidden]{display:none}
.meal{display:flex;flex-direction:column;gap:6px;min-height:34px}
.none{font-size:13px;color:${MUTED};font-style:italic}
.rowitem{display:flex;align-items:center;gap:8px;background:var(--pill,#D3E9E9);border-radius:12px;padding:9px 11px;font-size:15px}
.rowitem .em{font-size:17px}
.rowitem .tx{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;cursor:text;border-bottom:1px dashed #C7CCD4;padding-bottom:1px}
.rowitem .txin{flex:1 1 auto;min-width:0;border:0;background:transparent;font:inherit;font-size:15px;color:#1F2328;padding:0 0 1px;outline:none;border-bottom:1px solid var(--f-blue,#007AFF)}
.rowitem .del{flex:0 0 auto;width:30px;height:30px;border:0;border-radius:50%;background:transparent;color:var(--f-danger,#FF3B30);display:inline-flex;align-items:center;justify-content:center;cursor:pointer;padding:0;box-shadow:0 0 0 1px rgba(179,38,30,.22),0 1px 2px rgba(16,20,32,.12)}
.rowitem .del svg{width:16px;height:16px;display:block}
.rowitem .okbtn{flex:0 0 auto;width:28px;height:28px;border:0;border-radius:50%;background:var(--f-blue,#007AFF);color:#fff;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;padding:0}
.rowitem .okbtn svg{width:15px;height:15px;display:block}
.adder{display:flex;gap:6px}
.adder input{flex:1 1 auto;min-width:0;border:0;border-radius:12px;background:#F5F6F8;padding:12px 14px;font:inherit;font-size:16px;color:${INK}}
.adder button{border:0;border-radius:12px;background:var(--f-blue,#007AFF);color:#fff;font:inherit;font-size:14px;font-weight:700;padding:0 16px;cursor:pointer}
.rem{display:flex;align-items:center;gap:8px;font-size:13px;color:#4A5060;cursor:pointer;user-select:none}
.rem input{width:16px;height:16px;accent-color:var(--f-blue,#007AFF)}
.emos{display:flex;flex-wrap:wrap;gap:5px}
.emo{border:0;border-radius:9px;background:#F4F5F7;font-size:17px;line-height:1;padding:6px 7px;cursor:pointer}
.emo.on{box-shadow:0 0 0 2px var(--pill,#D3E9E9)}
.quick{display:flex;gap:6px}
.quick button{flex:1 1 0;border:0;border-radius:12px;padding:12px 8px;font:inherit;font-size:13px;font-weight:600;cursor:pointer;background:#F4F5F7;color:#3A4050}
.quick button.restes{background:#FFF3E2;color:#5C451A}
.libhead{font-size:11px;letter-spacing:.07em;text-transform:uppercase;color:${MUTED};margin-top:2px}
.lib{display:flex;flex-direction:column;gap:5px;max-height:30vh;overflow:auto;padding-right:2px}
.libitem{display:flex;align-items:center;gap:8px;border:0;border-radius:10px;background:#F4F5F7;padding:9px 11px;font:inherit;font-size:14px;color:${INK};text-align:left;cursor:pointer}
.libitem .em{font-size:16px}
.actions{display:flex;gap:8px;margin-top:auto;padding-top:8px}
.actions button{flex:1 1 0;border:0;border-radius:14px;padding:14px;font:inherit;font-size:15px;font-weight:600;cursor:pointer}
.ghostbtn{background:#F4F5F7;color:#4A5060}
.ghostbtn[hidden]{display:none}
.primary{background:var(--f-blue,#007AFF);color:#FFFFFF}
/* ---- panneau Réglages ---- */
/* --- panneau Réglages — DA Skylight --- */
.pbody{display:flex;flex-direction:column;flex:1 1 auto;min-height:0}
.psheet{width:min(430px,94vw);height:100%;overflow:auto;background:#FFFFFF;color:#1F2328;color-scheme:light;border-radius:26px 0 0 26px;padding:calc(22px + env(safe-area-inset-top,0px)) calc(22px + env(safe-area-inset-right,0px)) calc(20px + env(safe-area-inset-bottom,0px)) calc(22px + env(safe-area-inset-left,0px));display:flex;flex-direction:column;box-shadow:-14px 0 44px rgba(16,20,32,.18);font-family:var(--skylight-sans)}
.phead{display:flex;align-items:center;gap:10px;margin-bottom:22px;flex:0 0 auto}
.phead .ttl{flex:1 1 auto;min-width:0}
.phead h2{margin:0;font-family:var(--skylight-serif);font-size:23px;font-weight:600;line-height:1.3;color:#1F2328}
.phead h2.long{font-size:19px;line-height:1.25;white-space:normal}
.cbtn{flex:0 0 auto;width:36px;height:36px;border:0;border-radius:50%;background:#F1F3F5;color:#4B5563;display:inline-flex;align-items:center;justify-content:center;cursor:pointer}
.cbtn svg{width:17px;height:17px;display:block}
.cbtn[hidden]{display:none}
.help{margin:0 0 20px;font-size:14px;line-height:1.5;color:#6B7280}
.card{background:#F7F8FA;border-radius:16px;padding:0;margin-bottom:14px;overflow:hidden}
.srow{display:flex;align-items:center;gap:12px;padding:12px 14px;min-height:60px;box-sizing:border-box}
.srow+.srow{border-top:1px solid #EDF0F3}
.srow{transition:height .30s cubic-bezier(.4,0,.2,1),opacity .20s ease,transform .30s cubic-bezier(.4,0,.2,1),padding-top .30s cubic-bezier(.4,0,.2,1),padding-bottom .30s cubic-bezier(.4,0,.2,1),background .20s ease}
.srow.removing{height:0!important;min-height:0!important;padding-top:0!important;padding-bottom:0!important;opacity:0;transform:translateX(18px);background:#FDE7E4;overflow:hidden;pointer-events:none}
.delbtn[disabled]{opacity:.6;cursor:default}
.srow.tap{cursor:pointer}
.ico{flex:0 0 auto;width:36px;height:36px;border-radius:50%;background:#FFFFFF;display:inline-flex;align-items:center;justify-content:center;color:#374151;box-shadow:inset 0 0 0 1px #E8EBEF}
.ico svg{width:18px;height:18px;display:block}
.srow .txt{flex:1 1 auto;min-width:0}
.srow .name,.plink .name{display:block;font-size:15.5px;font-weight:600;color:#1F2328;line-height:1.2}
.srow .sub,.plink .sub{display:block;font-size:13px;color:#6B7280;margin-top:3px;line-height:1.3}
.chev{flex:0 0 auto;color:#9CA3AF;display:inline-flex}
.chev svg{width:17px;height:17px;display:block}
.tg{flex:0 0 auto;width:46px;height:28px;border-radius:14px;background:#E4E7EC;position:relative;transition:background .18s;cursor:pointer}
.tg.on{background:var(--f-blue,#007AFF)}
.tg i{position:absolute;top:3px;left:3px;width:22px;height:22px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.22);transition:left .18s}
.tg.on i{left:21px}
.dot{flex:0 0 auto;width:34px;height:34px;border-radius:50%;cursor:pointer;box-shadow:0 0 0 2px #fff,inset 0 0 0 1px rgba(0,0,0,.07),0 1px 3px rgba(0,0,0,.16)}
.pbtn{width:100%;border:0;border-radius:15px;padding:15px;font:inherit;font-size:15.5px;font-weight:700;cursor:pointer;background:var(--f-blue,#007AFF);color:#fff}
.plink{display:flex;align-items:center;gap:12px;padding:12px 14px;min-height:60px;box-sizing:border-box;font:inherit;font-size:15.5px;font-weight:600;color:#1F2328;background:transparent;border:0;cursor:pointer;width:100%;text-align:left}
.plink .ico{background:#FFFFFF}
.plink .ico.muted{color:#9CA3AF}
.delbtn{flex:0 0 auto;border:0;border-radius:10px;background:transparent;color:var(--f-danger,#FF3B30);font:inherit;font-size:13px;font-weight:700;padding:9px 13px;cursor:pointer}
.plink .txt{flex:1 1 auto}
.form{background:#FFFFFF;border-radius:14px;padding:2px 2px 8px}
.form input{width:100%;border:0;border-radius:12px;background:#F1F3F5;padding:13px 14px;font:inherit;font-size:16px;color:#1F2328}
/* champ en cours d'édition : anneau intérieur, jamais rogné par le tiroir */
.adder input:focus,.form input:focus{outline:none;background:#fff;box-shadow:inset 0 0 0 2px var(--f-blue-line,rgba(0,122,255,.42))}
.chips{display:flex;gap:8px;flex-wrap:wrap;padding:12px 2px 0}
.chip{border:1px solid #E4E7EC;background:#fff;border-radius:999px;padding:8px 13px;font:inherit;font-size:13px;font-weight:600;color:#374151;cursor:pointer}
.formrow{display:flex;gap:8px;padding:12px 2px 2px}
.formrow button{flex:1 1 0;border:0;border-radius:12px;padding:12px;font:inherit;font-size:14px;font-weight:700;cursor:pointer}
.formrow .ok{background:var(--f-blue,#007AFF);color:#fff}
.formrow .no{background:#F1F3F5;color:#4B5563;flex:0 0 38%}
.undo{display:flex;align-items:center;gap:10px;background:#FDE7E4;border-radius:12px;padding:10px 12px;margin:0 0 14px;font-size:13px;color:var(--f-danger,#FF3B30);align-self:flex-start}
.undo button{border:0;background:transparent;color:var(--f-danger,#FF3B30);font:inherit;font-size:13px;font-weight:700;text-decoration:underline;cursor:pointer;padding:0}
.undo .udismiss{text-decoration:none;font-size:14px;padding:0 0 0 4px;opacity:.7}
.spacer{flex:1 1 auto;min-height:12px}
.mscrim{position:fixed;inset:0;z-index:10003;display:flex;align-items:center;justify-content:center;background:rgba(20,24,40,.38);padding:24px}
.mscrim[hidden]{display:none}
.modal{width:100%;max-width:340px;background:#FFFFFF;color:#1F2328;color-scheme:light;border-radius:20px;padding:24px 22px 18px;box-shadow:0 18px 50px rgba(16,20,32,.28);font-family:${SANS};display:flex;flex-direction:column;gap:8px}
.modal h3{margin:0;font-family:${SERIF};font-size:20px;font-weight:600;line-height:1.25}
.modal p{margin:0;font-size:14px;line-height:1.45;color:#6B7280}
.modal .mb{display:flex;flex-direction:column;gap:8px;margin-top:18px}
.modal .mb button{border:0;border-radius:14px;padding:14px;font:inherit;font-size:15px;font-weight:700;cursor:pointer}
.modal .mno{background:#F1F3F5;color:#374151}
.modal .myes{background:#FF3B30;color:#FFFFFF}
.danger{margin-top:auto;padding-top:16px;border-top:1px solid #EEF0F3}
.danger-btn{display:flex;align-items:center;gap:8px;border:0;background:transparent;color:#FF3B30;font:inherit;font-size:14px;font-weight:600;padding:10px 2px 10px 23px;cursor:pointer}
.danger-btn svg{width:17px;height:17px;flex:0 0 auto}
.swgrid{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;padding:2px 2px 10px}
.swgrid button{border:0;background:transparent;padding:0;cursor:pointer}
.swgrid .tile{width:100%;aspect-ratio:1;border-radius:14px;background:#F1F2F4;display:flex;align-items:center;justify-content:center}
.swgrid .tile i{width:22px;height:22px;border-radius:50%;display:block}
.swgrid button.on .tile{box-shadow:inset 0 0 0 2px var(--f-blue,#007AFF)}
.mlist{display:none}
@media (max-width:900px){
.sheet,.psheet{width:100vw;max-width:100vw;border-radius:0}
.scrim,.pscrim{align-items:stretch}
}
@media (max-width:900px){
.page{padding:0 12px 12px;gap:10px;overflow:hidden}
/* l'en-tête mobile (60 px, marges 8 px, date 18 px, heure/météo 16 px) est
   dans famille-core.js, variante « split » */
.rep{display:none}
.gear{width:32px;height:32px}
.clear{padding:7px 11px;font-size:12px}
/* sous 430 px, le bouton Vider ne garde que son icone : la date du jour doit
   rester entiere, c'est l'information principale de l'en-tete */
@media (max-width:430px){.clear{font-size:0;padding:7px 9px;gap:0}.clear svg{width:16px;height:16px}.date{font-size:16px}}
.rep{max-width:40vw;padding:7px 11px;font-size:12px}
.grid{display:none!important}
.mlist{display:flex;flex-direction:column;gap:16px;flex:1 1 auto;min-height:0;overflow-y:auto;
  overscroll-behavior:contain;
  /* la réserve sous la barre flottante : sans elle, le dimanche restait caché
     derrière le verre et on ne pouvait pas le faire remonter. Même formule que
     les autres vues qui défilent (tâches, profils) — un seul jeton. */
  padding-bottom:var(--f-tabbar-inset,calc(var(--f-tabbar-h,64px) + 40px))}
.mday{display:flex;flex-direction:column;gap:6px}
.mhead{display:flex;align-items:center;gap:7px;font-family:var(--skylight-serif);font-size:16px;font-weight:600;color:#1F2328}
.mhead .num{display:inline-flex;align-items:center;justify-content:center;width:1.9em;height:1.9em;border-radius:999px;font-size:14px;line-height:1}
.mhead.today .num{background:#F66951;color:#FFFFFF}
.mrows{display:flex;flex-direction:column;gap:6px}
.mcell{border:0;border-radius:14px;padding:0;font:inherit;font-size:16px;color:#1F2328;text-align:left;cursor:pointer;display:flex;align-items:center;gap:8px;min-height:54px;overflow:hidden;-webkit-tap-highlight-color:transparent}
.mcell .dish{flex:1 1 auto;justify-content:flex-start;padding:14px;border-radius:14px;background:var(--pill,#E9EDEF)}
.mcell.empty{background:var(--band,#F6F7F8);padding:14px;color:#8A8F9C}
.mcell.empty .plus{font-size:18px;opacity:.5;display:inline}
.mcell .mname{font-size:14px}
.mcell.multi{flex-direction:column;align-items:stretch;gap:6px;background:transparent}
.mcell.multi .dish{width:100%;min-height:48px}
}
`;

class SkylightMealsV2Card extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._built = false;
    this._dayKey = null;
    this._working = [];
    this._lib = [];
    this._pendingEmoji = "";
    this._libLoaded = false;
    this._drag = null;
    this._suppressClick = false;
    this._tookIndex = -1;
    this._clearTimer = null;
    this._page = null;
    this._selDay = 0;
    this._undo = null;
    this._undoTimer = null;
    this._adding = false;
    this._delMode = false;
  }

  setConfig(config) {
    if (!config || !Array.isArray(config.days) || config.days.length === 0) {
      throw new Error("skylight-meals-v2 : 'days' (liste non vide) est requis");
    }
    this._config = config;
    this._built = false;
    if (this.shadowRoot) this.shadowRoot.innerHTML = "";
  }

  getCardSize() { return 6; }

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
    const key = new Date().toDateString();
    if (!this._built || key !== this._dayKey) {
      this._dayKey = key;
      this._built = false;
      this._build();
    }
    this._sync();
  }

  /* ---------- utilitaires ---------- */
  _state(id) {
    const s = this._hass && this._hass.states[id];
    return s && s.state && s.state !== "unknown" && s.state !== "unavailable" ? s.state : "";
  }

  _esc(t) {
    return String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  _monday() {
    const d = new Date();
    const dow = (d.getDay() + 6) % 7;
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() - dow);
  }

  _fmtLong(d) {
    /* Une seule forme de date pour toute l'app : celle du tronc commun.
       Avant, cet écran passait en « Lundi 2 novembre » au-dessus de 760 px et
       les autres restaient en « Lun. 2 nov. » — deux formats, deux rendus. */
    return CORE.headerDate(d);
  }

  _fmtShort(d) {
    const s = d.toLocaleDateString("fr-FR", { weekday: "short" }).replace(".", "");
    return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
  }

  /* ---------- couleurs ---------- */
  _palette() {
    const raw = this._state(this._config.colors_entity || COLORS_ENTITY);
    const list = raw.split(",").map((s) => s.trim()).filter((s) => /^#[0-9a-fA-F]{6}$/.test(s));
    return list.length === this._config.days.length ? list : DEFAULT_PALETTE;
  }

  _hexToRgb(h) {
    const s = h.replace("#", "");
    return [parseInt(s.substr(0, 2), 16), parseInt(s.substr(2, 2), 16), parseInt(s.substr(4, 2), 16)];
  }

  _ramp(base, f) {
    const [r, g, b] = this._hexToRgb(base);
    const m = (c) => Math.max(0, Math.min(255, Math.round(c * f)));
    return "#" + [m(r), m(g), m(b)].map((v) => v.toString(16).padStart(2, "0")).join("");
  }

  _tint(base, w) {
    const [r, g, b] = this._hexToRgb(base);
    const m = (c) => Math.round(c + (255 - c) * w);
    return "#" + [m(r), m(g), m(b)].map((v) => v.toString(16).padStart(2, "0")).join("");
  }

  /* couleur d'une case : teinte du jour, assombrie selon le rang de la ligne visible */
  _cellColors(dayIdx, visIdx) {
    const base = this._palette()[dayIdx % this._config.days.length] || DEFAULT_PALETTE[dayIdx % 7];
    const pill = this._tint(base, Math.max(0.5, 0.78 - 0.10 * visIdx));
    const band = this._tint(base, 0.88);
    return { band: band, pill: pill };
  }

  /* ---------- lignes ---------- */
  _rowDefs() {
    const raw = this._state(this._config.rows_entity || ROWS_ENTITY);
    const list = raw.split(",").map((s) => s.trim()).filter(Boolean).map((s) => {
      const p = s.split("=");
      return { name: (p[0] || "").trim(), on: p[1] !== "0" };
    }).filter((r) => r.name);
    if (list.length) return list;
    const cfg = Array.isArray(this._config.rows) ? this._config.rows : [];
    if (cfg.length) return cfg.map((r) => ({ name: r.label || r.name || "Repas", on: true }));
    return [{ name: "Midi", on: true }, { name: "Soir", on: true }];
  }

  _visibleRows() {
    const out = [];
    this._rowDefs().forEach((r, i) => { if (r.on) out.push({ name: r.name, slot: i }); });
    return out;
  }

  /* ---------- plats ---------- */
  _leadingEmoji(text) {
    const chars = Array.from(String(text));
    if (!chars.length) return "";
    const c = chars[0].codePointAt(0);
    const ok = (c >= 0x1F000 && c <= 0x1FAFF) || (c >= 0x2190 && c <= 0x2BFF) || (c >= 0x2600 && c <= 0x27BF);
    return ok ? chars[0] : "";
  }

  _norm(t) {
    return String(t || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, " ").trim();
  }

  _autoEmoji(text) {
    const q = " " + this._norm(text) + " ";
    if (!q.trim()) return "";
    let best = "";
    let score = 0;
    for (let i = 0; i < FOOD.length; i++) {
      const k = this._norm(FOOD[i][0]);
      if (!k) continue;
      if (q.indexOf(" " + k + " ") !== -1 || q.indexOf(" " + k) !== -1) {
        const sc = k.length + (k.indexOf(" ") !== -1 ? 6 : 0);
        if (sc > score) { score = sc; best = FOOD[i][1]; }
      }
    }
    return best || "\uD83C\uDF7D\uFE0F";
  }

  _parseDish(value) {
    const raw = String(value || "").trim();
    if (!raw) return { emoji: "", label: "" };
    const e = this._leadingEmoji(raw);
    const label = e ? raw.slice(Array.from(raw)[0].length).trim() : raw;
    return { emoji: e || this._autoEmoji(label), label: label };
  }

  _parseSlot(value) {
    return String(value || "").split("+").map((x) => x.trim()).filter(Boolean)
      .map((x) => this._parseDish(x));
  }

  _fmtDish(d) { return (d.emoji ? d.emoji + " " : "") + d.label; }

  _split(id) {
    const n = this._rowDefs().length;
    const parts = String(this._state(id)).split("|");
    const out = [];
    for (let i = 0; i < n; i++) out.push(parts[i] || "");
    return out;
  }

  _slotValues() {
    const out = [];
    this._config.days.forEach((d) => { this._split(d.entity).forEach((v) => out.push(v)); });
    return out;
  }

  _writeSlots(vals) {
    if (!this._hass) return;
    const n = this._rowDefs().length;
    this._config.days.forEach((d, i) => {
      const cur = this._split(d.entity);
      const next = [];
      for (let k = 0; k < n; k++) next.push(vals[i * n + k] || "");
      if (cur.join("|") === next.join("|")) return;
      this._hass.callService("input_text", "set_value", { entity_id: d.entity, value: next.join("|") });
    });
  }

  _swap(a, b) {
    const n = this._rowDefs().length;
    const vals = this._slotValues();
    const ia = a.day * n + a.slot;
    const ib = b.day * n + b.slot;
    const t = vals[ia];
    vals[ia] = vals[ib];
    vals[ib] = t;
    this._writeSlots(vals);
  }

  /* ---------- report ---------- */
  _reportList() {
    const raw = this._state(this._config.report_entity || REPORT).trim();
    if (!raw) return [];
    return raw.split("|").map((s) => s.trim()).filter(Boolean);
  }

  _setReport(list) {
    if (!this._hass) return;
    this._hass.callService("input_text", "set_value", {
      entity_id: this._config.report_entity || REPORT,
      value: list.join("|").slice(0, 255),
    });
  }

  _pushReport(value) {
    if (!this._hass || !value) return;
    this._setReport(this._reportList().concat([value]));
  }

  _dropReportAt(i) {
    const list = this._reportList();
    if (i < 0 || i >= list.length) return;
    list.splice(i, 1);
    this._setReport(list);
  }

  /* ---------- bibliothèque ---------- */
  _loadLibrary() {
    if (!this._config.library || !this._hass || !this._hass.callWS) return;
    this._hass.callWS({ type: "todo/item/list", entity_id: this._config.library })
      .then((r) => {
        this._lib = ((r && r.items) || []).map((it) => String(it.summary || "")).filter(Boolean);
        this._libLoaded = true;
        this._renderLibrary();
      })
      .catch(() => { this._libLoaded = true; });
  }

  _remember(dish) {
    if (!this._config.library || !this._hass) return;
    const line = this._fmtDish(dish);
    const exists = this._lib.some((s) => this._parseDish(s).label.toLowerCase() === dish.label.toLowerCase());
    if (exists) return;
    this._hass.callService("todo", "add_item", { entity_id: this._config.library, item: line });
    this._lib = this._lib.concat([line]);
  }

  /* ---------- construction ---------- */
  _build() {
    const root = this.shadowRoot;
    const days = this._config.days;
    const rows = this._visibleRows();
    const monday = this._monday();
    const todayIdx = (new Date().getDay() + 6) % 7;

    const heads = days.map((d, i) => {
      const date = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
      return '<div class="dh' + (i === todayIdx ? " today" : "") + '">' +
        '<span class="dow">' + this._fmtShort(date) + '</span>' +
        '<span class="num"><span class="nn">' + date.getDate() + '</span></span></div>';
    }).join("");

    const rowHtml = rows.map((r, vi) => {
      const cells = days.map((d, i) =>
        '<button class="cell" type="button" data-day="' + i + '" data-slot="' + r.slot + '"' +
        ' aria-label="' + this._esc(r.name) + " " + d.label + '"><span class="plus">+</span></button>'
      ).join("");
      return '<div class="row" data-vis="' + vi + '">' + cells + "</div>";
    });

    const mHtml = days.map((d, i) => {
      const date = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
      const head = '<div class="mhead' + (i === todayIdx ? " today" : "") + '">' +
        '<span class="dow">' + this._fmtShort(date) + '</span>' +
        '<span class="num"><span class="nn">' + date.getDate() + '</span></span></div>';
      const cells = rows.map((r) =>
        '<button class="mcell" type="button" data-day="' + i + '" data-slot="' + r.slot + '"' +
        ' aria-label="' + this._esc(r.name) + " " + d.label + '"></button>'
      ).join("");
      return '<div class="mday">' + head + '<div class="mrows">' + cells + "</div></div>";
    }).join("");

    root.innerHTML =
      "<style>" + CORE.coreCss() + STYLE + (this._config.css || "") + "</style>" +
      '<div class="page">' +
        CORE.headerHtml({
          variant: 'split',
          date: this._fmtLong(new Date()),
          actions: [
            '<div class="rep" hidden>\u23F3</div>',
            '<button class="clear" type="button" aria-label="Vider la semaine de repas" hidden></button>',
            '<button class="gear" type="button" aria-label="Réglages" title="Réglages">' + this._sf("gear") + "</button>",
          ],
        }) +
        '<div class="grid">' +
          "<div></div>" +
          '<div class="dayheads">' + heads + "</div>" +
          '<div class="labs">' + rows.map((r) => '<div class="lab">' + this._esc(r.name) + "</div>").join("") + "</div>" +
          rowHtml.join("") +
        "</div>" +
        '<div class="mlist">' + mHtml + "</div>" +
      "</div>" +
      '<div class="ghost" hidden></div>' +
      '<div class="mscrim" hidden><div class="modal" role="dialog" aria-modal="true">' +
        '<h3>Vider la semaine ?</h3>' +
        '<p>Tous les repas de la semaine seront effacés. Tes recettes et les plats en attente sont conservés.</p>' +
        '<div class="mb"><button class="mno" type="button">Annuler</button><button class="myes" type="button">Tout vider</button></div>' +
      "</div></div>" +

      /* ---- tiroir d'édition d'un repas ---- */
      '<div class="scrim" hidden><div class="sheet" role="dialog" aria-modal="true">' +
        '<div class="sheet-top"><div class="sheet-title"><span class="t"></span><span class="when"></span></div>' +
        '<button class="close" type="button" aria-label="Fermer">✕</button></div>' +
        '<div class="meal"></div>' +
        '<div class="adder"><input type="text" maxlength="80" placeholder="Ex. Pizza" autocomplete="off">' +
        '<button class="addone" type="button">Ajouter</button></div>' +
        '<label class="rem"><input type="checkbox"> Ajouter à mes recettes</label>' +
        '<div class="emos"></div>' +
        '<div class="quick"><button class="restes" type="button">\uD83C\uDF7D\uFE0F Restes</button></div>' +
        '<div class="takewrap"></div>' +
        '<div class="libhead">Mes recettes</div>' +
        '<div class="lib"></div>' +
        '<div class="actions"><button class="ghostbtn" type="button">Vider</button>' +
        '<button class="primary" type="button">Valider</button></div>' +
      "</div></div>" +

      /* ---- panneau Réglages ---- */
      '<div class="pscrim" hidden><div class="psheet" role="dialog" aria-modal="true">' +
        '<div class="phead"><button class="cbtn back" type="button" aria-label="Retour" hidden>' + this._ico("back") + '</button>' +
        '<div class="ttl"><h2></h2></div>' +
        '<button class="cbtn pclose" type="button" aria-label="Fermer">' + this._ico("x") + '</button></div>' +
        '<div class="pbody"></div>' +
      "</div></div>";

    /* grille : N lignes visibles, hauteurs égales */
    const grid = root.querySelector(".grid");
    if (grid) {
      grid.style.gridTemplateRows = "auto repeat(" + rows.length + ", minmax(0,1fr))";
      grid.style.gridTemplateColumns = "30px minmax(0,1fr)";
    }
    const cols = "repeat(" + days.length + ", minmax(0,1fr))";
    const hd = root.querySelector(".dayheads");
    if (hd) hd.style.gridTemplateColumns = cols;
    root.querySelectorAll(".row").forEach((r) => { r.style.gridTemplateColumns = cols; });

    root.querySelectorAll(".mcell").forEach((el) => {
      el.addEventListener("click", () => this._open(Number(el.dataset.day), Number(el.dataset.slot)));
    });

    root.querySelectorAll(".cell").forEach((el) => {
      el.addEventListener("click", () => {
        if (this._suppressClick) { this._suppressClick = false; return; }
        this._open(Number(el.dataset.day), Number(el.dataset.slot));
      });
      el.addEventListener("pointerdown", (ev) => this._down(ev, el));
      el.addEventListener("pointermove", (ev) => this._move(ev));
      el.addEventListener("pointerup", () => this._up());
      el.addEventListener("pointercancel", () => this._cancel());
    });

    const scrim = root.querySelector(".scrim");
    scrim.addEventListener("click", (ev) => { if (ev.target === scrim) this._close(); });
    root.querySelector(".close").addEventListener("click", () => this._close());
    root.querySelector(".ghostbtn").addEventListener("click", () => {
      this._working = [];
      this._renderDrawer();
    });
    root.querySelector(".primary").addEventListener("click", () => this._commit());
    root.querySelector(".restes").addEventListener("click", () => {
      this._working = [{ emoji: "\uD83C\uDF7D\uFE0F", label: "Restes" }];
      this._renderDrawer();
    });
    root.querySelector(".addone").addEventListener("click", () => this._addTyped());

    const clr = root.querySelector(".clear");
    const mscrim = root.querySelector(".mscrim");
    clr.innerHTML = this._sf("trash") + "<span>Vider</span>";
    clr.addEventListener("click", () => {
      clr.classList.remove("arm");
      root.querySelector(".mscrim").hidden = false;
    });
    root.querySelector(".mno").addEventListener("click", () => { root.querySelector(".mscrim").hidden = true; });
    root.querySelector(".myes").addEventListener("click", () => {
      root.querySelector(".mscrim").hidden = true;
      this._writeSlots(new Array(this._config.days.length * this._rowDefs().length).fill(""));
    });
    mscrim.addEventListener("click", (ev) => { if (ev.target === mscrim) mscrim.hidden = true; });

    const input = root.querySelector(".adder input");
    input.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") { ev.preventDefault(); this._addTyped(); }
      if (ev.key === "Escape") this._close();
    });
    input.addEventListener("input", () => this._renderLibrary());

    const emos = root.querySelector(".emos");
    EMOJI_PICKER.forEach((e) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "emo";
      b.textContent = e;
      b.addEventListener("click", () => {
        this._pendingEmoji = e;
        emos.querySelectorAll(".emo").forEach((x) => x.classList.remove("on"));
        b.classList.add("on");
        input.focus();
      });
      emos.appendChild(b);
    });

    /* réglages */
    root.querySelector(".gear").addEventListener("click", () => this._openSettings("root"));
    root.querySelector(".pclose").addEventListener("click", () => this._closeSettings());
    root.querySelector(".back").addEventListener("click", () => this._back());
    const pscrim = root.querySelector(".pscrim");
    pscrim.addEventListener("click", (ev) => { if (ev.target === pscrim) this._closeSettings(); });

    this._built = true;
  }

  /* ---------- glisser / déposer ---------- */
  _down(ev, el) {
    if (ev.pointerType === "mouse" && ev.button !== 0) return;
    this._drag = {
      day: Number(el.dataset.day), slot: Number(el.dataset.slot), el: el,
      x0: ev.clientX, y0: ev.clientY, active: false, timer: null, target: null,
    };
    try { el.setPointerCapture(ev.pointerId); } catch (e) { /* ignore */ }
    const d = this._drag;
    d.timer = setTimeout(() => this._begin(), Number(this._config.hold_ms) || 260);
  }

  _begin() {
    const d = this._drag;
    if (!d) return;
    const cells = this._parseSlot(this._split(this._config.days[d.day].entity)[d.slot]);
    if (!cells.length) { this._drag = null; return; }
    d.active = true;
    d.el.classList.add("dragging");
    const g = this.shadowRoot.querySelector(".ghost");
    if (g) {
      g.style.setProperty("--pill", d.el.style.getPropertyValue("--pill") || "#E9EDEF");
      g.innerHTML = cells.map((x) =>
        '<span class="em" style="font-size:16px">' + x.emoji + "</span><span>" + this._esc(x.label) + "</span>"
      ).join("");
      g.hidden = false;
    }
    try { if (navigator.vibrate) navigator.vibrate(12); } catch (e) { /* ignore */ }
  }

  _move(ev) {
    const d = this._drag;
    if (!d) return;
    if (!d.active) {
      const dx = ev.clientX - d.x0, dy = ev.clientY - d.y0;
      if (dx * dx + dy * dy > 144) { clearTimeout(d.timer); this._drag = null; }
      return;
    }
    ev.preventDefault();
    const g = this.shadowRoot.querySelector(".ghost");
    if (g) { g.style.left = ev.clientX + "px"; g.style.top = ev.clientY + "px"; }
    const hit = this.shadowRoot.elementFromPoint(ev.clientX, ev.clientY);
    const cell = hit && hit.closest ? hit.closest(".cell") : null;
    if (d.target && d.target !== cell) d.target.classList.remove("over");
    d.target = (cell && cell !== d.el) ? cell : null;
    if (d.target) d.target.classList.add("over");
  }

  _up() {
    const d = this._drag;
    if (!d) return;
    clearTimeout(d.timer);
    if (d.active) {
      const g = this.shadowRoot.querySelector(".ghost");
      if (g) g.hidden = true;
      d.el.classList.remove("dragging");
      if (d.target) d.target.classList.remove("over");
      const target = d.target;
      this._suppressClick = true;
      if (target) {
        this._swap({ day: d.day, slot: d.slot },
          { day: Number(target.dataset.day), slot: Number(target.dataset.slot) });
      }
      setTimeout(() => { this._suppressClick = false; }, 350);
    }
    this._drag = null;
  }

  _cancel() {
    const d = this._drag;
    if (!d) return;
    clearTimeout(d.timer);
    if (d.el) d.el.classList.remove("dragging");
    if (d.target) d.target.classList.remove("over");
    const g = this.shadowRoot.querySelector(".ghost");
    if (g) g.hidden = true;
    this._drag = null;
  }

  /* ---------- synchro ---------- */
  _sync() {
    if (!this._hass || !this._config) return;
    const root = this.shadowRoot;

    /* heure et météo : une seule implémentation, dans le tronc commun. Cet
       écran avait la sienne (autre table d'emoji, autre espacement), d'où une
       météo qui ne s'écrivait pas comme ailleurs. */
    CORE.paintHeaderLive(root, this._hass, this._config);

    const rep = root.querySelector(".rep");
    const clrBtn = root.querySelector(".clear");
    const rows = this._visibleRows();
    const nSlots = this._rowDefs().length;

    if (clrBtn) {
      clrBtn.hidden = !this._config.days.some((d) => this._split(d.entity).some((v) => v));
    }
    if (rep) {
      const rlist = this._reportList();
      if (rlist.length) {
        rep.hidden = false;
        const first = this._parseSlot(rlist[0]).map((x) => x.label).join(" + ");
        const more = rlist.length > 1 ? " +" + (rlist.length - 1) : "";
        rep.innerHTML = "\u23F3 <span class=\"t\">" + this._esc(first) + more + "</span>";
      } else {
        rep.hidden = true;
      }
    }

    const visBySlot = {};
    rows.forEach((r, vi) => { visBySlot[r.slot] = vi; });

    root.querySelectorAll(".cell, .mcell").forEach((el) => {
      const dayIdx = Number(el.dataset.day);
      const slot = Number(el.dataset.slot);
      const isM = el.classList.contains("mcell");
      const vi = visBySlot[slot];
      const col = this._cellColors(dayIdx, vi === undefined ? 0 : vi);
      if (el.style.getPropertyValue("--pill") !== col.pill) {
        el.style.setProperty("--band", col.band);
        el.style.setProperty("--pill", col.pill);
      }
      if (el.dataset.ns !== String(nSlots)) el.dataset.ns = String(nSlots);

      const day = this._config.days[dayIdx];
      if (!day) return;
      const dishes = this._parseSlot(this._split(day.entity)[slot]);
      const sig = dishes.map((d) => d.emoji + d.label).join("~");
      if (el.dataset.sig === sig) return;
      el.dataset.sig = sig;

      if (!dishes.length) {
        const rn = this._rowDefs()[slot];
        el.innerHTML = isM
          ? '<span class="plus">+</span><span class="mname">' + this._esc(rn ? rn.name : "") + "</span>"
          : '<span class="plus">+</span>';
        el.classList.remove("multi", "single");
        el.classList.add("empty");
        return;
      }
      el.classList.remove("empty");
      el.classList.toggle("multi", dishes.length > 1);
      el.classList.toggle("single", dishes.length === 1);
      el.innerHTML = dishes.map((d) =>
        '<span class="dish"><span class="ln"><span class="em">' + d.emoji + "</span>" +
        this._esc(d.label) + "</span></span>"
      ).join("");
    });
  }

  /* ---------- édition d'un repas ---------- */
  _open(dayIdx, slot) {
    const day = this._config.days[dayIdx];
    const defs = this._rowDefs();
    const row = defs[slot];
    if (!day || !row) return;
    this._editing = { dayIdx, slot };
    this._tookIndex = -1;
    const root = this.shadowRoot;
    const date = new Date(this._monday().getTime());
    date.setDate(date.getDate() + dayIdx);

    this._working = this._parseSlot(this._split(day.entity)[slot]);
    this._pendingEmoji = "";

    root.querySelector(".sheet-title .t").textContent = row.name;
    root.querySelector(".sheet-title .when").textContent = this._fmtLong(date);
    const col = this._cellColors(dayIdx, 0);
    root.querySelector(".sheet").style.setProperty("--pill", col.pill);
    root.querySelector(".adder input").value = "";
    root.querySelector(".rem input").checked = false;
    root.querySelector(".emos").querySelectorAll(".emo").forEach((x) => x.classList.remove("on"));

    this._renderDrawer();
    this._renderTake();
    if (!this._libLoaded) this._loadLibrary();
    root.querySelector(".scrim").hidden = false;
    setTimeout(() => root.querySelector(".adder input").focus(), 40);
  }

  _renderTake() {
    const root = this.shadowRoot;
    const box = root.querySelector(".takewrap");
    if (!box) return;
    const list = this._reportList();
    if (!list.length) { box.innerHTML = ""; return; }
    const txt = this._parseSlot(list[0]).map((x) => x.label).join(" + ");
    const rest = list.length > 1 ? " (+" + (list.length - 1) + " en attente)" : "";
    box.innerHTML = '<button class="quick take" type="button">\u23F3 Remettre : ' +
      this._esc(txt) + rest + "</button>";
    const b = box.querySelector("button");
    b.style.cssText = "width:100%;border:0;border-radius:12px;padding:12px 8px;font:inherit;font-size:13px;font-weight:600;cursor:pointer;background:#EEF6F6;color:#16453F";
    b.addEventListener("click", () => {
      this._working = this._parseSlot(list[0]);
      this._tookIndex = 0;
      this._renderDrawer();
    });
  }

  _renderDrawer() {
    const root = this.shadowRoot;
    if (!root) return;
    const meal = root.querySelector(".meal");
    if (!meal) return;

    if (!this._working.length) {
      meal.innerHTML = '<span class="none">Aucun plat pour ce repas</span>';
    } else {
      meal.innerHTML = this._working.map((d, i) =>
        '<div class="rowitem" data-i="' + i + '"><span class="em">' + d.emoji + "</span>" +
        '<span class="tx">' + this._esc(d.label) + "</span>" +
        '<button class="del" type="button" data-i="' + i + '" aria-label="Retirer le plat">' + this._sf("trash") + '</button></div>'
      ).join("");
      meal.querySelectorAll(".del").forEach((b) => {
        b.addEventListener("click", () => {
          this._working.splice(Number(b.dataset.i), 1);
          this._renderDrawer();
        });
      });
      meal.querySelectorAll(".rowitem").forEach((row) => {
        row.addEventListener("click", (ev) => {
          if (ev.target && ev.target.closest && ev.target.closest(".del")) return;
          this._editDish(Number(row.dataset.i), row);
        });
      });
    }
    const pbtn = root.querySelector(".primary");
    if (pbtn) pbtn.textContent = (this._isRestes() && this._slotFilled()) ? "Décaler et valider" : "Valider";
    const gbtn = root.querySelector(".ghostbtn");
    if (gbtn) gbtn.hidden = this._working.length < 2;
    this._renderLibrary();
  }

  _renderLibrary() {
    const root = this.shadowRoot;
    const lib = root && root.querySelector(".lib");
    if (!lib) return;
    const inp = root.querySelector(".adder input");
    const q = String(inp ? inp.value : "").trim().toLowerCase();
    const items = this._lib
      .map((s) => this._parseDish(s))
      .filter((d) => !q || d.label.toLowerCase().indexOf(q) !== -1)
      .slice(0, 60);

    if (!items.length) {
      lib.innerHTML = '<span class="none">' + (this._libLoaded ? "Aucune recette pour l'instant" : "Chargement…") + "</span>";
      return;
    }
    lib.innerHTML = items.map((d, i) =>
      '<button class="libitem" type="button" data-i="' + i + '">' +
      '<span class="em">' + d.emoji + "</span><span>" + this._esc(d.label) + "</span></button>"
    ).join("");
    lib.querySelectorAll(".libitem").forEach((b) => {
      b.addEventListener("click", () => {
        const d = items[Number(b.dataset.i)];
        if (!this._working.some((x) => x.label.toLowerCase() === d.label.toLowerCase())) {
          this._working.push(d);
        }
        this._renderDrawer();
      });
    });
  }

  _editDish(i, row) {
    const d = this._working[i];
    if (!d || !row || row.querySelector(".txin")) return;
    const tx = row.querySelector(".tx");
    if (!tx) return;
    const inp = document.createElement("input");
    inp.type = "text";
    inp.className = "txin";
    inp.value = d.label;
    inp.maxLength = 60;
    inp.setAttribute("aria-label", "Modifier le plat");
    tx.replaceWith(inp);
    const del = row.querySelector(".del");
    if (del) {
      const okBtn = document.createElement("button");
      okBtn.type = "button";
      okBtn.className = "okbtn";
      okBtn.setAttribute("aria-label", "Valider la modification");
      okBtn.innerHTML = this._ico("check");
      okBtn.addEventListener("mousedown", (ev) => ev.preventDefault());
      okBtn.addEventListener("click", (ev) => { ev.stopPropagation(); finish(true); });
      del.replaceWith(okBtn);
    }
    inp.focus();
    inp.select();
    let done = false;
    const finish = (save) => {
      if (done) return;
      done = true;
      if (save) {
        const v = String(inp.value || "").replace(/[|+]/g, " ").trim();
        if (v) {
          d.label = v;
          if (d.emoji === "\uD83C\uDF7D\uFE0F") {
            const e = this._autoEmoji(v);
            if (e) d.emoji = e;
          }
        }
      }
      this._renderDrawer();
    };
    inp.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") { ev.preventDefault(); finish(true); }
      if (ev.key === "Escape") { ev.preventDefault(); finish(false); }
    });
    inp.addEventListener("blur", () => finish(true));
  }

  _addTyped() {
    const root = this.shadowRoot;
    const input = root.querySelector(".adder input");
    const label = String(input.value || "").replace(/[|+]/g, " ").trim();
    if (!label) { input.focus(); return; }
    const dish = { emoji: this._pendingEmoji || this._autoEmoji(label), label: label };
    this._working.push(dish);

    if (root.querySelector(".rem input").checked) this._remember(dish);

    input.value = "";
    this._pendingEmoji = "";
    root.querySelector(".emos").querySelectorAll(".emo").forEach((x) => x.classList.remove("on"));
    this._renderDrawer();
    input.focus();
  }

  _disarmClear() {
    clearTimeout(this._clearTimer);
    const clr = this.shadowRoot && this.shadowRoot.querySelector(".clear");
    if (!clr) return;
    clr.dataset.armed = "0";
    clr.classList.remove("arm");
  }

  _close() {
    this._editing = null;
    this._tookIndex = -1;
    this._disarmClear();
    const s = this.shadowRoot.querySelector(".scrim");
    if (s) s.hidden = true;
  }

  _isRestes() {
    return this._working.length === 1 && /^restes$/i.test(String(this._working[0].label).trim());
  }

  _slotFilled() {
    if (!this._editing) return false;
    const d = this._config.days[this._editing.dayIdx];
    if (!d) return false;
    return (this._split(d.entity)[this._editing.slot] || "") !== "";
  }

  _commit() {
    if (!this._editing || !this._hass) return;
    const n = this._rowDefs().length;
    const value = this._working.map((d) => this._fmtDish(d)).join(" + ");
    const shift = this._isRestes() && this._slotFilled();
    if (shift && !value) return;

    if (shift) {
      const vals = this._slotValues();
      const idx = this._editing.dayIdx * n + this._editing.slot;
      const overflow = vals[vals.length - 1];
      for (let i = vals.length - 1; i > idx; i--) vals[i] = vals[i - 1];
      vals[idx] = value;
      if (overflow) this._pushReport(overflow);
      this._writeSlots(vals);
    } else {
      const day = this._config.days[this._editing.dayIdx];
      const parts = this._split(day.entity);
      parts[this._editing.slot] = value;
      this._hass.callService("input_text", "set_value", {
        entity_id: day.entity,
        value: parts.join("|"),
      });
    }

    if (this._tookIndex >= 0) this._dropReportAt(this._tookIndex);
    this._close();
  }

  /* ================= RÉGLAGES ================= */
  _openSettings(page) {
    this._page = page || "root";
    this._adding = false;
    this._delMode = false;
    this._delMode = false;
    const root = this.shadowRoot;
    root.querySelector(".pscrim").hidden = false;
    this._renderSettings();
  }

  _back() {
    const page = this._page || "root";
    if (page === "color") { this._delMode = false; this._openSettings("days"); return; }
    if (page === "days" || page === "rows") { this._delMode = false; this._openSettings("root"); return; }
    this._closeSettings();
  }

  _closeSettings() {
    this._page = null;
    this._adding = false;
    this._delMode = false;
    clearTimeout(this._undoTimer);
    this._undo = null;
    this._undoExpires = 0;
    const root = this.shadowRoot;
    const s = root.querySelector(".pscrim");
    if (s) s.hidden = true;
  }

  /* icône Apple (SF Symbols), toujours en contour — même dessin que la feuille « Plus » */
  _sf(name) {
    const ic = (CORE.NAV_ICON || {})[name];
    return ic ? ic.o : "";
  }

  _svg(inner) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + inner + "</svg>";
  }

  _ico(name) {
    const P = {
      utensils: '<path d="M6 3v7a2 2 0 0 0 4 0V3"></path><path d="M8 10v11"></path><path d="M17 3c-1.5 1.3-2.3 3.1-2.3 5.3 0 2 .8 3.1 2.3 3.7V21"></path>',
      palette: '<path d="M12 21a9 9 0 1 1 9-9c0 1.9-1.5 3-3.3 3H16a2 2 0 0 0-1.5 3.4c.5.7.2 1.6-.6 2-.6.4-1.2.6-1.9.6z"></path><circle cx="8.2" cy="10.2" r=".9"></circle><circle cx="12" cy="7.6" r=".9"></circle><circle cx="15.6" cy="10.2" r=".9"></circle>',
      sun: '<circle cx="12" cy="12" r="4"></circle><path d="M12 2.4v2M12 19.6v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.4 12h2M19.6 12h2M4.6 19.4L6 18M18 6l1.4-1.4"></path>',
      moon: '<path d="M20 14.6A8.6 8.6 0 1 1 9.4 4a6.9 6.9 0 0 0 10.6 10.6z"></path>',
      apple: '<path d="M12 8.4c-1.2-1-2.5-1.4-3.8-.7C6.6 8.6 5.9 10.9 6.4 13c.6 2.7 2.4 5 4.1 5 .7 0 1-.3 1.5-.3s.8.3 1.5.3c1.7 0 3.5-2.3 4.1-5 .5-2.1-.2-4.4-1.8-5.3-1.3-.7-2.6-.3-3.8.7z"></path><path d="M12 8.4V5.6"></path><path d="M12 5.6c1.5-1.7 3.1-1.7 4.2-.6-1.3 1.7-2.9 1.8-4.2.6z"></path>',
      cup: '<path d="M5 8h11v5.5a5 5 0 0 1-5 5H10a5 5 0 0 1-5-5V8z"></path><path d="M16 9.5h1.8a2.2 2.2 0 0 1 0 4.4H16"></path><path d="M7.5 4.5c0 .8.8 1 .8 1.8"></path><path d="M11 4.5c0 .8.8 1 .8 1.8"></path>',
      glass: '<path d="M8 4h8l-.8 5.2A3.4 3.4 0 0 1 12 12a3.4 3.4 0 0 1-3.2-2.8L8 4z"></path><path d="M12 12v7"></path><path d="M8.6 19h6.8"></path>',
      plus: '<path d="M12 5.5v13M5.5 12h13"></path>',
      chevron: '<path d="M9 5.5l6.5 6.5L9 18.5"></path>',
      x: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"></path>',
      back: '<path d="M14.5 5.5L8 12l6.5 6.5"></path>',
      check: '<path d="M5.5 12.5l4.2 4.2L18.5 7.8"></path>',
      trash: '<path d="M4.5 7h15"></path><path d="M9.5 7V4.8h5V7"></path><path d="M6.5 7l.9 12.2h9.2L17.5 7"></path>'
    };
    return this._svg(P[name] || "");
  }

  _mealIcon(name) {
    const s = String(name || "").toLowerCase();
    if (/go[uû]t|collation|fruit|dessert|snack/.test(s)) return this._ico("apple");
    if (/brunch|petit|matin|d[eé]j/.test(s)) return this._ico("cup");
    if (/ap[eé]ro|ap[eè]ro|verre|cocktail/.test(s)) return this._ico("glass");
    if (/soir|d[iî]ner|nuit/.test(s)) return this._ico("moon");
    if (/midi|d[eé]jeuner|repas/.test(s)) return this._ico("sun");
    return this._ico("utensils");
  }

  _el(tag, cls, html) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html !== undefined) n.innerHTML = html;
    return n;
  }

  _link(iconName, title, sub, onClick) {
    const b = this._el("button", "plink");
    b.type = "button";
    b.innerHTML = '<span class="ico">' + this._ico(iconName) + "</span>" +
      '<span class="txt"><span class="name">' + this._esc(title) + "</span>" +
      (sub ? '<span class="sub">' + this._esc(sub) + "</span>" : "") + "</span>" +
      '<span class="chev">' + this._ico("chevron") + "</span>";
    b.addEventListener("click", onClick);
    return b;
  }

  _suggestions() {
    const have = this._rowDefs().map((r) => this._norm(r.name));
    const pool = ["Petit-déjeuner", "Midi", "Goûter", "Brunch", "Apéro", "Collation", "Soir"];
    return pool.filter((n) => have.indexOf(this._norm(n)) === -1).slice(0, 5);
  }

  _renderSettings() {
    const root = this.shadowRoot;
    if (!root) return;
    const back = root.querySelector(".phead .back");
    const h2 = root.querySelector(".phead h2");
    const body = root.querySelector(".pbody");
    if (!body || !h2) return;
    const page = this._page || "root";
    if (this._undo && this._undoExpires && Date.now() > this._undoExpires) {
      this._undo = null;
      this._undoExpires = 0;
    }
    if (page === "rows" && this._delMode) this._undo = null;
    back.hidden = page === "root";
    h2.classList.remove("long");
    body.innerHTML = "";
    const add = (n) => body.appendChild(n);

    if (page === "root") {
      h2.textContent = "Réglages";
      const c1 = this._el("div", "card");
      c1.appendChild(this._link("utensils", "Repas de la journée", "Midi, goûter, soir", () => this._openSettings("rows")));
      add(c1);
      const c2 = this._el("div", "card");
      c2.appendChild(this._link("palette", "Les couleurs", "Une teinte pour chaque jour", () => this._openSettings("days")));
      add(c2);
      return;
    }

    if (page === "rows") {
      h2.textContent = "Repas de la journée";
      add(this._el("p", "help", "Coché, le repas apparaît dans la semaine. Décoché, sa ligne disparaît."));
      const card = this._el("div", "card");
      this._rowDefs().forEach((r, i) => {
        const row = this._el("div", "srow");
        const del = this._delMode
          ? '<button class="delbtn" type="button">Supprimer</button>'
          : '<span class="tg' + (r.on ? " on" : "") + '"><i></i></span>';
        row.innerHTML = '<span class="ico">' + this._mealIcon(r.name) + "</span>" +
          '<span class="txt"><span class="name">' + this._esc(r.name) + "</span></span>" + del;
        if (this._delMode) row.querySelector(".delbtn").addEventListener("click", () => {
          if (row.dataset.removing) return;
          row.dataset.removing = "1";
          row.style.height = row.getBoundingClientRect().height + "px";
          requestAnimationFrame(() => requestAnimationFrame(() => row.classList.add("removing")));
          setTimeout(() => this._removeRow(i), 360);
        });
        else row.querySelector(".tg").addEventListener("click", () => this._toggleRow(i));
        card.appendChild(row);
      });
      add(card);

      if (this._undo) {
        const u = this._el("div", "undo", "<span>Modifié</span><button class=\"uact\" type=\"button\">Annuler</button><button class=\"udismiss\" type=\"button\">✕</button>");
        u.querySelector(".uact").addEventListener("click", () => this._undoLast());
        u.querySelector(".udismiss").addEventListener("click", () => { this._undo = null; this._renderSettings(); });
        add(u);
      }

      if (this._delMode) {
        const done = this._el("button", "pbtn", "Terminé");
        done.type = "button";
        done.addEventListener("click", () => { this._delMode = false; this._renderSettings(); });
        add(done);
        return;
      }

      if (!this._adding) {
        const cAdd = this._el("div", "card");
        cAdd.appendChild(this._link("plus", "Ajouter un instant repas", "Un goûter, un brunch, un apéro…", () => {
          this._adding = true;
          this._renderSettings();
          setTimeout(() => { const i = root.querySelector(".form input"); if (i) i.focus(); }, 30);
        }));
        add(cAdd);
        const dz = this._el("div", "danger");
        const cDel = this._el("button", "danger-btn");
        cDel.type = "button";
        cDel.innerHTML = this._sf("trash") + "<span>Supprimer un instant repas</span>";
        cDel.addEventListener("click", () => { this._delMode = true; this._renderSettings(); });
        dz.appendChild(cDel);
        add(dz);
      } else {
        const cForm = this._el("div", "card");
        const f = this._el("div", "form");
        f.innerHTML = '<input type="text" maxlength="24" placeholder="Nom du moment" autocomplete="off">' +
          '<div class="chips">' + this._suggestions().map((n) => '<button class="chip" type="button">' + n + "</button>").join("") + "</div>" +
          '<div class="formrow"><button class="no" type="button">Annuler</button><button class="ok" type="button">Ajouter</button></div>';
        const inp = f.querySelector("input");
        f.querySelectorAll(".chip").forEach((ch) => ch.addEventListener("click", () => { inp.value = ch.textContent; inp.focus(); }));
        f.querySelector(".no").addEventListener("click", () => { this._adding = false;
    this._delMode = false; this._renderSettings(); });
        f.querySelector(".ok").addEventListener("click", () => this._addRowNamed(inp.value));
        inp.addEventListener("keydown", (ev) => {
          if (ev.key === "Enter") { ev.preventDefault(); this._addRowNamed(inp.value); }
        });
        cForm.appendChild(f);
        add(cForm);
      }
      return;
    }

    if (page === "days") {
      h2.textContent = "Les couleurs";
      const pal = this._palette();
      const card = this._el("div", "card");
      this._config.days.forEach((d, i) => {
        const row = this._el("div", "srow tap");
        row.innerHTML = '<span class="txt"><span class="name">' + this._esc(d.label) + "</span></span>" +
          '<span class="dot" role="button" style="background:' + pal[i] + '"></span>';
        row.addEventListener("click", () => { this._selDay = i; this._openSettings("color"); });
        card.appendChild(row);
      });
      add(card);
      return;
    }

    if (page === "color") {
      const dn = this._config.days[this._selDay] ? this._config.days[this._selDay].label : "";
      h2.textContent = "Choisis la couleur du " + dn.toLowerCase();
      h2.classList.add("long");
      const pal = this._palette();
      const cur = String(pal[this._selDay] || "").toUpperCase();
      const grid = this._el("div", "swgrid");
      SWATCHES.forEach((c) => {
        const b = document.createElement("button");
        b.type = "button";
        b.innerHTML = '<span class="tile"><i style="background:' + c + '"></i></span>';
        if (c.toUpperCase() === cur) b.classList.add("on");
        b.addEventListener("click", () => {
          grid.querySelectorAll("button").forEach((x) => x.classList.remove("on"));
          b.classList.add("on");
          this._pickColor(c);
        });
        grid.appendChild(b);
      });
      add(grid);
      add(this._el("div", "spacer"));
      const done = this._el("button", "pbtn", "Terminé");
      done.type = "button";
      done.addEventListener("click", () => this._openSettings("days"));
      add(done);
    }
  }

  _setRows(defs) {
    if (!this._hass) return;
    this._hass.callService("input_text", "set_value", {
      entity_id: this._config.rows_entity || ROWS_ENTITY,
      value: defs.map((r) => r.name + "=" + (r.on ? "1" : "0")).join(",").slice(0, 255),
    });
  }

  _setPalette(list) {
    if (!this._hass) return;
    this._hass.callService("input_text", "set_value", {
      entity_id: this._config.colors_entity || COLORS_ENTITY,
      value: list.join(",").slice(0, 255),
    });
  }

  _snapshot() {
    this._undo = {
      rows: this._rowDefs().map((r) => ({ name: r.name, on: r.on })),
      n: this._rowDefs().length,
      values: this._slotValues(),
      at: Date.now(),
    };
    this._undoExpires = Date.now() + 5000;
    clearTimeout(this._undoTimer);
    this._undoTimer = setTimeout(() => {
      this._undo = null;
      this._undoExpires = 0;
      if (this._page === "rows") this._renderSettings();
    }, 5000);
  }

  _undoLast() {
    if (!this._undo) return;
    const u = this._undo;
    const rows = u.rows;
    this._setRows(rows);
    this._config.days.forEach((d, i) => {
      const seg = [];
      for (let k = 0; k < rows.length; k++) seg.push(u.values[i * u.n + k] || "");
      this._hass.callService("input_text", "set_value", { entity_id: d.entity, value: seg.join("|") });
    });
    this._undo = null;
    this._rebuildSoon(900);
  }

  _toggleRow(i) {
    const defs = this._rowDefs();
    if (!defs[i]) return;
    defs[i].on = !defs[i].on;
    this._setRows(defs);
    this._rebuildSoon();
  }

  _rank(name) {
    const s = this._norm(name);
    if (/petit|dej|matin|brunch/.test(s)) return 5;
    if (/midi|dejeuner|dejeun/.test(s)) return 10;
    if (/gout|collation|apres/.test(s)) return 20;
    if (/apero|aperitif/.test(s)) return 25;
    if (/soir|diner|nuit/.test(s)) return 30;
    return 35;
  }

  _addRowNamed(name) {
    const nm = String(name || "").trim().slice(0, 24);
    if (!nm) return;
    this._snapshot();
    const defs = this._rowDefs();
    const rk = this._rank(nm);
    let pos = defs.findIndex((r) => this._rank(r.name) > rk);
    if (pos < 0) pos = defs.length;
    defs.splice(pos, 0, { name: nm, on: true });
    this._setRows(defs);
    this._config.days.forEach((d) => {
      const cur = String(this._state(d.entity)).split("|");
      const seg = [];
      for (let k = 0; k < defs.length; k++) {
        if (k < pos) seg.push(cur[k] || "");
        else if (k === pos) seg.push("");
        else seg.push(cur[k - 1] || "");
      }
      this._hass.callService("input_text", "set_value", { entity_id: d.entity, value: seg.join("|") });
    });
    this._adding = false;
    this._delMode = false;
    this._rebuildSoon();
  }

  _removeRow(i) {
    const defs = this._rowDefs();
    if (!defs[i] || defs.length <= 1) return;
    this._snapshot();
    const oldN = defs.length;
    defs.splice(i, 1);
    this._setRows(defs);
    this._config.days.forEach((d) => {
      const cur = String(this._state(d.entity)).split("|");
      const seg = [];
      for (let k = 0; k < defs.length; k++) seg.push(k < i ? (cur[k] || "") : (cur[k + 1] || ""));
      this._hass.callService("input_text", "set_value", { entity_id: d.entity, value: seg.join("|") });
    });
    this._rebuildSoon(450);
  }

  _pickColor(hex) {
    const pal = this._palette().slice();
    pal[this._selDay] = hex;
    this._setPalette(pal);
    const nVis = this._visibleRows().length;
    const prev = this.shadowRoot.querySelector(".preview");
    if (prev) {
      prev.querySelectorAll("span").forEach((s, k) => {
        s.style.background = this._ramp(hex, 1 - 0.09 * k);
      });
    }
  }

  _rebuildSoon(delay) {
    clearTimeout(this._rt);
    this._rt = setTimeout(() => {
      this._built = false;
      this._build();
      this._sync();
      if (this._page) {
        const ps = this.shadowRoot.querySelector(".pscrim");
        if (ps) ps.hidden = false;
        this._renderSettings();
      }
    }, delay || 350);
  }
}

if (!customElements.get("skylight-meals-v2")) {
  customElements.define("skylight-meals-v2", SkylightMealsV2Card);
}
window.customCards = window.customCards || [];
window.customCards.push({
  type: "skylight-meals-v2",
  name: "Skylight Meals v2",
  description: "Planning repas façon Skylight (7 couleurs, lignes dynamiques)",
});
