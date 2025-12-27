'use client';

import { useState, useEffect, useCallback } from 'react';

interface UseTypingEffectOptions {
  speed?: number;
  delay?: number;
  onComplete?: () => void;
}

export function useTypingEffect(text: string, options: UseTypingEffectOptions = {}) {
  const { speed = 50, delay = 0, onComplete } = options;
  const [displayedText, setDisplayedText] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    let index = 0;
    let timeoutId: NodeJS.Timeout;

    setDisplayedText('');
    setIsComplete(false);
    setIsTyping(false);

    // Initial delay before starting
    const startTyping = () => {
      setIsTyping(true);

      const typeNextChar = () => {
        if (index < text.length) {
          setDisplayedText(text.slice(0, index + 1));
          index++;
          timeoutId = setTimeout(typeNextChar, speed);
        } else {
          setIsComplete(true);
          setIsTyping(false);
          onComplete?.();
        }
      };

      typeNextChar();
    };

    if (delay > 0) {
      timeoutId = setTimeout(startTyping, delay);
    } else {
      startTyping();
    }

    return () => {
      clearTimeout(timeoutId);
    };
  }, [text, speed, delay, onComplete]);

  const reset = useCallback(() => {
    setDisplayedText('');
    setIsComplete(false);
    setIsTyping(false);
  }, []);

  return {
    displayedText,
    isComplete,
    isTyping,
    reset,
  };
}

// Hook for typing multiple lines sequentially
interface UseMultiLineTypingOptions {
  lineDelay?: number;
  charSpeed?: number;
  onAllComplete?: () => void;
}

export function useMultiLineTyping(lines: string[], options: UseMultiLineTypingOptions = {}) {
  const { lineDelay = 300, charSpeed = 50, onAllComplete } = options;
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [completedLines, setCompletedLines] = useState<string[]>([]);
  const [isAllComplete, setIsAllComplete] = useState(false);

  const { displayedText, isComplete } = useTypingEffect(lines[currentLineIndex] || '', {
    speed: charSpeed,
    onComplete: () => {
      if (currentLineIndex < lines.length - 1) {
        setTimeout(() => {
          setCompletedLines((prev) => [...prev, lines[currentLineIndex]]);
          setCurrentLineIndex((prev) => prev + 1);
        }, lineDelay);
      } else {
        setCompletedLines((prev) => [...prev, lines[currentLineIndex]]);
        setIsAllComplete(true);
        onAllComplete?.();
      }
    },
  });

  const reset = useCallback(() => {
    setCurrentLineIndex(0);
    setCompletedLines([]);
    setIsAllComplete(false);
  }, []);

  return {
    completedLines,
    currentLine: displayedText,
    currentLineIndex,
    isLineComplete: isComplete,
    isAllComplete,
    reset,
  };
}
