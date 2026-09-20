# Rena — Smart Room Assistant

Rena turns one room's dumb hardware into real smart-home accessories. A Raspberry Pi 4
drives a Flipper Zero over serial, firing IR codes at a star projector and an RGB desk
light and SubGHz captures at three RF wall sockets. A Matter bridge puts all of it in
**Apple Home** and **Google Home**.

Everything runs on the Pi. No cloud service, no subscription, no account.

## Architecture

```
  Siri  /  Google Assistant  /  Home app  /  Alexa
                  |  Matter over WiFi (local, IPv6 + mDNS)
        Matterbridge  +  matterbridge-rena plugin   (Node 20+, web UI on :8283)
                  |  HTTP  ->  127.0.0.1:8080
        Flask REST API  (main.py)                    (Python 3.11)
                  |  pyflipper over serial, behind a lock
        Flipper Zero  ->  IR (NEC)  /  SubGHz .sub files
                  |
        Projector · RGB strip · Socket 1/2/3
```

IR and SubGHz are write-only — the hardware never reports back. Rena therefore tracks
what it believes each device is doing in `state.json` and serves it from `/state`, which
is what the Home apps display. A physical remote will desync this; the next command
puts it right.

## What shows up in the Home app

| Accessory | Type | Controls |
|---|---|---|
| Star Projector | Light | Astronaut galaxy projector (IR) |
| Desk RGB Light | Light | Dragon RGB strip (IR) |
| Laptop Charger | Outlet | RF socket 1 |
| Reading Lamp | Outlet | RF socket 2 |
| Bed Light | Outlet | RF socket 3 |
| All Lights On / All Lights Off / Sleep | Switch | Scenes |
| Pink Light / Blue Light / Next Color | Switch | Color presets |

Scenes are momentary switches: they fire and spring back to off, so you can drop them
into Home app automations or trigger them by voice.

## API Reference

The Flask app listens on `127.0.0.1:8080`. Every device route is a `GET` returning
`Success`, or `500` with a JSON error if the Flipper refused the command.

| Route | Effect |
|---|---|
| `/ast_projector_on`, `/ast_projector_off` | Star projector |
| `/dragon_rbg_on`, `/dragon_rbg_off` | RGB desk light |
| `/next_color` | Step the RGB strip to its next color |
| `/pink_light`, `/blue_light` | Color presets |
| `/socket1_on` … `/socket3_off` | RF wall sockets |
| `/lights_on`, `/lights_off` | Projector + RGB strip together |
| `/sleep` | Everything off |
| `/state` | JSON of assumed device state |
| `/healthz` | `{"ok": true, "flipper": true}` |

## Install

### 1. The API

```bash
git clone https://github.com/codejapoe/Rena.git
cd Rena
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
```

Your user needs access to the Flipper's serial port:

```bash
sudo usermod -aG dialout $USER   # log out and back in
```

Run it:

```bash
.venv/bin/python main.py
curl localhost:8080/healthz
```

### 2. The Matter bridge

```bash
sudo npm install -g matterbridge --omit=dev

cd matterbridge-rena
npm install          # typescript + @types/node only
npm link matterbridge
npm run build

matterbridge -add "$(pwd)"
matterbridge
```

`matterbridge` must **not** be a dependency in the plugin's `package.json` —
Matterbridge refuses to load plugins that bundle it. `npm link matterbridge` borrows
the global install just for the TypeScript build.

Configure the plugin (API URL, poll interval, accessory allow/deny lists) in the
Matterbridge web UI on port 8283.

### 3. Run both on boot

See [`systemd/README.md`](systemd/README.md).

## Pairing

Matterbridge prints a QR code and a manual pairing code on startup, and shows both in
its web UI on port 8283.

**Apple Home** — Home app → **+** → Add Accessory → scan the QR code. All accessories
appear at once. A HomePod or Apple TV is only needed for automations and remote access;
local control works without one.

**Google Home** — Google Home app → **Devices** → **Add** → **Matter-enabled device**.
Google **requires a Matter hub** on the account: a Nest Hub, Nest Mini, or Chromecast
with Google TV. Without one, Google cannot commission a Matter device at all.

Matter supports several controllers at once. Pair Apple Home first, then use Apple's
**Turn On Pairing Mode** to generate a second code for Google.

### Matter prerequisites on the Pi

- Node.js 20 LTS or newer.
- **IPv6 must be enabled.** Matter needs IPv6 link-local and will not work on an
  IPv4-only host. Check `/etc/sysctl.conf` for `disable_ipv6`.
- mDNS must work. Matterbridge and Avahi both want UDP 5353; see the Matterbridge
  docs for the coexistence settings.
- The Pi, your phone, and the hub must share one LAN — not a guest or isolated SSID.

## Flipper Zero setup

SubGHz captures for the wall sockets belong on the Flipper's SD card as
`/ext/subghz/On1.sub` … `/ext/subghz/Off3.sub`. Capture them with the Flipper's Read
function from your socket remote. The IR codes are NEC on address `00` and are defined
in `devices.py`.

## Built With

- [pyFlipper: Flipper Zero Python CLI Wrapper](https://github.com/wh00hw/pyFlipper)
- [Matterbridge](https://github.com/Luligu/matterbridge)

## Products Reference

- [Flipper Zero](https://flipperzero.one/)
- [Raspberry Pi 4](https://www.raspberrypi.com/products/raspberry-pi-4-model-b/)
- [Remote Control Outlet](https://www.amazon.com/dp/B07JF93XB5)
- [Galaxy Star Projector](https://www.amazon.com/dp/B09TW3VVJP)

## Authors

- [@codejapoe](https://codejapoe.xyz)
