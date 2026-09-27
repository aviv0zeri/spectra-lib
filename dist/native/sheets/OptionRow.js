import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * A single selectable row -- a radio circle, a label, an optional leading
 * color dot (which unit/category this is), and an optional trailing
 * sub-label (a capacity, a reason it can't be picked). `OptionList` stacks
 * several as one rounded panel with a hairline divider between them.
 *
 * Ported from the same GateOpen redesign round as ./BottomSheet: its unit
 * picker, language picker and country-code picker were all this same shape
 * hand-repeated three times. A vertical list of named options with a plain
 * radio indicator is a shape every future app of Aviv's needs too (this is
 * NOT a general-purpose `<select>` replacement -- no search, no multi-select,
 * no icons-per-row beyond one color dot; a picker needing any of those
 * stays hand-built).
 *
 * Deliberately excluded, same boundary as the rest of this package: no
 * icon library, no default colors anywhere in `OptionRowColors`.
 */
import { Children, Fragment } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
export function OptionRow({ label, selected = false, disabled = false, subLabel, subLabelTone = 'muted', leadingDot, onPress, colors, rtl = false, style, testID, }) {
    const subColor = subLabelTone === 'danger' ? (colors.danger ?? colors.muted) : colors.muted;
    return (_jsxs(Pressable, { onPress: disabled ? undefined : onPress, disabled: disabled, accessibilityRole: "radio", accessibilityState: { selected, disabled }, accessibilityLabel: subLabel ? `${label}, ${subLabel}` : label, testID: testID, style: ({ pressed }) => [
            styles.row,
            { flexDirection: rtl ? 'row-reverse' : 'row' },
            pressed && !disabled ? styles.rowPressed : null,
            style,
        ], children: [_jsx(View, { style: [
                    styles.radio,
                    { borderColor: selected ? colors.accent : colors.rim },
                ], children: selected ? (_jsx(View, { style: [styles.radioDot, { backgroundColor: colors.accent }] })) : null }), leadingDot ? (_jsx(View, { style: [styles.leadingDot, { backgroundColor: leadingDot }] })) : null, _jsx(Text, { numberOfLines: 1, style: [
                    styles.label,
                    { color: disabled ? colors.muted : colors.text, textAlign: rtl ? 'right' : 'left' },
                ], children: label }), subLabel ? (_jsx(Text, { numberOfLines: 1, style: [styles.subLabel, { color: subColor, textAlign: rtl ? 'left' : 'right' }], children: subLabel })) : null] }));
}
/** Wraps a run of `OptionRow`s in one rounded panel with a hairline divider
 * between consecutive rows -- never before the first or after the last. */
export function OptionList({ children, colors, style, testID }) {
    const rows = Children.toArray(children);
    return (_jsx(View, { style: [styles.list, { backgroundColor: colors.panel }, style], testID: testID, children: rows.map((child, i) => (_jsxs(Fragment, { children: [i > 0 ? _jsx(View, { style: [styles.divider, { backgroundColor: colors.rim }] }) : null, child] }, i))) }));
}
const styles = StyleSheet.create({
    list: {
        borderRadius: 14,
        overflow: 'hidden',
    },
    divider: {
        height: StyleSheet.hairlineWidth,
        marginStart: 16,
    },
    row: {
        alignItems: 'center',
        gap: 12,
        minHeight: 52,
        paddingHorizontal: 16,
    },
    rowPressed: {
        opacity: 0.7,
    },
    radio: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    radioDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    leadingDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        flexShrink: 0,
    },
    label: {
        flex: 1,
        fontSize: 16,
    },
    subLabel: {
        fontSize: 13,
        flexShrink: 0,
    },
});
