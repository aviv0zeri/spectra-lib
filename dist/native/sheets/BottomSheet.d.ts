import type { ComponentType, ReactNode } from 'react';
import type { ModalProps, StyleProp, TextStyle, ViewStyle } from 'react-native';
import type { SheetColors } from './types';
type SheetContainerProps = {
    style?: StyleProp<ViewStyle>;
    children?: ReactNode;
};
export interface SheetHeaderProps {
    /** Usually a Cancel text button, or omitted for a sheet with no way back
     * except its own action buttons. */
    left?: ReactNode;
    title?: ReactNode;
    /** Usually a Done text button. */
    right?: ReactNode;
    colors: Pick<SheetColors, 'text'>;
    rtl?: boolean;
    titleStyle?: StyleProp<TextStyle>;
    style?: StyleProp<ViewStyle>;
    testID?: string;
}
/**
 * The header row alone, exported separately so a caller building a fully
 * custom sheet body still gets the same title-centering grid (three equal
 * flex slots -- the title stays centered whatever `left`/`right` end up
 * measuring, rather than the common bug of a title that drifts toward
 * whichever side is empty).
 */
export declare function SheetHeader({ left, title, right, colors, rtl, titleStyle, style, testID, }: SheetHeaderProps): import("react").JSX.Element;
export interface BottomSheetProps {
    visible: boolean;
    /** Backdrop tap and the Android hardware back button both call this --
     * same as every other dismiss path in this component, it does not close
     * the sheet itself. The caller owns `visible`. */
    onRequestClose: () => void;
    colors: SheetColors;
    rtl?: boolean;
    children?: ReactNode;
    /** A fully custom header; takes over from `title`/`headerLeft`/
     * `headerRight` when given. */
    header?: ReactNode;
    title?: string;
    headerLeft?: ReactNode;
    headerRight?: ReactNode;
    /** Default `true` -- the small grab affordance under the header, which
     * (with `dragToDismiss`) really does drag: pulling the handle/header area
     * down past `dismissDragDistance` calls `onRequestClose`. */
    showGrabber?: boolean;
    /** Default `true`. A downward drag on the grabber + header area follows
     * the finger and, released past `dismissDragDistance` (or flicked), asks
     * to close. Only that top zone is draggable on purpose: the body may
     * scroll, and a body-wide drag would fight it. */
    dragToDismiss?: boolean;
    /** Default 80 (points). */
    dismissDragDistance?: number;
    /** Fraction of the window height the sheet may grow to before its body
     * scrolls internally. Default 0.92, matching the ported prototype. */
    maxHeightRatio?: number;
    animationDuration?: number;
    Container?: ComponentType<SheetContainerProps>;
    style?: StyleProp<ViewStyle>;
    contentContainerStyle?: StyleProp<ViewStyle>;
    /** Spread onto the underlying `Modal` -- a consumer's own
     * presentation-mode conventions (e.g. `statusBarTranslucent`,
     * `presentationStyle`) without this package needing to know them. */
    modalProps?: Partial<ModalProps>;
    /** Fires once the close animation has finished and the Modal has actually
     * un-mounted -- the moment it is safe to present ANOTHER Modal-backed
     * surface. Presenting one while this sheet's Modal is still leaving is
     * silently dropped on iOS (a real bug GateOpen gates every dialog chain
     * on), so a caller opening a follow-up sheet/dialog from a choice made
     * here should do it from this callback, not from `onRequestClose`. */
    onExited?: () => void;
    testID?: string;
}
/**
 * `BottomSheet` owns presentation (scrim, slide, rounded panel, optional
 * header); it never owns whether it's open. Mount it once per sheet and
 * flip `visible`, the same lifecycle every other component in this package
 * uses.
 */
export declare function BottomSheet({ visible, onRequestClose, colors, rtl, children, header, title, headerLeft, headerRight, showGrabber, dragToDismiss, dismissDragDistance, maxHeightRatio, animationDuration, Container, style, contentContainerStyle, modalProps, onExited, testID, }: BottomSheetProps): import("react").JSX.Element | null;
export {};
