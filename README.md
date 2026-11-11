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

## Calendrier

Reliez un calendrier **Google, Apple/CalDAV ou local** déjà ajouté à Home
Assistant. L'application lit les événements et crée des rendez-vous sur ces
calendriers ; la synchronisation est celle de Home Assistant.

La suppression et la modification dépendent de l'intégration HA. CalDAV (Apple)
n'expose que la **création** : supprimez ou modifiez le rendez-vous dans
l'application Calendrier du téléphone, la synchronisation le répercutera ici.
Google et local selon les fonctionnalités exposées par l'intégration.

## Confidentialité

Toutes les données de l'application (famille, profils, tâches, routines,
récompenses, repas, étoiles) restent dans
`.storage/skylight_hub_family.data` sur votre Home Assistant. L'application
n'appelle aucun service tiers : pas de CDN, pas d'analytique, polices du
système. Les calendriers restent ceux de Home Assistant (Google, Apple/CalDAV
ou local selon vos intégrations).

## Mises à jour

Une mise à jour remplace uniquement le code de l'intégration : le fichier
`.storage/skylight_hub_family.data` n'est jamais touché. Faites une sauvegarde
Home Assistant avant, par précaution.

## Thèmes

Deux thèmes sont prévus : **Skylight Calendar** (actif) et **Apple** (à venir).
Le sélecteur est dans **Réglages → Thème**. L'architecture, les règles
d'isolation et la procédure pour développer le thème Apple sont dans
[THEMES.md](THEMES.md).

## Prérequis

- Home Assistant 2026.10 ou plus récent.
- Aucune carte externe : la vue Calendrier est intégrée à l'application.

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

## Plein écran

L'interrupteur **Plein écran** (écran Réglages) masque la barre latérale de
Home Assistant et affiche l'application comme une application. Aucun plugin
n'est nécessaire pour cela.

## Remise à zéro

Chaque nuit à 4 h, l'intégration décoche les routines terminées et retire les
tâches familiales faites. C'est une tâche planifiée de l'intégration — plus
d'automatisation Home Assistant.

## Désinstallation

Supprimer l'intégration retire le panneau. Le fichier de données est conservé :
les tâches, profils et étoiles de la famille ne sont jamais supprimés.
