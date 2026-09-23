import type { ComponentType, ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

/** The caller's theme, read verbatim -- no defaults, same convention as
 * `StatusColors`/`CalendarColors`: this package never injects a palette. */
export type NotificationColors = {
  text: string;
  muted: string;
  accent: string;
  onAccent: string;
  panel: string;
  rim: string;
};

export type NotificationAction = {
  label: string;
  onPress: () => void;
};

/** Shape every `Container` override must satisfy -- same minimal contract as
 * `StatusScreen`/`StatusBanner`'s Container slot. */
export type NotificationContainerProps = {
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
};

export type NotificationContainer = ComponentType<NotificationContainerProps>;
