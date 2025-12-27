'use client';

import { useTypingEffect, useMultiLineTyping } from '@/hooks/useTypingEffect';
import { cn } from '@/lib/utils';

interface TerminalTextProps {
  text: string;
  className?: string;
  speed?: number;
  delay?: number;
  showCursor?: boolean;
  cursorChar?: string;
  onComplete?: () => void;
  as?: 'span' | 'p' | 'h1' | 'h2' | 'h3' | 'div';
}

export function TerminalText({
  text,
  className,
  speed = 50,
  delay = 0,
  showCursor = true,
  cursorChar = '_',
  onComplete,
  as: Component = 'span',
}: TerminalTextProps) {
  const { displayedText, isComplete, isTyping } = useTypingEffect(text, {
    speed,
    delay,
    onComplete,
  });

  return (
    <Component className={cn('font-mono', className)}>
      {displayedText}
      {showCursor && (
        <span
          className={cn(
            'ml-0.5 inline-block',
            isTyping || !isComplete ? 'animate-cursor-blink' : 'opacity-0'
          )}
        >
          {cursorChar}
        </span>
      )}
    </Component>
  );
}

interface TerminalLinesProps {
  lines: string[];
  className?: string;
  lineClassName?: string;
  charSpeed?: number;
  lineDelay?: number;
  showCursor?: boolean;
  prefix?: string;
  onAllComplete?: () => void;
}

export function TerminalLines({
  lines,
  className,
  lineClassName,
  charSpeed = 50,
  lineDelay = 300,
  showCursor = true,
  prefix = '> ',
  onAllComplete,
}: TerminalLinesProps) {
  const { completedLines, currentLine, currentLineIndex, isAllComplete } = useMultiLineTyping(
    lines,
    {
      charSpeed,
      lineDelay,
      onAllComplete,
    }
  );

  return (
    <div className={cn('space-y-1 font-mono', className)}>
      {/* Completed lines */}
      {completedLines.map((line, index) => (
        <div key={index} className={cn('text-neon-cyan', lineClassName)}>
          <span className="text-neon-magenta">{prefix}</span>
          {line}
        </div>
      ))}

      {/* Current typing line */}
      {currentLineIndex < lines.length && !isAllComplete && (
        <div className={cn('text-neon-cyan', lineClassName)}>
          <span className="text-neon-magenta">{prefix}</span>
          {currentLine}
          {showCursor && <span className="ml-0.5 inline-block animate-cursor-blink">_</span>}
        </div>
      )}
    </div>
  );
}

// Static terminal prompt display
interface TerminalPromptProps {
  children: React.ReactNode;
  className?: string;
  prefix?: string;
  showCursor?: boolean;
}

export function TerminalPrompt({
  children,
  className,
  prefix = '> ',
  showCursor = false,
}: TerminalPromptProps) {
  return (
    <div className={cn('font-mono text-neon-cyan', className)}>
      <span className="text-neon-magenta">{prefix}</span>
      {children}
      {showCursor && <span className="ml-0.5 inline-block animate-cursor-blink">_</span>}
    </div>
  );
}

// ASCII art header component
interface AsciiHeaderProps {
  text: string;
  className?: string;
  glow?: boolean;
}

const ASCII_CHARS: Record<string, string[]> = {
  H: ['H   H', 'H   H', 'HHHHH', 'H   H', 'H   H'],
  E: ['EEEEE', 'E    ', 'EEE  ', 'E    ', 'EEEEE'],
  I: ['IIIII', '  I  ', '  I  ', '  I  ', 'IIIII'],
  M: ['M   M', 'MM MM', 'M M M', 'M   M', 'M   M'],
  D: ['DDDD ', 'D   D', 'D   D', 'D   D', 'DDDD '],
  A: [' AAA ', 'A   A', 'AAAAA', 'A   A', 'A   A'],
  L: ['L    ', 'L    ', 'L    ', 'L    ', 'LLLLL'],
  ' ': ['     ', '     ', '     ', '     ', '     '],
};

export function AsciiHeader({ text, className, glow = true }: AsciiHeaderProps) {
  const lines: string[] = ['', '', '', '', ''];

  for (const char of text.toUpperCase()) {
    const charArt = ASCII_CHARS[char] || ASCII_CHARS[' '];
    charArt.forEach((line, i) => {
      lines[i] += line + ' ';
    });
  }

  return (
    <pre
      className={cn(
        'font-mono text-xs leading-tight text-neon-cyan sm:text-sm',
        glow && 'text-glow-cyan',
        className
      )}
    >
      {lines.map((line, i) => (
        <div key={i}>{line}</div>
      ))}
    </pre>
  );
}
