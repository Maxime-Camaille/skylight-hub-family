/* skylight-tasks-card — vue Tâches / Routine façon Skylight Calendar 2
 *
 * S'appuie sur le TRONC COMMUN (famille-core.js) : jetons, barre de navigation,
 * en-tête, feuille, avatars, états vides et accès aux données viennent de là.
 * Ce fichier ne doit plus en garder de copie (voir ETAT-CHANTIER.md §4).
 *
 * type: custom:skylight-tasks-card
 * chores_entity: todo.taches_famille        # tâches ponctuelles, partagées
 * time_entity: sensor.heure_actuelle
 * weather_entity: weather.forecast_maison
 * stars_per_task: 10
 * evening_from: 16                         # heure de bascule auto vers le soir
 * profiles:
 *   - id: mateo                            # clé utilisée dans r.o (chores) et les routines
 *     name: Matéo
 *     color: "#B7E4C7"                     # pastel de la personne (calendrier)
 *     accent: "#2E9E63"                    # teinte d'identité (avatar, coche, anneau, jauge)
 *     routine_entity: todo.routines_mateo
 *     stars: true                          # barre d'étoiles (défaut : oui si routine_entity)
 *     photo: /local/avatars/mateo.webp     # optionnel, sinon initiale
 * nav:
 *   - {icon: cal, label: Calendrier, path: /famille-home/calendrier}
 *
 * Modèle : un item todo par tâche. La description porte les métadonnées JSON :
 *   routine : {"t":"routine","p":"morning|afternoon|evening","d":[1..7],"n":1,"e":"🪥","s":10}
 *   tâche   : {"t":"chore","o":"mateo","e":"🛋️","s":10}
 * done = statut "completed" ; la remise à zéro quotidienne est faite par
 * script.taches_remise_a_zero (automatisation de 4 h).
 *
 * Étoiles : le compteur de la colonne est le SOLDE cumulatif, lu sur
 * `counter.etoiles_<id>` (surchargeable par `stars_entity`). Il monte au
 * cochage et redescend au décochage, via `script.etoiles` (nom surchargeable
 * par `stars_script`), qui boucle des counter.increment/decrement côté serveur.
 */

const CSS = `
:host{display:block;height:100%;max-height:100vh;overflow:hidden;--em-fade:.65;--em-sat:1;font-family:var(--skylight-sans,Figtree,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif);color:#1F2328}
*,*::before,*::after{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
.app{display:flex;height:100%;overflow:hidden;background:#fff}
.main{flex:1 1 auto;min-width:0;min-height:0;position:relative;display:flex;flex-direction:column}
.pvband{display:none;align-items:center;gap:10px;margin:0 14px 8px;padding:10px 10px 10px 14px;border-radius:14px;background:#F1F3F6;color:#2B2F38;font-size:13.5px;font-weight:600;flex:0 0 auto}
.pvband.on{display:flex}
.pvband .pvdot{width:17px;height:17px;flex:0 0 17px;color:#5F6675;display:inline-flex}
.pvband .pvdot svg{width:17px;height:17px;fill:currentColor}
.pvband button{margin-left:auto;border:1px solid #D8DEE8;background:#fff;border-radius:10px;padding:7px 13px;font:inherit;font-size:12.5px;font-weight:700;color:#2B2F38;cursor:pointer;box-shadow:0 1px 2px rgba(31,35,40,.06)}
.board{flex:1 1 auto;min-height:0;display:flex;gap:12px;padding:6px 14px 14px;overflow-x:auto;overflow-y:hidden;scrollbar-width:none}
.board::-webkit-scrollbar{display:none}
/* voile de fin de plateau : signale qu'il reste des colonnes à droite */
.bfade{position:absolute;right:0;top:0;bottom:14px;width:52px;pointer-events:none;opacity:0;transition:opacity .18s ease;background:linear-gradient(to left,rgba(255,255,255,.92),rgba(255,255,255,0))}
.bfade.on{opacity:1}
/* quatre colonnes visibles, à largeur FIXE : les profils suivants débordent à
   droite (défilement) au lieu de rétrécir les colonnes affichées */
.col{flex:0 0 calc((100% - 36px) / 4);min-width:250px;min-height:0;overflow:hidden;border-radius:30px;background:var(--col);display:flex;flex-direction:column;padding:14px 14px 0;scroll-snap-align:start}
/* feuille « Affichage » : deux blocs dans un seul panneau */
.sect2{font-family:var(--skylight-serif,Literata,Georgia,serif);font-size:17px;margin:14px 2px 5px}
.sect2:first-child{margin-top:2px}
/* bande d'ordre : une BANDE HORIZONTALE, à l'image du tableau.
   Chaque personne est une mini-colonne avec ses deux flèches ‹ › — la direction
   à l'écran est la même que celle du tableau, donc rien à interpréter. */
.ostrip{display:flex;gap:8px;overflow-x:auto;scrollbar-width:none;padding:2px 2px 8px}
.ostrip::-webkit-scrollbar{display:none}
.ocell{flex:0 0 calc(100% / 4.4);min-width:0;display:flex;flex-direction:column;align-items:center;gap:7px;background:var(--col);border-radius:16px;padding:9px 4px 7px}
.ocell .oa{width:46px;height:46px;flex:0 0 46px;border-radius:50%;overflow:hidden;background:var(--accent);display:grid;place-items:center;color:#fff;font-size:18px;font-weight:700;box-shadow:0 0 0 3px var(--halo),0 2px 9px var(--halo);position:relative;cursor:pointer}
/* colonne masquée : avatar barré, nom estompé — les flèches restent nettes */
.ocell.off .oa,.ocell.off .on{opacity:.45}
.ocell.off .oa img{filter:grayscale(1)}
.ocell.off .oa::after{content:'';position:absolute;left:-3px;right:-3px;top:calc(50% - 1.5px);height:3px;border-radius:2px;background:#fff;transform:rotate(-45deg);box-shadow:0 1px 2px rgba(31,35,40,.28)}
.ocell .oa img{width:100%;height:100%;object-fit:cover;display:block}
.ocell .oa .gico{display:grid;place-items:center;width:100%;height:100%}
.ocell .oa .gico img{width:22px;height:22px;object-fit:contain;filter:brightness(0) invert(1)}
.ocell .on{font-size:11.5px;font-weight:700;line-height:1.15;text-align:center;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ocell .oarrows{display:flex;gap:4px}
.ocell .omv{width:32px;height:32px;flex:0 0 32px;border:0;border-radius:9px;background:#fff;color:#2B2F38;font:inherit;font-size:15px;font-weight:700;line-height:1;cursor:pointer;box-shadow:0 1px 3px rgba(31,35,40,.12);display:grid;place-items:center;padding:0}
.ocell .omv[data-off="1"]{opacity:.24;pointer-events:none;box-shadow:none;background:rgba(255,255,255,.5)}
.ocell .omv:active{transform:scale(.92)}
.bars{display:flex;gap:7px;margin-top:4px}
.bar{position:relative;flex:1 1 0;min-width:0;height:var(--f-pill-h,26px);border-radius:999px;background:var(--band);overflow:hidden;display:flex;align-items:center;justify-content:center;font-size:var(--f-pill-fs,12.5px);font-weight:var(--f-pill-fw,700);color:#2B2F38;line-height:1}
.bar .fill{position:absolute;left:0;top:0;bottom:0;background:var(--accent);opacity:.62;border-radius:999px;transition:width .48s cubic-bezier(.32,.72,0,1)}
.bar .txt{position:relative;display:flex;align-items:center;justify-content:center;gap:5px;height:26px;line-height:1}
.n{display:inline-block;line-height:1;transform:translateY(.5px)}
.bar .txt .n{font-weight:700}
.bar svg{display:block;width:14px;height:14px;flex:0 0 14px}
.bar .ck{fill:currentColor}
.bar .st{width:var(--f-pill-icon,16px);height:var(--f-pill-icon,16px);flex:0 0 var(--f-pill-icon,16px);fill:#F5B93E}
.periods{display:flex;gap:5px;padding:18px 2px 0}
.per{flex:1 1 0;min-width:0;border:0;background:none;font:inherit;cursor:pointer;padding:0;display:flex;flex-direction:column;align-items:center;gap:5px}
.disc{position:relative;width:100%;max-width:58px;aspect-ratio:1;border-radius:50%;display:grid;place-items:center;background:var(--band)}
.disc .em{font-size:24px;line-height:1;opacity:1}
.per[data-on="0"] .disc{box-shadow:none}
.per[data-on="1"] .disc{background:#fff;box-shadow:inset 0 0 0 1.15px rgba(31,35,40,.72)}
.per[data-on="0"] .disc .em{opacity:var(--em-fade,.65);filter:saturate(var(--em-sat,1))}
.ring{position:absolute;inset:0;width:100%;height:100%;transform:rotate(-90deg);overflow:visible}
.ring .arc{fill:none;stroke:var(--accent);stroke-width:7.5;stroke-linecap:round;opacity:1;transition:stroke-dasharray .48s cubic-bezier(.32,.72,0,1)}
.ring .arc[data-zero="1"]{display:none}
.per[data-on="0"] .ring .arc{opacity:.55}
.per .lb{font-size:11px;font-weight:600;color:#8A8F9C;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
.per[data-on="1"] .lb{color:#1F2328}
.scroll{flex:1 1 auto;min-height:0;position:relative;overflow-y:auto;overflow-x:hidden;padding:2px 3px 10px;scrollbar-width:none}
.scroll::-webkit-scrollbar{display:none}
.sect{flex:0 0 auto;font-family:var(--skylight-serif,Literata,Georgia,serif);font-size:22px;margin:14px 2px 10px}
.tiles{display:flex;flex-direction:column;gap:10px}
/* La carte garde son bouton de gestion HORS d'elle : une carte est déjà un
   <button>, et cliquer la carte doit cocher la tâche, pas ouvrir la fiche. */
.rw{position:relative}
.mng{position:absolute;top:6px;right:8px;z-index:2;width:26px;height:26px;padding:0;border:0;border-radius:50%;background:transparent;color:#8A8F9C;font:inherit;font-size:17px;line-height:1;font-weight:600;display:grid;place-items:center;cursor:pointer;opacity:.5;transition:opacity .12s ease,color .12s ease}
.mng:hover{opacity:1;color:#1F2328}
.rw>.mng:active{opacity:1;color:#1F2328;transform:scale(.9)}
.tile{position:relative;border:0;width:100%;border-radius:22px;background:var(--tile);color:inherit;font:inherit;text-align:left;cursor:pointer;padding:0;display:flex;flex-direction:column;overflow:hidden;height:clamp(120px,18.25vh,146px);transition:transform .07s ease}
.tile:active{transform:scale(.994)}
.tile .ill{flex:1 1 auto;min-height:0;display:grid;place-items:center;font-size:46px;line-height:1;padding:12px 8px 4px}
.tile .foot{flex:0 0 auto;display:flex;align-items:center;justify-content:space-between;gap:8px;background:var(--band);padding:9px 12px 10px}
.tile .txt{min-width:0}
.tile .lb{font-size:14.5px;font-weight:700;line-height:1.16;display:block;word-break:break-word}
.tile .schip{display:inline-flex;align-items:center;gap:3px;margin-top:5px;background:#fff;border-radius:7px;padding:2px 7px;font-size:11px;line-height:1;font-weight:600;color:#3A4050;height:auto}
.tile .schip svg{display:block;width:11px;height:11px;flex:0 0 11px;fill:#A89B84}
.tile .schip.filled svg{fill:#F5B93E}
.tile .chk{width:24px;height:24px;flex:0 0 24px;border-radius:50%;background:#fff;display:grid;place-items:center;font-size:13px;font-weight:700;color:#fff;box-shadow:0 1px 2px rgba(31,35,40,.10);align-self:center}
.tile.done{background:var(--done)}
/* coche : le rond se remplit et le trait se dessine (animation seulement au cochage) */
.chk{position:relative}
.chk svg{display:block;width:15px;height:15px}
.chk svg path{fill:none;stroke:#fff;stroke-width:3.4;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:24;stroke-dashoffset:24}
.tile.done .chk svg path,.chore.done .chk svg path{stroke-dashoffset:0}
/* couche d'effets : au-dessus de tout, hors des cartes (sinon overflow:hidden rogne) */
.fx{position:fixed;inset:0;pointer-events:none;z-index:9999;overflow:visible}
.fxdot{position:absolute;width:7px;height:7px;border-radius:50%;will-change:transform}
.fxstar{position:absolute;color:#F5B93E;line-height:1;will-change:transform;text-shadow:0 1px 2px rgba(120,80,0,.18)}
.bar.pulse{animation:barpulse .42s cubic-bezier(.34,1.5,.64,1)}
@keyframes barpulse{0%{transform:scale(1)}45%{transform:scale(1.07)}100%{transform:scale(1)}}
/* célébration : toutes les tâches du jour faites */
.celebrate{position:fixed;inset:0;z-index:10001;display:none;align-items:center;justify-content:center;pointer-events:none;overflow:hidden;background:rgba(20,24,40,.34)}
.celebrate.on{display:flex;pointer-events:auto;cursor:pointer}
.cel-card{position:relative;z-index:2;background:#fff;border-radius:26px;padding:26px 36px 24px;text-align:center;box-shadow:0 18px 50px rgba(20,24,40,.22);animation:celin .42s cubic-bezier(.34,1.5,.64,1)}
.cel-em{font-size:44px;line-height:1}
.cel-ttl{font-family:var(--skylight-serif,Literata,Georgia,serif);font-size:25px;font-weight:600;margin-top:10px}
.cel-sub{font-size:14.5px;color:#5A6074;margin-top:5px}
.cel-piece{position:absolute;top:-24px;width:9px;height:15px;border-radius:3px;will-change:transform;animation:fall linear forwards}
@keyframes celin{from{transform:scale(.82);opacity:0}to{transform:scale(1);opacity:1}}
@keyframes fall{0%{transform:translate3d(0,-10px,0) rotate(0)}100%{transform:translate3d(var(--dx,0),105vh,0) rotate(var(--rot,540deg))}}
.tile.pin.done .chk,.chore.pin.done .chk{animation:chkpop .42s cubic-bezier(.34,1.5,.64,1)}
.tile.pin.done .chk svg path,.chore.pin.done .chk svg path{animation:chkdraw .3s ease .05s both}
.tile.pin.done .chk::after,.chore.pin.done .chk::after{content:'';position:absolute;inset:-4px;border-radius:50%;border:2px solid var(--accent);animation:chkring .6s cubic-bezier(.32,.72,0,1) forwards}
@keyframes chkpop{0%{transform:scale(.86)}55%{transform:scale(1.13)}100%{transform:scale(1)}}
@keyframes chkdraw{from{stroke-dashoffset:24}to{stroke-dashoffset:0}}
@keyframes chkring{0%{opacity:.55;transform:scale(.55)}100%{opacity:0;transform:scale(1.35)}}
.tile.done .foot{background:transparent}
.tile.done .chk{background:var(--accent);box-shadow:none}
.tile.done .lb{color:#1F2328}
.tile.done .schip{background:#fff}
.tile.nostar{height:134px}
.chores{display:flex;flex-direction:column;gap:14px;margin-top:10px}
.chore{display:flex;align-items:center;gap:9px;border:0;width:100%;min-height:46px;border-radius:999px;background:var(--band);color:inherit;font:inherit;cursor:pointer;padding:9px 10px 9px 16px;text-align:left}
.chore .ctxt{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px;align-items:flex-start}
.chore .lb{font-size:14.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
.chore .sub{display:flex;align-items:center;gap:7px;font-size:11.5px;font-weight:600;color:#6C7382}
.chore .sub .rel{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.chore .cchip{display:inline-flex;align-items:center;gap:3px;background:#fff;border-radius:999px;padding:2px 7px;font-size:10.5px;font-weight:600;color:#3A4050;flex:0 0 auto}
.chore .cchip svg{display:block;width:11px;height:11px;fill:#A89B84}
.chore .cchip.filled svg{fill:#F5B93E}
.chore .chk{width:24px;height:24px;flex:0 0 24px;border-radius:50%;background:#fff;display:grid;place-items:center;font-size:13px;font-weight:700;color:#fff;box-shadow:0 1px 2px rgba(31,35,40,.10)}
.chore.done{background:var(--done)}
.chore.tall{border-radius:20px;padding:11px 12px 11px 16px}
.chore.done .chk{background:var(--accent);box-shadow:none}
.chore.done .lb{color:#1F2328}
.empty{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:22px;color:#78808F;font-size:17px;font-weight:500;line-height:1.3;text-align:center;padding:0 12px 44px}
.empty .e{font-size:64px;line-height:1;opacity:.92}
/* en coordonnées écran, comme le bouton de la coque (calendrier) : les deux
   boutons « + » de l'app doivent tomber exactement au même endroit, et le
   glyphe doit être le même — d'où la police explicite (un <button> ne l'hérite
   pas : sans elle il rend en Arial, plus épais que Figtree) */
.fab{position:fixed;right:calc(16px + env(safe-area-inset-right,0px));bottom:calc(16px + env(safe-area-inset-bottom,0px));width:56px;height:56px;border-radius:50%;border:0;background:var(--f-blue,#007AFF);color:#fff;font-family:Figtree,system-ui,sans-serif;font-size:27px;line-height:1;cursor:pointer;box-shadow:0 8px 22px rgba(31,35,40,.26);display:grid;place-items:center;z-index:5}
.scrim{position:fixed;inset:0;background:rgba(20,24,40,.34);display:none;z-index:98}
.scrim.on{display:block}
.scrim.soft{background:transparent}
/* la feuille (.panel, .ptop, .pbody, .pfoot) est dans famille-core.js */
.field{display:flex;align-items:center;gap:12px;height:54px;border-radius:16px;background:#F5F6FA;padding:0 16px;margin-bottom:12px;color:#8A8F9C;font-size:15px}
/* champ en cours d'édition : anneau intérieur, jamais rogné par le panneau */
.field:focus-within{background:#fff;box-shadow:inset 0 0 0 2px var(--f-blue-line,rgba(0,122,255,.42))}
.field .ic{width:18px;text-align:center;flex:0 0 18px;display:grid;place-items:center}
.field .ic svg{width:17px;height:17px;fill:currentColor}
.field input{border:0;background:none;font:inherit;font-size:16px;color:#1F2328;flex:1;min-width:0;outline:none}
.box{background:#F7F8FB;border-radius:22px;padding:16px 14px;margin-bottom:12px}
.box .lbl{display:flex;align-items:center;gap:8px;font-size:13.5px;font-weight:600;color:#4A5464;margin-bottom:14px}
.box .lbl svg{width:16px;height:16px;fill:currentColor}
/* Rangeés horizontales SANS barre de défilement : elles restent glissables au
   doigt (natif) et, à la souris, par la molette (mappée à l'horizontale) ou en
   glissant au clic — voir _hScroll. Le prochain élément dépasse toujours, pour
   qu'on devine qu'il en reste (convention du dépôt). */
.profiles{display:flex;gap:8px;overflow-x:auto;scrollbar-width:none;padding:7px 6px 8px;margin:0 -6px -4px}
.profiles::-webkit-scrollbar{display:none}
.profiles::-webkit-scrollbar{height:0}
/* glissement à la souris (clic maintenu), comme le plateau des colonnes */
.profiles[data-drag="1"]{cursor:grabbing;user-select:none}
/* pastilles de couleur du formulaire « Créer un profil » (classe distincte de
   .sw, qui est l'interrupteur de la carte) */
.pcsw{width:32px;height:32px;flex:0 0 32px;border-radius:50%;border:0;padding:0;cursor:pointer;box-shadow:0 0 0 1px rgba(31,35,40,.08)}
.pfrow2{display:flex;gap:0;overflow-x:auto;scrollbar-width:none;padding:6px 0;margin:0;align-items:flex-start}
.pfrow2::-webkit-scrollbar{height:0}
/* Les deux rangées défilent horizontalement. La largeur des cellules n'est pas
   un diviseur exact du conteneur : la 6e image / la 8e couleur dépasse à droite,
   tronquée. C'est cet amorce qui indique qu'il y en a d'autres à faire glisser
   — sans elle, une rangée pleine a l'air complète.
   align-items:flex-start : sans lui, iOS étire les cellules à la hauteur de
   la rangée et les ronds deviennent des ellipses (l'aspect-ratio est ignoré sur
   un élément étiré). Le rond porte en plus son propre aspect-ratio, ceinture et
   bretelles. */
.pfcell{flex:0 0 calc(100% / 5.6);aspect-ratio:1;height:auto;align-self:flex-start;border:0;padding:7px;background:none;cursor:pointer;display:block}
.pfcolc{flex:0 0 calc(100% / 7.4)}
.pfdot{display:grid;place-items:center;width:100%;height:auto;aspect-ratio:1;border-radius:50%;overflow:hidden;background:var(--tile);box-shadow:0 3px 10px var(--halo);font-size:19px;color:var(--accent)}
.pfdot img{width:100%;height:100%;object-fit:cover;display:block}
.pfcell[data-on="1"] .pfdot{background:var(--accent);color:#fff;box-shadow:0 0 0 3px #fff,0 0 0 6px var(--accent)}
.pfcolc[data-on="1"] .pfdot{box-shadow:0 0 0 3px #fff,0 0 0 6px #1F2328}
.hdrin{font-family:var(--skylight-serif,Literata,Georgia,serif);font-size:19px;font-weight:600;border:0;border-bottom:2px solid var(--f-blue-line,rgba(0,122,255,.42));background:transparent;color:#1F2328;outline:none;width:150px;padding:0 1px 1px;box-shadow:none;appearance:none}
.hdrin::selection{background:rgba(127,176,212,.35);color:#1F2328}
.pen{display:inline-grid;place-items:center;width:26px;height:26px;margin-left:8px;border:0;border-radius:50%;background:#F1F3F7;color:#5A6074;cursor:pointer;vertical-align:middle}
.pen:hover{background:#E6EAF1}
.pname{display:inline-block;font-family:var(--skylight-serif,Literata,Georgia,serif);font-size:27px;font-weight:600;line-height:1.15;padding:1px 2px 2px;cursor:text;border-bottom:2px dashed transparent;max-width:100%;word-break:break-word}
.pname:hover{border-bottom-color:#D7DCE3}
.pname-in{display:block;width:100%;font-family:var(--skylight-serif,Literata,Georgia,serif);font-size:27px;font-weight:600;line-height:1.15;border:0;border-bottom:2px solid var(--f-blue-line,rgba(0,122,255,.42));background:transparent;color:#1F2328;outline:none;padding:1px 2px 2px}
.pfwrap{position:relative}
.pfwrap{position:relative}
.pfwrap::after{content:'';position:absolute;top:0;right:0;bottom:0;width:14px;pointer-events:none;background:linear-gradient(to right,rgba(255,255,255,0),#fff 65%)}
.pcsw[data-on="1"]{box-shadow:0 0 0 2px #fff,0 0 0 4px #1F2328}
.profiles::-webkit-scrollbar{display:none}
.pf{flex:0 0 20%;border:0;background:none;font:inherit;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:10px;padding:0;min-width:0}
.pf .a{width:46px;height:46px;border-radius:50%;overflow:hidden;background:var(--accent);box-shadow:0 0 0 3px var(--halo),0 2px 9px var(--halo);display:grid;place-items:center;color:#fff;font-size:17px;font-weight:700}
.pf .a img{width:100%;height:100%;object-fit:cover;display:block}
.pf .n{font-size:11px;font-weight:600;color:#5A6074;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;line-height:1.2}
.pf[data-on="1"] .a{box-shadow:0 0 0 3px #fff,0 0 0 6px var(--accent)}
.pf[data-on="1"] .n{color:#1F2328}
.sw{width:44px;height:25px;flex:0 0 44px;border-radius:999px;border:0;background:#D8DDE5;position:relative;cursor:pointer;padding:0;transition:background .15s ease}
.sw span{position:absolute;top:3px;left:3px;width:19px;height:19px;border-radius:50%;background:#fff;box-shadow:0 1px 2px rgba(31,35,40,.28);transition:left .15s ease}
.sw[data-on="1"]{background:var(--f-blue,#007AFF)}
.sw[data-on="1"] span{left:22px}
.seg{display:flex;gap:8px}
.seg button{flex:1 1 0;height:42px;border-radius:12px;border:1px solid transparent;background:#fff;font:inherit;font-size:14px;font-weight:600;color:#5A6074;cursor:pointer;padding:0 6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.seg button[data-on="1"]{border-color:#C9D2DE;color:#1F2328;box-shadow:0 1px 2px rgba(31,35,40,.06)}
.row{display:flex;align-items:center;gap:8px;margin-bottom:8px}
.num{width:64px;height:42px;border-radius:12px;border:1px solid #E2E7EE;background:#fff;text-align:center;font:inherit;font-size:15px;font-weight:600;color:#1F2328;outline:none}
.days{display:flex;gap:6px;justify-content:space-between}
.day{flex:1 1 0;height:42px;border-radius:11px;border:1px solid #E2E7EE;background:#fff;font:inherit;font-size:13px;font-weight:600;color:#5A6074;cursor:pointer;padding:0}
.day[data-on="1"]{border-color:var(--f-blue,#007AFF);color:#1F2328;box-shadow:0 0 0 1px var(--f-blue,#007AFF) inset}
/* .pfoot et la feuille sont dans famille-core.js */
.go{width:100%;height:54px;border-radius:16px;border:0;background:var(--f-blue-soft,#E5F0FF);color:#fff;font:inherit;font-size:17px;font-weight:700;cursor:pointer}
.go[data-on="1"]{background:var(--f-blue,#007AFF)}
.del{width:100%;height:46px;border-radius:14px;border:0;background:transparent;color:var(--f-danger,#FF3B30);font:inherit;font-size:15px;font-weight:700;cursor:pointer;margin-top:10px}
.hint{font-size:13px;color:#8A8F9C;margin:4px 2px 0;line-height:1.4}
/* interrupteur « ouvert à tous » */
.togrow{display:flex;align-items:center;gap:12px;width:100%;border:0;background:none;font:inherit;cursor:pointer;padding:2px 0}
.togrow .tic{width:24px;height:24px;flex:0 0 24px;display:grid;place-items:center;color:#7A8290;transition:color .15s ease}
.togrow .tic svg{width:22px;height:22px}
.togrow .tic img{width:22px;height:22px;object-fit:contain;display:block;opacity:.42;transition:opacity .15s ease}
.togrow[data-on="1"] .tic img{opacity:1}
.togrow .ttl{flex:1 1 auto;text-align:left;font-size:14px;font-weight:600;color:#7A8290;transition:color .15s ease}
.togrow[data-on="1"] .ttl{color:#1F2328}
.togrow[data-on="1"] .tic{color:#1F2328}
.sw{width:50px;height:30px;flex:0 0 50px;border-radius:999px;background:#D5DBE4;position:relative;transition:background .18s ease}
.sw::after{content:'';position:absolute;top:3px;left:3px;width:24px;height:24px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(20,24,40,.22);transition:transform .18s ease}
.sw[data-on="1"]{background:var(--f-blue,#007AFF)}
.sw[data-on="1"]::after{transform:translateX(20px)}
.box.off{opacity:.45;pointer-events:none}
/* sélecteur de type : deux pastilles icône (Skylight actuel) */
.types{display:flex;gap:8px;margin:2px 0 12px;padding:0 2px}
.trow{display:flex;gap:9px;align-items:stretch;margin-bottom:9px}
.trow .field{flex:1 1 auto;margin-bottom:0}
.emobtn{width:54px;flex:0 0 54px;border:0;border-radius:14px;background:#F5F6FA;color:#3A4050;line-height:1;cursor:pointer;display:grid;place-items:center;padding:0}
.emobtn svg{width:24px;height:24px;fill:currentColor}
.emobtn[data-mode="emoji"]{font-size:25px}
.emobtn.manual{background:#EDF3FB}
.tbtn{display:flex;flex-direction:column;align-items:center;gap:8px;border:0;background:none;font:inherit;cursor:pointer;padding:0;min-width:60px}
.tbtn .c{width:60px;height:60px;border-radius:50%;display:grid;place-items:center;background:#F1F2F4;color:#1F2328;border:1.6px solid transparent;transition:background .16s ease,border-color .16s ease,color .16s ease}
.tbtn .c svg{width:26px;height:26px;fill:currentColor}
.tbtn .t{font-size:13px;font-weight:600;color:#7A8290}
.pf.addp .a{background:#fff;border:1.6px dashed #C6CEDA;color:#7A8290;box-shadow:none}
.pf.addp .a svg{width:20px;height:20px;fill:currentColor}
.pf.addp .n{color:#8A909E}
.tbtn[data-on="1"] .c{background:#fff;border-color:#1F2328;color:#1F2328}
.tbtn[data-on="1"] .t{color:#1F2328}
.esearch{padding:0 16px 10px}
.esearch input{width:100%;height:44px;border:0;border-radius:12px;background:#F3F5F8;padding:0 14px;font:inherit;font-size:15px;color:#2B2F38;outline:none;-webkit-appearance:none;appearance:none}
.esearch input::-webkit-search-cancel-button,.esearch input::-webkit-search-decoration{-webkit-appearance:none;display:none}
.esearch input::placeholder{color:#8A909E}
.epick{position:fixed;inset:0;z-index:200;display:flex;align-items:center;justify-content:center;background:rgba(20,24,40,.34)}
.ecard{width:min(440px,92vw);max-height:min(80vh,620px);background:#fff;border-radius:22px;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 24px 60px rgba(20,24,40,.28)}
.ehead{display:flex;align-items:center;justify-content:space-between;padding:14px 14px 8px 18px;font-family:var(--skylight-serif,Literata,Georgia,serif);font-size:19px}
.ehead .ex{width:36px;height:36px;flex:0 0 36px;border-radius:50%;border:0;background:#F3F5F8;cursor:pointer;display:grid;place-items:center;color:#2B2F38}
.ehead .ex svg{width:16px;height:16px;fill:currentColor}
.ecats{display:flex;gap:6px;padding:0 16px 10px;overflow-x:auto;scrollbar-width:none}
.ecats::-webkit-scrollbar{display:none}
.ecats button{border:0;background:#F3F5F8;border-radius:999px;padding:7px 12px;font:inherit;font-size:12.5px;font-weight:600;color:#5A6074;cursor:pointer;white-space:nowrap}
.ecats button[data-on="1"]{background:#1F2328;color:#fff}
.egrid{display:grid;grid-template-columns:repeat(8,1fr);gap:2px;padding:0 12px 16px;overflow-y:auto}
.egrid::-webkit-scrollbar{display:none}
.egrid button{border:0;background:none;font-size:25px;line-height:1;padding:7px 0;border-radius:10px;cursor:pointer}
.egrid button:hover,.egrid button:active{background:#F3F5F8}
.enone{grid-column:1/-1;padding:22px 6px;text-align:center;color:#8A909E;font-size:13.5px}
/* colonne « à faire » + feuille « qui l'a faite ? » */
.ava.glyph{background:var(--accent)}
.ava.glyph img{width:30px;height:30px;object-fit:contain;display:block;filter:brightness(0) invert(1)}
.ghouse{display:none}
/* étiquette « famille » sous le titre, même facture que la pastille d'étoiles */
.gtag{display:inline-flex;align-items:center;justify-content:center;background:#fff;border-radius:999px;padding:3px 10px;flex:0 0 auto;box-shadow:0 1px 2px rgba(31,35,40,.10)}
.gtag img{width:12px;height:12px;object-fit:contain;display:block}
.glist{display:flex;flex-direction:column;gap:8px}
.grow{display:flex;align-items:center;gap:14px;border:0;background:#F7F8FB;border-radius:20px;padding:10px 14px 10px 10px;font:inherit;cursor:pointer;text-align:left}
.grow .ga{width:42px;height:42px;flex:0 0 42px;border-radius:50%;overflow:hidden;background:var(--accent);display:grid;place-items:center;font-weight:700;color:#fff;font-size:16px;box-shadow:0 0 0 3px var(--halo),0 2px 9px var(--halo)}
.grow .ga img{width:100%;height:100%;object-fit:cover;display:block}
.grow[data-on="1"] .ga{box-shadow:0 0 0 3px #fff,0 0 0 6px var(--accent)}
.grow .gn{flex:1 1 auto;font-size:15.5px;font-weight:600;color:#2B2F38}
.grow .radio{width:24px;height:24px;flex:0 0 24px;border-radius:50%;border:2px solid #C7CEDA;display:grid;place-items:center;transition:border-color .15s ease,background .15s ease}
.grow[data-on="1"] .radio{border-color:var(--accent);background:var(--accent)}
.grow[data-on="1"] .radio::after{content:'';width:8px;height:8px;border-radius:50%;background:#fff}
@media (max-width:900px){
  .board{gap:8px;padding:6px}
  .bfade{width:26px}
  .ava.glyph img{width:25px;height:25px}
  .tile{height:clamp(104px,17vh,140px)}
  .tile .ill{font-size:32px}
  /* Material : FAB de 56 px, à 16 px des bords, au-dessus de la zone sûre (barre gestuelle iOS = 34 px) */
  .fab{width:56px;height:56px;right:calc(16px + env(safe-area-inset-right,0px));bottom:calc(16px + env(safe-area-inset-bottom,0px));font-size:27px}
}
@media (max-width:600px){
  .bfade{width:16px}
  .empty .e{font-size:56px}
  .empty{font-size:15px;gap:16px}
}
`;

const SVG = {
  cal: '<svg viewBox="0 0 24 24"><path d="M9,10V12H7V10H9M13,10V12H11V10H13M17,10V12H15V10H17M19,3A2,2 0 0,1 21,5V19A2,2 0 0,1 19,21H5C3.89,21 3,20.1 3,19V5A2,2 0 0,1 5,3H6V1H8V3H16V1H18V3H19M19,19V8H5V19H19M9,14V16H7V14H9M13,14V16H11V14H13M17,14V16H15V14H17Z"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z"/></svg>',
  meals: '<svg viewBox="0 0 24 24"><path d="M11,9H9V2H7V9H5V2H3V9C3,11.12 4.66,12.84 6.75,12.97V22H9.25V12.97C11.34,12.84 13,11.12 13,9V2H11V9M16,6V14H18.5V22H21V2C18.24,2 16,4.24 16,6Z"/></svg>',
  gear: '<svg viewBox="0 0 24 24"><path d="M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8M12,10A2,2 0 0,0 10,12A2,2 0 0,0 12,14A2,2 0 0,0 14,12A2,2 0 0,0 12,10M10,22C9.75,22 9.54,21.82 9.5,21.58L9.13,18.93C8.5,18.68 7.96,18.34 7.44,17.94L4.95,18.95C4.73,19.03 4.46,18.95 4.34,18.73L2.34,15.27C2.21,15.05 2.27,14.78 2.46,14.63L4.57,12.97L4.5,12L4.57,11L2.46,9.37C2.27,9.22 2.21,8.95 2.34,8.73L4.34,5.27C4.46,5.05 4.73,4.96 4.95,5.05L7.44,6.05C7.96,5.66 8.5,5.32 9.13,5.07L9.5,2.42C9.54,2.18 9.75,2 10,2H14C14.25,2 14.46,2.18 14.5,2.42L14.87,5.07C15.5,5.32 16.04,5.66 16.56,6.05L19.05,5.05C19.27,4.96 19.54,5.05 19.66,5.27L21.66,8.73C21.79,8.95 21.73,9.22 21.54,9.37L19.43,11L19.5,12L19.43,13L21.54,14.63C21.73,14.78 21.79,15.05 21.66,15.27L19.66,18.73C19.54,18.95 19.27,19.04 19.05,18.95L16.56,17.95C16.04,18.34 15.5,18.68 14.87,18.93L14.5,21.58C14.46,21.82 14.25,22 14,22H10M11.25,4L10.88,6.61C9.68,6.86 8.62,7.5 7.85,8.39L5.44,7.35L4.69,8.65L6.8,10.2C6.4,11.37 6.4,12.64 6.8,13.8L4.68,15.36L5.43,16.66L7.86,15.62C8.63,16.5 9.68,17.14 10.87,17.38L11.24,20H12.76L13.13,17.39C14.32,17.14 15.37,16.5 16.14,15.62L18.57,16.66L19.32,15.36L17.2,13.81C17.6,12.64 17.6,11.37 17.2,10.2L19.31,8.65L18.56,7.35L16.15,8.39C15.38,7.5 14.32,6.86 13.12,6.62L12.75,4H11.25Z"/></svg>',
  filter: '<svg viewBox="0 0 24 24"><path d="M6,13H18V11H6M3,6V8H21V6M10,18H14V16H10V18Z"/></svg>',
  /* curseurs = « options d'affichage » (le panneau qui contient filtre ET ordre) */
  display: '<svg viewBox="0 0 24 24"><path d="M3,17V19H9V17H3M3,5V7H13V5H3M13,21V19H21V17H13V15H11V21H13M7,9V11H3V13H7V15H9V9H7M21,13V11H11V13H21M15,9H17V7H21V5H17V3H15V9Z"/></svg>',
  sync: '<svg viewBox="0 0 24 24"><path d="M12,18A6,6 0 0,1 6,12C6,11 6.25,10.03 6.7,9.2L5.24,7.74C4.46,8.97 4,10.43 4,12A8,8 0 0,0 12,20V23L16,19L12,15M12,4V1L8,5L12,9V6A6,6 0 0,1 18,12C18,13 17.75,13.97 17.3,14.8L18.76,16.26C19.54,15.03 20,13.57 20,12A8,8 0 0,0 12,4Z"/></svg>',
  days: '<svg viewBox="0 0 24 24"><path d="M6 1H8V3H16V1H18V3H19C20.11 3 21 3.9 21 5V19C21 20.11 20.11 21 19 21H5C3.89 21 3 20.1 3 19V5C3 3.89 3.89 3 5 3H6V1M5 8V19H19V8H5M7 10H17V12H7V10Z"/></svg>',
  clock: '<svg viewBox="0 0 24 24"><path d="M12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22C6.47,22 2,17.5 2,12A10,10 0 0,1 12,2M12.5,7V12.25L17,14.92L16.25,16.15L11,13V7H12.5Z"/></svg>',
  people: '<svg viewBox="0 0 24 24"><path d="M13.07 10.41A5 5 0 0 0 13.07 4.59A3.39 3.39 0 0 1 15 4A3.5 3.5 0 0 1 15 11A3.39 3.39 0 0 1 13.07 10.41M5.5 7.5A3.5 3.5 0 1 1 9 11A3.5 3.5 0 0 1 5.5 7.5M7.5 7.5A1.5 1.5 0 1 0 9 6A1.5 1.5 0 0 0 7.5 7.5M16 17V19H2V17S2 13 9 13 16 17 16 17M14 17C13.86 16.22 12.67 15 9 15S4.07 16.31 4 17M15.95 13A5.32 5.32 0 0 1 18 17V19H22V17S22 13.37 15.94 13Z"/></svg>',
  broom: '<svg viewBox="0 0 24 24"><path d="M19.36,2.72L20.78,4.14L15.06,9.85C16.13,11.39 16.28,13.24 15.38,14.44L9.06,8.12C10.26,7.22 12.11,7.37 13.65,8.44L19.36,2.72M5.93,17.57C3.92,15.56 2.69,13.16 2.35,10.92L7.23,8.83L14.67,16.27L12.58,21.15C10.34,20.81 7.94,19.58 5.93,17.57Z"/></svg>',
  sun: '<svg viewBox="0 0 24 24"><path d="M12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,2L14.39,5.42C13.65,5.15 12.84,5 12,5C11.16,5 10.35,5.15 9.61,5.42L12,2M3.34,7L7.5,6.65C6.9,7.16 6.36,7.78 5.94,8.5C5.5,9.24 5.25,10 5.11,10.79L3.34,7M3.36,17L5.12,13.23C5.26,14 5.53,14.78 5.95,15.5C6.37,16.24 6.91,16.86 7.5,17.37L3.36,17M20.65,7L18.88,10.79C18.74,10 18.47,9.23 18.05,8.5C17.63,7.78 17.1,7.15 16.5,6.64L20.65,7M20.64,17L16.5,17.36C17.09,16.85 17.62,16.22 18.04,15.5C18.46,14.77 18.73,14 18.87,13.21L20.64,17M12,22L9.59,18.56C10.33,18.83 11.14,19 12,19C12.82,19 13.63,18.83 14.37,18.56L12,22Z"/></svg>',
  line: '<svg viewBox="0 0 24 24"><path d="M19,13H5V11H19V13Z"/></svg>',
  smile: '<svg viewBox="0 0 24 24"><path d="M12,17.5C14.33,17.5 16.3,16.04 17.11,14H6.89C7.69,16.04 9.67,17.5 12,17.5M8.5,11A1.5,1.5 0 0,0 10,9.5A1.5,1.5 0 0,0 8.5,8A1.5,1.5 0 0,0 7,9.5A1.5,1.5 0 0,0 8.5,11M15.5,11A1.5,1.5 0 0,0 17,9.5A1.5,1.5 0 0,0 15.5,8A1.5,1.5 0 0,0 14,9.5A1.5,1.5 0 0,0 15.5,11M12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20M12,2C6.47,2 2,6.5 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"/></svg>',
  star: '<svg viewBox="0 0 24 24"><path d="M12,17.27L18.18,21L16.54,13.97L22,9.24L14.81,8.62L12,2L9.19,8.62L2,9.24L7.45,13.97L5.82,21L12,17.27Z"/></svg>',
  starOut: '<svg viewBox="0 0 24 24"><path d="M12,15.39L8.24,17.66L9.23,13.38L5.91,10.5L10.29,10.13L12,6.09L13.71,10.13L18.09,10.5L14.77,13.38L15.76,17.66M22,9.24L14.81,8.63L12,2L9.19,8.63L2,9.24L7.45,13.97L5.82,21L12,17.27L18.18,21L16.54,13.97L22,9.24Z"/></svg>',
  tick: '<svg viewBox="0 0 24 24"><path d="M9,20.42L2.79,14.21L5.62,11.38L9,14.77L18.88,4.88L21.71,7.71L9,20.42Z"/></svg>',
  close: '<svg viewBox="0 0 24 24"><path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"/></svg>',
  emojiPlus: '<svg viewBox="0 0 24 24"><path d="M15 18H18V15H20V18H23V20H20V23H18V20H15V18M12 17.5C9.67 17.5 7.69 16.04 6.89 14H15.69C14.5 14.78 13.62 15.97 13.23 17.36C12.83 17.45 12.42 17.5 12 17.5M8.5 11C7.67 11 7 10.33 7 9.5C7 8.67 7.67 8 8.5 8C9.33 8 10 8.67 10 9.5C10 10.33 9.33 11 8.5 11M15.5 11C14.67 11 14 10.33 14 9.5C14 8.67 14.67 8 15.5 8C16.33 8 17 8.67 17 9.5C17 10.33 16.33 11 15.5 11M12 20L13.07 19.93C13.18 20.61 13.4 21.26 13.72 21.85C13.16 21.95 12.58 22 12 22C6.47 22 2 17.5 2 12C2 6.5 6.47 2 12 2C17.5 2 22 6.5 22 12C22 12.59 21.95 13.16 21.85 13.72C21.26 13.4 20.62 13.18 19.93 13.07L20 12C20 7.58 16.42 4 12 4C7.58 4 4 7.58 4 12C4 16.42 7.58 20 12 20Z"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><path d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z"/></svg>',
  homeGroup: '<img src="/local/family-house.png" alt="">',
};

const PERIODS = [
  { k: 'morning', lb: 'Matin', em: '\uD83C\uDF24\uFE0F' },
  { k: 'afternoon', lb: 'Après-midi', em: '\u2600\uFE0F' },
  { k: 'evening', lb: 'Soir', em: '\uD83C\uDF19' },
  { k: 'chores', lb: 'Tâches', em: '\uD83E\uDDF9' },
];
const WD = ['L', 'Ma', 'Me', 'J', 'V', 'S', 'D'];
const WMO = {
  sunny: '\u2600\uFE0F', 'clear-night': '\uD83C\uDF19', partlycloudy: '\u26C5', cloudy: '\u2601\uFE0F',
  rainy: '\uD83C\uDF26\uFE0F', pouring: '\uD83C\uDF27\uFE0F', snowy: '\u2744\uFE0F',
  'snowy-rainy': '\uD83C\uDF28\uFE0F', hail: '\uD83C\uDF28\uFE0F', lightning: '\uD83C\uDF29\uFE0F',
  'lightning-rainy': '\u26C8\uFE0F', windy: '\uD83C\uDF2C\uFE0F', 'windy-variant': '\uD83C\uDF2C\uFE0F',
  fog: '\uD83C\uDF2B\uFE0F', exceptional: '\u26A0\uFE0F',
};
const AUTO = [
  [/dent/i, '\uD83E\uDEA5'], [/douche|\blaver\b|bain/i, '\uD83D\uDEC1'], [/habill|vêti/i, '\uD83D\uDC55'],
  [/sac|cartable/i, '\uD83C\uDF92'], [/devoir|école/i, '\uD83D\uDCDA'], [/chambre|rang/i, '\uD83E\uDDF9'],
  [/\blit\b|dormir|coucher/i, '\uD83D\uDECF\uFE0F'], [/lire|lecture/i, '\uD83D\uDCD6'], [/jouet/i, '\uD83E\uDDF8'],
  [/cheveu|coiff/i, '\uD83D\uDC87'], [/déjeuner|manger|repas/i, '\uD83E\uDD63'], [/poubelle/i, '\uD83D\uDDD1\uFE0F'],
  [/pelouse|jardin|plante/i, '\uD83C\uDF31'], [/course|acheter/i, '\uD83D\uDED2'], [/lessive|linge/i, '\uD83E\uDDFA'],
];
const CIRC = 2 * Math.PI * 44;

/* à incrémenter À CHAQUE dépôt, en même temps que le ?v= de la ressource */
const CARD_VERSION = 'v127';

/* ---------- tronc commun ----------
 * Les jetons, la barre, l'en-tête, la feuille et l'accès aux données vivent
 * dans `famille-core.js` (servi en `/local/famille-core.js?v=N`). Cette carte
 * n'en garde AUCUNE copie : `pastelOf`, `localDay`, `mix`, `alpha`, `esc` et
 * l'échelle de tons viennent de là-bas.
 * `CORE_URL` porte le numéro de version : l'incrémenter en même temps que la
 * ressource `famille-core` (voir ETAT-CHANTIER.md). En production la ressource
 * est déjà chargée : cet import retrouve le MÊME module, évalué une seule fois.
 * Hors Home Assistant, le banc d'essai pose `window.FAMILLE_CORE_URL`. */
const CORE_URL = '/skylight-static/famille-core.js?v=0.5.17';

let CORE = null;
let esc; let mix; let alpha; let localDay; let pastelOf; let tokens;

const coreReady = import((typeof window !== 'undefined' && window.FAMILLE_CORE_URL) || CORE_URL)
  .then((m) => {
    CORE = m;
    esc = m.esc;
    mix = m.mix;
    alpha = m.alpha;
    localDay = m.localDay;
    pastelOf = m.pastelOf;
    tokens = m.profileTones;
    return m;
  });

/* (les helpers `localDay`, `hexToHsl`, `pastelOf` et l'échelle de tons sont
   dans famille-core.js — une seule implémentation pour tous les écrans) */

const EMOJI_CATS = [
  ['Visages', '\uD83D\uDE00 \uD83D\uDE03 \uD83D\uDE04 \uD83D\uDE01 \uD83D\uDE06 \uD83D\uDE05 \uD83D\uDE02 \uD83E\uDD23 \uD83D\uDE0A \uD83D\uDE07 \uD83D\uDE42 \uD83D\uDE09 \uD83D\uDE0C \uD83D\uDE0D \uD83E\uDD70 \uD83D\uDE18 \uD83D\uDE0B \uD83D\uDE1B \uD83D\uDE1C \uD83E\uDD2A \uD83E\uDD28 \uD83E\uDDD0 \uD83E\uDD13 \uD83D\uDE0E \uD83E\uDD73 \uD83D\uDE0F \uD83D\uDE12 \uD83D\uDE1E \uD83D\uDE14 \uD83D\uDE1F \uD83D\uDE15 \uD83D\uDE41 \uD83D\uDE23 \uD83D\uDE16 \uD83D\uDE2B \uD83D\uDE29 \uD83E\uDD7A \uD83D\uDE22 \uD83D\uDE2D \uD83D\uDE24 \uD83D\uDE20 \uD83D\uDE21 \uD83D\uDE31 \uD83D\uDE28 \uD83D\uDE30 \uD83D\uDE25 \uD83D\uDE13 \uD83E\uDD17 \uD83E\uDD14 \uD83E\uDD2D \uD83E\uDD2B \uD83E\uDD25 \uD83D\uDE36 \uD83D\uDE10 \uD83D\uDE11 \uD83D\uDE2C \uD83D\uDE44 \uD83D\uDE2E \uD83D\uDE32 \uD83D\uDE34 \uD83E\uDD24 \uD83D\uDE2A \uD83D\uDE35 \uD83E\uDD10 \uD83E\uDD74 \uD83E\uDD22 \uD83E\uDD2E \uD83E\uDD27 \uD83D\uDE37 \uD83E\uDD12 \uD83E\uDD15 \uD83E\uDD20'],
  ['Animaux & nature', '\uD83D\uDC36 \uD83D\uDC31 \uD83D\uDC2D \uD83D\uDC39 \uD83D\uDC30 \uD83E\uDD8A \uD83D\uDC3B \uD83D\uDC3C \uD83D\uDC28 \uD83D\uDC2F \uD83E\uDD81 \uD83D\uDC2E \uD83D\uDC37 \uD83D\uDC38 \uD83D\uDC35 \uD83D\uDC14 \uD83D\uDC27 \uD83D\uDC26 \uD83E\uDD86 \uD83E\uDD89 \uD83E\uDD87 \uD83D\uDC3A \uD83D\uDC34 \uD83E\uDD84 \uD83D\uDC1D \uD83D\uDC1B \uD83E\uDD8B \uD83D\uDC0C \uD83D\uDC1E \uD83D\uDC22 \uD83D\uDC0D \uD83D\uDC19 \uD83E\uDD80 \uD83D\uDC2C \uD83D\uDC33 \uD83E\uDD88 \uD83D\uDC0A \uD83D\uDC18 \uD83D\uDC2A \uD83E\uDD92 \uD83D\uDC04 \uD83D\uDC0E \uD83D\uDC16 \uD83D\uDC11 \uD83E\uDD8C \uD83C\uDF35 \uD83C\uDF32 \uD83C\uDF33 \uD83C\uDF34 \uD83C\uDF31 \uD83C\uDF3F \uD83C\uDF40 \uD83C\uDF41 \uD83C\uDF44 \uD83C\uDF3E \uD83D\uDC90 \uD83C\uDF37 \uD83C\uDF39 \uD83C\uDF3A \uD83C\uDF38 \uD83C\uDF3C \uD83C\uDF3B'],
  ['Nourriture', '\uD83C\uDF4F \uD83C\uDF4E \uD83C\uDF50 \uD83C\uDF4A \uD83C\uDF4B \uD83C\uDF4C \uD83C\uDF49 \uD83C\uDF47 \uD83C\uDF53 \uD83C\uDF52 \uD83C\uDF51 \uD83C\uDF4D \uD83E\uDD5D \uD83E\uDD51 \uD83C\uDF45 \uD83E\uDD52 \uD83E\uDD6C \uD83E\uDD66 \uD83C\uDF3D \uD83E\uDD55 \uD83E\uDD54 \uD83C\uDF60 \uD83E\uDD50 \uD83C\uDF5E \uD83E\uDD56 \uD83E\uDDC0 \uD83E\uDD5A \uD83C\uDF73 \uD83E\uDD5E \uD83C\uDF54 \uD83C\uDF5F \uD83C\uDF55 \uD83C\uDF2D \uD83E\uDD6A \uD83C\uDF2E \uD83C\uDF5C \uD83C\uDF72 \uD83C\uDF5B \uD83C\uDF63 \uD83C\uDF71 \uD83C\uDF64 \uD83C\uDF59 \uD83C\uDF5A \uD83C\uDF58 \uD83C\uDF67 \uD83C\uDF68 \uD83C\uDF66 \uD83E\uDD67 \uD83E\uDDC1 \uD83C\uDF70 \uD83C\uDF82 \uD83C\uDF6E \uD83C\uDF6D \uD83C\uDF6C \uD83C\uDF6B \uD83C\uDF7F \uD83C\uDF69 \uD83C\uDF6A \uD83E\uDD5C \uD83C\uDF77 \uD83E\uDD5B \u2615 \uD83C\uDF75 \uD83E\uDDC3 \uD83E\uDD64 '],
  ['Maison & objets', '\uD83D\uDECF \uD83D\uDECB \uD83D\uDEAA \uD83D\uDEBD \uD83D\uDEBF \uD83D\uDEC1 \uD83E\uDDFC \uD83E\uDDFD \uD83E\uDDF9 \uD83E\uDEA5 \uD83E\uDDB7 \uD83E\uDDFA \uD83E\uDDFB \uD83E\uDDF4 \uD83D\uDED2 \uD83C\uDF92 \uD83D\uDC55 \uD83D\uDC56 \uD83E\uDDE6 \uD83D\uDC5F \uD83D\uDC60 \uD83C\uDFA9 \uD83E\uDDE2 \uD83D\uDC53 \uD83D\uDD76 \uD83D\uDC84 \uD83D\uDCDA \uD83D\uDCD6 \u270F\uFE0F \uD83D\uDCDD \uD83D\uDCCC \uD83D\uDCCE \u2702\uFE0F \uD83D\uDCCF \uD83D\uDCC5 \uD83D\uDDC2 \uD83D\uDDD1 \uD83D\uDD12 \uD83D\uDD11 \uD83D\uDD28 \uD83D\uDEE0 \uD83D\uDD27 \u2699\uFE0F \uD83E\uDDF0 \uD83E\uDDF2 \uD83D\uDD0C \uD83D\uDCA1 \uD83D\uDD26 \uD83D\uDD6F'],
  ['Sports & loisirs', '\u26BD \uD83C\uDFC0 \uD83C\uDFC8 \u26BE \uD83C\uDFBE \uD83C\uDFD0 \uD83C\uDFB1 \uD83C\uDFB3 \u26F3 \uD83C\uDFF9 \uD83C\uDFA3 \uD83E\uDD4A \uD83E\uDD4B \uD83D\uDEF9 \uD83D\uDEF7 \u26F8 \uD83C\uDFBF \uD83C\uDFC2 \uD83E\uDD38 \uD83E\uDD3A \uD83C\uDFC7 \uD83E\uDDD8 \uD83C\uDFC4 \uD83C\uDFCA \uD83D\uDEB4 \uD83C\uDFC6 \uD83E\uDD47 \uD83E\uDD48 \uD83E\uDD49 \uD83C\uDFC5 \uD83C\uDFAB \uD83C\uDFAA \uD83C\uDFAD \uD83C\uDFA8 \uD83C\uDFAC \uD83C\uDFA4 \uD83C\uDFA7 \uD83C\uDFBC \uD83C\uDFB9 \uD83E\uDD41 \uD83C\uDFB7 \uD83C\uDFBA \uD83C\uDFB8 \uD83C\uDFBB \uD83C\uDFB2 \uD83C\uDFAF \uD83C\uDFAE \uD83E\uDDE9'],
];
const EMOJI_KW = {
  "😀": "content dents émoticône grand sourire heureux joyeux rire sourire super visage visage rieur visage très souriant",
  "😃": "content dents émoticône formidable grand sourire heureux sourire super visage souriant avec de grands yeux visage très souriant avec la bouche ouverte",
  "😄": "content émoticône grand sourire heureux joyeux lol mdr rire sourire sourire mignon visage avec la bouche ouverte et les yeux souriants visage très souriant aux yeux rieurs",
  "😁": "content dents émoticône grand sourire heureux sourire sourire de toutes ses dents super visage visage souriant aux yeux rieurs visage souriant avec yeux souriants yeux souriants",
  "😆": "ahah bouche content émoticône lol mdr rire sourire visage visage souriant avec bouche ouverte et yeux fermés visage souriant avec yeux plissés",
  "😅": "émoticône excité froid goutte sourire sourire nerveux stressé sueur sueurs froides visage souriant avec une goutte de sueur",
  "😂": "content émoticône heureux joie larmes lol mdr pleurer de joie pleurer de rire rire aux larmes sourire visage riant aux larmes",
  "🤣": "content drôle émoticône hilare joyeux larmes lol mdr pleurer de rire rire rire aux larmes se rouler par terre se rouler par terre de rire se tordre de rire visage visage qui rit aux larmes",
  "😊": "content émoticône heureux œil rougir satisfait sourire visage visage qui rougit visage souriant avec yeux rieurs visage souriant avec yeux souriants yeux",
  "😇": "ange angélique auréole béni bible émoticône heureux innocent paix sourire spirituel visage souriant avec auréole",
  "🙂": "content émoticône heureux léger sourire sourire visage avec un léger sourire visage souriant",
  "😉": "blague clin d’œil émoticône flirter plaisanter sexy visage visage faisant un clin d’œil",
  "😌": "calme émoticône sérénité soulagement visage visage soulagé zen",
  "😍": "amour amoureux cœur émoticône œil romantique sourire visage visage souriant avec yeux en forme de cœur yeux",
  "🥰": "adorer aimer amour béguin coeur cœurs j’adore je t’aime smiley avec 3 coeurs sourire visage souriant avec cœurs",
  "😘": "amour baiser bise bisou et cœur bonjour bonne nuit cœur embrasser émoticône je t’aime visage envoyant un bisou visage qui fait une bise avec un cœur",
  "😋": "bon content délicieux émoticône faim heureux langue manger miam savourer sourire visage souriant qui tire la langue",
  "😛": "cool émoticône génial langue super visage visage qui tire la langue",
  "😜": "amusant blague clin d’œil émoticône fou langue loufoque marrant œil rigolo visage visage qui tire la langue et fait un clin d’œil",
  "🤪": "grand large oeil œil petit tête de fou tête folle yeux yeux fous",
  "🤨": "euh hein incrédule méfiant pas vrai quoi sceptique surprise tête avec sourcil levé visage avec les sourcils relevés",
  "🧐": "classe collet monté fortune monocle riche tête avec monocle vieux jeu visage avec un monocle",
  "🤓": "doué futé geek idiot intelligent lunettes personne premier de la classe ringard surdoué tronche visage de geek",
  "😎": "cool lunettes de soleil posé tranquille visage avec lunettes de soleil",
  "🥳": "anniversaire célébration chapeau pointu émoticône fête heureux hourra joyeux anniversaire sifflet visage de fête visage festif youpi",
  "😏": "arrogant charmeur émoticône malin ricaner rusé séducteur sourire sourire suffisant suspicieux visage avec un sourire malin visage avec un sourire suffisant",
  "😒": "bizarre blasé émoticône énervé fâché jaloux pas content peu importe visage visage qui s’ennuie",
  "😞": "abattu affreux découragé déçu émoticône malheureux tort triste visage",
  "😔": "abattu déçu émoticône horrible mort pensif perdu triste visage",
  "😟": "anxieux émoticône inquiet préoccupé stressé surpris triste visage",
  "😕": "confus désolé émoticône ennuyé je ne sais pas triste visage",
  "🙁": "émoticône mécontent triste visage visage légèrement mécontent",
  "😣": "concentré émoticône mal de tête migraine persévérant visage",
  "😖": "confus déconcerté émoticône fâché frustré irrité triste visage yeux fermés",
  "😫": "contrarié émoticône fatigue mécontent triste visage visage fatigué",
  "😩": "échec émoticône épuisé faim fatigué mécontent non pleurer sommeil triste visage visage las",
  "🥺": "embarrassé excuse gros yeux pardon pitié s’il te plaît supplication supplie visage implorant yeux de chiens battus",
  "😢": "émoticône horrible larme larmes malheureux pleurer triste visage qui pleure",
  "😭": "émoticône larme larmes malheureux pleurer pleurs sangloter triste visage visage qui pleure à chaudes larmes",
  "😤": "colère émoticône énervé fâché mécontent triomphe victoire visage visage avec fumée sortant des narines",
  "😠": "colère émoticône exaspéré fâché frustré mécontent rageur sourcils froncés visage en colère",
  "😡": "colère émoticône énervé exaspéré fâché furieux mécontent rageur rouge rouge de colère sourcils froncés visage boudeur",
  "😱": "choqué cri effrayé munch omd peur surpris terreur visage visage qui hurle de peur",
  "😨": "anxieux apeuré blême effrayé émoticône inquiet peur terrifié visage",
  "😰": "aah bleu bouche bée effrayé émoticône froid mince nerveux peur bleue sueurs froides terrifié visage anxieux avec goutte de sueur visage en sueur bouche ouverte",
  "😥": "déçu émoticône ouf pfiou soulagé sueur triste visage déçu mais soulagé visage triste mais soulagé",
  "😓": "émoticône froide mal de tête migraine mince ouf peur sueur triste visage visage démoralisé avec goutte de sueur visage et sueurs froides",
  "🤗": "câlin émoticône gentil mains visage visage qui fait un câlin",
  "🤔": "émoticône hum méditer penser réfléchir réflexion visage visage en pleine réflexion",
  "🤭": "malin oops oups rigole secret surprise visage avec main devant la bouche visage avec une main sur la bouche",
  "🤫": "chut pas un bruit silence tête qui dit chut visage avec un doigt sur la bouche",
  "🤥": "émoticône mensonge menteur pinocchio visage visage de menteur visage dont le nez s’allonge",
  "😶": "émoticône muet ne rien dire neutre sans commentaires sans expression sans voix se taire secret silence sourdine visage sans bouche",
  "😐": "émoticône gêné neutre ni chaud ni froid pas drôle peu importe rester de marbre sans commentaires sans rire visage neutre visage sans expression",
  "😑": "émoticône inexpressif mécontent neutre peu importe sans expression visage visage sans expression",
  "😬": "dents émoticône gêné grimace rien sourire visage visage grimaçant",
  "🙄": "agacé émoticône excédé incrédulité roulement visage qui lève les yeux au ciel visage qui roule des yeux visage roulant des yeux yeux",
  "😮": "bouche bée bouche ouverte choqué émoticône épaté incroyable omd oubli surpris visage avec bouche ouverte visage avec la bouche ouverte visage étonné",
  "😲": "choc choqué émoticône étonné impossible incroyable omd stupéfait visage",
  "😴": "bonne nuit coucher dormir émoticône endormi fatigué sieste sommeil visage visage somnolent zzz",
  "🤤": "baver délicieux émoticône mmh visage visage qui bave",
  "😪": "émoticône fatigué larme pleurer sommeil triste visage visage endormi",
  "😵": "émoticône fatigué malade mort tournis visage visage avec le tournis visage étourdi",
  "🤐": "bouche bouche cousue émoticône fermeture éclair motus se taire secret visage visage avec bouche cousue visage avec bouche fermeture éclair",
  "🥴": "bouche ondulée bourré bourrée dans les vapes hébété pas clair pompette rond saoul souler tête qui tourne visage éméché",
  "🤢": "dégoûtant écœuré émoticône malade nausée visage visage nauséeux visage vert qui a la nausée vomir",
  "🤮": "gerbe gerber malade tête qui vomit visage qui vomit vomi vomissure",
  "🤧": "à tes souhaits atchoum émoticône éternuement éternuer fièvre grippe malade mouchoir rhume se moucher visage qui éternue",
  "😷": "bactéries dentiste docteur émoticône germes malade masque masque chirurgical médecin rhume visage avec masque",
  "🤒": "indisposé malade thermomètre visage visage avec thermomètre",
  "🤕": "aïe bandage blessure bobo émoticône pansement tête tête avec un bandage visage visage avec bandage autour de la tête",
  "🤠": "chapeau cowboy visage visage avec chapeau de cowboy",
  "🐶": "animal animal domestique chien chiot tête de chien visage",
  "🐱": "animal chat chaton miaou minou tête de chat",
  "🐭": "animal souris tête de souris visage",
  "🐹": "animal animal domestique hamster tête tête de hamster visage",
  "🐰": "animal animal domestique dents lapin tête de lapin",
  "🦊": "animal nature renard tête visage",
  "🐻": "animal miel nounours ours ours brun teddy tête visage",
  "🐼": "animal panda tête tête de panda visage",
  "🐨": "animal australie koala",
  "🐯": "animal félin prédateur tête de tigre tigre visage",
  "🦁": "animal astrologie crinière fort horoscope lion roi rugissement safari savane tête de lion visage zodiaque",
  "🐮": "animal lait meuh tête de vache vache visage",
  "🐷": "animal cochon ferme porc tête de cochon visage",
  "🐸": "animal crapaud grenouille tête tête de grenouille",
  "🐵": "animal georges le petit curieux singe sourire tête de singe visage",
  "🐔": "animal coq ferme oiseau poule poulet volaille",
  "🐧": "animal antarctique banquise manchot oiseau pingouin",
  "🐦": "animal oiseau ornithologie",
  "🦆": "animal canard coin-coin oiseau",
  "🦉": "animal chouette hibou oiseau sage",
  "🦇": "animal chauve-souris vampire",
  "🐺": "animal loup louve tête tête de loup",
  "🐴": "animal cheval dressage équitation ferme jument tête de cheval",
  "🦄": "animal licorne licrone tête tête de licorne",
  "🐝": "abeille animal bourdon guêpe insecte miel nature printemps",
  "🐛": "animal chenille insecte jardin",
  "🦋": "animal insecte mignon papillon printemps",
  "🐌": "animal escargot jardin lentement nature",
  "🐞": "animal bête coccinelle insecte jardin nature",
  "🐢": "animal carapace lentement reptile tortue",
  "🐍": "animal reptile serpent serpent à sonnette venin",
  "🐙": "animal créature mer mollusque océan pieuvre poulpe",
  "🦀": "animal astrologie cancer crabe horoscope mer pinces plage zodiaque",
  "🐬": "animal dauphin flipper mer océan plage",
  "🐳": "animal baleine baleine avec évent baleine soufflant par son évent mer océan plage souffle",
  "🦈": "animal dents de la mer poisson requin",
  "🐊": "alligator animal caïman crocodile reptile zoo",
  "🐘": "animal éléphant pachyderme trompe",
  "🐪": "animal bosse désert dromadaire une bosse",
  "🦒": "animal cou girafe taches",
  "🐄": "animal ferme lait meuh vache",
  "🐎": "animal cheval course hippique hippodrome tiercé",
  "🐖": "animal cochon ferme gros jambon porc truie",
  "🐑": "animal bêler brebis doux ferme laine lait mouton",
  "🦌": "animal bois cerf",
  "🌵": "cactus désert épines nature piquant plante sécheresse",
  "🌲": "arbre conifère feuilles persistantes forêt pin plante sapin sapin de noël",
  "🌳": "arbre arbre à feuilles caduques feuilles caduques feuillu forêt nature plante",
  "🌴": "arbre cocotier palmier plage plante tropical tropiques",
  "🌱": "germe jeune plant jeune pousse plante plantule pousser printemps semis",
  "🌿": "arbre feuille feuilles plante",
  "🍀": "4 chance feuilles irlande plante porte-bonheur quatre trèfle trèfle à quatre feuilles",
  "🍁": "automne érable feuille feuille d’érable feuille morte tomber",
  "🍄": "champignon champignon vénéneux mario plante",
  "🌾": "grain plant de riz plante riz",
  "💐": "amoureux anniversaire bouquet fleur fleurs plante rendez-vous roses",
  "🌷": "bourgeon fleur plante printemps tulipe",
  "🌹": "amour beauté fleur plante rose rouge saint-valentin",
  "🌺": "fleur hibiscus plante",
  "🌸": "bourgeon fleur fleur de cerisier plante printemps",
  "🌼": "bourgeon bouton d’or dent-de-lion fleur pissenlit plante printemps",
  "🌻": "champs fleur plante soleil tournesol",
  "🍏": "fruit nourriture pomme pomme verte",
  "🍎": "fruit nourriture pomme pomme rouge",
  "🍐": "fruit nourriture poire",
  "🍊": "agrume clémentine fruit mandarine nourriture orange vitamine c",
  "🍋": "acide agrume citron fruit nourriture zeste",
  "🍌": "banane fruit nourriture potassium",
  "🍉": "fruit pastèque",
  "🍇": "fruit nourriture raisin",
  "🍓": "fraise fruit nourriture",
  "🍒": "cerise cerises fruit nourriture",
  "🍑": "fruit nourriture pêche",
  "🍍": "ananas fruit nourriture tropical",
  "🥝": "fruit kiwi nourriture",
  "🥑": "avocat fruit nourriture",
  "🍅": "fruit légume nourriture plante tomate",
  "🥒": "concombre cornichon légume nourriture",
  "🥬": "bok choy chou chou chinois chou frisé chou pommé kale laitue légume à feuilles vertes salade",
  "🥦": "broccoli brocoli chou chou sauvage légume",
  "🌽": "épi épi de maïs ferme maïs nourriture",
  "🥕": "carotte légume nourriture",
  "🥔": "légume nourriture patate pomme de terre purée",
  "🍠": "nourriture patate patate douce patate douce au four",
  "🥐": "croissant nourriture pain petit-déjeuner viennoiserie",
  "🍞": "miche nourriture pain pain de mie",
  "🥖": "baguette nourriture pain",
  "🧀": "fromage nourriture part de fromage",
  "🥚": "nourriture œuf",
  "🍳": "cuisine friture nourriture œuf œuf au plat petit-déjeuner poêle poêle à frire se faire cuire un œuf",
  "🥞": "crêpe goûter nourriture pancake pancakes petit-déjeuner",
  "🍔": "burger cheeseburger fast food hamburger nourriture",
  "🍟": "fast food frites potatoes potatœs",
  "🍕": "fromage nourriture part pepperoni pizza tranche",
  "🌭": "hot dog nourriture saucisse saucisse de francfort",
  "🥪": "nourriture pain pain de mie pique-nique sandwich",
  "🌮": "mexicain nourriture taco",
  "🍜": "bol bol fumant nouilles nourriture ramen vapeur",
  "🍲": "marmite nourriture ragoût",
  "🍛": "curry nourriture riz riz au curry",
  "🍣": "japonais nourriture poisson riz sushi",
  "🍱": "bento boîte déjeuner nourriture",
  "🍤": "beignet de crevette crevette",
  "🍙": "boulette de riz japonais nourriture onigiri plat riz",
  "🍚": "bol de riz nourriture riz",
  "🍘": "cracker galette de riz nourriture riz",
  "🍧": "coupe de glace crème glacée dessert glace granité nourriture restaurant sucré",
  "🍨": "coupe de glace crème crème glacée dessert glace nourriture restaurant sucré",
  "🍦": "cornet de glace dessert glace glace italienne nourriture sucré",
  "🥧": "décoration garniture gâteau nourriture pâte à tarte pâtisserie tarte tarte aux fruits tourte",
  "🧁": "cupcake dessert muffin pâtisserie sucre sucrerie",
  "🍰": "dessert gâteau gâteau sablé goûter nourriture pâtisserie sucré",
  "🎂": "anniversaire bougies dessert fête gâteau gâteau d’anniversaire goûter joyeux anniversaire nourriture pâtisserie",
  "🍮": "crème renversée dessert flan nourriture pudding sucré",
  "🍭": "dessert goûter nourriture sucette sucré sucrerie",
  "🍬": "bonbon dessert goûter nourriture sucré sucrerie",
  "🍫": "barre barre chocolatée chocolat dessert goûter nourriture sucré",
  "🍿": "cinéma nourriture pop-corn",
  "🍩": "dessert donut doughnut goûter nourriture sucré sucrerie",
  "🍪": "biscuit cookie dessert gâteau goûter nourriture pépites de chocolat sucré",
  "🥜": "arachide cacahuète cacahuètes noisette nourriture",
  "🍷": "alcool bar boisson club restaurant verre verre à vin verre de vin vin",
  "🥛": "boisson lait verre verre de lait",
  "☕": "boisson boisson chaude café caféine matin thé",
  "🍵": "boisson tasse tasse de thé sans anse thé",
  "🧃": "boisson briquette de jus carton jus jus de fruits paille",
  "🥤": "boisson eau gobelet avec paille jus de fruit jus de fruits soda verre avec une paille",
  "🛏": "dormir hôtel lit",
  "🛋": "canapé canapé avec une lampe canapé et lampe lampe",
  "🚪": "placard porte porte d’entrée",
  "🚽": "cabinets toilettes wc",
  "🚿": "douche eau pommeau de douche",
  "🛁": "baignoire bain mousse",
  "🧼": "bain bulles lavage laver me lave me laver mousse pain de savon porte-savon savon se lave se laver",
  "🧽": "absorbante absorbe éponge laver nettoyage nettoyer poreuse savonner",
  "🧹": "balai balais balayage ménage nettoie nettoyage nettoyé nettoyer sorcière",
  "🪥": "brosse brosse à dents brosser les dents dentaire dents hygiène laver laver les dents salle de bain",
  "🦷": "carie dent dentiste émail diamant",
  "🧺": "agriculture cueillette lessive linge panier pique-nique",
  "🧻": "essuie-tout papier hygiénique papier toilette rouleau de papier rouleau de pq",
  "🧴": "après-shampoing bouteille de lotion crème hydratante crème pour le corps crème solaire flacon hydratant lotion shampoing shampooing",
  "🛒": "caddie chariot courses panier shopping supermarché",
  "🎒": "cartable école sac sac à dos",
  "👕": "bleu chemise courses décontracté polo shopping t-shirt tee-shirt vêtements week-end",
  "👖": "bleu courses denim jean pantalon shopping vêtements week-end",
  "🧦": "chaussettes pieds vêtements",
  "👟": "accessoire athlétisme basket chaussure chaussure de sport coup de pied courir courses shopping tennis vêtements vite",
  "👠": "accessoire chaussure chaussure à talon chaussure à talon haut chaussure de femme courses mode shopping stilletto talon aiguille talon haut vêtements",
  "🎩": "accessoire chapeau élégant haut de forme haut-de-forme magie vêtements",
  "🧢": "baseball cap casquette casquette américaine casquette de baseball chapeau vêtements",
  "👓": "accessoire lunettes lunettes de vue œil vêtements yeux",
  "🕶": "lunettes lunettes de soleil lunettes noires soleil",
  "💄": "cosmétiques maquillage rendez-vous rouge à lèvres",
  "📚": "apprendre bibliothèque école enseignement étudier lecture lire littérature livres manuels scolaires roman savoir",
  "📖": "apprendre bibliothèque école enseignement étudier lecture lire littérature livre ouvert manuel scolaire roman savoir",
  "✏️": "crayon crayon à papier gomme mine",
  "📝": "bloc-notes crayon écrire mémo",
  "📌": "fournitures punaise",
  "📎": "fournitures trombone",
  "✂️": "ciseaux couper découper fournitures papier",
  "📏": "fournitures mathématiques règle règle plate",
  "📅": "calendrier date",
  "🗂": "classement classeur index intercalaire intercalaires",
  "🗑": "corbeille corbeille à papiers poubelle",
  "🔒": "cadenas cadenas fermé privé verrouillé verrouiller",
  "🔑": "clé mot de passe ouvrir serrure",
  "🔨": "marteau outil réparer travaux",
  "🛠": "clé clé à molette marteau marteau et clé à molette outil outils",
  "🔧": "clé clé à molette outil travaux",
  "⚙️": "engrenage outil roue dentée",
  "🧰": "boîte à outils caisse à outils coffre mécanique mécano outil outils",
  "🧲": "aimant aimanter attirer attraction fer à cheval magnet magnétique positif négatif",
  "🔌": "branché câble avec fiche électrique électricité prise prise électrique",
  "💡": "allumer ampoule bande dessinée bd dessin idée lampe lumière",
  "🔦": "lampe électrique lampe torche lumière outil torche",
  "🕯": "bougie chandelle lumière",
  "⚽": "balle ballon ballon de football football sport",
  "🏀": "ballon basket basket-ball panier sport",
  "🏈": "ballon football américain sport super bowl",
  "⚾": "balle balle de baseball baseball sport",
  "🎾": "balle balle de tennis sport tennis",
  "🏐": "ballon jeu match sport volley volley-ball",
  "🎱": "8 billard boule de billard boule magique huit jeu pool",
  "🎳": "boule bowling jeu partie quilles sport strike",
  "⛳": "drapeau de golf golf sport trou",
  "🏹": "arc arc et flèche archer astrologie flèche horoscope sagittaire sport tir à l’arc zodiaque",
  "🎣": "canne à pêche pêche pêche à la ligne sport",
  "🥊": "boxe gant gant de boxe sport",
  "🥋": "arts martiaux judo karaté kimono sport taekwondo tenue tenue d’arts martiaux",
  "🛹": "glisse longboard planche à roulettes roulettes skate skateboard",
  "🛷": "glisser luge neige traîneau",
  "⛸": "glace patin patin à glace patiner patinoire sport",
  "🎿": "neige ski sport",
  "🏂": "homme neige ski snowboard snowboardeur sport",
  "🤸": "agilité athlète faire la roue femme faisant la roue gymnaste gymnastique personne personne faisant la roue roue sport",
  "🤺": "épée escrime escrimeur escrimeuse personne sport",
  "🏇": "cheval course de chevaux course hippique jockey sport",
  "🧘": "détendu femme lotus méditation personne assise en position du lotus personne dans la posture du lotus position du lotus relax relaxation tailleur yoga zen",
  "🏄": "glisse homme mer océan personne personne faisant du surf plage planche sport surf vagues",
  "🏊": "crawl eau exercice homme nage nageur natation personne personne nageant piscine sport",
  "🚴": "course cycliste guidon homme pédaler personne rouler sport tour de france vélo",
  "🏆": "champion championne coupe gagner prix trophée victoire",
  "🥇": "1er médaille médaille d’or or premier",
  "🥈": "2e argent deuxième médaille médaille d’argent",
  "🥉": "3e bronze médaille médaille de bronze troisième",
  "🏅": "champion championne médaille médaille d’or médaille sportive sport vainqueur victoire",
  "🎫": "billet place spectacle",
  "🎪": "chapiteau cirque",
  "🎭": "acteur actrice art masque spectacle spectacle vivant théâtre",
  "🎨": "art artiste couleurs musée de peinture palette de peinture peindre peintre peinture",
  "🎬": "action ça tourne clap film",
  "🎤": "chanter karaoke karaoké micro microphone musique",
  "🎧": "casque écouteur écouteurs musique son",
  "🎼": "musique note partition",
  "🎹": "clavier instrument musique piano touches",
  "🥁": "baguette baguettes batterie musique tambour",
  "🎷": "instrument musique saxophone",
  "🎺": "instrument musique trompette",
  "🎸": "guitare guitare électrique instrument musique",
  "🎻": "instrument musique violon",
  "🎲": "dé dés hasard jeu",
  "🎯": "cible dans le mille fléchettes jeu",
  "🎮": "jeu vidéo joystick manette playstation xbox",
  "🧩": "assemblage énigme indice interloqué pièce de puzzle pièce manquante puzzle",
};

function emojiChar(e) {
  if (!e) return '';
  const s = String(e);
  if (s.includes('\uFE0F')) return s;
  return Array.from(s).length === 1 ? s + '\uFE0F' : s;
}

function norm(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

function autoEmojiOrNull(title) {
  for (const [re, em] of AUTO) if (re.test(title)) return em;
  return null;
}

function autoEmoji(title) {
  for (const [re, em] of AUTO) if (re.test(title)) return em;
  return '\u2705';
}

/* une tâche faite descend en bas de sa liste ; l'ordre d'origine revient si on la décoche.
   `pin` = carte qu'on garde à sa place quelques instants après le cochage. */
function byDone(a, b) {
  const ad = (a.done && !a.pin) ? 1 : 0;
  const bd = (b.done && !b.pin) ? 1 : 0;
  return ad - bd;
}

function parseMeta(it) {
  try {
    const m = JSON.parse(it.description || '{}');
    return m && typeof m === 'object' ? m : {};
  } catch (e) {
    return {};
  }
}

const CHECK_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.6l4.4 4.4L19 7.6"/></svg>';

class SkylightTasksCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._built = false;
    this._data = {};
    this._sig = '';
    this._sel = {};
    this._hide = new Set();
    this._offset = 0;
    this._loadToken = 0;
  }

  setConfig(config) {
    if (!config || !Array.isArray(config.profiles) || !config.profiles.length) {
      throw new Error('skylight-tasks-card: "profiles" (liste non vide) est requis');
    }
    /* Home Assistant gèle l'objet de configuration qu'il remet à chaque
       instanciation : on en garde une copie MUTABLE (tableau de profils compris),
       sinon toute réécriture de la liste échoue silencieusement et la carte
       reste sur les profils du YAML. */
    this._cfg = Object.assign({}, config);
    this._cfg.profiles = (config.profiles || []).map((p) => Object.assign({}, p));
    this._built = false;
    this._offset = 0;
    this._hide = new Set(config.hidden_profiles || []);
    try {
      const saved = JSON.parse(localStorage.getItem('skylight-tasks-card:hide') || '[]');
      if (Array.isArray(saved)) this._hide = new Set(saved);
    } catch (e) { /* localStorage indisponible : filtre non persistant */ }
    /* Home Assistant rappelle setConfig quand la carte est ré-instanciée : la
       config repart du YAML, donc les profils du registre doivent être réappliqués
       tout de suite (sinon les colonnes créées dans l'app disparaissent), et
       rechargés au prochain `hass`. */
    this._profLoaded = false;
    if (this._storeProfiles) this._applyProfiles();
    if (this.shadowRoot) this.shadowRoot.innerHTML = '';
  }

  _saveHide() {
    try {
      localStorage.setItem('skylight-tasks-card:hide', JSON.stringify(Array.from(this._hide)));
    } catch (e) { /* ignore */ }
  }

  _starsPref() {
    try {
      const v = JSON.parse(localStorage.getItem('skylight-tasks-card:stars') || '{}');
      return v && typeof v === 'object' ? v : {};
    } catch (e) {
      return {};
    }
  }

  _saveStars(o) {
    try {
      localStorage.setItem('skylight-tasks-card:stars', JSON.stringify(o));
    } catch (e) { /* ignore */ }
  }

  /* la carte ne doit jamais dépasser l'écran : seul le défilement interne des colonnes bouge */
  _fit() {
    try {
      const top = Math.max(this.getBoundingClientRect().top, 0);
      /* clientHeight, pas innerHeight : sur iPhone, innerHeight inclut la zone
         que la barre d'outils de Safari recouvre, et la carte débordait sous le
         bord bas de l'écran (capture du 05/11). */
      let h = Math.round((document.documentElement.clientHeight || window.innerHeight) - top);
      const ph = this.parentElement ? Math.round(this.parentElement.clientHeight) : 0;
      if (ph > 200) h = Math.min(h, ph);
      if (h > 240 && Math.abs((this._fh || 0) - h) > 2) {
        this._fh = h;
        this.style.height = h + 'px';
        this.style.maxHeight = h + 'px';
      }
      /* position du bouton + réglable par appareil : fab_bottom / fab_right */
      const fab = this.shadowRoot && this.shadowRoot.getElementById('fab');
      if (fab) {
        const fb = Number(this._cfg.fab_bottom);
        const fr = Number(this._cfg.fab_right);
        fab.style.bottom = isFinite(fb) && this._cfg.fab_bottom !== undefined && this._cfg.fab_bottom !== null ? fb + 'px' : '';
        fab.style.right = isFinite(fr) && this._cfg.fab_right !== undefined && this._cfg.fab_right !== null ? fr + 'px' : '';
      }
    } catch (e) { /* ignore */ }
  }

  set hass(hass) {
    this._hass = hass;
    /* Le tronc commun est un module : il arrive après le premier `hass`. On
       construit et on démarre la carte dès qu'il est là, une seule fois. */
    if (!CORE) {
      if (!this._coreAsked) {
        this._coreAsked = true;
        coreReady.then(() => {
          if (!this._hass || this._built) return;
          this._build();
          this._pump();
        }).catch((e) => this._coreFailed(e));
      }
      return;
    }
    if (!this._built) this._build();
    this._pump();
  }

  /* affiché seulement si le module n'a pas pu être chargé (dépôt incomplet) */
  _coreFailed(e) {
    if (!this.shadowRoot) return;
    /* `esc` vient du module absent : on échappe ici, à la main */
    const msg = String((e && e.message) || e).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
    this.shadowRoot.innerHTML = `<style>:host{display:block;padding:24px;font-family:system-ui,sans-serif;color:#FF3B30;background:#FDF2F0}</style><div>Vue Tâches : le tronc commun n'a pas pu être chargé (famille-core.js). ${msg}</div>`;
  }

  _pump() {
    const hass = this._hass;
    CORE.data.attach(hass);
    /* le chargement n'est marqué réussi QUE s'il aboutit : au premier `hass` la
       connexion websocket n'est pas toujours prête, et une erreur laissait la
       carte sans les profils du registre jusqu'au rechargement de la page. */
    if (!this._profLoaded) this._loadProfiles();
    /* si la liste des profils change (profil créé ou supprimé depuis l'écran
       Profils), la carte doit relire : sinon une colonne supprimée reste. */
    const pst = hass.states[this._cfg.profiles_entity || 'todo.profils'];
    const psig = pst ? pst.state + '|' + pst.last_updated : '-';
    if (psig !== this._profSig) {
      this._profSig = psig;
      this._profLoaded = false;
      this._loadProfiles();
    }
    const sig = this._entities().map((id) => {
      const s = hass.states[id];
      return s ? s.state + '|' + s.last_updated : '-';
    }).join('~');
    if (sig !== this._sig) {
      this._sig = sig;
      /* pendant les ~1 s qui suivent un cochage, on garde l'affichage optimiste :
         recharger ici reconstruirait le DOM et tuerait l'animation de jauge en cours.
         Mais on ne perd pas l'événement pour autant : on REJOUE le chargement à la
         fin de la fenêtre (sinon `_sig` était déjà avancé et la liste restait
         périmée jusqu'à la mutation suivante). */
      const wait = (this._skipLoadUntil || 0) - Date.now();
      if (wait <= 0) this._load();
      else {
        clearTimeout(this._deferLoad);
        this._deferLoad = setTimeout(() => this._load(), wait + 30);
      }
    }
    /* Les soldes vivent dans des `counter.etoiles_*`, qui ne font pas partie de
       `_entities()` : sans ce contrôle, une variation d'étoiles ne repeignait
       RIEN (le ★ restait figé 30 s à 1 min — constaté le 03/11). On ne reconstruit
       pas la carte pour autant : on réécrit seulement le nombre des pastilles,
       ce qui n'interrompt aucune animation. */
    const ssig = CORE.data.starsSignature(this._cfg.profiles);
    if (ssig !== this._ssig) {
      this._ssig = ssig;
      this._paintStars();
    }
    this._tick();
  }

  /* réécrit le nombre affiché dans la pastille ★ de chaque colonne */
  _paintStars() {
    if (!this._board) return;
    this._model().forEach((m) => {
      if (!m.showStars) return;
      const el = this._board.querySelector(`[data-stars="${m.p.id}"] .n`);
      if (el && el.textContent !== String(m.stars)) el.textContent = String(m.stars);
    });
  }

  getCardSize() {
    return 12;
  }

  /* lit le registre des profils ; il est mémorisé pour pouvoir être réappliqué
     si Home Assistant remplace la configuration de la carte */
  _loadProfiles() {
    const h = this._hass;
    if (!h || !h.callWS) return;
    if (this._profLoading) return;
    this._profLoading = true;
    const ent = this._cfg.profiles_entity || 'todo.profils';
    /* lecture, cache, repli par service et erreurs : famille-core.js */
    CORE.data.attach(h).items(ent).then((items) => {
      items = items || [];
      if (!items.length) return;
      this._profRawDesc = new Map(items.map((x) => [x.uid, x.description || '']));
      /* l'ordre des colonnes suit le champ `ord` du profil (voir l'écran
         Profils et le glissement d'en-tête) ; à défaut, la position dans la
         liste. Le calcul est dans le tronc commun : les quatre écrans trient
         désormais pareil. */
      this._storeProfiles = CORE.parseProfiles(items);
      this._profLoaded = true;
      this._profErr = false;
      this._applyProfiles();
      this._load();
    }).catch(() => { /* échec : on retentera au prochain `hass` */
      this._profErr = true;
      this._profErrMsg = CORE.data.err;
    })
      .then(() => { this._profLoading = false; });
  }

  /* affiche dans l'en-tête ce que la carte voit réellement : version, nombre de
     profils, état du chargement. Sert à diagnostiquer sans console. */
  _diag() {
    const el = this.shadowRoot && this.shadowRoot.getElementById('diag');
    if (!el) return;
    const n = (this._cfg && this._cfg.profiles) ? this._cfg.profiles.length : 0;
    const st = this._profErr
      ? ('KO ' + String(this._profErrMsg || '').slice(0, 42))
      : (this._profLoaded ? 'ok' : 'lecture…');
    const txt = 'v64 · ' + n + ' profils · ' + st;
    if (el.textContent !== txt) el.textContent = txt;
  }

  /* le registre est la source : dès qu'il a répondu, il remplace la liste YAML.
     C'est ce qui fait qu'un profil supprimé disparaît vraiment des colonnes. */
  _applyProfiles() {
    if (!this._cfg || !this._storeProfiles || !this._storeProfiles.length) return;
    this._cfg.profiles = this._storeProfiles.slice();
    if (this._built) this._render();
  }

  connectedCallback() {
    /* marqueur de version : sans ça, un client qui tourne sur une copie en cache
       est indiscernable d'un bug — c'est arrivé le 03/11 avec counter.increment.
       Lisible dans la console, et dans le DOM : [data-skylight-ver]. */
    if (this.dataset) this.dataset.skylightVer = CARD_VERSION;
    if (!window.__SKYLIGHT_TASKS_VER) {
      window.__SKYLIGHT_TASKS_VER = CARD_VERSION;
      console.log('[skylight-tasks-card] ' + CARD_VERSION);
    }
    if (this._timer) clearInterval(this._timer);
    this._timer = setInterval(() => { this._tick(); this._fit(); }, 30000);
    this._onResize = () => this._fit();
    window.addEventListener('resize', this._onResize);
    [0, 80, 300, 900, 2000].forEach((t) => setTimeout(() => this._fit(), t));
    this._fit();
  }

  disconnectedCallback() {
    if (this._timer) clearInterval(this._timer);
    this._timer = null;
    if (this._onResize) window.removeEventListener('resize', this._onResize);
    this._onResize = null;
  }

  /* ---------- données ---------- */

  _entities() {
    const ids = [];
    if (this._cfg.chores_entity) ids.push(this._cfg.chores_entity);
    this._cfg.profiles.forEach((p) => { if (p.routine_entity) ids.push(p.routine_entity); });
    return ids;
  }

  _load() {
    const h = this._hass;
    if (!h || !h.callWS) return;
    const token = ++this._loadToken;
    /* lecture des listes par le tronc commun (même repli websocket → service) */
    const api = CORE.data.attach(h);
    Promise.all(this._entities().map((id) => api.items(id)
      .then((items) => ({ id, items }))
      .catch(() => ({ id, items: [] }))))
      .then((res) => {
        if (token !== this._loadToken) return;
        const next = {};
        res.forEach((x) => { next[x.id] = x.items; });
        /* on ré-épingle la carte qui vient d'être cochée, même après un rafraîchissement */
        if (this._pinUid) {
          Object.keys(next).forEach((k) => {
            const hit = next[k].find((it) => it.uid === this._pinUid);
            if (hit) hit._pin = true;
          });
        }
        this._data = next;
        this._render();
      });
  }

  _today() {
    const d = new Date();
    d.setDate(d.getDate() + this._offset);
    return d;
  }

  _model() {
    const t = this._today();
    const wd = ((t.getDay() + 6) % 7) + 1;
    const week = Math.floor(t.getTime() / 604800000);
    const starsDefault = Number(this._cfg.stars_per_task || 10);
    const choresAll = (this._data[this._cfg.chores_entity] || []).map((it) => this._item(it, starsDefault));
    const pref = this._starsPref();

    return this._cfg.profiles.map((p) => {
      const routine = (this._data[p.routine_entity] || [])
        .map((it) => this._item(it, starsDefault))
        .filter((it) => it.meta.t !== 'chore' && this._due(it.meta, wd, week));
      const chores = choresAll.filter((it) => (it.meta.o || '') === p.id);
      const all = routine.concat(chores);
      const periods = PERIODS.filter((x) => (x.k === 'chores'
        ? chores.length > 0
        : routine.some((it) => (it.meta.p || 'morning') === x.k)));
      const done = all.filter((it) => it.done).length;
      /* étoiles du jour (mémoire du jour) et SOLDE cumulatif lu sur
         counter.etoiles_<id>. C'est le solde qui s'affiche : le magot de la
         personne, pas sa performance du jour. Si le compteur n'existe pas
         (installation neuve), on retombe sur les étoiles du jour. */
      const earned = all.filter((it) => it.done).reduce((s, it) => s + it.stars, 0);
      const solde = this._solde(p);
      const stars = solde === null ? earned : solde;
      const showStars = pref[p.id] !== undefined ? !!pref[p.id] : (p.stars === undefined ? true : !!p.stars);
      return { p, routine, chores, all, periods, done, stars, earned, solde, showStars };
    });
  }

  _item(it, starsDefault) {
    const meta = parseMeta(it);
    return {
      uid: it.uid,
      title: it.summary || '',
      done: it.status === 'completed',
      pin: !!it._pin,
      meta,
      emoji: meta.e || autoEmoji(it.summary || ''),
      stars: Number(meta.s) || starsDefault,
    };
  }

  _due(meta, wd, week) {
    if (Array.isArray(meta.d) && meta.d.indexOf(wd) === -1) return false;
    const n = Number(meta.n || 1);
    if (n > 1 && ((week % n) + n) % n !== 0) return false;
    return true;
  }

  /* créneau courant : matin avant `evening_from`, soir après */
  _autoPeriod(m) {
    const h = new Date().getHours();
    const from = Number(this._cfg.evening_from || 16);
    const has = (k) => m.periods.some((x) => x.k === k);
    const want = (h >= from || h < 4) ? 'evening' : 'morning';
    if (has(want)) return want;
    const alt = want === 'evening' ? 'morning' : 'evening';
    if (has(alt)) return alt;
    return m.periods[0] ? m.periods[0].k : 'morning';
  }

  /* ---------- rendu ---------- */

  _build() {
    const cfg = this._cfg;
    /* La barre et l'en-tête viennent du tronc commun : ni liste de navigation,
       ni balisage d'en-tête ici. L'onglet allumé est déduit de l'URL. */
    const railHtml = CORE.navHtml({
      initial: cfg.family_initial == null ? 'F' : cfg.family_initial,
      path: window.__SKYLIGHT_PATH || undefined,
    });
    const headHtml = CORE.headerHtml({
      actions: [`<button class="chip" id="display">${SVG.display}<span class="lbl">Affichage</span></button>`],
    });

    this.shadowRoot.innerHTML = `
<style>${CORE.coreCss()}${CSS}</style>
<div class="app">
  ${railHtml}
  <div class="main">
    ${headHtml}
    <div class="pvband" id="pvband"><span class="pvdot">${SVG.cal}</span><span id="pvtext"></span><button data-day="0">Revenir à aujourd'hui</button></div>
    <div class="board" id="board"></div>
    <div class="bfade" id="bfade"></div>
  </div>
</div>
<button class="fab" id="fab" aria-label="Ajouter une tâche">+</button>
<div class="scrim" id="scrim"></div>
<div class="celebrate" id="celebrate"></div>
${CORE.sheetHtml({ closeIcon: SVG.close })}`;

    this._board = this.shadowRoot.getElementById('board');
    this._panel = this.shadowRoot.getElementById('panel');
    this._scrim = this.shadowRoot.getElementById('scrim');

    /* une photo ou une couleur modifiée ailleurs doit se voir ici tout de suite */
    this._onProfChange = () => { this._profLoaded = false; this._loadProfiles(); };
    window.addEventListener('skylight-profiles-changed', this._onProfChange);
    /* filet de sécurité : au cas où la modification vient de Home Assistant */
    this._profTimer = setInterval(() => { this._profLoaded = false; this._loadProfiles(); }, 15000);

    /* rangées de profils (Assigner, Filtrer) : on les fait glisser au clic
       maintenu, exactement comme le plateau. Pas de barre visible. */
    this.shadowRoot.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse') return;
      const row = e.target && e.target.closest ? e.target.closest('.profiles, .pfrow2') : null;
      if (!row || row.scrollWidth <= row.clientWidth + 1) return;
      this._rd = { row, x: e.clientX, left: row.scrollLeft, dragging: false };
    });
    this.shadowRoot.addEventListener('pointermove', (e) => {
      const d = this._rd;
      if (!d || e.pointerType !== 'mouse') return;
      const dx = e.clientX - d.x;
      if (!d.dragging) {
        if (Math.abs(dx) < 8) return;
        d.dragging = true;
        d.row.dataset.drag = '1';
      }
      d.row.scrollLeft = d.left - dx;
    });
    ['pointerup', 'pointercancel'].forEach((ev) => this.shadowRoot.addEventListener(ev, () => {
      const d = this._rd;
      if (!d) return;
      if (d.dragging) {
        this._profDragAt = Date.now();
        delete d.row.dataset.drag;
      }
      this._rd = null;
    }));
    /* après un glissement, le clic sur un profil ne doit pas le sélectionner */
    this.shadowRoot.addEventListener('click', (e) => {
      if (this._profDragAt && Date.now() - this._profDragAt < 300) {
        e.stopPropagation();
        e.preventDefault();
      }
    }, true);

    this._board.addEventListener('click', (e) => this._onBoardClick(e));
    /* « ⋯ » : le seul chemin VISIBLE vers la fiche. Il est frère de la carte,
       donc un tap dessus ne déclenche pas la coche, et la coche reste intacte. */
    this._board.addEventListener('click', (e) => {
      const m = e.target.closest && e.target.closest('[data-mng]');
      if (!m) return;
      e.preventDefault();
      e.stopPropagation();
      this._openEdit(m.dataset.mlist, m.dataset.mng, m.dataset.mprof);
    });
    this._board.addEventListener('pointerdown', (e) => this._press(e));
    ['pointerup', 'pointercancel', 'pointerleave'].forEach((ev) => this._board.addEventListener(ev, () => this._release()));
    this._board.addEventListener('pointermove', (e) => {
      if (!this._down) return;
      if (Math.abs(e.clientX - this._down.x) + Math.abs(e.clientY - this._down.y) > 12) this._release();
    });

    this.shadowRoot.getElementById('fab').addEventListener('click', () => this._openAdd());
    this.shadowRoot.getElementById('pback').addEventListener('click', () => this._closePanel());
    this._scrim.addEventListener('click', () => this._closePanel());
    this.shadowRoot.getElementById('display').addEventListener('click', () => this._openDisplay());
    this.shadowRoot.querySelectorAll('[data-day]').forEach((b) => {
      b.addEventListener('click', () => {
        const d = Number(b.dataset.day);
        this._offset = d === 0 ? 0 : this._offset + d;
        this._render();
        this._tick();
      });
    });
    CORE.bindNav(this.shadowRoot);

    this._board.addEventListener('pointerdown', (e) => this._pDown(e));
    this._board.addEventListener('pointermove', (e) => this._pMove(e));
    this._board.addEventListener('pointerup', () => this._pUp());
    this._board.addEventListener('pointercancel', () => this._pUp());
    this._board.addEventListener('scroll', () => this._syncFade());

    this._built = true;
  }

  _syncFade() {
    const b = this._board;
    const f = this.shadowRoot && this.shadowRoot.getElementById('bfade');
    if (!b || !f) return;
    const rest = b.scrollWidth - b.clientWidth - b.scrollLeft;
    f.classList.toggle('on', rest > 12);
  }

  /* glisser le plateau à la souris — le geste ne s'arme qu'au mouvement horizontal,
     pour qu'un simple clic sur une tâche reste un clic */
  _pDown(e) {
    if (e.pointerType === 'touch') return;
    const b = this._board;
    if (!b || b.scrollWidth <= b.clientWidth + 1) return;
    this._pd = { x: e.clientX, y: e.clientY, left: b.scrollLeft, dragging: false, id: e.pointerId };
  }

  _pMove(e) {
    const d = this._pd;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (!d.dragging) {
      if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(dy)) return;
      d.dragging = true;
      try { this._board.setPointerCapture(d.id); } catch (err) { /* ignore */ }
      this._board.style.cursor = 'grabbing';
    }
    this._board.scrollLeft = d.left - dx;
    e.preventDefault();
  }

  _pUp() {
    const d = this._pd;
    this._pd = null;
    if (this._board) this._board.style.cursor = '';
    if (d && d.dragging) {
      this._dragMovedAt = Date.now();
      if (this._lp) clearTimeout(this._lp);
      this._lp = null;
      try { this._board.releasePointerCapture(d.id); } catch (err) { /* ignore */ }
    }
  }

  _press(e) {
    if (this._dragMovedAt && Date.now() - this._dragMovedAt < 300) return;
    const t = e.target.closest('[data-task]');
    if (!t) return;
    this._down = { x: e.clientX, y: e.clientY, el: t };
    this._lp = setTimeout(() => {
      this._lp = null;
      this._suppress = true;
      this._openEdit(t.dataset.list, t.dataset.task, t.dataset.prof);
    }, 550);
  }

  _release() {
    if (this._lp) clearTimeout(this._lp);
    this._lp = null;
    this._down = null;
  }

  _onBoardClick(e) {
    if (this._suppress) { this._suppress = false; return; }
    const prof = e.target.closest('[data-profile]');
    if (prof) { this._openProfile(prof.dataset.profile); return; }
    const per = e.target.closest('[data-per]');
    if (per) {
      this._sel[per.dataset.prof] = per.dataset.per;
      this._render();
      return;
    }
    const claim = e.target.closest('[data-claim]');
    if (claim) {
      this._claimGrab(claim.dataset.uid, claim.dataset.claim);
      return;
    }
    const t = e.target.closest('[data-task]');
    if (!t) return;
    if (this._offset !== 0) return;
    if (this._dragMovedAt && Date.now() - this._dragMovedAt < 300) return;
    /* une carte « à faire » ne se coche pas : on demande qui l'a faite */
    if (t.dataset.grab === '1') { this._openGrab(t.dataset.task); return; }
    this._toggle(t.dataset.list, t.dataset.task);
  }

  /* ---------- « à faire » : tâches ouvertes à tous ---------- */

  _grabProfile() {
    return {
      id: '__grab',
      name: this._cfg.grab_name || 'À faire',
      color: '#CFC3E8',
      accent: '#6B5CA5',
      glyph: '\uD83C\uDFE0',
      kind: 'grab',
    };
  }

  _grabItems() {
    const starsDefault = Number(this._cfg.stars_per_task || 10);
    return (this._data[this._cfg.chores_entity] || [])
      .map((it) => this._item(it, starsDefault))
      .filter((it) => it.meta.grab && !it.meta.o && !it.done);
  }

  _openGrab(uid) {
    const it = this._grabItems().find((x) => x.uid === uid);
    if (!it) return;
    const rows = this._cfg.profiles.map((p) => {
      const acc = p.accent || '#7A8596';
      return `<button class="grow" data-pick="${esc(p.id)}" style="--accent:${esc(acc)};--halo:${alpha(acc, 0.3)}">
        ${CORE.avatarHtml(p, { tag: 'span', className: 'ga', upper: false })}
        <span class="gn">${esc(p.name)}</span>
        <span class="radio"></span></button>`;
    }).join('');
    this._openPanel("Qui l'a fait ?", `<div class="glist">${rows}</div>`,
      CORE.buttonHtml('Valider', { cls: 'go', attrs: 'id="g-go"' }), true);
    const root = this.shadowRoot;
    let picked = null;
    const go = root.getElementById('g-go');
    root.querySelectorAll('[data-pick]').forEach((b) => {
      b.addEventListener('click', () => {
        picked = b.dataset.pick;
        root.querySelectorAll('[data-pick]').forEach((x) => { x.dataset.on = x === b ? '1' : '0'; });
        if (go) go.dataset.on = '1';
      });
    });
    if (go) go.addEventListener('click', () => { if (picked) this._claimGrab(uid, picked); });
  }

  _claimGrab(uid, profId) {
    const h = this._hass;
    if (!h) return;
    const raw = (this._data[this._cfg.chores_entity] || []).find((x) => x.uid === uid);
    if (!raw) return;
    const meta = parseMeta(raw);
    meta.o = profId;
    meta.by = profId;
    meta.done = localDay();
    /* le crédit d'une tâche « ouverte à tous » suit la même règle : un seul
       paiement par jour, et le marqueur permet d'annuler un décochage */
    meta.cd = localDay();
    const desc = JSON.stringify(meta);
    const target = this._profBar(profId);
    const cardEl = this._board.querySelector(`[data-task="${uid}"]`);
    const from = cardEl ? cardEl.getBoundingClientRect() : null;
    this._closePanel();
    /* on crédite localement tout de suite : la carte part chez la personne */
    raw.status = 'completed';
    raw.description = desc;
    this._skipLoadUntil = Date.now() + 1000;
    this._render();
    if (from) {
      this._burstAt(from.left + from.width / 2, from.top + from.height / 2, 10);
      this._starsFly(from, profId, 5);
    }
    if (target) {
      target.classList.remove('pulse');
      void target.offsetWidth;
      target.classList.add('pulse');
    }
    /* la tâche ouverte à tous crédite la personne qui l'a prise */
    this._credit(profId, Number(meta.s) || Number(this._cfg.stars_per_task || 10));
    h.callService('todo', 'update_item',
      { item: uid, status: 'completed', description: desc },
      { entity_id: this._cfg.chores_entity });
  }

  _profBar(profId) {
    return this._board.querySelector(`[data-stars="${profId}"]`);
  }

  /* ---------- effets : confettis sur la coche + envol d'étoiles ---------- */

  _fx() {
    if (!this._fxLayer) {
      this._fxLayer = document.createElement('div');
      this._fxLayer.className = 'fx';
      this.shadowRoot.appendChild(this._fxLayer);
    }
    return this._fxLayer;
  }

  _profileShowStars(id) {
    const p = this._cfg.profiles.find((x) => x.id === id);
    if (!p) return false;
    const pref = this._starsPref();
    return pref[id] !== undefined ? !!pref[id] : (p.stars === undefined ? true : !!p.stars);
  }

  /* ---------- solde d'étoiles cumulatif ---------- */

  /* Le compteur, sa lecture et son écriture sont dans le tronc commun
     (`CORE.data.starsEntity` / `starsOf` / `credit`). Ici il ne reste que la
     POLITIQUE de l'écran : quels profils affichent leurs étoiles. */
  _solde(p) {
    return CORE.data.attach(this._hass).starsOf(p);
  }

  _credit(profId, n) {
    if (!profId || !n) return;
    const p = this._cfg.profiles.find((x) => x.id === profId);
    if (!p || !this._profileShowStars(profId)) return;
    /* `script.etoiles` (jamais un set_value calculé ici) : voir famille-core.js */
    CORE.data.attach(this._hass).credit(profId, n, {
      entity: CORE.data.starsEntity(p),
      script: this._cfg.stars_script || 'etoiles',
    });
  }

  _burstAt(x, y, n) {
    const layer = this._fx();
    const lr = layer.getBoundingClientRect();
    const colors = ['#2E9E63', '#F5B93E', '#3E8FD8', '#D9548C', '#A9762F', '#7C8AE0'];
    for (let i = 0; i < n; i++) {
      const p = document.createElement('i');
      p.className = 'fxdot';
      const a = (Math.PI * 2 * i) / n + Math.random() * 0.5;
      const d = 20 + Math.random() * 18;
      p.style.background = colors[i % colors.length];
      p.style.left = (x - lr.left) + 'px';
      p.style.top = (y - lr.top) + 'px';
      layer.appendChild(p);
      const anim = p.animate([
        { transform: 'translate(-50%,-50%) scale(.4)', opacity: 1, easing: 'cubic-bezier(.15,.6,.35,1)' },
        { transform: `translate(calc(-50% + ${Math.cos(a) * d}px), calc(-50% + ${Math.sin(a) * d + 8}px)) scale(1.05)`, opacity: 1, offset: 0.62 },
        { transform: `translate(calc(-50% + ${Math.cos(a) * d * 1.15}px), calc(-50% + ${Math.sin(a) * d * 1.15 + 14}px)) scale(.9)`, opacity: 0 },
      ], { duration: 850 + Math.random() * 220, delay: i * 22, easing: 'ease-out' });
      anim.onfinish = () => p.remove();
    }
  }

  _starsFly(fromRect, profId, n) {
    const layer = this._fx();
    const target = this._board.querySelector(`[data-stars="${profId}"]`);
    if (!target || !fromRect) return;
    const tr = target.getBoundingClientRect();
    const lr = layer.getBoundingClientRect();
    const cx = fromRect.left + fromRect.width / 2;
    const cy = fromRect.top + fromRect.height / 2;
    for (let i = 0; i < n; i++) {
      const s = document.createElement('span');
      s.className = 'fxstar';
      s.textContent = '\u2605';
      /* départ groupé sur l'étiquette d'étoiles, avec un léger écartement */
      const sx = cx + (Math.random() - 0.5) * 14;
      const sy = cy + (Math.random() - 0.5) * 8;
      s.style.left = (sx - lr.left) + 'px';
      s.style.top = (sy - lr.top) + 'px';
      s.style.fontSize = (13 + Math.random() * 7).toFixed(0) + 'px';
      layer.appendChild(s);
      const dx = (tr.left + tr.width * 0.5) - sx;
      const dy = (tr.top + tr.height * 0.5) - sy;
      const lift = -52 - Math.random() * 26;
      const anim = s.animate([
        { transform: 'translate(-50%,-50%) scale(.2)', opacity: 0, easing: 'ease-out' },
        { transform: `translate(calc(-50% + ${dx * 0.05}px), calc(-50% + ${lift}px)) scale(1)`, opacity: 1, offset: 0.24 },
        { transform: `translate(calc(-50% + ${dx * 0.45}px), calc(-50% + ${dy * 0.5 + lift * 0.2}px)) scale(1)`, opacity: 1, offset: 0.66 },
        { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(.45)`, opacity: 0 },
      ], { duration: 950 + Math.random() * 180, delay: i * 95, easing: 'cubic-bezier(.4,.05,.35,1)', fill: 'forwards' });
      anim.onfinish = () => s.remove();
    }
    setTimeout(() => {
      const t = this._board && this._board.querySelector(`[data-stars="${profId}"]`);
      if (t) {
        t.classList.remove('pulse');
        void t.offsetWidth;
        t.classList.add('pulse');
      }
    }, 1180);
  }

  _celebrate(p) {
    const box = this.shadowRoot.getElementById('celebrate');
    if (!box) return;
    box.innerHTML = '';
    const colors = [p.accent || 'var(--f-blue,#007AFF)', '#F5B93E', '#D9548C', '#3E8FD8', '#2E9E63', '#A9762F'];
    for (let i = 0; i < 40; i++) {
      const el = document.createElement('i');
      el.className = 'cel-piece';
      el.style.left = (Math.random() * 100).toFixed(1) + '%';
      el.style.background = colors[i % colors.length];
      el.style.animationDuration = (2.2 + Math.random() * 1.7).toFixed(2) + 's';
      el.style.animationDelay = (Math.random() * 0.8).toFixed(2) + 's';
      el.style.setProperty('--dx', (Math.random() * 160 - 80).toFixed(0) + 'px');
      el.style.setProperty('--rot', (Math.random() * 900 - 450).toFixed(0) + 'deg');
      if (i % 3 === 0) el.style.borderRadius = '50%';
      box.appendChild(el);
    }
    const card = document.createElement('div');
    card.className = 'cel-card';
    card.innerHTML = `<div class="cel-em">\uD83C\uDF89</div>
      <div class="cel-ttl">Bravo ${esc(p.name)} !</div>
      <div class="cel-sub">Toutes les tâches du jour sont faites.</div>`;
    box.appendChild(card);
    box.classList.add('on');
    clearTimeout(this._celTimer);
    const close = () => {
      clearTimeout(this._celTimer);
      box.classList.remove('on');
      box.innerHTML = '';
    };
    box.onclick = close;
    this._celTimer = setTimeout(close, 4600);
  }

  _toggle(list, uid) {
    const h = this._hass;
    if (!h) return;
    const it = (this._data[list] || []).find((x) => x.uid === uid);
    if (!it) return;
    const to = it.status === 'completed' ? 'needs_action' : 'completed';

    /* positions relevées avant de reconstruire le DOM */
    const el = this._board.querySelector(`[data-task="${uid}"]`);
    const chk = el ? el.querySelector('.chk') : null;
    const chip = el ? el.querySelector('.schip, .cchip') : null;
    const chkRect = chk ? chk.getBoundingClientRect() : null;
    const chipRect = chip ? chip.getBoundingClientRect() : null;
    const tileRect = el ? el.getBoundingClientRect() : null;
    const profId = el ? el.dataset.prof : null;
    const wantStars = profId ? this._profileShowStars(profId) : false;
    const nStars = Number(parseMeta(it).s) || Number(this._cfg.stars_per_task || 10);

    it.status = to;
    this._skipLoadUntil = Date.now() + 1000;
    /* on épingle la carte ~0,85 s à sa place : le temps de voir la coche, le ton et les étoiles changer */
    clearTimeout(this._pinTimer);
    (this._data[list] || []).forEach((x) => { x._pin = false; });
    if (to === 'completed') {
      it._pin = true;
      this._pinUid = uid;
      this._pinTimer = setTimeout(() => {
        if (this._pinUid !== uid) return;
        this._pinUid = null;
        Object.keys(this._data).forEach((k) => this._data[k].forEach((x) => { x._pin = false; }));
        this._render();
        this._load();
      }, 850);
    } else {
      this._pinUid = null;
    }
    this._render();
    if (to === 'completed') {
      if (chkRect) this._burstAt(chkRect.left + chkRect.width / 2, chkRect.top + chkRect.height / 2, 8);
      if (wantStars && nStars > 0 && (chipRect || tileRect) && profId) this._starsFly(chipRect || tileRect, profId, 5);
      /* dernière tâche du jour pour ce profil → célébration */
      if (profId) {
        const mm = this._model().find((x) => x.p.id === profId);
        if (mm && mm.all.length > 0 && mm.done >= mm.all.length) {
          setTimeout(() => this._celebrate(mm.p), 200);
        }
      }
    }
    /* --- Étoiles : une tâche ne rapporte qu'UNE FOIS PAR JOUR --------------
       `cd` (date du crédit, AAAA-MM-JJ) est écrit dans la description de
       l'item. Il permet de tout régler sans jamais afficher un nombre négatif :
         • recocher une tâche déjà payée aujourd'hui ne recrédite pas ;
         • décocher annule le crédit du jour, mais si les étoiles ont déjà été
           dépensées on ne reprend que ce qui reste, et `cd` est CONSERVÉ pour
           que recocher ne les rende pas gratuitement.
       Sans ce marqueur, cocher → échanger → décocher → recocher redonnait
       10 étoiles (constaté le 03/11). */
    const meta = parseMeta(it);
    const today = localDay();
    const paidToday = meta.cd === today;
    const prof = profId ? this._cfg.profiles.find((x) => x.id === profId) : null;
    let desc = null;
    if (prof && wantStars && nStars > 0) {
      if (to === 'completed') {
        if (!paidToday) {
          this._credit(profId, nStars);
          meta.cd = today;
          desc = JSON.stringify(meta);
        }
      } else if (paidToday) {
        const dispo = this._solde(prof);
        const reprise = Math.min(nStars, dispo === null ? nStars : Math.max(0, dispo));
        if (reprise > 0) this._credit(profId, -reprise);
        /* reprise complète → la tâche redevient payante (sinon on la garde) */
        if (reprise >= nStars) {
          delete meta.cd;
          desc = JSON.stringify(meta);
        }
      }
    }
    const payload = { item: uid, status: to };
    if (desc) { it.description = desc; payload.description = desc; }
    h.callService('todo', 'update_item', payload, { entity_id: list });
  }

  _render() {
    const board = this._board;
    if (!board) return;
    const model = this._model();
    const scrolls = {};
    const before = {};
    const prevBars = {};
    const beforeCols = {};
    board.querySelectorAll('[data-scroll]').forEach((s) => { scrolls[s.dataset.scroll] = s.scrollTop; });
    board.querySelectorAll('[data-task]').forEach((el) => { before[el.dataset.task] = el.getBoundingClientRect().top; });
    board.querySelectorAll('.col[data-prof]').forEach((c) => { beforeCols[c.dataset.prof] = c.getBoundingClientRect().left; });
    /* valeurs actuelles des jauges, pour les faire glisser au lieu de les faire sauter */
    board.querySelectorAll('.col').forEach((col) => {
      const fill = col.querySelector('.bar .fill');
      prevBars[col.dataset.prof] = {
        fill: fill ? fill.style.width : null,
        arcs: Array.from(col.querySelectorAll('.ring .arc')).map((a) => a.getAttribute('stroke-dasharray')),
      };
    });

    /* les colonnes sont rendues dans l'ordre combiné (personnes + « À faire ») */
    const shownById = new Map(model.filter((m) => !this._hide.has(m.p.id)).map((m) => [m.p.id, m]));
    const ent = this._columnOrder()
      .map((e) => (e.kind === 'g' ? e : Object.assign({}, e, { m: shownById.get(e.id) })))
      .filter((e) => (e.kind === 'g' ? !this._hide.has('__grab') : e.m));
    board.innerHTML = ent.map((e) => (e.kind === 'g' ? this._colGrab() : this._col(e.m))).join('')
      || '<div class="empty" style="flex:1">Aucun profil affiché</div>';
    board.querySelectorAll('[data-scroll]').forEach((s) => { s.scrollTop = scrolls[s.dataset.scroll] || 0; });

    /* FLIP horizontal : une colonne qui change de rang GLISSE vers sa place */
    board.querySelectorAll('.col[data-prof]').forEach((c) => {
      const old = beforeCols[c.dataset.prof];
      if (old == null) return;
      const dx = old - c.getBoundingClientRect().left;
      if (Math.abs(dx) < 2) return;
      c.animate([{ transform: `translateX(${dx}px)` }, { transform: 'translateX(0)' }],
        { duration: 300, easing: 'cubic-bezier(.32,.72,0,1)' });
    });

    /* jauges : on repart de l'ancienne valeur puis on anime vers la nouvelle */
    board.querySelectorAll('.col').forEach((col) => {
      const pv = prevBars[col.dataset.prof];
      if (!pv) return;
      const fill = col.querySelector('.bar .fill');
      if (fill && pv.fill && pv.fill !== fill.style.width) {
        const target = fill.style.width;
        fill.style.transition = 'none';
        fill.style.width = pv.fill;
        void fill.offsetWidth;            /* force le calcul de style avant de relancer la transition */
        fill.style.transition = 'width .48s cubic-bezier(.32,.72,0,1)';
        fill.style.width = target;
      }
      col.querySelectorAll('.ring .arc').forEach((arc, i) => {
        const old = pv.arcs[i];
        if (!old) return;
        const target = arc.getAttribute('stroke-dasharray');
        if (!target || old === target) return;
        arc.style.transition = 'none';
        arc.style.strokeDasharray = old;
        void arc.getBoundingClientRect();
        arc.style.transition = 'stroke-dasharray .48s cubic-bezier(.32,.72,0,1)';
        arc.style.strokeDasharray = target;
      });
    });

    /* FLIP : les cartes qui changent de place glissent au lieu de sauter */
    board.querySelectorAll('[data-task]').forEach((el) => {
      const old = before[el.dataset.task];
      if (old == null) return;
      const dy = old - el.getBoundingClientRect().top;
      if (Math.abs(dy) < 2) return;
      el.style.transition = 'none';
      el.style.transform = `translateY(${dy}px)`;
      requestAnimationFrame(() => {
        el.style.transition = 'transform .34s cubic-bezier(.32,.72,0,1)';
        el.style.transform = '';
      });
    });
    this._fit();
    this._syncFade();
  }

  /* ---------- ordre des colonnes ----------
     Pas de geste, volontairement : sur ce tableau glisser sert déjà à faire
     défiler (colonnes horizontalement, listes verticalement) et taper à cocher.
     Un quatrième geste se serait battu avec les trois autres, et un appui long
     malencontreux (un enfant qui pose le doigt) aurait réordonné sans le vouloir.
     L'ordre est donc un réglage explicite : une feuille avec des flèches.
     Il est global — écrit dans `ord`, il vaut pour toutes les vues. */

  /* position de la colonne « À faire » : un input_number (partagé, restauré).
     0 = jamais réglée (un compteur neuf vaut 0) → on la met en dernier. */
  _grabOrd() {
    const ent = (this._cfg && this._cfg.grab_ord_entity) || 'input_number.ordre_colonne_a_faire';
    const st = this._hass && this._hass.states[ent];
    if (!st) return null;
    const v = Number(st.state);
    return isFinite(v) && v > 0 ? v : null;
  }

  /* liste combinée des colonnes, dans l'ordre d'affichage */
  _columnOrder() {
    const n = this._cfg.profiles.length;
    const list = this._cfg.profiles.map((p, i) => ({
      kind: 'p', id: p.id, p, ord: p.ord === null ? i + 1 : p.ord,
    }));
    if (this._grabItems().length) {
      list.push({ kind: 'g', id: '__grab', p: this._grabProfile(), ord: this._grabOrd() === null ? n + 1 : this._grabOrd() });
    }
    return list.sort((a, b) => a.ord - b.ord);
  }

  /* une cellule par colonne — personnes ET « À faire » — qui porte les DEUX
     fonctions : toucher l'avatar affiche/masque, les flèches déplacent.
     Une seule liste, donc plus de doublon « personnes » / « ordre ». */
  _orderRowsHtml() {
    const list = this._columnOrder();
    const n = list.length;
    return list.map((e, i) => {
      const prof = e.p;
      const grab = e.kind === 'g';
      const name = grab ? (prof.name || 'À faire') : prof.name;
      const acc = prof.accent || '#7A8596';
      const off = this._hide.has(e.id);
      const face = grab
        ? `<span class="gico">${SVG.homeGroup}</span>`
        : (prof.photo ? `<img src="${esc(prof.photo)}" alt="">`
          : (prof.glyph ? esc(prof.glyph) : esc((prof.name || '?').charAt(0))));
      return `<div class="ocell${grab ? ' ograb' : ''}${off ? ' off' : ''}" data-id="${esc(e.id)}" style="--col:${esc(tokens(prof).col)};--accent:${esc(acc)};--halo:${alpha(acc, 0.3)}">
        <span class="oa" role="button" tabindex="0" aria-label="${off ? 'Afficher' : 'Masquer'} ${esc(name)}">${face}</span>
        <span class="on">${esc(name)}</span>
        <span class="oarrows">
          <button class="omv" data-mv="-1" data-id="${esc(e.id)}"${i === 0 ? ' data-off="1"' : ''} aria-label="Déplacer ${esc(name)} à gauche">\u2039</button>
          <button class="omv" data-mv="1" data-id="${esc(e.id)}"${i === n - 1 ? ' data-off="1"' : ''} aria-label="Déplacer ${esc(name)} à droite">\u203A</button>
        </span>
      </div>`;
    }).join('');
  }

  _bindOrderRows() {
    this.shadowRoot.querySelectorAll('[data-mv]').forEach((b) => {
      b.addEventListener('click', () => this._moveColumn(b.dataset.id, Number(b.dataset.mv)));
    });
    /* l'avatar bascule l'affichage de SA colonne */
    this.shadowRoot.querySelectorAll('.ocell .oa').forEach((av) => {
      const cell = av.closest('.ocell');
      const id = cell && cell.dataset.id;
      if (!id) return;
      av.addEventListener('click', (ev) => {
        ev.stopPropagation();
        this._toggleColumn(id);
      });
    });
  }

  /* masque / affiche une colonne (personne ou « À faire »), puis redessine */
  _toggleColumn(id) {
    if (this._hide.has(id)) this._hide.delete(id); else this._hide.add(id);
    this._saveHide();
    const box = this.shadowRoot.getElementById('orows');
    if (box) {
      box.innerHTML = this._orderRowsHtml();
      this._bindOrderRows();
    }
    this._render();
  }

  /* un cran, appliqué tout de suite : la bande ET le tableau glissent */
  _moveColumn(id, dir) {
    const list = this._columnOrder();
    const i = list.findIndex((e) => e.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= list.length) return;
    const tmp = list[i];
    list[i] = list[j];
    list[j] = tmp;
    this._applyColumnOrder(list);
    /* redessine la bande en faisant glisser les cellules (FLIP, deux axes :
       la bande se répartit sur plusieurs lignes, une cellule peut changer de rang) */
    const box = this.shadowRoot.getElementById('orows');
    if (!box) return;
    const beforeR = new Map();
    box.querySelectorAll('.ocell').forEach((c) => beforeR.set(c.dataset.id, c.getBoundingClientRect()));
    box.innerHTML = this._orderRowsHtml();
    this._bindOrderRows();
    box.querySelectorAll('.ocell').forEach((c) => {
      const old = beforeR.get(c.dataset.id);
      if (!old) return;
      const r = c.getBoundingClientRect();
      const dx = old.left - r.left;
      const dy = old.top - r.top;
      if (!dx && !dy) return;
      c.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }],
        { duration: 260, easing: 'cubic-bezier(.32,.72,0,1)' });
    });
  }

  /* fixe les positions 1..n sur la liste combinée, puis enregistre */
  _applyColumnOrder(list) {
    let grabPos = null;
    list.forEach((e, i) => {
      if (e.kind === 'p') e.p.ord = i + 1;
      else grabPos = i + 1;
    });
    this._storeProfiles = list.filter((e) => e.kind === 'p').map((e) => e.p);
    this._applyProfiles();
    this._saveColOrder(grabPos);
  }

  /* n'écrit que ce qui change : `ord` déjà calculé sur la liste combinée (il
     contient donc des trous, la place de la colonne « À faire »), et la valeur
     de cette colonne. On compare à la description BRUTE pour éviter les
     réécritures inutiles. */
  _saveColOrder(grabPos) {
    const h = this._hass;
    if (!h) return;
    const ent = this._cfg.profiles_entity || 'todo.profils';
    this._cfg.profiles.forEach((p) => {
      const ord = p.ord;
      if (!p.uid || !isFinite(ord)) return;
      let m = {};
      try {
        m = JSON.parse((this._profRawDesc && this._profRawDesc.get(p.uid)) || '{}') || {};
      } catch (e) { m = {}; }
      if (Number(m.ord) === ord) return;
      m.ord = ord;
      const desc = JSON.stringify(m);
      if (this._profRawDesc) this._profRawDesc.set(p.uid, desc);
      h.callService('todo', 'update_item', { item: p.uid, description: desc }, { entity_id: ent });
    });
    const gent = (this._cfg && this._cfg.grab_ord_entity) || 'input_number.ordre_colonne_a_faire';
    if (grabPos !== null && h.states[gent] && Number(h.states[gent].state) !== grabPos) {
      h.callService('input_number', 'set_value', { value: grabPos }, { entity_id: gent });
    }
  }

  /* fiche profil : étoiles on/off, masquer — mémorisé sur l'appareil */
  /* clic sur l'avatar : prénom, image et couleur se modifient ici.
     Le brouillon vit dans this._pd ; redessiner ne le réinitialise jamais. */
  _openProfile(id) {
    const p = this._cfg.profiles.find((x) => x.id === id);
    if (!p) return;
    this._pd = {
      id: id,
      stored: p.name || '',
      name: p.name || '',
      color: p.color || '#BBD5EF',
      accent: p.accent || this._shade(p.color || '#BBD5EF', 0.45),
      face: p.photo ? p.photo : (p.glyph ? ':' + p.glyph : ''),
      storedFace: p.photo ? p.photo : (p.glyph ? ':' + p.glyph : ''),
      editing: false,
    };
    this._pfDraw();
  }

  _pfDraw() {
    const pd = this._pd;
    if (!pd) return;
    const tk = tokens({ color: pd.color, accent: pd.accent });
    const halo = alpha(pd.accent, 0.3);
    const th = `--tile:${tk.tile};--accent:${pd.accent};--halo:${halo}`;
    /* biblioth?que de l'application : ces images existent ind?pendamment des
       profils, donc elles restent propos?es m?me si personne ne les porte */
    const SKY_AVATARS = ['mateo', 'elena', 'papa', 'noemie'];
    let photos = [];
    SKY_AVATARS.forEach((n) => { photos.push('/local/avatars/' + n + '.webp'); });
    this._cfg.profiles.forEach((x) => {
      if (x.photo && photos.indexOf(x.photo) === -1) photos.push(x.photo);
      /* fichier d'avatar d'origine, connu par convention */
      if (x.id) {
        const f = '/local/avatars/' + x.id + '.webp';
        if (photos.indexOf(f) === -1) photos.push(f);
      }
    });
    let emojis = ['🦊', '🐰', '🐼', '🦄', '🐶', '🐱', '🐸', '🐨', '🦁', '🐵', '🐷', '🐙'];
    /* l'image en cours et celle d'origine sont toujours proposées, sinon on ne
       peut pas revenir en arrière après un essai */
    [pd.face, pd.storedFace].forEach((v) => {
      if (!v) return;
      if (v.charAt(0) === ':') {
        const e = v.slice(1);
        if (emojis.indexOf(e) === -1) emojis = [e].concat(emojis);
      } else if (photos.indexOf(v) === -1) {
        photos = [v].concat(photos);
      }
    });
    /* Les 14 teintes d'identité, identiques à la carte Profils : la couleur
       qu'on possède est vive, le pastel des colonnes s'en déduit (pastelOf).
       Écartées d'au moins 50 unités RVB — à taille de pastille, aucune ne se
       confond avec sa voisine. */
    const palette = ['#2E9E63', '#A8D46A', '#4FC3D0', '#0F5F6E', '#4677A8', '#8E5BD9', '#D9548C',
      '#C2185B', '#C22F2F', '#E0622A', '#7A4B2A', '#A9762F', '#F5A623', '#2B3038'];
    /* une teinte enregistrée hors palette (profil ancien) reste visible */
    if (pd.accent && palette.every((c) => c.toLowerCase() !== String(pd.accent).toLowerCase())) {
      palette.unshift(pd.accent);
    }

    const faces = photos.map((s2) => `<button class="pfcell" data-face="${esc(s2)}" data-on="${pd.face === s2 ? 1 : 0}"><span class="pfdot" style="${th}">
        <img src="${esc(s2)}" alt=""></span></button>`)
      .concat(emojis.map((e) => `<button class="pfcell" data-face=":${esc(e)}" data-on="${pd.face === ':' + e ? 1 : 0}"><span class="pfdot" style="${th}">${esc(e)}</span></button>`))
      .join('');
    const colors = palette.map((c) => {
      /* c'est la teinte d'identité qui est sélectionnée, pas le pastel */
      const on = String(pd.accent || '').toLowerCase() === c.toLowerCase();
      return `<button class="pfcell pfcolc" data-color="${c}" data-on="${on ? 1 : 0}"><span class="pfdot" style="background:${c}"></span></button>`;
    }).join('');

    const keep = this._pfScroll || { faces: 0, colors: 0 };
    this._openPanel(pd.name, `
      <div class="hint" style="margin:2px 2px 0">Image</div>
      <div class="pfrow2">${faces}</div>
      <div class="hint" style="margin:6px 2px 0">Couleur</div>
      <div class="pfrow2">${colors}</div>
    `, CORE.buttonHtml('Valider', { cls: 'go', attrs: 'data-on="1" id="pf-save"' }), true);

    const root = this.shadowRoot;
    /* on remet les rangées là où elles étaient : changer d'image ne doit pas
       renvoyer la liste au début */
    root.querySelectorAll('.pfrow2 img').forEach((im) => {
      im.addEventListener('error', () => {
        const cell = im.closest('.pfcell');
        if (cell) cell.remove();
      });
    });
    const rows = root.querySelectorAll('.pfrow2');
    if (rows[0]) rows[0].scrollLeft = keep.faces || 0;
    if (rows[1]) rows[1].scrollLeft = keep.colors || 0;
    const remember = () => {
      const r = root.querySelectorAll('.pfrow2');
      this._pfScroll = { faces: r[0] ? r[0].scrollLeft : 0, colors: r[1] ? r[1].scrollLeft : 0 };
    };
    const ttl = root.getElementById('pttl');
    const pen = '<button class="pen" id="pf-pen" aria-label="Modifier le prénom" title="Modifier le prénom">'
      + '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg></button>';

    if (ttl) {
      if (pd.editing) {
        ttl.innerHTML = '<input class="hdrin" id="pf-name" maxlength="24" value="' + esc(pd.name) + '">'
          + '<button class="pen" id="pf-ok" aria-label="Confirmer le prénom" title="Confirmer">'
          + '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/></svg></button>';
        const inp = root.getElementById('pf-name');
        const ok = root.getElementById('pf-ok');
        inp.focus();
        inp.select();
        inp.addEventListener('input', () => { pd.name = inp.value; });
        /* le clic sur ✓ ne doit pas provoquer le blur (qui annule) */
        ok.addEventListener('mousedown', (ev) => { ev.preventDefault(); });
        ok.addEventListener('click', () => { pd.editing = false; this._pfDraw(); });
        inp.addEventListener('keydown', (ev) => {
          if (ev.key === 'Enter') { pd.editing = false; this._pfDraw(); }
          if (ev.key === 'Escape') { pd.name = pd.stored; pd.editing = false; this._pfDraw(); }
        });
        /* cliquer ailleurs = annuler : le prénom revient à sa valeur enregistrée */
        inp.addEventListener('blur', () => {
          if (!pd.editing) return;
          pd.name = pd.stored;
          pd.editing = false;
          this._pfDraw();
        });
      } else {
        ttl.innerHTML = esc(pd.name) + pen;
        root.getElementById('pf-pen').addEventListener('click', () => { pd.editing = true; this._pfDraw(); });
      }
    }

    root.querySelectorAll('[data-face]').forEach((b) => b.addEventListener('click', () => {
      remember();
      pd.face = b.dataset.face;
      this._pfDraw();
    }));
    root.querySelectorAll('[data-color]').forEach((b) => b.addEventListener('click', () => {
      remember();
      const v = b.dataset.color;
      /* même garde-fou que l'écran Profils : une teinte inchangée ne recalcule
         pas le pastel, donc les accords existants ne dérivent pas */
      if (String(pd.accent || '').toLowerCase() !== String(v).toLowerCase()) {
        pd.accent = v;
        pd.color = pastelOf(v);
      }
      this._pfDraw();
    }));
    root.getElementById('pf-save').addEventListener('click', () => this._commitProfile());
  }

  _shade(hex, k) {
    const c = [1, 3, 5].map((i) => Math.round(parseInt(hex.substr(i, 2), 16) * (1 - k)));
    return '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');
  }

  /* une seule écriture, valable pour toutes les vues : nom, couleur, image */
  _commitProfile() {
    const h = this._hass;
    const pd = this._pd || {};
    const name = String(pd.name || '').trim();
    if (!h || !name || !pd.id) return;
    const ent = this._cfg.profiles_entity || 'todo.profils';
    h.callWS({ type: 'todo/item/list', entity_id: ent }).then((r) => {
      const it = ((r && r.items) || []).find((x) => {
        try { return (JSON.parse(x.description || '{}') || {}).i === pd.id; } catch (e) { return false; }
      });
      if (!it) return null;
      let m = {};
      try { m = JSON.parse(it.description || '{}') || {}; } catch (e) { m = {}; }
      m.c = pd.color;
      m.a = pd.accent;
      m.p = pd.face || '';
      return h.callService('todo', 'update_item',
        { item: it.uid, rename: name, description: JSON.stringify(m) }, { entity_id: ent });
    }).then(() => {
      /* la fiche vient d'être enregistrée ici : le brouillon laissé dans l'écran
         Profils est périmé, on le jette pour qu'il ne réapparaisse pas */
      try {
        const raw = localStorage.getItem('skylight-profiles-card:draft');
        if (raw) {
          const d = JSON.parse(raw);
          if (!d || !d.id || d.id === pd.id) localStorage.removeItem('skylight-profiles-card:draft');
        }
      } catch (e) { /* ignore */ }
      this._pd = null;
      this._closePanel();
      this._profLoaded = false;
      setTimeout(() => this._loadProfiles(), 400);
    }).catch(() => { /* on garde l'affichage en place */ });
  }

  _col(m) {
    const p = m.p;
    const tk = tokens(p);
    const acc = p.accent || '#7A8596';
    const style = `--col:${tk.col};--tile:${tk.tile};--band:${tk.band};--done:${tk.done};--accent:${acc};--halo:${alpha(acc, 0.3)};--glow:${alpha(acc, 0.3)};--glowSoft:${alpha(acc, 0.16)}`;

    let sel = this._sel[p.id];
    if (!sel || !m.periods.some((x) => x.k === sel)) {
      sel = this._autoPeriod(m);
      this._sel[p.id] = sel;
    }

    const perHtml = m.periods.map((x) => {
      const items = x.k === 'chores'
        ? m.chores
        : m.routine.filter((it) => (it.meta.p || 'morning') === x.k);
      const d = items.filter((it) => it.done).length;
      const ratio = items.length ? d / items.length : 0;
      const dash = (ratio * CIRC).toFixed(1);
      return `<button class="per" data-per="${x.k}" data-prof="${esc(p.id)}" data-on="${sel === x.k ? 1 : 0}">
        <span class="disc">
          <svg class="ring" viewBox="0 0 100 100" aria-hidden="true">
            <circle class="arc" cx="50" cy="50" r="44" data-zero="${ratio === 0 ? 1 : 0}" stroke-dasharray="${dash} ${CIRC.toFixed(1)}"></circle>
          </svg>
          <span class="em">${x.em}</span>
        </span>
        <span class="lb">${x.lb}</span></button>`;
    }).join('');

    const avatar = CORE.avatarHtml(p, { upper: true });

    const pct = m.all.length ? Math.round((m.done / m.all.length) * 100) : 0;
    const bar = (extra, html) => `<div class="bar${extra}">${extra === '' ? `<span class="fill" style="width:${pct}%"></span>` : ''}<span class="txt">${html}</span></div>`;
    const barTask = bar('', `${SVG.tick}<span class="n">${m.done}/${m.all.length}</span>`);
    const barsHtml = m.showStars
      ? barTask + bar(' st', `${SVG.star}<span class="n">${m.stars}</span>`).replace('class="bar st"', `class="bar st" data-stars="${esc(p.id)}"`)
      : barTask.replace('class="bar"', 'class="bar" style="flex:1 1 100%"');

    let sectHtml = '';
    let body = '';
    /* illustrations d'état vide, comme Skylight : une différente par colonne */
    const ILLUS = ['\uD83C\uDF43', '\uD83D\uDE48', '\uD83D\uDCEA'];
    const pIdx = Math.max(0, this._cfg.profiles.findIndex((x) => x.id === p.id));
    const illu = ILLUS[(pIdx + (sel === 'chores' ? 1 : 0)) % ILLUS.length];
    if (sel === 'chores') {
      const items = m.chores.slice().sort(byDone);
      body = items.length
        ? `<div class="chores">${items.map((it) => this._chore(it, p, m.showStars)).join('')}</div>`
        : CORE.emptyHtml(illu, 'Aucune tâche pour le moment.');
    } else {
      const def = PERIODS.find((x) => x.k === sel);
      sectHtml = `<div class="sect">${def ? def.lb : ''}</div>`;
      const items = m.routine.filter((it) => (it.meta.p || 'morning') === sel).sort(byDone);
      body = items.length
        ? `<div class="tiles">${items.map((it) => this._tileWrap(it, p, m.showStars)).join('')}</div>`
        : CORE.emptyHtml(illu, this._offset === 0 ? "Rien à faire aujourd'hui." : 'Rien à faire ce jour-là.');
    }

    return `<section class="col" data-prof="${esc(p.id)}" style="${style}">
      <div class="head">
        <div class="ava" data-profile="${esc(p.id)}">${avatar}</div>
        <div class="who">
          <div class="nm">${esc(p.name)}</div>
          <div class="bars">${barsHtml}</div>
        </div>
      </div>
      ${m.periods.length > 1 ? `<div class="periods">${perHtml}</div>` : ''}
      ${sectHtml}
      <div class="scroll" data-scroll="${esc(p.id)}">${body}</div>
    </section>`;
  }

  /* carte + son bouton de gestion ; le bouton est FRÈRE de la carte (voir .mng) */
  _tileWrap(it, p, showStars) {
    return `<div class="rw">${this._tile(it, p, showStars)}`
      + `<button class="mng" data-mng="${esc(it.uid)}" data-mlist="${esc(p.routine_entity)}" data-mprof="${esc(p.id)}" aria-label="Modifier ou supprimer cette tâche">⋯</button>`
      + '</div>';
  }

  _tile(it, p, showStars) {
    const hasStar = showStars && it.stars > 0;
    const star = hasStar
      ? `<span class="schip${it.done ? ' filled' : ''}">${it.done ? SVG.star : SVG.starOut}<span class="n">${it.stars}</span></span>`
      : '';
    return `<button class="tile${it.done ? ' done' : ''}${hasStar ? '' : ' nostar'}${it.pin ? ' pin' : ''}" data-task="${esc(it.uid)}" data-list="${esc(p.routine_entity)}" data-prof="${esc(p.id)}">
      <span class="ill">${esc(it.emoji)}</span>
      <span class="foot"><span class="txt"><span class="lb">${esc(it.title)}</span>${star}</span>
      <span class="chk">${CHECK_SVG}</span></span></button>`;
  }

  _colGrab() {
    const p = this._grabProfile();
    const tk = tokens(p);
    const acc = p.accent;
    const items = this._grabItems().slice().sort(byDone);
    const style = `--col:${tk.col};--tile:${tk.tile};--band:${tk.band};--done:${tk.done};--accent:${acc};--halo:${alpha(acc, 0.3)}`;
    const barsHtml = `<div class="bar" style="flex:1 1 100%"><span class="txt">${SVG.tick}<span class="n">0/${items.length}</span></span></div>`;
    const body = items.length
      ? `<div class="chores">${items.map((it) => this._chore(it, p, true)).join('')}</div>`
      : CORE.emptyHtml('\uD83C\uDFE1', 'Rien à prendre<br>pour le moment.');
    return `<section class="col grab" data-prof="__grab" style="${style}">
      <div class="head">
        <div class="ava glyph">${SVG.homeGroup}</div>
        <div class="who">
          <div class="nm">${esc(p.name)}</div>
          <div class="bars">${barsHtml}</div>
        </div>
      </div>
      <div class="scroll" data-scroll="__grab"><div class="sect">Ouvert à tous</div>${body}</div>
    </section>`;
  }

  _relDay(iso) {
    if (!iso) return '';
    const d = new Date(iso + 'T00:00:00');
    if (isNaN(d.getTime())) return '';
    const today = this._today();
    const a = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
    const b = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
    const n = Math.round((a - b) / 86400000);
    if (n <= 0) return "aujourd'hui";
    if (n === 1) return 'hier';
    if (n < 7) return `il y a ${n} jours`;
    if (n < 14) return 'il y a une semaine';
    return `il y a ${Math.round(n / 7)} semaines`;
  }

  _chore(it, p, showStars) {
    const star = (showStars && it.stars > 0)
      ? `<span class="cchip${it.done ? ' filled' : ''}">${it.done ? SVG.star : SVG.starOut}<span class="n">${it.stars}</span></span>`
      : '';
    /* une tâche « ouverte à tous » faite par quelqu'un : date, puis étiquette famille en dessous */
    const sub = (it.done && it.meta.by)
      ? `<span class="sub"><span class="rel">${esc(this._relDay(it.meta.done))}</span></span><span class="gtag" title="Ouverte à tous">${SVG.homeGroup}</span>`
      : '';
    const grabAttr = it.meta.grab && !it.meta.o ? ' data-grab="1"' : '';
    const tall = sub ? ' tall' : '';
    return `<button class="chore${it.done ? ' done' : ''}${it.pin ? ' pin' : ''}${tall}" data-task="${esc(it.uid)}" data-list="${esc(this._cfg.chores_entity)}" data-prof="${esc(p.id)}"${grabAttr}>
      <span class="ctxt"><span class="lb">${esc(it.title)}</span>${sub}</span>${star}<span class="chk">${CHECK_SVG}</span></button>`;
  }

  _tick() {
    const root = this.shadowRoot;
    if (!root) return;
    const dEl = root.getElementById('d');
    if (!dEl) return;
    const d = this._today();
    const J = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
    const M = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
    /* en poche, la date longue ne tient pas à côté de l'heure, de la météo et des
       boutons : « Lundi 2 novembre » devient « Lun. 2 nov. » */
    /* date, heure, météo : une seule implémentation, dans le tronc commun.
       Avant, chaque carte avait la sienne — deux formats de date, deux tables
       d'emoji, et la météo qui disparaissait sur un écran. */
    CORE.paintHeaderLive(root, this._hass, Object.assign({}, this._cfg, { today: this._offset === 0 }));

    /* bandeau « vous regardez un autre jour » : posé dans le flux, au-dessus du plateau */
    const band = root.getElementById('pvband');
    if (band) {
      const on = this._offset !== 0;
      band.classList.toggle('on', on);
      if (on) {
        const pvEl = root.getElementById('pvtext');
        if (pvEl) pvEl.textContent = `Vous regardez le ${raw}`;
      }
    }

    /* bascule automatique matin / soir : on libère les choix manuels au changement de créneau */
    const slot = (new Date().getHours() >= Number(this._cfg.evening_from || 16) || new Date().getHours() < 4) ? 'evening' : 'morning';
    if (this._slot && this._slot !== slot) {
      this._sel = {};
      if (this._built) this._render();
    }
    this._slot = slot;
  }

  /* ---------- panneau ---------- */

  /* Rangée horizontale sans barre de défilement : elle se glisse EXACTEMENT comme
     le plateau des tâches (voir _pDown/_pMove/_pUp) — souris uniquement, armé au
     seul mouvement horizontal, seuil de 8 px. Au doigt, le défilement est natif.
     La molette n'est PAS détournée : elle reste verticale (constat du 03/11). */
  _hScroll(el) {
    if (!el || el._hscroll) return;
    el._hscroll = true;
    el.style.cursor = 'grab';
    let d = null;
    el.addEventListener('pointerdown', (ev) => {
      if (ev.pointerType === 'touch') return;
      if (ev.target && ev.target.closest && ev.target.closest('button')) return;
      if (el.scrollWidth <= el.clientWidth + 1) return;
      d = { x: ev.clientX, y: ev.clientY, left: el.scrollLeft, dragging: false, id: ev.pointerId };
    });
    el.addEventListener('pointermove', (ev) => {
      if (!d) return;
      const dx = ev.clientX - d.x;
      const dy = ev.clientY - d.y;
      if (!d.dragging) {
        /* on n'arme qu'à l'horizontale : un geste vertical laisse passer le scroll */
        if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(dy)) return;
        d.dragging = true;
        try { el.setPointerCapture(d.id); } catch (e) { /* ignore */ }
        el.style.cursor = 'grabbing';
      }
      el.scrollLeft = d.left - dx;
      ev.preventDefault();
    });
    const up = () => {
      if (d && d.dragging) el._draggedAt = Date.now();
      d = null;
      el.style.cursor = 'grab';
    };
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    /* un glissement ne doit pas déclencher la flèche qui se trouve sous le doigt */
    el.addEventListener('click', (ev) => {
      if (el._draggedAt && Date.now() - el._draggedAt < 280) {
        ev.stopPropagation();
        ev.preventDefault();
      }
    }, true);
  }

  /* La feuille (panneau latéral, compacte ou ancrée) est le composant partagé
     `CORE.openSheet` ; ici on ne garde que ce qui est propre à cet écran : les
     rangées horizontales doivent rester glissables à la souris. */
  _openPanel(title, bodyHtml, footHtml, compact, anchorEl) {
    const root = this.shadowRoot;
    const s = CORE.openSheet(root, {
      title,
      body: bodyHtml,
      foot: footHtml || '',
      compact,
      anchor: anchorEl,
    });
    if (!s || !s.body) return;
    s.body.querySelectorAll('.profiles, .ostrip').forEach((el) => this._hScroll(el));
  }

  _closePanel() {
    CORE.closeSheet(this.shadowRoot);
  }

  /* création rapide d'un profil depuis le panneau « Ajouter une tâche » :
     prénom + couleur, puis création de sa liste de routines, comme dans la
     vue Profils (photo et calendrier se règlent ensuite là-bas). */
  _openAddProfile() {
    /* la création se fait dans l'écran Profils, avec toutes ses options */
    try { localStorage.setItem('skylight-profiles-card:new', '1'); } catch (e) { /* ignore */ }
    this._closePanel();
    /* V2 : on reste dans l'application (le panneau écoute cet événement) */
    window.dispatchEvent(new CustomEvent('skylight-navigate', { detail: { view: 'profils' } }));
  }


  /* « Affichage » : UNE seule liste de colonnes, et chaque cellule porte les deux
     fonctions — toucher l'avatar affiche/masque, les flèches déplacent. C'est ce
     qui évite d'avoir les personnes à deux endroits (constat du 03/11) et ce qui
     fait entrer « À faire » dans le filtre comme n'importe quelle colonne. */
  _openDisplay() {
    this._openPanel('Affichage',
      `<div class="hint"><b>Qui apparaît sur le tableau, et dans quel ordre.</b><br>
        Touchez un visage pour masquer sa colonne · <b>\u2039 \u203A</b> pour changer sa place.</div>
       <div class="ostrip" id="orows">${this._orderRowsHtml()}</div>`,
      CORE.buttonHtml('Terminé', { cls: 'go', attrs: 'data-on="1" id="dispdone"' }), true);
    const root = this.shadowRoot;
    this._bindOrderRows();
    root.getElementById('dispdone').addEventListener('click', () => this._closePanel());
  }

  _openAdd() {
    if (this._offset !== 0) { this._offset = 0; this._render(); }
    const cfg = this._cfg;
    const profs = cfg.profiles.map((p, i) => {
      const acc = p.accent || '#7A8596';
      return `<button class="pf" data-addprof="${esc(p.id)}" data-on="${i === 0 ? 1 : 0}" style="--accent:${esc(acc)};--halo:${alpha(acc, 0.3)}">
        ${CORE.avatarHtml(p, { tag: 'span', className: 'a', upper: false })}
        <span class="n">${esc(p.name)}</span></button>`;
    }).join('');
    const days = WD.map((lb, i) => `<button class="day" data-day="${i + 1}" data-on="${i < 5 ? 1 : 0}">${lb}</button>`).join('');

    this._openPanel('Ajouter une tâche', `
      <div class="types" id="a-type">
        <button class="tbtn" data-type="chore" data-on="0"><span class="c">${SVG.broom}</span><span class="t">Tâche</span></button>
        <button class="tbtn" data-type="routine" data-on="1"><span class="c">${SVG.sun}</span><span class="t">Routine</span></button>
      </div>
      <div class="trow">
        <label class="field"><span class="ic">${SVG.line}</span><input id="a-title" placeholder="Titre" maxlength="80"></label>
        <button class="emobtn" id="a-emoji-btn" data-mode="icon" aria-label="Changer l'emoji">${SVG.emojiPlus}</button>
      </div>
      <div class="box" id="a-profbox"><div class="lbl">${SVG.people}Assigner</div><div class="profiles">${profs}<button class="pf addp" id="a-addprof" aria-label="Ajouter un profil"><span class="a">${SVG.plus}</span><span class="n">Ajouter</span></button></div></div>
      <div class="box"><button class="togrow" id="a-grab"><span class="tic">${SVG.homeGroup}</span><span class="ttl">Ouvert à tous</span><span class="sw" data-on="0"></span></button></div>
      <div class="box" id="a-when">
        <div class="lbl">${SVG.sync}Tous les</div>
        <div class="row"><input class="num" id="a-every" value="1" inputmode="numeric">
          <div class="seg" style="flex:1"><button data-unit="day">Jour</button><button data-unit="week" data-on="1">Semaine</button></div></div>
        <div class="lbl" style="margin-top:12px">${SVG.days}Le</div>
        <div class="days">${days}</div>
      </div>
      <div class="box" id="a-period">
        <div class="lbl">${SVG.clock}Moment</div>
        <div class="seg" id="a-per"><button data-p="morning" data-on="1">\uD83C\uDF24\uFE0F Matin</button><button data-p="afternoon">\u2600\uFE0F Aprèm</button><button data-p="evening">\uD83C\uDF19 Soir</button></div>
      </div>
      <div class="hint" id="a-warn" style="display:none;color:#FF3B30">Ce profil n'a pas de liste de routines : choisissez « Tâche », ou donnez-lui une liste de routines dans la configuration.</div>`,
      '<button class="go" id="a-go">Ajouter</button>');

    const root = this.shadowRoot;
    const state = { profiles: new Set([cfg.profiles[0].id]), type: 'routine', unit: 'week', per: 'morning', days: new Set([1, 2, 3, 4, 5]), grab: false, emoji: null };
    this._addState = state;

    const grabBtn = root.getElementById('a-grab');
    if (grabBtn) {
      grabBtn.addEventListener('click', () => {
        state.grab = !state.grab;
        grabBtn.dataset.on = state.grab ? '1' : '0';
        const sw = grabBtn.querySelector('.sw');
        if (sw) sw.dataset.on = state.grab ? '1' : '0';
        const pbox = root.getElementById('a-profbox');
        if (pbox) pbox.classList.toggle('off', state.grab);
        /* une tâche ouverte à tous vit dans la liste familiale */
        if (state.grab) {
          state.type = 'chore';
          root.querySelectorAll('#a-type button').forEach((x) => { x.dataset.on = x.dataset.type === 'chore' ? '1' : '0'; });
          const when = root.getElementById('a-when');
          if (when) when.style.display = 'none';
          const per = root.getElementById('a-period');
          if (per) per.style.display = 'none';
        } else {
          const when = root.getElementById('a-when');
          if (when) when.style.display = '';
          const per = root.getElementById('a-period');
          if (per) per.style.display = '';
        }
        this._checkAdd();
      });
    }

    /* une tâche n'est que pour une personne : la sélection est exclusive */
    root.querySelectorAll('[data-addprof]').forEach((b) => {
      b.addEventListener('click', () => {
        state.profiles = new Set([b.dataset.addprof]);
        root.querySelectorAll('[data-addprof]').forEach((x) => { x.dataset.on = x === b ? '1' : '0'; });
        this._checkAdd();
      });
    });
    /* sélecteur de type : deux pastilles icône, comme l'interface Skylight actuelle */
    root.querySelectorAll('#a-type .tbtn').forEach((b) => {
      b.addEventListener('click', () => {
        root.querySelectorAll('#a-type .tbtn').forEach((x) => { x.dataset.on = '0'; });
        b.dataset.on = '1';
        state.type = b.dataset.type;
        root.getElementById('a-when').style.display = state.type === 'routine' ? '' : 'none';
        root.getElementById('a-period').style.display = state.type === 'routine' ? '' : 'none';
        this._checkAdd();
      });
    });
    root.querySelectorAll('.seg button').forEach((b) => {
      b.addEventListener('click', () => {
        const grp = b.parentElement;
        grp.querySelectorAll('button').forEach((x) => { x.dataset.on = '0'; });
        b.dataset.on = '1';
        if (grp.id === 'a-per') state.per = b.dataset.p;
        if (b.dataset.unit) state.unit = b.dataset.unit;
        this._checkAdd();
      });
    });
    root.querySelectorAll('.day').forEach((b) => {
      b.addEventListener('click', () => {
        const d = Number(b.dataset.day);
        if (state.days.has(d)) state.days.delete(d); else state.days.add(d);
        b.dataset.on = state.days.has(d) ? '1' : '0';
      });
    });
    root.getElementById('a-title').addEventListener('input', () => { this._syncEmoji(); this._checkAdd(); });
    const emoBtn = root.getElementById('a-emoji-btn');
    if (emoBtn) emoBtn.addEventListener('click', () => this._openEmojiPicker());
    const addP = root.getElementById('a-addprof');
    if (addP) addP.addEventListener('click', () => this._openAddProfile());
    this._syncEmoji();
    root.getElementById('a-go').addEventListener('click', () => this._add());
    setTimeout(() => { const i = root.getElementById('a-title'); if (i) i.focus(); }, 60);
    this._checkAdd();
  }

  _checkAdd() {
    const root = this.shadowRoot;
    const st = this._addState;
    if (!root || !st) return;
    const go = root.getElementById('a-go');
    const title = root.getElementById('a-title');
    if (!go) return;
    const bad = Array.from(st.profiles).some((id) => {
      const p = this._cfg.profiles.find((x) => x.id === id);
      return p && st.type === 'routine' && !p.routine_entity;
    });
    go.dataset.on = (title && title.value.trim() && (st.grab || st.profiles.size) && !bad) ? '1' : '0';
    const warn = root.getElementById('a-warn');
    if (warn) warn.style.display = bad ? 'block' : 'none';
  }

  /* l'emoji suit le titre en direct ; sans titre ni choix, on montre l'icône « emoji + » */
  _syncEmoji() {
    const root = this.shadowRoot;
    const st = this._addState;
    const btn = root && root.getElementById('a-emoji-btn');
    if (!btn || !st) return;
    const t = root.getElementById('a-title');
    const val = st.emoji || autoEmojiOrNull(t ? t.value : '');
    if (val) {
      const e = emojiChar(val);
      if (btn.dataset.mode !== 'emoji' || btn.textContent !== e) {
        btn.dataset.mode = 'emoji';
        btn.textContent = e;
      }
    } else if (btn.dataset.mode !== 'icon') {
      btn.dataset.mode = 'icon';
      btn.innerHTML = SVG.emojiPlus;
    }
    btn.classList.toggle('manual', !!st.emoji);
  }

  _openEmojiPicker() {
    const st = this._addState;
    const root = this.shadowRoot;
    if (!st || !root) return;
    const old = root.getElementById('epick');
    if (old) old.remove();
    const cats = EMOJI_CATS.map((c, i) => `<button data-cat="${i}" data-on="${i === 0 ? 1 : 0}">${esc(c[0])}</button>`).join('');
    const wrap = document.createElement('div');
    wrap.className = 'epick';
    wrap.id = 'epick';
    wrap.innerHTML = `<div class="ecard">
      <div class="ehead"><span>Choisir un emoji</span><button class="ex" aria-label="Fermer">${SVG.close}</button></div>
      <div class="esearch"><input id="esearch" type="search" placeholder="Rechercher un emoji" autocomplete="off"></div>
      <div class="ecats">${cats}</div><div class="egrid" id="egrid"></div></div>`;
    root.appendChild(wrap);
    const grid = wrap.querySelector('#egrid');
    const catBar = wrap.querySelector('.ecats');
    const cell = (e) => `<button data-em="${emojiChar(e)}">${emojiChar(e)}</button>`;
    const fill = (i) => {
      grid.innerHTML = EMOJI_CATS[i][1].split(' ').map(cell).join('');
      grid.scrollTop = 0;
    };
    fill(0);
    wrap.querySelectorAll('[data-cat]').forEach((b) => {
      b.addEventListener('click', () => {
        wrap.querySelectorAll('[data-cat]').forEach((x) => { x.dataset.on = x === b ? '1' : '0'; });
        fill(Number(b.dataset.cat));
      });
    });
    const search = wrap.querySelector('#esearch');
    search.addEventListener('input', () => {
      const q = norm(search.value);
      if (!q) {
        catBar.style.display = '';
        const on = wrap.querySelector('[data-cat][data-on="1"]');
        fill(on ? Number(on.dataset.cat) : 0);
        return;
      }
      catBar.style.display = 'none';
      const score = (e) => {
        const kw = norm(EMOJI_KW[e] || '');
        if (!kw) return 3;
        if (kw.split(' ').indexOf(q) !== -1) return 0;
        if (kw.indexOf(q) === 0) return 1;
        return 2;
      };
      const hits = EMOJI_CATS.flatMap((c) => c[1].split(' '))
        .filter((e) => norm(EMOJI_KW[e] || '').indexOf(q) !== -1)
        .sort((a, b) => score(a) - score(b));
      grid.innerHTML = hits.length
        ? hits.map(cell).join('')
        : '<div class="enone">Aucun emoji pour cette recherche.</div>';
      grid.scrollTop = 0;
    });
    grid.addEventListener('click', (e) => {
      const b = e.target.closest('[data-em]');
      if (!b) return;
      st.emoji = b.dataset.em;
      this._syncEmoji();
      wrap.remove();
    });
    wrap.addEventListener('click', (e) => { if (e.target === wrap) wrap.remove(); });
    wrap.querySelector('.ex').addEventListener('click', () => wrap.remove());
    setTimeout(() => { if (search) search.focus(); }, 60);
  }

  _add() {
    const root = this.shadowRoot;
    const st = this._addState;
    const title = root.getElementById('a-title').value.trim();
    if (!title || (!st.grab && !st.profiles.size)) return;
    const emoji = st.emoji || autoEmoji(title);
    const every = Math.max(1, Math.min(8, Number(root.getElementById('a-every').value) || 1));
    const stars = Number(this._cfg.stars_per_task || 10);
    const h = this._hass;

    /* « ouvert à tous » : une seule tâche dans la liste familiale, sans propriétaire */
    if (st.grab) {
      const ent = this._cfg.chores_entity;
      if (ent) {
        const desc = JSON.stringify({ t: 'chore', grab: 1, e: emoji, s: stars });
        h.callService('todo', 'add_item', { item: title, description: desc }, { entity_id: ent });
      }
      this._closePanel();
      setTimeout(() => this._load(), 800);
      return;
    }

    st.profiles.forEach((id) => {
      const p = this._cfg.profiles.find((x) => x.id === id);
      if (!p) return;
      let ent;
      let desc;
      if (st.type === 'routine') {
        if (!p.routine_entity) return;
        const days = st.unit === 'day' ? [1, 2, 3, 4, 5, 6, 7] : Array.from(st.days).sort((a, b) => a - b);
        if (!days.length) return;
        ent = p.routine_entity;
        desc = JSON.stringify({ t: 'routine', p: st.per, d: days, n: every, e: emoji, s: stars });
      } else {
        ent = this._cfg.chores_entity;
        if (!ent) return;
        desc = JSON.stringify({ t: 'chore', o: id, e: emoji, s: stars });
      }
      h.callService('todo', 'add_item', { item: title, description: desc }, { entity_id: ent });
    });

    this._closePanel();
    setTimeout(() => this._load(), 800);
  }

  _openEdit(list, uid, profId) {
    const it = (this._data[list] || []).find((x) => x.uid === uid);
    if (!it) return;
    const meta = parseMeta(it);
    this._openPanel('Modifier', `
      <label class="field"><span class="ic">${SVG.line}</span><input id="e-title" value="${esc(it.summary || '')}" maxlength="80"></label>
      <label class="field"><span class="ic">${SVG.smile}</span><input id="e-emoji" value="${esc(meta.e || '')}" placeholder="Emoji" maxlength="4"></label>
      <div class="hint">Appui long sur une tuile pour rouvrir ce panneau. « Supprimer » retire la tâche de la liste.</div>`,
      '<button class="go" data-on="1" id="e-save">Enregistrer</button><button class="del" id="e-del">Supprimer</button>', true);

    const root = this.shadowRoot;
    root.getElementById('e-save').addEventListener('click', () => {
      const title = root.getElementById('e-title').value.trim();
      const emoji = root.getElementById('e-emoji').value.trim();
      if (!title) return;
      const d = Object.assign({}, meta);
      if (emoji) d.e = emoji; else delete d.e;
      this._hass.callService('todo', 'update_item', { item: uid, rename: title, description: JSON.stringify(d) }, { entity_id: list });
      this._closePanel();
      setTimeout(() => this._load(), 800);
    });
    root.getElementById('e-del').addEventListener('click', () => {
      const b = root.getElementById('e-del');
      if (b.dataset.arm !== '1') {
        b.dataset.arm = '1';
        b.textContent = 'Confirmer la suppression ?';
        clearTimeout(this._delTimer);
        this._delTimer = setTimeout(() => { b.dataset.arm = '0'; b.textContent = 'Supprimer'; }, 4000);
        return;
      }
      clearTimeout(this._delTimer);
      this._hass.callService('todo', 'remove_item', { item: uid }, { entity_id: list });
      this._closePanel();
      setTimeout(() => this._load(), 800);
    });
  }
}

if (!customElements.get('skylight-tasks-card')) {
  customElements.define('skylight-tasks-card', SkylightTasksCard);
}
window.customCards = window.customCards || [];
window.customCards.push({
  type: 'skylight-tasks-card',
  name: 'Skylight Tâches',
  description: 'Vue Tâches / Routine par profil, façon Skylight Calendar 2',
});
