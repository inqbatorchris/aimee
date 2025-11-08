import { useEffect, useRef, useCallback } from 'react';

interface UseAutoSaveOptions {
  delay?: number; // Debounce delay in milliseconds (default: 500)
  onSave: () => void | Promise<void>; // Function to call when saving
  enabled?: boolean; // Whether auto-save is enabled (default: true)
}

/**
 * Hook that provides debounced auto-save functionality with blur flush.
 * 
 * Usage:
 * ```
 * const { triggerSave, saveNow } = useAutoSave({
 *   delay: 500,
 *   onSave: async () => {
 *     await saveMutation.mutateAsync(data);
 *   },
 *   enabled: isDirty
 * });
 * 
 * // Trigger debounced save on change
 * onChange={(value) => {
 *   setData(value);
 *   triggerSave();
 * }}
 * 
 * // Flush immediately on blur
 * onBlur={saveNow}
 * ```
 */
export function useAutoSave({ delay = 500, onSave, enabled = true }: UseAutoSaveOptions) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const saveRef = useRef(onSave);
  const enabledRef = useRef(enabled);

  // Keep refs up to date
  useEffect(() => {
    saveRef.current = onSave;
  }, [onSave]);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  /**
   * Trigger a debounced save. If called multiple times within the delay period,
   * only the last call will result in a save.
   */
  const triggerSave = useCallback(() => {
    if (!enabledRef.current) return;

    // Clear any pending save
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Schedule new save
    timeoutRef.current = setTimeout(() => {
      saveRef.current();
      timeoutRef.current = null;
    }, delay);
  }, [delay]);

  /**
   * Save immediately, bypassing the debounce delay.
   * Useful for blur events or when user explicitly wants to save.
   */
  const saveNow = useCallback(() => {
    if (!enabledRef.current) return;

    // Clear any pending save
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // Save immediately
    saveRef.current();
  }, []);

  /**
   * Cancel any pending save without executing it.
   */
  const cancelSave = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  return { triggerSave, saveNow, cancelSave };
}
