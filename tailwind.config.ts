import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: "hsl(var(--card))",
        cardForeground: "hsl(var(--card-foreground))",
        muted: "hsl(var(--muted))",
        mutedForeground: "hsl(var(--muted-foreground))",
        border: "hsl(var(--border))",
        accent: "hsl(var(--accent))",
        accentForeground: "hsl(var(--accent-foreground))",
        ring: "hsl(var(--ring))",
        danger: "hsl(var(--danger))",
        warning: "hsl(var(--warning))",
        success: "hsl(var(--success))"
      },
      fontFamily: {
        display: ["var(--font-orbitron)", "sans-serif"],
        body: ["var(--font-manrope)", "sans-serif"]
      },
      boxShadow: {
        race: "0 8px 32px rgba(0, 0, 0, 0.35)",
        glow: "0 0 0 1px rgba(220, 38, 38, 0.25), 0 10px 40px rgba(220, 38, 38, 0.12)"
      },
      backgroundImage: {
        telemetry:
          "linear-gradient(120deg, rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(300deg, rgba(255,255,255,0.02) 1px, transparent 1px)"
      },
      backgroundSize: {
        telemetry: "28px 28px"
      },
      keyframes: {
        "fade-slide": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        }
      },
      animation: {
        "fade-slide": "fade-slide 420ms ease-out"
      }
    }
  },
  plugins: []
};

export default config;
