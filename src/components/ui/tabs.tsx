"use client"

import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"

import { cn } from "@/lib/utils"

const Tabs = TabsPrimitive.Root

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      // Retro terminal tabs container
      "inline-flex h-10 items-center justify-center gap-1",
      "bg-terminal-black border-2 border-neon-cyan/30 p-1",
      "text-muted-foreground font-mono",
      className
    )}
    {...props}
  />
))
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      // Base styles
      "inline-flex items-center justify-center whitespace-nowrap px-3 py-1.5",
      "text-xs font-mono uppercase tracking-wider",
      "transition-all duration-100",
      // Borders and background
      "border-2 border-transparent",
      // Focus
      "ring-offset-terminal-black",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-cyan focus-visible:ring-offset-2",
      // Disabled
      "disabled:pointer-events-none disabled:opacity-50",
      // Hover (inactive)
      "hover:text-neon-cyan hover:border-neon-cyan/30",
      // Active state - neon highlight
      "data-[state=active]:border-neon-cyan",
      "data-[state=active]:bg-neon-cyan/10",
      "data-[state=active]:text-neon-cyan",
      "data-[state=active]:shadow-[2px_2px_0_hsl(180_100%_50%)]",
      className
    )}
    {...props}
  />
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-2",
      "ring-offset-terminal-black",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-cyan focus-visible:ring-offset-2",
      // Animation
      "data-[state=active]:animate-in data-[state=active]:fade-in-0",
      className
    )}
    {...props}
  />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }
