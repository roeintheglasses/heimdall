import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  // Base styles - retro terminal aesthetic
  'inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-mono uppercase tracking-wider transition-all duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-terminal-black disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border-2',
  {
    variants: {
      variant: {
        default:
          'bg-transparent border-neon-cyan text-neon-cyan shadow-retro-sm hover:bg-neon-cyan hover:text-terminal-black hover:shadow-retro hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none',
        destructive:
          'bg-transparent border-destructive text-destructive shadow-[2px_2px_0_hsl(0_100%_50%)] hover:bg-destructive hover:text-white hover:shadow-[4px_4px_0_hsl(0_100%_50%)] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none',
        outline:
          'border-border bg-transparent text-foreground hover:border-neon-cyan hover:text-neon-cyan hover:shadow-retro-sm',
        secondary:
          'bg-transparent border-neon-magenta text-neon-magenta shadow-[2px_2px_0_hsl(300_100%_50%)] hover:bg-neon-magenta hover:text-terminal-black hover:shadow-retro-magenta hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none',
        ghost:
          'border-transparent hover:border-neon-cyan/50 hover:text-neon-cyan hover:bg-neon-cyan/10',
        link: 'border-transparent text-neon-cyan underline-offset-4 hover:underline',
        neon: 'bg-neon-cyan/10 border-neon-cyan text-neon-cyan shadow-glow-cyan animate-glow-pulse hover:bg-neon-cyan hover:text-terminal-black',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 px-3 text-xs',
        lg: 'h-10 px-8',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
