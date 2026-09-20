# Running Rena on a Raspberry Pi 4

Two services: the Flask API that drives the Flipper Zero, and Matterbridge, which
publishes the room to Apple Home and Google Home.

## 1. API service

Adjust `User`, `Group` and the paths in `rena-api.service` if you did not clone to
`/home/pi/Rena`, then:

```bash
sudo cp systemd/rena-api.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now rena-api
systemctl status rena-api
```

Check it:

```bash
curl localhost:8080/healthz
curl localhost:8080/state
journalctl -u rena-api -f
```

The service user must be in the `dialout` group to open `/dev/ttyACM0`:

```bash
sudo usermod -aG dialout pi
```

## 2. Matterbridge service

Matterbridge ships its own service installer:

```bash
sudo npm install -g matterbridge --omit=dev
matterbridge -add /home/pi/Rena/matterbridge-rena
```

Follow the Matterbridge systemd instructions at
<https://github.com/Luligu/matterbridge> to install `matterbridge.service`, then:

```bash
sudo systemctl enable --now matterbridge
journalctl -u matterbridge -f
```

The pairing QR code and manual code are printed in that log and shown in the
Matterbridge web UI on port 8283.

## Ordering

The plugin retries on its own and re-reads `/state` on a timer, so Matterbridge
starting before the API is not a problem — the accessories just report stale state
until the first successful poll.
