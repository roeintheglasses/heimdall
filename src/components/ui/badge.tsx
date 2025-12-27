import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  // Base styles - retro terminal aesthetic
  "inline-flex items-center border-2 px-2 py-0.5 text-xs font-mono uppercase tracking-wider transition-all duration-100 focus:outline-none focus:ring-2 focus:ring-neon-cyan focus:ring-offset-2 focus:ring-offset-terminal-black",
  {
    variants: {
      variant: {
        default:
          "border-neon-cyan bg-neon-cyan/10 text-neon-cyan shadow-[1px_1px_0_hsl(180_100%_50%)] hover:bg-neon-cyan/20",
        secondary:
          "border-neon-magenta bg-neon-magenta/10 text-neon-magenta shadow-[1px_1px_0_hsl(300_100%_50%)] hover:bg-neon-magenta/20",
        destructive:
          "border-destructive bg-destructive/10 text-destructive shadow-[1px_1px_0_hsl(0_100%_50%)] hover:bg-destructive/20",
        outline:
          "border-border text-foreground bg-transparent hover:border-neon-cyan hover:text-neon-cyan",
        success:
          "border-neon-green bg-neon-green/10 text-neon-green shadow-[1px_1px_0_hsl(120_100%_50%)] hover:bg-neon-green/20",
        warning:
          "border-neon-orange bg-neon-orange/10 text-neon-orange shadow-[1px_1px_0_hsl(30_100%_50%)] hover:bg-neon-orange/20",
        pink:
          "border-neon-pink bg-neon-pink/10 text-neon-pink shadow-[1px_1px_0_hsl(330_100%_60%)] hover:bg-neon-pink/20",
        // Category-specific variants
        development:
          "border-cat-development bg-cat-development/10 text-cat-development",
        deployments:
          "border-cat-deployments bg-cat-deployments/10 text-cat-deployments",
        infrastructure:
          "border-cat-infrastructure bg-cat-infrastructure/10 text-cat-infrastructure",
        issues:
          "border-cat-issues bg-cat-issues/10 text-cat-issues",
        security:
          "border-cat-security bg-cat-security/10 text-cat-security",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
