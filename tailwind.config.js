/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    screens: {
      xs: '475px',
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
    },
    extend: {
      colors: {
        // Base semantic colors (from CSS variables)
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        // Neon color palette
        neon: {
          cyan: 'hsl(200 100% 50%)',
          magenta: 'hsl(300 100% 50%)',
          green: 'hsl(120 100% 50%)',
          pink: 'hsl(330 100% 60%)',
          orange: 'hsl(30 100% 50%)',
          yellow: 'hsl(60 100% 50%)',
        },
        // Terminal backgrounds
        terminal: {
          black: 'hsl(0 0% 5%)',
          dark: 'hsl(220 15% 10%)',
          gray: 'hsl(220 10% 15%)',
          border: 'hsl(180 50% 20%)',
        },
        // Category colors
        cat: {
          development: 'hsl(180 100% 50%)',
          deployments: 'hsl(300 100% 50%)',
          infrastructure: 'hsl(120 100% 50%)',
          issues: 'hsl(30 100% 50%)',
          security: 'hsl(330 100% 60%)',
        },
      },
      // All border radius set to 0 for boxy design
      borderRadius: {
        lg: '0px',
        md: '0px',
        sm: '0px',
        DEFAULT: '0px',
        none: '0px',
        full: '0px',
      },
      // Custom box shadows for retro effect
      boxShadow: {
        retro: '4px 4px 0 hsl(180 100% 50%)',
        'retro-sm': '2px 2px 0 hsl(180 100% 50%)',
        'retro-lg': '6px 6px 0 hsl(180 100% 50%)',
        'retro-magenta': '4px 4px 0 hsl(300 100% 50%)',
        'retro-green': '4px 4px 0 hsl(120 100% 50%)',
        'retro-pink': '4px 4px 0 hsl(330 100% 60%)',
        'retro-orange': '4px 4px 0 hsl(30 100% 50%)',
        'glow-cyan': '0 0 10px hsl(200 100% 50%), 0 0 20px hsl(200 100% 50%)',
        'glow-magenta': '0 0 10px hsl(300 100% 50%), 0 0 20px hsl(300 100% 50%)',
        'glow-green': '0 0 10px hsl(120 100% 50%), 0 0 20px hsl(120 100% 50%)',
        'inner-glow': 'inset 0 0 20px rgba(0, 255, 255, 0.05)',
        vignette: 'inset 0 0 100px rgba(0, 0, 0, 0.4)',
      },
      // Font families
      fontFamily: {
        mono: ['var(--font-mono)', 'JetBrains Mono', 'Fira Code', 'monospace'],
        pixel: ['var(--font-pixel)', 'Press Start 2P', 'monospace'],
        terminal: ['var(--font-mono)', 'JetBrains Mono', 'Fira Code', 'monospace'],
      },
      // Custom animations
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'pulse-slow': 'pulse-slow 2s ease-in-out infinite',
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
        flicker: 'flicker 4s infinite',
        scanline: 'scanline-sweep 8s linear infinite',
        'cursor-blink': 'blink-cursor 1s step-end infinite',
        glitch: 'glitch 0.3s ease-in-out',
        'text-reveal': 'text-reveal 0.5s ease-out forwards',
        'neon-flicker': 'neon-flicker 3s infinite',
        phosphor: 'phosphor-fade 0.3s ease-out forwards',
        float: 'float 3s ease-in-out infinite',
        glow: 'glow 2s ease-in-out infinite',
        // Event-specific animations
        'slide-in-left-arrow': 'slide-in-left-arrow 0.4s ease-out forwards',
        'fade-glow-pulse': 'fade-glow-pulse 0.6s ease-out forwards',
        'shake-glitch': 'shake-glitch 0.5s ease-in-out forwards',
        'shield-pulse': 'shield-pulse 0.6s ease-in-out forwards',
        'ticker-scroll': 'ticker-scroll var(--ticker-duration, 30s) linear infinite',
        'timeline-pulse': 'timeline-pulse 2s ease-in-out infinite',
        'typing-cursor': 'typing-cursor 0.8s step-end infinite',
        'progress-fill': 'progress-fill 1s ease-out forwards',
        'boot-check': 'boot-check-appear 0.3s ease-out forwards',
        'shortcut-flash': 'shortcut-flash 0.2s ease-in-out',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'pulse-slow': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        'glow-pulse': {
          '0%, 100%': { opacity: '1', filter: 'brightness(1)' },
          '50%': { opacity: '0.8', filter: 'brightness(1.2)' },
        },
        flicker: {
          '0%, 100%': { opacity: '1' },
          '92%': { opacity: '1' },
          '93%': { opacity: '0.9' },
          '94%': { opacity: '1' },
          '97%': { opacity: '0.95' },
          '98%': { opacity: '1' },
        },
        'scanline-sweep': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        'blink-cursor': {
          '0%, 50%': { borderColor: 'hsl(180 100% 50%)' },
          '51%, 100%': { borderColor: 'transparent' },
        },
        glitch: {
          '0%, 100%': { transform: 'translate(0)' },
          '20%': { transform: 'translate(-2px, 2px)' },
          '40%': { transform: 'translate(2px, -2px)' },
          '60%': { transform: 'translate(-1px, -1px)' },
          '80%': { transform: 'translate(1px, 1px)' },
        },
        'text-reveal': {
          '0%': { clipPath: 'inset(0 100% 0 0)' },
          '100%': { clipPath: 'inset(0 0 0 0)' },
        },
        'neon-flicker': {
          '0%, 19%, 21%, 23%, 25%, 54%, 56%, 100%': {
            textShadow: '0 0 5px currentColor, 0 0 10px currentColor, 0 0 20px currentColor',
          },
          '20%, 24%, 55%': {
            textShadow: 'none',
          },
        },
        'phosphor-fade': {
          '0%': { opacity: '0', transform: 'scale(0.8)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-4px)' },
        },
        glow: {
          '0%, 100%': { boxShadow: '0 0 5px hsl(180 100% 50%), 0 0 10px hsl(180 100% 50%)' },
          '50%': {
            boxShadow:
              '0 0 10px hsl(180 100% 50%), 0 0 20px hsl(180 100% 50%), 0 0 30px hsl(180 100% 50%)',
          },
        },
        // Event-specific keyframes
        'slide-in-left-arrow': {
          '0%': { transform: 'translateX(-20px)', opacity: '0' },
          '50%': { opacity: '1' },
          '100%': { transform: 'translateX(0)' },
        },
        'fade-glow-pulse': {
          '0%': { opacity: '0', boxShadow: '0 0 0 transparent' },
          '50%': { opacity: '1', boxShadow: '0 0 20px var(--glow-color, hsl(300 100% 50%))' },
          '100%': { opacity: '1', boxShadow: '0 0 5px var(--glow-color, hsl(300 100% 50%))' },
        },
        'shake-glitch': {
          '0%, 100%': { transform: 'translateX(0)', filter: 'none' },
          '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-2px)', filter: 'hue-rotate(90deg)' },
          '20%, 40%, 60%, 80%': { transform: 'translateX(2px)', filter: 'hue-rotate(-90deg)' },
        },
        'shield-pulse': {
          '0%, 100%': { transform: 'scale(1)', filter: 'brightness(1)' },
          '50%': { transform: 'scale(1.05)', filter: 'brightness(1.3)' },
        },
        'ticker-scroll': {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        'timeline-pulse': {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.2)', opacity: '0.8' },
        },
        'typing-cursor': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
        'progress-fill': {
          from: { width: '0%' },
          to: { width: 'var(--progress-width, 100%)' },
        },
        'boot-check-appear': {
          '0%': { opacity: '0', transform: 'translateX(-10px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'shortcut-flash': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5', backgroundColor: 'hsl(180 100% 50% / 0.2)' },
        },
      },
      // Text shadow utilities
      textShadow: {
        'glow-cyan':
          '0 0 5px hsl(200 100% 50%), 0 0 10px hsl(200 100% 50%), 0 0 20px hsl(200 100% 50%)',
        'glow-magenta':
          '0 0 5px hsl(300 100% 50%), 0 0 10px hsl(300 100% 50%), 0 0 20px hsl(300 100% 50%)',
        'glow-green':
          '0 0 5px hsl(120 100% 50%), 0 0 10px hsl(120 100% 50%), 0 0 20px hsl(120 100% 50%)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
