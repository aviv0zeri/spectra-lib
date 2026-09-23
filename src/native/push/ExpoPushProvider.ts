/**
 * Device-token lifecycle. PushTokenProvider is the strategy interface: how a
 * device gets a token it can hand to its own backend. ExpoPushProvider is the
 * implementation for Expo's push relay (README.md's "provider question" --
 * the path GateOpen proves out). A project that later goes past the relay to
 * raw APNs/FCM tokens writes another PushTokenProvider and passes it to the
 * client; PushToken's shape, and every caller of it, stay the same.
 */
import type { PermissionManager } from './PermissionManager';
import type { PushPlatform } from './platform';
import type { PushProvider, PushToken } from './types';

export interface PushTokenProvider {
  /** Which provider issues the tokens (PushToken.provider). */
  readonly id: PushProvider;

  /**
   * This device's current token, or null when one can't be had (permission
   * not granted, build not set up for push, simulator/offline). MUST NOT
   * throw, and MUST NOT prompt for permission -- when the prompt happens is
   * the caller's decision.
   */
  register(): Promise<PushToken | null>;

  /** Stop targeting this device. See ExpoPushProvider.unregister. */
  unregister(token: PushToken): Promise<void>;

  /** Called whenever the underlying token may have changed. Returns an
   * unsubscribe function. */
  onRefresh(handler: (token: PushToken) => void): () => void;
}

export interface ExpoPushProviderOptions {
  /** Override the EAS project id (defaults to the one the build carries). */
  projectId?: string;
  /** Clock for PushToken.obtainedAt -- injectable so tests are deterministic. */
  now?: () => Date;
}

export class ExpoPushProvider implements PushTokenProvider {
  readonly id = 'expo' as const;

  constructor(
    private readonly platform: PushPlatform,
    private readonly permissions: PermissionManager,
    private readonly options: ExpoPushProviderOptions = {},
  ) {}

  async register(): Promise<PushToken | null> {
    try {
      if ((await this.permissions.getStatus()) !== 'granted') return null;

      const projectId = this.options.projectId ?? this.platform.getProjectId();
      if (!projectId) return null;

      const value = await this.platform.getExpoPushToken(projectId);
      if (!value) return null;

      const obtainedAt = (this.options.now?.() ?? new Date()).toISOString();
      return { provider: 'expo', value, obtainedAt };
    } catch {
      return null;
    }
  }

  /**
   * No OS-side "forget this token" call exists on either platform -- the
   * actual stop-targeting call is the consuming project's own backend request
   * (this lib produces the token, the project's API registers or unregisters
   * it server-side). A documented no-op so the interface stays symmetric with
   * register() rather than the split being implicit.
   */
  async unregister(_token: PushToken): Promise<void> {
    return undefined;
  }

  /**
   * The platform's token listener fires with the raw native device token
   * (APNs/FCM), not an Expo push token -- Expo's relay derives
   * ExponentPushToken[...] from the native token server-side, so wiring the
   * listener's own payload into PushToken.value would hand the caller a token
   * in the wrong format. Re-deriving via register() on each change is the fix.
   */
  onRefresh(handler: (token: PushToken) => void): () => void {
    // register() is async, so a change can still be resolving when the caller
    // unsubscribes; `active` keeps that late result from reaching a handler
    // that has already asked not to be called.
    let active = true;
    const stopListening = this.platform.addPushTokenListener(() => {
      void this.register().then((token) => {
        if (active && token) handler(token);
      });
    });
    return () => {
      active = false;
      stopListening();
    };
  }
}
