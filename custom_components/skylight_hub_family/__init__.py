"""Skylight V2 — les données vivent dans l'application, pas dans Home Assistant.

Aucune entité n'est créée : profils, tâches, récompenses, repas et étoiles sont
stockés dans un fichier de l'intégration. Les cartes continuent de parler à
`homeassistant` via un adaptateur côté navigateur, mais tout est servi par ici.

Cette intégration vit à côté de la v1 : domaine, panneau et stockage distincts.
"""

from __future__ import annotations

import logging
from pathlib import Path

from homeassistant.components import frontend
from homeassistant.components.frontend import add_extra_js_url
from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant

from . import api
from .const import (
    DOMAIN,
    FRONTEND_DIRNAME,
    PANEL_ICON,
    PANEL_TITLE,
    PANEL_URL,
    PREVIEW_URL,
    STATIC_PATH,
    VERSION,
)

_LOGGER = logging.getLogger(__name__)

_STATIC_KEY = f"{DOMAIN}_static"
_API_KEY = f"{DOMAIN}_api"
_ICONSET_KEY = f"{DOMAIN}_iconset"

FRONTEND_DIR = Path(__file__).parent / FRONTEND_DIRNAME


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    await api.async_get_data(hass)

    if not hass.data.get(_STATIC_KEY):
        await hass.http.async_register_static_paths(
            [StaticPathConfig(STATIC_PATH, str(FRONTEND_DIR), False)]
        )
        hass.data[_STATIC_KEY] = True

    if not hass.data.get(_API_KEY):
        api.async_register(hass)
        hass.data[_API_KEY] = True

    # Jeu d'icônes de l'application. Il doit être chargé AVANT le rendu de la barre
    # latérale : un simple module de panneau arrive trop tard, d'où add_extra_js_url.
    if not hass.data.get(_ICONSET_KEY):
        add_extra_js_url(hass, f"{STATIC_PATH}/panel-icon.js?v={VERSION}")
        hass.data[_ICONSET_KEY] = True

    if PANEL_URL in (hass.data.get("frontend_panels") or {}):
        frontend.async_remove_panel(hass, PANEL_URL)

    try:
        frontend.async_register_built_in_panel(
            hass,
            component_name="custom",
            sidebar_title=PANEL_TITLE,
            sidebar_icon=PANEL_ICON,
            frontend_url_path=PANEL_URL,
            config={
                "_panel_custom": {
                    "name": "skylight-hub-panel",
                    "module_url": f"{STATIC_PATH}/panel.js?v={VERSION}",
                    "embed_iframe": False,
                    "trust_external": False,
                }
            },
            require_admin=False,
        )
    except ValueError:
        _LOGGER.debug("Panneau %s déjà enregistré", PANEL_URL)

    # Découverte en aperçu : même module, même élément, mais le panneau est
    # ouvert en mode « rien n'est enregistré ». Accessible d'un clic dans la
    # barre latérale, sans retenir d'URL.
    if PREVIEW_URL in (hass.data.get("frontend_panels") or {}):
        frontend.async_remove_panel(hass, PREVIEW_URL)
    try:
        frontend.async_register_built_in_panel(
            hass,
            component_name="custom",
            sidebar_title="Découverte",
            sidebar_icon="mdi:compass-outline",
            frontend_url_path=PREVIEW_URL,
            config={
                "_panel_custom": {
                    "name": "skylight-hub-panel",
                    "module_url": f"{STATIC_PATH}/panel.js?v={VERSION}",
                    "embed_iframe": False,
                    "trust_external": False,
                    "preview": True,
                }
            },
            require_admin=False,
        )
    except ValueError:
        _LOGGER.debug("Panneau %s déjà enregistré", PREVIEW_URL)

    _LOGGER.info("Skylight V2 prêt sur /%s", PANEL_URL)
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    frontend.async_remove_panel(hass, PANEL_URL)
    frontend.async_remove_panel(hass, PREVIEW_URL)
    return True
