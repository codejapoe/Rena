"""Rena — Smart Room Assistant.

REST API over a Flipper Zero, exposing one room's IR and RF devices. Intended to be
driven by the matterbridge-rena plugin, which presents these endpoints to Apple Home
and Google Home as Matter accessories.

Listens on 127.0.0.1:8080 — only the bridge on the same Pi needs to reach it.
"""

from flask import Flask, jsonify

import devices
import state

app = Flask(__name__)

HOST = "127.0.0.1"
PORT = 8080


@app.errorhandler(devices.FlipperError)
def flipper_error(exc):
    return jsonify(error=str(exc)), 500


def _run(action, *args):
    action(*args)
    return "Success"


# --- Astronaut star projector ---

@app.route("/ast_projector_on")
def ast_projector_on():
    return _run(devices.projector_on)


@app.route("/ast_projector_off")
def ast_projector_off():
    return _run(devices.projector_off)


# --- Dragon RGB desk light ---

@app.route("/dragon_rbg_on")
def dragon_rbg_on():
    return _run(devices.rgb_on)


@app.route("/dragon_rbg_off")
def dragon_rbg_off():
    return _run(devices.rgb_off)


@app.route("/next_color")
def next_color():
    return _run(devices.next_color)


# --- Color presets ---

@app.route("/pink_light")
def pink_light():
    return _run(devices.pink_light)


@app.route("/blue_light")
def blue_light():
    return _run(devices.blue_light)


# --- RF wall sockets ---

@app.route("/socket1_on")
def socket1_on():
    return _run(devices.socket_on, 1)


@app.route("/socket2_on")
def socket2_on():
    return _run(devices.socket_on, 2)


@app.route("/socket3_on")
def socket3_on():
    return _run(devices.socket_on, 3)


@app.route("/socket1_off")
def socket1_off():
    return _run(devices.socket_off, 1)


@app.route("/socket2_off")
def socket2_off():
    return _run(devices.socket_off, 2)


@app.route("/socket3_off")
def socket3_off():
    return _run(devices.socket_off, 3)


# --- Scenes ---

@app.route("/lights_on")
def lights_on():
    return _run(devices.lights_on)


@app.route("/lights_off")
def lights_off():
    return _run(devices.lights_off)


@app.route("/sleep")
def sleep():
    return _run(devices.sleep)


# --- Bridge support ---

@app.route("/state")
def get_state():
    return jsonify(state.get())


@app.route("/healthz")
def healthz():
    return jsonify(ok=True, flipper=devices.connected())


if __name__ == "__main__":
    app.run(host=HOST, port=PORT, debug=False)
