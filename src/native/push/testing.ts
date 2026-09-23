/**
 * FakePushPlatform -- an in-memory PushPlatform for tests, exported as
 * spectra-lib/native/push/testing so a consuming project can test its own
 * code against a real PushNotificationClient without a device or expo.
 *
 * It records what the classes ask of the OS (channels, scheduled
 * notifications, cancellations) and lets a test play the OS's part: change the
 * permission answer, deliver a foreground notification, fire a tap.
 */
import type {
  PlatformChannelConfig,
  PlatformForegroundHandler,
  PlatformScheduleRequest,
  PushPlatform,
  RawNotification,
  RawNotificationResponse,
} from './platform';
import type { ForegroundPresentation } from './types';

export interface ScheduledRecord {
  id: string;
  request: PlatformScheduleRequest;
}

export class FakePushPlatform implements PushPlatform {
  os: string;

  /** What getPermissionStatus() reports. */
  permission = 'undetermined';
  /** What requestPermission() flips `permission` to (and returns). */
  answerToRequest = 'granted';
  projectId: string | undefined = 'fake-project-id';
  /** What getExpoPushToken() resolves; set an Error to make it reject. */
  token: string | null | Error = 'ExponentPushToken[fake]';

  readonly channels = new Map<string, PlatformChannelConfig>();
  readonly deletedChannels: string[] = [];
  readonly scheduled: ScheduledRecord[] = [];
  readonly cancelled: string[] = [];
  cancelledAll = 0;
  permissionRequests = 0;

  private foregroundHandler: PlatformForegroundHandler | null = null;
  private readonly tokenListeners = new Set<() => void>();
  private readonly responseListeners = new Set<(response: RawNotificationResponse) => void>();
  private lastResponse: RawNotificationResponse | null = null;
  private nextId = 1;

  constructor(os = 'ios') {
    this.os = os;
  }

  // --- PushPlatform -------------------------------------------------------

  async getPermissionStatus(): Promise<string> {
    return this.permission;
  }

  async requestPermission(): Promise<string> {
    this.permissionRequests += 1;
    this.permission = this.answerToRequest;
    return this.permission;
  }

  getProjectId(): string | undefined {
    return this.projectId;
  }

  async getExpoPushToken(_projectId: string): Promise<string | null> {
    if (this.token instanceof Error) throw this.token;
    return this.token;
  }

  addPushTokenListener(listener: () => void): () => void {
    this.tokenListeners.add(listener);
    return () => {
      this.tokenListeners.delete(listener);
    };
  }

  async setChannel(id: string, config: PlatformChannelConfig): Promise<void> {
    this.channels.set(id, config);
  }

  async deleteChannel(id: string): Promise<void> {
    this.channels.delete(id);
    this.deletedChannels.push(id);
  }

  setForegroundHandler(handler: PlatformForegroundHandler): () => void {
    this.foregroundHandler = handler;
    return () => {
      if (this.foregroundHandler === handler) this.foregroundHandler = null;
    };
  }

  async schedule(request: PlatformScheduleRequest): Promise<string> {
    const id = `local-${this.nextId++}`;
    this.scheduled.push({ id, request });
    return id;
  }

  async cancel(id: string): Promise<void> {
    this.cancelled.push(id);
  }

  async cancelAll(): Promise<void> {
    this.cancelledAll += 1;
  }

  addResponseListener(listener: (response: RawNotificationResponse) => void): () => void {
    this.responseListeners.add(listener);
    return () => {
      this.responseListeners.delete(listener);
    };
  }

  getLastResponse(): RawNotificationResponse | null {
    return this.lastResponse;
  }

  clearLastResponse(): void {
    this.lastResponse = null;
  }

  // --- The OS's side, driven by a test ------------------------------------

  /** How many native-token listeners are attached right now. */
  get tokenListenerCount(): number {
    return this.tokenListeners.size;
  }

  /** How many tap listeners are attached right now. */
  get responseListenerCount(): number {
    return this.responseListeners.size;
  }

  /** Whether a foreground handler is currently installed. */
  get hasForegroundHandler(): boolean {
    return this.foregroundHandler !== null;
  }

  /** Deliver a notification while "the app is open". Returns how the handler
   * asked the OS to present it, or null if no handler is installed. */
  deliverForeground(raw: RawNotification): ForegroundPresentation | null {
    return this.foregroundHandler ? this.foregroundHandler(raw) : null;
  }

  /** The native push token changed. */
  changeToken(): void {
    for (const listener of [...this.tokenListeners]) listener();
  }

  /** The user tapped a notification while the app was running. */
  tap(raw: RawNotification): void {
    for (const listener of [...this.responseListeners]) listener({ notification: raw });
  }

  /** The app was cold-launched by tapping a notification. */
  launchFromTap(raw: RawNotification): void {
    this.lastResponse = { notification: raw };
  }
}
