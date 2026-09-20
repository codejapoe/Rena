"""Flipper Zero device driver for Rena — Smart Room Assistant.

pyflipper holds a single serial connection to the Flipper's CLI. Flask serves
requests on threads and a Matter scene fires several device commands at once, so
every transmission goes through one re-entrant lock: concurrent writes would
otherwise interleave and garble the CLI stream. The lock is re-entrant so a scene
like lights_on() can hold it across the whole sequence while the helpers it calls
take it again.
"""

import threading
import time

from pyflipper import PyFlipper

import state

COM = "/dev/ttyACM0"
GAP = 0.1

_lock = threading.RLock()
_flipper = None


class FlipperError(RuntimeError):
    """The Flipper is unreachable or rejected a command."""


def _conn():
    """Connect on first use so the module imports without hardware attached."""
    global _flipper
    if _flipper is None:
        try:
            _flipper = PyFlipper(com=COM)
        except Exception as exc:
            raise FlipperError(f"cannot open Flipper on {COM}: {exc}") from exc
    return _flipper


def connected():
    try:
        _conn()
    except FlipperError:
        return False
    return True


def _ir(*commands):
    """Send NEC IR commands on address 00, pausing between each."""
    with _lock:
        ir = _conn().ir
        for command in commands:
            try:
                ir.tx(protocol="NEC", hex_address="00", hex_command=command)
            except Exception as exc:
                raise FlipperError(f"IR tx {command} failed: {exc}") from exc
            time.sleep(GAP)


def _sub(path):
    with _lock:
        try:
            _conn().subghz.tx_from_file(path)
        except Exception as exc:
            raise FlipperError(f"SubGHz tx {path} failed: {exc}") from exc
        time.sleep(GAP)


# --- Astronaut star projector (IR) ---

def projector_on():
    _ir("45", "44", "09", "09", "46", "46")
    state.set(projector=True)


def projector_off():
    _ir("45")
    state.set(projector=False)


# --- Dragon RGB desk light (IR) ---

def rgb_on():
    _ir("0D")
    state.set(rgb=True)


def rgb_off():
    _ir("1F")
    state.set(rgb=False)


def next_color():
    _ir("44")
    state.set(rgb=True)


# --- Color presets ---

def pink_light():
    # Replays the projector power-on sequence, then steps to pink.
    _ir("45", "45", "44", "09", "09", "46", "46", "0F")
    state.set(projector=True)


def blue_light():
    _ir("44", "44", "44", "44", "44", "44", "4C")
    state.set(rgb=True)


# --- RF wall sockets (SubGHz) ---

def socket_on(n):
    _sub(f"/ext/subghz/On{n}.sub")
    state.set(**{f"socket{n}": True})


def socket_off(n):
    _sub(f"/ext/subghz/Off{n}.sub")
    state.set(**{f"socket{n}": False})


# --- Scenes ---

def lights_on():
    with _lock:
        projector_on()
        rgb_on()


def lights_off():
    with _lock:
        projector_off()
        rgb_off()


def sleep():
    with _lock:
        for n in (1, 2, 3):
            socket_off(n)
        projector_off()
        rgb_off()
