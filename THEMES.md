# Thèmes — contrat de développement

L'application a **deux thèmes prévus**, isolés :

| id | nom | état | fichier |
|---|---|---|---|
| `skylight` | Skylight Calendar | **actif / validé** | `custom_components/skylight_hub_family/frontend/themes/skylight.js` |
| `apple` | Apple | **à développer** (`status: 'coming'`) | `custom_components/skylight_hub_family/frontend/themes/apple.js` |

Le sélecteur est dans **Réglages → Thème**. Le thème actif est stocké dans le
store de l'app (`theme`), donc il survit aux mises à jour et aux redémarrages.

## Règle d'or

> **Ne jamais modifier le thème Skylight, le CSS de base du panneau ou les
> cartes pour construire le thème Apple.**

Le thème Skylight est la référence validée. Une conversation « développe le
thème Apple » doit **ajouter** :

- le CSS/tokens/animations dans `frontend/themes/apple.js` ;
- éventuellement `setup(host)` / `teardown(host)` dans ce même fichier ;
- le passage de `status: 'coming'` à `status: 'ready'` ;
- les overrides nécessaires aux composants qui ont encore des valeurs codées
  en dur (dans `apple.js`, scopés au thème, ou en convertissant la valeur en
  variable partagée — jamais en réécrivant Skylight).

## Comment ça marche

```
frontend/themes/index.js     registre : THEMES, resolveTheme, applyTheme
frontend/themes/skylight.js  thème actif (validé)
frontend/themes/apple.js     scaffold du thème Apple (status: 'coming')
```

- `applyTheme(host, id)` injecte **uniquement** le CSS du thème actif dans
  `<style id="skylight-theme">` du shadow root du panneau, après le CSS de base.
- Le thème inactif n'est **jamais injecté** : ses `@keyframes` ne tournent pas,
  son `setup()` n'est pas appelé, son `teardown()` nettoie au changement.
- Les cartes (calendrier, tâches, récompenses, repas, profils, réglages) sont
  dans des **shadow roots séparés** : un thème ne peut pas les styler par un
  sélecteur global. Elles héritent des **custom properties** posées sur le
  panneau (`--f-*`, `--skylight-*`, `--theme-*`). C'est le contrat.
- Un thème `coming` n'est pas sélectionnable : le sélecteur l'affiche
  « Bientôt » et le panneau retombe sur Skylight (`resolveTheme`).

## Activer le thème Apple

1. Remplir `frontend/themes/apple.js` (tokens + CSS + animations + `setup`).
2. Passer `status` à `'ready'`.
3. Vérifier dans Réglages : l'option Apple devient sélectionnable, la bascule
   est immédiate et persistée ; le retour à Skylight doit être **identique**.
4. Tester les cartes : celles qui utilisent les variables suivent ; celles qui
   ont encore des couleurs en dur doivent recevoir un override dans
   `apple.js` (ou être converties en variables pour les deux thèmes).
5. Ne pas toucher `skylight.js` ni le CSS de base.

## Variables principales

- Typo : `--skylight-sans`, `--skylight-serif`
- Encre/fonds : `--f-ink`, `--f-ink-soft`, `--f-muted`, `--f-line`,
  `--f-surface`, `--f-rail`, `--f-chip`
- Marque : `--f-brand`, `--f-brand-soft`, `--f-star`, `--f-today`
- Rayons : `--theme-radius`, `--theme-radius-lg`
- Le thème Apple peut ajouter ses propres variables (préfixées `--apple-*`).

## Test minimal avant livraison

- Réglages → Thème : Skylight actif, Apple « Bientôt » si non prêt.
- Basculer, recharger : le thème choisi est conservé.
- Revenir à Skylight : le rendu doit être identique à l'ancien.
- Vérifier qu'aucun CSS du thème Apple n'est présent quand Skylight est actif.
- Les données (profils, tâches, repas, étoiles) ne sont pas affectées.
