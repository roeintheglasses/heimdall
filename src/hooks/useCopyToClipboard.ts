import { useState, useCallback } from 'react';

interface UseCopyToClipboardReturn {
  copiedValue: string | null;
  copy: (_text: string, _identifier?: string) => Promise<boolean>;
  isCopied: (_identifier: string) => boolean;
  reset: () => void;
}

/**
 * Hook for copying text to clipboard with feedback state
 * @param resetTimeout - Time in ms to reset copied state (default: 2000ms)
 */
export function useCopyToClipboard(resetTimeout = 2000): UseCopyToClipboardReturn {
  const [copiedValue, setCopiedValue] = useState<string | null>(null);

  const copy = useCallback(
    async (text: string, identifier?: string): Promise<boolean> => {
      if (!navigator?.clipboard) {
        console.warn('Clipboard API not available');
        return false;
      }

      try {
        await navigator.clipboard.writeText(text);
        setCopiedValue(identifier ?? text);

        if (resetTimeout > 0) {
          setTimeout(() => setCopiedValue(null), resetTimeout);
        }

        return true;
      } catch (error) {
        console.error('Failed to copy to clipboard:', error);
        setCopiedValue(null);
        return false;
      }
    },
    [resetTimeout]
  );

  const isCopied = useCallback(
    (identifier: string): boolean => {
      return copiedValue === identifier;
    },
    [copiedValue]
  );

  const reset = useCallback(() => {
    setCopiedValue(null);
  }, []);

  return { copiedValue, copy, isCopied, reset };
}
