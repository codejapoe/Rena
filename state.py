"""Assumed device state for Rena — Smart Room Assistant.

The Flipper Zero transmits IR and SubGHz one way: nothing on the other end reports
back. Apple Home and Google Home both require an accessory to publish its on/off
state, so we track what we believe each device is doing and persist it across
restarts. A physical remote or wall switch will desync this; that is inherent to
write-only transmission, not something this module can fix.
"""

import json
import os
import threading

DEVICES = ("projector", "rgb", "socket1", "socket2", "socket3")

_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "state.json")
_lock = threading.Lock()
_state = {name: False for name in DEVICES}


def _write():
    tmp = _PATH + ".tmp"
    with open(tmp, "w") as f:
        json.dump(_state, f)
    os.replace(tmp, _PATH)


def load():
    """Seed state from disk. Unknown or missing keys keep their default of False."""
    try:
        with open(_PATH) as f:
            stored = json.load(f)
    except (FileNotFoundError, ValueError):
        return
    with _lock:
        for name in DEVICES:
            if isinstance(stored.get(name), bool):
                _state[name] = stored[name]


def get():
    with _lock:
        return dict(_state)


def set(**changes):
    """set(projector=True, rgb=False) — ignores names that aren't devices."""
    with _lock:
        for name, value in changes.items():
            if name in _state:
                _state[name] = bool(value)
        _write()


load()
