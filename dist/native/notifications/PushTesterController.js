export class PushTesterController {
    constructor(client, options) {
        this.client = client;
        this.options = options;
        this.listeners = new Set();
        this.nextId = 0;
        this.generation = 0;
        /** Bumped whenever the permission is set by an action, so a slower init()
         * read that started earlier can't overwrite the newer answer. */
        this.permissionSeq = 0;
        /** The current state. A NEW object after every change (never mutated), so it
         * works directly as a useSyncExternalStore snapshot. */
        this.getState = () => this.state;
        this.subscribe = (listener) => {
            this.listeners.add(listener);
            return () => {
                this.listeners.delete(listener);
            };
        };
        this.state = {
            title: options.defaultTitle,
            body: options.defaultBody,
            permission: null,
            token: undefined,
            status: null,
            sent: [],
        };
    }
    /** Reads the current permission. Call on mount; safe to call again. A result
     * that lands after dispose() is dropped. */
    async init() {
        const generation = this.generation;
        const seq = this.permissionSeq;
        let permission;
        try {
            permission = await this.client.permissions.getStatus();
        }
        catch {
            permission = 'unavailable';
        }
        if (generation === this.generation && seq === this.permissionSeq)
            this.set({ permission });
    }
    /** Detaches from in-flight work: results that arrive afterwards are ignored. */
    dispose() {
        this.generation += 1;
    }
    setTitle(title) {
        this.set({ title });
    }
    setBody(body) {
        this.set({ body });
    }
    async askPermission() {
        try {
            const permission = await this.client.permissions.request();
            this.permissionSeq += 1;
            this.set({ permission });
        }
        catch {
            this.set({ status: { kind: 'permissionFailed' } });
        }
    }
    /** Schedules the current title/body to fire `secondsFromNow` from now. */
    async send(secondsFromNow) {
        const { title, body } = this.state;
        this.set({ status: null });
        try {
            await this.client.local.schedule({
                categoryId: this.options.categoryId,
                title,
                body,
                trigger: { secondsFromNow },
            });
        }
        catch (error) {
            this.set({
                status: { kind: 'scheduleFailed', message: error instanceof Error ? error.message : String(error) },
            });
            return;
        }
        const sent = [{ id: String(this.nextId++), title, body, at: this.timeLabel() }, ...this.state.sent].slice(0, this.options.maxSent ?? 6);
        this.set({ sent, status: { kind: 'scheduled', seconds: secondsFromNow } });
    }
    /** The time to show on a sent test. The notification is already scheduled by
     * now, so a caller's formatter throwing must not turn that into a failure:
     * fall back to the device's locale time. */
    timeLabel() {
        const date = this.options.now?.() ?? new Date();
        try {
            return (this.options.formatTime ?? ((d) => d.toLocaleTimeString()))(date);
        }
        catch {
            return date.toLocaleTimeString();
        }
    }
    /** Asks the token provider for this device's token. A null means none
     * could be had (including a provider that failed). */
    async fetchToken() {
        try {
            const token = await this.client.provider.register();
            this.set({ token: token ? token.value : null });
        }
        catch {
            // The provider contract is "never throws", but a custom one might.
            this.set({ token: null });
        }
    }
    /** Copies a sent test's title/body back into the form. */
    reuse(id) {
        const test = this.state.sent.find((entry) => entry.id === id);
        if (test)
            this.set({ title: test.title, body: test.body });
    }
    dismiss(id) {
        this.set({ sent: this.state.sent.filter((entry) => entry.id !== id) });
    }
    /** Records that a sent test was tapped, so the view can say so. */
    noteTapped(id) {
        const test = this.state.sent.find((entry) => entry.id === id);
        if (test)
            this.set({ status: { kind: 'tapped', title: test.title } });
    }
    set(patch) {
        this.state = { ...this.state, ...patch };
        for (const listener of [...this.listeners])
            listener();
    }
}
