export class FakePushPlatform {
    constructor(os = 'ios') {
        /** What getPermissionStatus() reports. */
        this.permission = 'undetermined';
        /** What requestPermission() flips `permission` to (and returns). */
        this.answerToRequest = 'granted';
        this.projectId = 'fake-project-id';
        /** What getExpoPushToken() resolves; set an Error to make it reject. */
        this.token = 'ExponentPushToken[fake]';
        this.channels = new Map();
        this.deletedChannels = [];
        this.scheduled = [];
        this.cancelled = [];
        this.cancelledAll = 0;
        this.permissionRequests = 0;
        this.foregroundHandler = null;
        this.tokenListeners = new Set();
        this.responseListeners = new Set();
        this.lastResponse = null;
        this.nextId = 1;
        this.os = os;
    }
    // --- PushPlatform -------------------------------------------------------
    async getPermissionStatus() {
        return this.permission;
    }
    async requestPermission() {
        this.permissionRequests += 1;
        this.permission = this.answerToRequest;
        return this.permission;
    }
    getProjectId() {
        return this.projectId;
    }
    async getExpoPushToken(_projectId) {
        if (this.token instanceof Error)
            throw this.token;
        return this.token;
    }
    addPushTokenListener(listener) {
        this.tokenListeners.add(listener);
        return () => {
            this.tokenListeners.delete(listener);
        };
    }
    async setChannel(id, config) {
        this.channels.set(id, config);
    }
    async deleteChannel(id) {
        this.channels.delete(id);
        this.deletedChannels.push(id);
    }
    setForegroundHandler(handler) {
        this.foregroundHandler = handler;
        return () => {
            if (this.foregroundHandler === handler)
                this.foregroundHandler = null;
        };
    }
    async schedule(request) {
        const id = `local-${this.nextId++}`;
        this.scheduled.push({ id, request });
        return id;
    }
    async cancel(id) {
        this.cancelled.push(id);
    }
    async cancelAll() {
        this.cancelledAll += 1;
    }
    addResponseListener(listener) {
        this.responseListeners.add(listener);
        return () => {
            this.responseListeners.delete(listener);
        };
    }
    getLastResponse() {
        return this.lastResponse;
    }
    clearLastResponse() {
        this.lastResponse = null;
    }
    // --- The OS's side, driven by a test ------------------------------------
    /** How many native-token listeners are attached right now. */
    get tokenListenerCount() {
        return this.tokenListeners.size;
    }
    /** How many tap listeners are attached right now. */
    get responseListenerCount() {
        return this.responseListeners.size;
    }
    /** Whether a foreground handler is currently installed. */
    get hasForegroundHandler() {
        return this.foregroundHandler !== null;
    }
    /** Deliver a notification while "the app is open". Returns how the handler
     * asked the OS to present it, or null if no handler is installed. */
    deliverForeground(raw) {
        return this.foregroundHandler ? this.foregroundHandler(raw) : null;
    }
    /** The native push token changed. */
    changeToken() {
        for (const listener of [...this.tokenListeners])
            listener();
    }
    /** The user tapped a notification while the app was running. */
    tap(raw) {
        for (const listener of [...this.responseListeners])
            listener({ notification: raw });
    }
    /** The app was cold-launched by tapping a notification. */
    launchFromTap(raw) {
        this.lastResponse = { notification: raw };
    }
}
