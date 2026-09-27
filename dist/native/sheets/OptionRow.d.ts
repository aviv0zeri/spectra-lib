import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import type { OptionRowColors } from './types';
export interface OptionRowProps {
    label: string;
    selected?: boolean;
    disabled?: boolean;
    subLabel?: string;
    /** 'danger' colors `subLabel` with `colors.danger` (falls back to
     * `colors.muted` if the caller never supplied one) -- the mockup's red
     * "Taken" beside every other row's grey "Sleeps 4". */
    subLabelTone?: 'muted' | 'danger';
    /** A small color swatch before the label -- which unit/category this
     * option is, e.g. a unit's own color. Omit for a plain text-only row
     * (language, country). */
    leadingDot?: string;
    onPress?: () => void;
    colors: OptionRowColors;
    rtl?: boolean;
    style?: StyleProp<ViewStyle>;
    testID?: string;
}
export declare function OptionRow({ label, selected, disabled, subLabel, subLabelTone, leadingDot, onPress, colors, rtl, style, testID, }: OptionRowProps): import("react").JSX.Element;
export interface OptionListProps {
    children: ReactNode;
    colors: Pick<OptionRowColors, 'rim'> & {
        panel: string;
    };
    style?: StyleProp<ViewStyle>;
    testID?: string;
}
/** Wraps a run of `OptionRow`s in one rounded panel with a hairline divider
 * between consecutive rows -- never before the first or after the last. */
export declare function OptionList({ children, colors, style, testID }: OptionListProps): import("react").JSX.Element;
