import { useEffect, useRef } from 'react';

export const FOCUSABLE_MODAL_SELECTOR = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

interface ModalFocusTrapOptions {
  open: boolean;
  dialogRef: { current: HTMLElement | null };
  triggerRef: { current: HTMLElement | null };
  onEscape: () => void;
}

export function useModalFocusTrap({ open, dialogRef, triggerRef, onEscape }: ModalFocusTrapOptions): void {
  const onEscapeRef = useRef(onEscape);
  onEscapeRef.current = onEscape;

  useEffect(() => {
    if (!open) {
      return;
    }

    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }

    const focusableElements = () => Array.from(
      dialog.querySelectorAll<HTMLElement>(FOCUSABLE_MODAL_SELECTOR),
    ).filter((element) => {
      const style = window.getComputedStyle(element);
      return style.display !== 'none' && style.visibility !== 'hidden';
    });

    (focusableElements()[0] ?? dialog).focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onEscapeRef.current();
        return;
      }

      if (event.key !== 'Tab') {
        return;
      }

      const elements = focusableElements();
      if (elements.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const firstElement = elements[0];
      const lastElement = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      triggerRef.current?.focus();
    };
  }, [dialogRef, open, triggerRef]);
}
