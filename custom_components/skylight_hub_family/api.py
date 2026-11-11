"""API de Skylight V2.

Toutes les données de l'application vivent ici, dans un fichier de l'intégration.
Aucune entité Home Assistant n'est créée : les profils, tâches, récompenses,
repas et étoiles sont des objets de l'application, servis à ses écrans par
WebSocket.
"""

from __future__ import annotations

import json
import logging
import unicodedata
import uuid
from typing import Any

import voluptuous as vol

from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.storage import Store

from .const import DOMAIN, STORAGE_KEY, VERSION

_LOGGER = logging.getLogger(__name__)
DATA = f"{DOMAIN}_store"

DEFAULTS: dict[str, Any] = {
    "onboarding_done": False,
    "family_name": "Ma famille",
    "initial": "M",
    "kiosk": False,
    "theme": "skylight",
    "stars_per_task": 10,
    "evening_from": 16,
    "profiles": [],
    "lists": {},
    "meals": {},
    "stars": {},
    "order": 0,
}


async def async_get_data(hass: HomeAssistant) -> dict[str, Any]:
    """Charge (une fois) l'état de l'application."""
    holder = hass.data.get(DATA)
    if holder:
        return holder
    store: Store = Store(hass, 1, STORAGE_KEY)
    raw = await store.async_load() or {}
    data = {**DEFAULTS, **raw}
    for key in ("profiles", "lists", "meals", "stars"):
        data[key] = raw.get(key) or {}
        if key == "profiles":
            data[key] = raw.get(key) or []
    holder = {"store": store, "data": data}
    hass.data[DATA] = holder
    changed = _ensure_routines(data)
    if _clean_meals(data):
        changed = True
    if changed:
        await store.async_save(data)
    return holder


def _data(hass: HomeAssistant) -> dict[str, Any]:
    return hass.data[DATA]["data"]


async def _save(hass: HomeAssistant) -> None:
    holder = hass.data[DATA]
    await holder["store"].async_save(holder["data"])


def _slug(text: str) -> str:
    normalised = unicodedata.normalize("NFD", text)
    ascii_only = "".join(c for c in normalised if unicodedata.category(c) != "Mn")
    out: list[str] = []
    for char in ascii_only.lower():
        if char.isalnum():
            out.append(char)
        elif out and out[-1] != "_":
            out.append("_")
    return "".join(out).strip("_") or f"p{uuid.uuid4().hex[:4]}"


MEAL_KEYS = {
    "input_text.repas_lundi",
    "input_text.repas_mardi",
    "input_text.repas_mercredi",
    "input_text.repas_jeudi",
    "input_text.repas_vendredi",
    "input_text.repas_samedi",
    "input_text.repas_dimanche",
    "input_text.repas_lignes",
    "input_text.repas_couleurs",
    "input_text.repas_report",
}


def _clean_meals(data: dict[str, Any]) -> bool:
    """Retire les clés de repas qui ne sont pas des clés connues (valeurs
    écrites par erreur comme entité)."""
    meals = data.get("meals") or {}
    cleaned = {k: v for k, v in meals.items() if k in MEAL_KEYS}
    if cleaned != meals:
        data["meals"] = cleaned
        return True
    return False


def _ensure_routines(data: dict[str, Any]) -> bool:
    """Garantit une liste de routines par profil — sans elle, la carte Tâches
    affiche « ce profil n'a pas de liste de routines »."""
    lists = data.setdefault("lists", {})
    changed = False
    for item in lists.get("todo.profils") or []:
        try:
            meta = json.loads(item.get("description") or "{}") or {}
        except ValueError:
            meta = {}
        if not isinstance(meta, dict):
            meta = {}
        ident = meta.get("i") or _slug(item.get("summary") or "")
        key = meta.get("r") or ("todo.routines_" + ident)
        if key not in lists:
            lists[key] = []
            changed = True
        if meta.get("r") != key:
            meta["r"] = key
            item["description"] = json.dumps(meta, ensure_ascii=False)
            changed = True
    return changed


def _profiles(hass: HomeAssistant) -> list[dict[str, Any]]:
    """Les profils, stockés comme n'importe quelle liste de l'application."""
    items = (_data(hass).get("lists") or {}).get("todo.profils") or []
    out: list[dict[str, Any]] = []
    for item in items:
        try:
            meta = json.loads(item.get("description") or "{}") or {}
        except ValueError:
            meta = {}
        if not isinstance(meta, dict):
            meta = {}
        name = item.get("summary") or ""
        out.append(
            {
                "id": meta.get("i") or _slug(name),
                "name": name or meta.get("i") or "",
                "color": meta.get("c") or "#DDE3EA",
                "accent": meta.get("a") or "#7A8596",
                "photo": meta.get("p") or "",
                "calendar": meta.get("k") or "",
                "stars": meta.get("s") is not False,
                "routine": meta.get("r") or "",
                "ord": meta.get("ord") or 0,
            }
        )
    out.sort(key=lambda p: p.get("ord") or 0)
    return out


def payload(hass: HomeAssistant) -> dict[str, Any]:
    data = _data(hass)
    return {
        "version": VERSION,
        "onboarding_done": bool(data.get("onboarding_done")),
        "family_name": data.get("family_name"),
        "initial": data.get("initial"),
        "kiosk": bool(data.get("kiosk")),
        "theme": data.get("theme") or "skylight",
        "stars_per_task": data.get("stars_per_task"),
        "evening_from": data.get("evening_from"),
        "profiles": _profiles(hass),
        "lists": {
            "chores": "todo.taches_famille",
            "profiles": "todo.profils",
            "rewards": "todo.recompenses",
            "recipes": "todo.plats",
        },
        "meals": data.get("meals") or {},
        "stars": data.get("stars") or {},
        "order": data.get("order") or 0,
        "existing": bool((data.get("lists") or {}).get("todo.profils")),
    }


@callback
def async_register(hass: HomeAssistant) -> None:
    for cmd in (ws_config, ws_onboard, ws_settings, ws_list, ws_todo, ws_stars, ws_text, ws_listcreate, ws_reset):
        websocket_api.async_register_command(hass, cmd)
    async_start_schedule(hass)


@callback
def async_start_schedule(hass: HomeAssistant) -> None:
    """Remise à zéro quotidienne, côté application (ex-automatisation 4 h)."""
    from homeassistant.helpers.event import async_track_time_change

    async def _tick(now) -> None:
        await _daily_reset(hass)

    async_track_time_change(hass, lambda now: hass.async_create_task(_tick(now)), hour=4, minute=0, second=0)


async def _daily_reset(hass: HomeAssistant) -> None:
    data = _data(hass)
    lists = data.get("lists") or {}
    for key in list(lists.keys()):
        if key.startswith("todo.routines_"):
            for item in lists[key]:
                if item.get("status") == "completed":
                    item["status"] = "needs_action"
        elif key == "todo.taches_famille":
            lists[key] = [i for i in lists[key] if i.get("status") != "completed"]
    await _save(hass)


# --------------------------------------------------------------------------
# lecture / réglages
# --------------------------------------------------------------------------


@websocket_api.websocket_command({vol.Required("type"): f"{DOMAIN}/config"})
@websocket_api.async_response
async def ws_config(hass, connection, msg):
    connection.send_result(msg["id"], payload(hass))


@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/settings",
        vol.Optional("kiosk"): cv.boolean,
        vol.Optional("theme"): vol.In(("skylight", "apple")),
        vol.Optional("order"): vol.Coerce(int),
        vol.Optional("evening_from"): vol.Coerce(int),
        vol.Optional("family_name"): cv.string,
    }
)
@websocket_api.async_response
async def ws_settings(hass, connection, msg):
    data = _data(hass)
    for key in ("kiosk", "theme", "stars_per_task", "evening_from", "family_name", "order"):
        if key in msg:
            data[key] = msg[key]
    if msg.get("family_name"):
        data["initial"] = msg["family_name"][:1].upper()
    await _save(hass)
    connection.send_result(msg["id"], payload(hass))


# --------------------------------------------------------------------------
# accueil : crée les profils, relie ou crée les calendriers
# --------------------------------------------------------------------------

PERSON = vol.Schema(
    {
        vol.Required("name"): cv.string,
        vol.Optional("color"): cv.string,
        vol.Optional("calendar"): cv.string,
        vol.Optional("create_calendar", default=False): cv.boolean,
    }
)


@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/onboard",
        vol.Required("family_name"): cv.string,
        vol.Optional("people", default=list): vol.All(cv.ensure_list, [PERSON]),
        vol.Optional("keep", default=False): cv.boolean,
    }
)
@websocket_api.async_response
async def ws_onboard(hass, connection, msg):
    data = _data(hass)
    family = str(msg["family_name"]).strip() or "Ma famille"
    data["family_name"] = family
    data["initial"] = (family[:1] or "M").upper()

    created: list[str] = []
    if not msg.get("keep"):
        for index, person in enumerate(msg.get("people") or []):
            name = str(person.get("name") or "").strip()
            if not name:
                continue
            ident = _slug(name)
            calendar = str(person.get("calendar") or "")
            if person.get("create_calendar") and not calendar:
                calendar = await _create_calendar(hass, name) or ""
            items = data.setdefault("lists", {}).setdefault("todo.profils", [])
            routine = "todo.routines_" + ident
            data.setdefault("lists", {}).setdefault(routine, [])
            meta = {
                "i": ident,
                "c": person.get("color") or "#DDE3EA",
                "a": person.get("color") or "#7A8596",
                "p": "",
                "s": True,
                "r": routine,
                "k": calendar,
                "kc": "created" if person.get("create_calendar") and calendar else "",
                "ord": index + 1,
            }
            description = json.dumps(
                {k: v for k, v in meta.items() if v not in (None, "")}, ensure_ascii=False
            )
            current = next((it for it in items if _slug(it.get("summary", "")) == ident), None)
            if current:
                current["summary"] = name
                current["description"] = description
            else:
                items.append(
                    {
                        "uid": uuid.uuid4().hex,
                        "summary": name,
                        "description": description,
                        "status": "needs_action",
                    }
                )
            created.append(ident)

    data["onboarding_done"] = True
    await _save(hass)
    connection.send_result(msg["id"], {"ok": True, "created": created, "config": payload(hass)})


async def _create_calendar(hass: HomeAssistant, name: str) -> str | None:
    try:
        result = await hass.config_entries.flow.async_init(
            "local_calendar", context={"source": "user"}, data={"calendar_name": name}
        )
    except Exception:  # noqa: BLE001
        _LOGGER.exception("Skylight V2 : calendrier de %s non créé", name)
        return None
    if result.get("type") != "create_entry":
        return None
    entry = result.get("result")
    entry_id = getattr(entry, "entry_id", None)
    if not entry_id:
        return None
    for _ in range(20):
        await hass.async_block_till_done()
        registry = er.async_get(hass)
        for item in er.async_entries_for_config_entry(registry, entry_id):
            if item.domain == "calendar":
                return item.entity_id
        import asyncio

        await asyncio.sleep(0.2)
    return None


# --------------------------------------------------------------------------
# listes (tâches, récompenses, routine…) — stockées dans l'application
# --------------------------------------------------------------------------


@websocket_api.websocket_command(
    {vol.Required("type"): f"{DOMAIN}/list", vol.Required("entity"): cv.string}
)
@websocket_api.async_response
async def ws_list(hass, connection, msg):
    items = (_data(hass).get("lists") or {}).get(msg["entity"]) or []
    connection.send_result(msg["id"], {"items": [dict(i) for i in items]})


@websocket_api.websocket_command(
    {vol.Required("type"): f"{DOMAIN}/listcreate", vol.Required("name"): cv.string}
)
@websocket_api.async_response
async def ws_listcreate(hass, connection, msg):
    """Crée une liste de routine (identifiée comme une liste `todo`)."""
    data = _data(hass)
    lists = data.setdefault("lists", {})
    key = "todo.routines_" + _slug(msg["name"])
    lists.setdefault(key, [])
    await _save(hass)
    connection.send_result(msg["id"], {"entity_id": key})


@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/todo",
        vol.Required("entity"): cv.string,
        vol.Required("op"): vol.In(("add", "update", "remove", "remove_completed", "reset")),
        vol.Optional("item"): cv.string,
        vol.Optional("item_uid"): cv.string,
        vol.Optional("status"): cv.string,
        vol.Optional("description"): cv.string,
        vol.Optional("summary"): cv.string,
        vol.Optional("rename"): cv.string,
    }
)
@websocket_api.async_response
async def ws_todo(hass, connection, msg):
    data = _data(hass)
    lists = data.setdefault("lists", {})
    items = lists.setdefault(msg["entity"], [])
    op = msg["op"]
    result: dict[str, Any] = {"ok": True}

    if op == "add":
        item = {
            "uid": uuid.uuid4().hex,
            "summary": msg.get("item") or "",
            "description": msg.get("description") or "",
            "status": "needs_action",
        }
        items.append(item)
        result["item"] = dict(item)
    elif op == "update":
        uid = msg.get("item_uid") or msg.get("item")
        for item in items:
            if item["uid"] == uid or item["summary"] == uid:
                if msg.get("rename") is not None:
                    item["summary"] = msg["rename"]
                if msg.get("description") is not None:
                    item["description"] = msg["description"]
                if msg.get("status") is not None:
                    item["status"] = msg["status"]
                result["item"] = dict(item)
                break
    elif op == "remove":
        uid = msg.get("item_uid") or msg.get("item")
        lists[msg["entity"]] = [i for i in items if i["uid"] != uid and i["summary"] != uid]
    elif op == "remove_completed":
        lists[msg["entity"]] = [i for i in items if i.get("status") != "completed"]
    elif op == "reset":
        for item in items:
            if item.get("status") == "completed":
                item["status"] = "needs_action"

    await _save(hass)
    connection.send_result(msg["id"], result)


# --------------------------------------------------------------------------
# étoiles et champs texte (repas) : de simples valeurs de l'application
# --------------------------------------------------------------------------


@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/stars",
        vol.Required("profile"): cv.string,
        vol.Optional("delta"): vol.Coerce(int),
        vol.Optional("value"): vol.Coerce(int),
    }
)
@websocket_api.async_response
async def ws_stars(hass, connection, msg):
    data = _data(hass)
    stars = data.setdefault("stars", {})
    current = int(stars.get(msg["profile"]) or 0)
    if "value" in msg:
        current = max(0, int(msg["value"]))
    elif "delta" in msg:
        current = max(0, current + int(msg["delta"]))
    stars[msg["profile"]] = current
    await _save(hass)
    connection.send_result(msg["id"], {"profile": msg["profile"], "value": current})


@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/text",
        vol.Required("entity"): cv.string,
        vol.Optional("value"): cv.string,
    }
)
@websocket_api.async_response
async def ws_text(hass, connection, msg):
    entity = msg["entity"]
    if entity not in MEAL_KEYS:
        connection.send_error(msg["id"], "invalid_entity", f"Clé de repas inconnue : {entity}")
        return
    data = _data(hass)
    meals = data.setdefault("meals", {})
    if "value" in msg:
        meals[entity] = msg["value"]
        await _save(hass)
    connection.send_result(msg["id"], {"entity": entity, "value": meals.get(entity, "")})


@websocket_api.websocket_command({vol.Required("type"): f"{DOMAIN}/reset"})
@websocket_api.async_response
async def ws_reset(hass, connection, msg):
    """Remise à zéro à la demande (bouton de maintenance, ou test)."""
    await _daily_reset(hass)
    connection.send_result(msg["id"], {"ok": True, "config": payload(hass)})
