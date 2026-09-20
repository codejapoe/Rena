/**
 * matterbridge-rena — exposes the Rena Smart Room Assistant REST API to Matter.
 *
 * Every accessory here is a thin shell over an HTTP endpoint on the Flask app
 * (main.py), which in turn drives a Flipper Zero over serial. Because IR and
 * SubGHz are write-only, the real on/off state lives in the Flask app's state.json
 * and is pulled from GET /state — nothing can be read back off the hardware.
 */

import {
  MatterbridgeDynamicPlatform,
  MatterbridgeEndpoint,
  bridgedNode,
  onOffLight,
  onOffPlugInUnit,
  powerSource,
  type PlatformConfig,
  type PlatformMatterbridge,
} from 'matterbridge';
import { AnsiLogger } from 'matterbridge/logger';

/** Keys of the Flask app's /state response. */
type StateKey = 'projector' | 'rgb' | 'socket1' | 'socket2' | 'socket3';

interface DeviceSpec {
  key: StateKey;
  name: string;
  light: boolean;
  on: string;
  off: string;
}

interface SceneSpec {
  id: string;
  name: string;
  route: string;
}

const DEVICES: DeviceSpec[] = [
  { key: 'projector', name: 'Star Projector', light: true, on: 'ast_projector_on', off: 'ast_projector_off' },
  { key: 'rgb', name: 'Desk RGB Light', light: true, on: 'dragon_rbg_on', off: 'dragon_rbg_off' },
  { key: 'socket1', name: 'Laptop Charger', light: false, on: 'socket1_on', off: 'socket1_off' },
  { key: 'socket2', name: 'Reading Lamp', light: false, on: 'socket2_on', off: 'socket2_off' },
  { key: 'socket3', name: 'Bed Light', light: false, on: 'socket3_on', off: 'socket3_off' },
];

const SCENES: SceneSpec[] = [
  { id: 'lights-on', name: 'All Lights On', route: 'lights_on' },
  { id: 'lights-off', name: 'All Lights Off', route: 'lights_off' },
  { id: 'sleep', name: 'Sleep', route: 'sleep' },
  { id: 'pink-light', name: 'Pink Light', route: 'pink_light' },
  { id: 'blue-light', name: 'Blue Light', route: 'blue_light' },
  { id: 'next-color', name: 'Next Color', route: 'next_color' },
];

const VENDOR_ID = 0xfff1;
const VENDOR_NAME = 'Rena';
const PRODUCT_NAME = 'Smart Room Assistant';
/** How long a scene switch stays "on" in the Home app before springing back. */
const SCENE_RESET_MS = 1000;
/**
 * Matterbridge's OnOff behaviour runs our command handler first and only then
 * applies the attribute itself, so a correcting write has to land after it.
 */
const REVERT_DELAY_MS = 500;

export class RenaPlatform extends MatterbridgeDynamicPlatform {
  private readonly baseUrl: string;
  private readonly requestTimeout: number;
  private readonly pollInterval: number;

  private readonly devices = new Map<StateKey, MatterbridgeEndpoint>();
  private pollTimer?: NodeJS.Timeout;
  private readonly pendingTimers = new Set<NodeJS.Timeout>();

  constructor(matterbridge: PlatformMatterbridge, log: AnsiLogger, config: PlatformConfig) {
    super(matterbridge, log, config);

    this.baseUrl = ((config.baseUrl as string) ?? 'http://127.0.0.1:8080').replace(/\/+$/, '');
    this.requestTimeout = (config.requestTimeout as number) ?? 10000;
    // Seconds; 0 disables. Only matters if something other than this bridge
    // (a curl, a script) drives the Flask API behind our back.
    this.pollInterval = (config.pollInterval as number) ?? 60;
  }

  /** GET a Flask route. Resolves true only on a 2xx. */
  private async call(route: string): Promise<boolean> {
    const url = `${this.baseUrl}/${route}`;
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(this.requestTimeout) });
      if (!response.ok) {
        this.log.error(`${url} returned ${response.status} ${response.statusText}`);
        return false;
      }
      this.log.debug(`${url} ok`);
      return true;
    } catch (error) {
      this.log.error(`${url} failed: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  private async fetchState(): Promise<Partial<Record<StateKey, boolean>> | undefined> {
    const url = `${this.baseUrl}/state`;
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(this.requestTimeout) });
      if (!response.ok) {
        this.log.error(`${url} returned ${response.status} ${response.statusText}`);
        return undefined;
      }
      return (await response.json()) as Partial<Record<StateKey, boolean>>;
    } catch (error) {
      this.log.error(`${url} failed: ${error instanceof Error ? error.message : String(error)}`);
      return undefined;
    }
  }

  private newEndpoint(id: string, name: string, light: boolean): MatterbridgeEndpoint {
    return new MatterbridgeEndpoint([light ? onOffLight : onOffPlugInUnit, bridgedNode, powerSource], { id }, this.config.debug as boolean)
      .createDefaultIdentifyClusterServer()
      .createDefaultBridgedDeviceBasicInformationClusterServer(name, `rena-${id}`, VENDOR_ID, VENDOR_NAME, PRODUCT_NAME)
      .createDefaultPowerSourceWiredClusterServer()
      .createDefaultOnOffClusterServer(false);
  }

  override async onStart(reason?: string): Promise<void> {
    this.log.info(`Starting Rena Smart Room Assistant${reason ? `: ${reason}` : ''} (API ${this.baseUrl})`);
    await this.ready;
    await this.clearSelect();

    for (const spec of DEVICES) {
      if (!this.validateDevice(spec.name)) continue;

      const endpoint = this.newEndpoint(spec.key, spec.name, spec.light);
      this.setSelectDevice(`rena-${spec.key}`, spec.name, undefined, 'hub');

      // Matter applies the optimistic on/off itself. We only step in when the
      // Flipper refused the command, so the tile doesn't claim a device changed
      // when no IR or RF ever went out.
      endpoint.addCommandHandler('on', async () => {
        if (!(await this.call(spec.on))) this.revert(endpoint, false);
      });
      endpoint.addCommandHandler('off', async () => {
        if (!(await this.call(spec.off))) this.revert(endpoint, true);
      });

      await this.registerDevice(endpoint);
      this.devices.set(spec.key, endpoint);
    }

    for (const scene of SCENES) {
      if (!this.validateDevice(scene.name)) continue;

      // Matter has no scene device type, so a scene is a switch that fires its
      // route and then springs back to off.
      const endpoint = this.newEndpoint(scene.id, scene.name, false);
      this.setSelectDevice(`rena-${scene.id}`, scene.name, undefined, 'hub');

      endpoint.addCommandHandler('on', async () => {
        await this.call(scene.route);
        const timer = setTimeout(() => {
          this.pendingTimers.delete(timer);
          void endpoint.updateAttribute('OnOff', 'onOff', false, endpoint.log);
          void this.syncState();
        }, SCENE_RESET_MS);
        this.pendingTimers.add(timer);
      });
      // 'off' needs no handler: a scene has nothing to switch off, and Matter
      // already clears the attribute for us.

      await this.registerDevice(endpoint);
    }
  }

  /** Put an attribute back after Matter has optimistically applied a failed command. */
  private revert(endpoint: MatterbridgeEndpoint, value: boolean): void {
    const timer = setTimeout(() => {
      this.pendingTimers.delete(timer);
      void endpoint.updateAttribute('OnOff', 'onOff', value, endpoint.log);
    }, REVERT_DELAY_MS);
    this.pendingTimers.add(timer);
  }

  /** Pull /state and push it into every device attribute. */
  private async syncState(): Promise<void> {
    const state = await this.fetchState();
    if (!state) return;
    for (const [key, endpoint] of this.devices) {
      const value = state[key];
      if (typeof value === 'boolean') {
        await endpoint.updateAttribute('OnOff', 'onOff', value, endpoint.log);
      }
    }
  }

  override async onConfigure(): Promise<void> {
    await super.onConfigure();
    await this.syncState();

    if (this.pollInterval > 0) {
      this.pollTimer = setInterval(() => void this.syncState(), this.pollInterval * 1000);
      this.pollTimer.unref();
    }
  }

  override async onShutdown(reason?: string): Promise<void> {
    await super.onShutdown(reason);

    clearInterval(this.pollTimer);
    this.pollTimer = undefined;
    for (const timer of this.pendingTimers) clearTimeout(timer);
    this.pendingTimers.clear();
    this.devices.clear();

    if (this.config.unregisterOnShutdown === true) await this.unregisterAllDevices(500);
  }
}

export default function initializePlugin(matterbridge: PlatformMatterbridge, log: AnsiLogger, config: PlatformConfig): RenaPlatform {
  return new RenaPlatform(matterbridge, log, config);
}
