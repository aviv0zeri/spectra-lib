export class ExpoPushProvider {
    constructor(platform, permissions, options = {}) {
        this.platform = platform;
        this.permissions = permissions;
        this.options = options;
        this.id = 'expo';
    }
    async register() {
        try {
            if ((await this.permissions.getStatus()) !== 'granted')
                return null;
            const projectId = this.options.projectId ?? this.platform.getProjectId();
            if (!projectId)
                return null;
            const value = await this.platform.getExpoPushToken(projectId);
            if (!value)
                return null;
            const obtainedAt = (this.options.now?.() ?? new Date()).toISOString();
            return { provider: 'expo', value, obtainedAt };
        }
        catch {
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
    async unregister(_token) {
        return undefined;
    }
    /**
     * The platform's token listener fires with the raw native device token
     * (APNs/FCM), not an Expo push token -- Expo's relay derives
     * ExponentPushToken[...] from the native token server-side, so wiring the
     * listener's own payload into PushToken.value would hand the caller a token
     * in the wrong format. Re-deriving via register() on each change is the fix.
     */
    onRefresh(handler) {
        // register() is async, so a change can still be resolving when the caller
        // unsubscribes; `active` keeps that late result from reaching a handler
        // that has already asked not to be called.
        let active = true;
        const stopListening = this.platform.addPushTokenListener(() => {
            void this.register().then((token) => {
                if (active && token)
                    handler(token);
            });
        });
        return () => {
            active = false;
            stopListening();
        };
    }
}
