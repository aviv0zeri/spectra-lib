/**
 * The logic behind PushTester, with no React and no strings in it: a plain
 * class holding the tester's state and the actions that change it, so it can be
 * unit-tested against a fake client and any view can drive it. PushTester.tsx
 * is the React view over it; usePushTester adapts it to useSyncExternalStore.
 *
 * It only ever needs three things of a push client -- permission, token and
 * local scheduling -- so it asks for exactly those (PushTesterClient) and
 * imports the real types as `import type`, which keeps this file, and the
 * `spectra-lib/native` barrel it ships in, free of any push/expo runtime.
 * A PushNotificationClient satisfies the shape as-is.
 */
import type { LocalNotificationRequest } from '../push/LocalNotifier';
import type { PermissionStatus, PushToken } from '../push/types';

/** The slice of a PushNotificationClient the tester uses. */
export interface PushTesterClient {
  permissions: {
    getStatus(): Promise<PermissionStatus>;
    request(): Promise<PermissionStatus>;
  };
  provider: { register(): Promise<PushToken | null> };
  local: { schedule(request: LocalNotificationRequest): Promise<string> };
}

/** One test notification the tester has scheduled. */
export interface SentTest {
  id: string;
  title: string;
  body: string;
  /** Pre-formatted time it was sent -- see PushTesterControllerOptions.formatTime. */
  at: string;
}

/** What the last action did, as data -- the view turns it into words with the
 * caller's own labels, so this class never holds a translated string. */
export type PushTesterStatus =
  | { kind: 'scheduled'; seconds: number }
  | { kind: 'scheduleFailed'; message: string }
  | { kind: 'permissionFailed' }
  | { kind: 'tapped'; title: string };

export interface PushTesterState {
  title: string;
  body: string;
  /** null = still checking; 'unavailable' = the OS couldn't say. */
  permission: PermissionStatus | 'unavailable' | null;
  /** undefined = never asked, null = asked but none could be had, else the token. */
  token: string | null | undefined;
  status: PushTesterStatus | null;
  /** Newest first, capped at maxSent. */
  sent: SentTest[];
}

export interface PushTesterControllerOptions {
  /** The (registered) notification category the test notifications go out under. */
  categoryId: string;
  defaultTitle: string;
  defaultBody: string;
  /** How many sent tests to keep in the list. Default 6. */
  maxSent?: number;
  /** Clock -- injectable so tests are deterministic. */
  now?: () => Date;
  /** Formats the time shown on a sent test. Default: the device's locale time. */
  formatTime?: (date: Date) => string;
}

export class PushTesterController {
  private state: PushTesterState;
  private readonly listeners = new Set<() => void>();
  private nextId = 0;
  private generation = 0;
  /** Bumped whenever the permission is set by an action, so a slower init()
   * read that started earlier can't overwrite the newer answer. */
  private permissionSeq = 0;

  constructor(
    private readonly client: PushTesterClient,
    private readonly options: PushTesterControllerOptions,
  ) {
    this.state = {
      title: options.defaultTitle,
      body: options.defaultBody,
      permission: null,
      token: undefined,
      status: null,
      sent: [],
    };
  }

  /** The current state. A NEW object after every change (never mutated), so it
   * works directly as a useSyncExternalStore snapshot. */
  getState = (): PushTesterState => this.state;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  /** Reads the current permission. Call on mount; safe to call again. A result
   * that lands after dispose() is dropped. */
  async init(): Promise<void> {
    const generation = this.generation;
    const seq = this.permissionSeq;
    let permission: PushTesterState['permission'];
    try {
      permission = await this.client.permissions.getStatus();
    } catch {
      permission = 'unavailable';
    }
    if (generation === this.generation && seq === this.permissionSeq) this.set({ permission });
  }

  /** Detaches from in-flight work: results that arrive afterwards are ignored. */
  dispose(): void {
    this.generation += 1;
  }

  setTitle(title: string): void {
    this.set({ title });
  }

  setBody(body: string): void {
    this.set({ body });
  }

  async askPermission(): Promise<void> {
    try {
      const permission = await this.client.permissions.request();
      this.permissionSeq += 1;
      this.set({ permission });
    } catch {
      this.set({ status: { kind: 'permissionFailed' } });
    }
  }

  /** Schedules the current title/body to fire `secondsFromNow` from now. */
  async send(secondsFromNow: number): Promise<void> {
    const { title, body } = this.state;
    this.set({ status: null });
    try {
      await this.client.local.schedule({
        categoryId: this.options.categoryId,
        title,
        body,
        trigger: { secondsFromNow },
      });
    } catch (error) {
      this.set({
        status: { kind: 'scheduleFailed', message: error instanceof Error ? error.message : String(error) },
      });
      return;
    }
    const sent = [{ id: String(this.nextId++), title, body, at: this.timeLabel() }, ...this.state.sent].slice(
      0,
      this.options.maxSent ?? 6,
    );
    this.set({ sent, status: { kind: 'scheduled', seconds: secondsFromNow } });
  }

  /** The time to show on a sent test. The notification is already scheduled by
   * now, so a caller's formatter throwing must not turn that into a failure:
   * fall back to the device's locale time. */
  private timeLabel(): string {
    const date = this.options.now?.() ?? new Date();
    try {
      return (this.options.formatTime ?? ((d) => d.toLocaleTimeString()))(date);
    } catch {
      return date.toLocaleTimeString();
    }
  }

  /** Asks the token provider for this device's token. A null means none
   * could be had (including a provider that failed). */
  async fetchToken(): Promise<void> {
    try {
      const token = await this.client.provider.register();
      this.set({ token: token ? token.value : null });
    } catch {
      // The provider contract is "never throws", but a custom one might.
      this.set({ token: null });
    }
  }

  /** Copies a sent test's title/body back into the form. */
  reuse(id: string): void {
    const test = this.state.sent.find((entry) => entry.id === id);
    if (test) this.set({ title: test.title, body: test.body });
  }

  dismiss(id: string): void {
    this.set({ sent: this.state.sent.filter((entry) => entry.id !== id) });
  }

  /** Records that a sent test was tapped, so the view can say so. */
  noteTapped(id: string): void {
    const test = this.state.sent.find((entry) => entry.id === id);
    if (test) this.set({ status: { kind: 'tapped', title: test.title } });
  }

  private set(patch: Partial<PushTesterState>): void {
    this.state = { ...this.state, ...patch };
    for (const listener of [...this.listeners]) listener();
  }
}
