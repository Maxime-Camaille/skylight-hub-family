# Thèmes (frontend)

- `index.js` : registre + `applyTheme` (thème actif uniquement).
- `skylight.js` : thème **validé**. **Ne pas modifier pour créer Apple.**
- `apple.js` : scaffold du thème Apple (`status: 'coming'`).

Contrat complet, règles d'isolation et procédure d'activation :
**[../../../../THEMES.md](../../../../THEMES.md)** (racine du dépôt).

Rappel : les cartes ont leur propre shadow root ; un thème ne les style que par
les custom properties héritées (`--f-*`, `--skylight-*`, `--theme-*`). Le CSS
du thème inactif n'est jamais injecté.
