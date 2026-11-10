# Skylight Hub Family

Application familiale **plein écran** pour Home Assistant : calendrier, tâches,
récompenses, repas, profils. Elle s'installe comme un panneau dans la barre
latérale, et **toutes ses données restent chez vous**.

## Ce qui la distingue

- **Aucune entité créée** : profils, tâches, routines, récompenses, repas,
  étoiles et réglages vivent dans un fichier de l'intégration
  (`.storage/skylight_hub_family.data`). Rien à créer, rien à nommer, aucun
  risque de collision avec vos entités existantes.
- **Un écran d'accueil** au premier lancement : nom de la famille, personnes,
  et pour chacune un calendrier à relier ou à créer.
- **Seuls les calendriers sont des objets de Home Assistant** — c'est voulu :
  les rendez-vous doivent rester de vrais calendriers (Google, CalDAV, local).

## Prérequis

- Home Assistant 2026.10 ou plus récent.
- La carte **Daylight Calendar Card** (HACS / Marketplace) pour la vue
  Calendrier.

## Installation

1. **HACS** → menu → *Dépôts personnalisés* → ajouter
   `https://github.com/Maxime-Camaille/skylight-hub-family` en catégorie
   **Intégration**.
2. Installer **Skylight Hub Family**, puis **redémarrer Home Assistant**.
3. **Réglages → Appareils et services → Ajouter une intégration →
   « Skylight Hub Family »**.
4. Une entrée **Skylight Hub** apparaît dans la barre latérale.

Installation manuelle équivalente : copier
`custom_components/skylight_hub_family/` dans le dossier `custom_components/`
de Home Assistant, puis redémarrer.

## Premier lancement

L'écran d'accueil demande le nom de la famille et les personnes du foyer. Pour
chaque personne, vous pouvez **relier un calendrier existant** ou **en créer un**
calendrier local. Les profils sont ensuite modifiables depuis l'écran Profils.

## Mode kiosque

L'interrupteur du mode kiosque (écran Réglages) masque la barre latérale de
Home Assistant et affiche l'application en plein écran. Aucun plugin n'est
nécessaire pour cela.

## Remise à zéro

Chaque nuit à 4 h, l'intégration décoche les routines terminées et retire les
tâches familiales faites. C'est une tâche planifiée de l'intégration — plus
d'automatisation Home Assistant.

## Désinstallation

Supprimer l'intégration retire le panneau. Le fichier de données est conservé :
les tâches, profils et étoiles de la famille ne sont jamais supprimés.
