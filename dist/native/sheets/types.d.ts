/**
 * Shared color contracts for ./BottomSheet and ./OptionRow -- same
 * convention as StatusColors/NotificationColors: read verbatim, no
 * defaults, no fallback palette. The caller's theme is the only source.
 */
export type SheetColors = {
    /** The dimmed backdrop behind the sheet. */
    scrim: string;
    /** The sheet's own background. */
    panel: string;
    /** Hairline border and the grab handle. */
    rim: string;
    text: string;
    /** Header button text (Cancel/Done) and any other tappable accent. */
    accent: string;
    muted: string;
};
export type OptionRowColors = {
    text: string;
    muted: string;
    accent: string;
    rim: string;
    /** A row's sub-label when it's a problem, not just informational (the
     * mockup's "Taken" in red vs "Sleeps 4" in muted grey). Optional --
     * falls back to `muted` so a caller that never has an invalid option
     * doesn't have to supply a color it never uses. */
    danger?: string;
};
