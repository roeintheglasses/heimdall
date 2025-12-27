import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // Base styles - retro terminal aesthetic
          "flex h-9 w-full border-2 px-3 py-1",
          "bg-terminal-black border-neon-cyan/50",
          "text-neon-cyan font-mono text-sm",
          "caret-neon-cyan",
          // Placeholder
          "placeholder:text-muted-foreground placeholder:opacity-50",
          // Focus state
          "focus-visible:outline-none focus-visible:border-neon-cyan",
          "focus-visible:shadow-[0_0_10px_hsl(180_100%_50%/0.3)]",
          "focus-visible:ring-0",
          // Transition
          "transition-all duration-200",
          // File input
          "file:border-0 file:bg-neon-cyan/20 file:text-neon-cyan",
          "file:text-sm file:font-mono file:mr-2 file:px-2 file:py-1",
          // Disabled
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:border-border",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
