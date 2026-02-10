"""Simple in-memory cache with TTL for NWS API responses (respect rate limits)."""
from __future__ import annotations

import time
from typing import Any

from app.config import settings


class TTLCache:
    def __init__(self, ttl_seconds: int | None = None):
        self._ttl = ttl_seconds or settings.cache_ttl_seconds
        self._store: dict[str, tuple[Any, float]] = {}

    def get(self, key: str) -> Any | None:
        entry = self._store.get(key)
        if entry is None:
            return None
        value, expires = entry
        if time.monotonic() > expires:
            del self._store[key]
            return None
        return value

    def set(self, key: str, value: Any) -> None:
        self._store[key] = (value, time.monotonic() + self._ttl)


# Module-level cache for NWS responses
nws_cache: TTLCache = TTLCache()
