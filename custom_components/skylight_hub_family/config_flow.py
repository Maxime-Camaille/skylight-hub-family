"""Ajout de l'intégration Skylight Hub Family.

L'application ne demande rien à l'installation : un seul appui sur
« Ajouter » crée l'entrée, puis c'est l'écran d'accueil de l'app qui pose
les questions (nom de la famille, personnes).
"""

from __future__ import annotations

from homeassistant import config_entries

from .const import DOMAIN

TITLE = "Skylight Hub Family"


class SkylightHubFamilyConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Une seule instance, créée sans formulaire."""

    VERSION = 1

    async def async_step_user(self, user_input=None):
        """Crée l'entrée directement : aucun champ à remplir."""
        if self._async_current_entries():
            return self.async_abort(reason="single_instance_allowed")
        return self.async_create_entry(title=TITLE, data={})
