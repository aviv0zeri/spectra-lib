import { Button } from './button.jsx';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './dialog.jsx';

/**
 * The confirm/cancel dialog — a themed replacement for `window.confirm()`,
 * which is a native browser box (can't be styled, blocks the render thread).
 * Same shape as the informational Dialog, just with a cancel + confirm
 * footer instead of content.
 *
 * @param {{
 *   open: boolean,
 *   onOpenChange: (open: boolean) => void,
 *   title: import('react').ReactNode,
 *   description?: import('react').ReactNode,
 *   confirmLabel: import('react').ReactNode,
 *   cancelLabel: import('react').ReactNode,
 *   onConfirm: () => void,
 *   variant?: 'default' | 'danger',
 * }} props
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  variant = 'default',
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={variant === 'danger' ? 'danger' : 'primary'}
            onClick={() => {
              onOpenChange(false);
              onConfirm();
            }}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
