/**
 * clsx + tailwind-merge, wrapped. Confirmed independently duplicated,
 * byte-for-byte, in at least 5 places before this existed: GateOpen
 * Dashboard, GateOpen Website, bagStore's Dashboard AND Storefront, and
 * eliyaWebsite. All shadcn/ui-style scaffolds reach for the exact same
 * 4 lines; this is that instead.
 *
 * clsx/tailwind-merge are peer dependencies, not bundled -- every current
 * consumer already depends on both directly (that's what was being
 * duplicated), so this rides their existing install rather than risking a
 * second, possibly-mismatched copy.
 */
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
