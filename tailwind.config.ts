import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "1.25rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      colors: {
        // Deep navy / charcoal base
        abyss: {
          950: "#05070f",
          900: "#080b17",
          800: "#0c1122",
          700: "#111834",
          600: "#182247",
        },
        // Primary accent family. Hue + saturation come from CSS vars
        // (--wk-h / --wk-s) so the whole scale re-tints when the user picks a
        // palette; the per-shade lightness ramp is fixed here to preserve
        // contrast. Defaults (set in globals.css) reproduce the electric blue.
        waku: {
          50: "hsl(var(--wk-h) var(--wk-s) 97% / <alpha-value>)",
          100: "hsl(var(--wk-h) var(--wk-s) 93% / <alpha-value>)",
          200: "hsl(var(--wk-h) var(--wk-s) 87% / <alpha-value>)",
          300: "hsl(var(--wk-h) var(--wk-s) 78% / <alpha-value>)",
          400: "hsl(var(--wk-h) var(--wk-s) 68% / <alpha-value>)",
          500: "hsl(var(--wk-h) var(--wk-s) 61% / <alpha-value>)",
          600: "hsl(var(--wk-h) var(--wk-s) 52% / <alpha-value>)",
          700: "hsl(var(--wk-h) var(--wk-s) 44% / <alpha-value>)",
          800: "hsl(var(--wk-h) var(--wk-s) 37% / <alpha-value>)",
          900: "hsl(var(--wk-h) var(--wk-s) 30% / <alpha-value>)",
          indigo: "hsl(var(--ir-h) var(--ir-s) 63% / <alpha-value>)",
          cinematic: "hsl(var(--wk-h) var(--wk-s) 72% / <alpha-value>)",
        },
        // Secondary accent — a lively companion hue (--ir-h / --ir-s) used for
        // the app's primary calls to action. Re-tints with the palette too.
        iris: {
          300: "hsl(var(--ir-h) var(--ir-s) 82% / <alpha-value>)",
          400: "hsl(var(--ir-h) var(--ir-s) 75% / <alpha-value>)",
          500: "hsl(var(--ir-h) var(--ir-s) 68% / <alpha-value>)",
          600: "hsl(var(--ir-h) var(--ir-s) 58% / <alpha-value>)",
          700: "hsl(var(--ir-h) var(--ir-s) 47% / <alpha-value>)",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
      },
      borderRadius: {
        "4xl": "2rem",
        "5xl": "2.75rem",
      },
      fontFamily: {
        // One family throughout (Manrope). `display` intentionally resolves to
        // the same var so headings and body stay cohesive.
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glass:
          "0 8px 32px -8px rgba(5,10,30,0.6), inset 0 1px 0 0 rgba(255,255,255,0.14), inset 0 -1px 1px 0 rgba(0,0,0,0.35)",
        "glass-lg":
          "0 24px 70px -20px rgba(4,8,26,0.75), inset 0 1px 0 0 rgba(255,255,255,0.18), inset 0 -2px 2px 0 rgba(0,0,0,0.4)",
        // Accent-driven but RESTRAINED — gentle tinted drop shadows, no bright
        // 1px halo ring. They re-tint with the palette (built from the hue/sat
        // vars) yet stay quiet at rest; lean on hover/active for emphasis.
        glow: "0 4px 18px -8px hsl(var(--wk-h) var(--wk-s) 55% / 0.35)",
        "glow-iris":
          "0 4px 18px -8px hsl(var(--ir-h) var(--ir-s) 58% / 0.38)",
        "glow-accent":
          "0 2px 12px -5px hsl(var(--wk-h) var(--wk-s) 58% / 0.28)",
      },
      backgroundImage: {
        "glass-sheen":
          "linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.03) 32%, rgba(255,255,255,0) 58%)",
        "radial-glow":
          "radial-gradient(60% 60% at 50% 0%, hsl(var(--wk-h) var(--wk-s) 58% / 0.16) 0%, transparent 72%)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        float: {
          "0%,100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        "spin-slow": {
          to: { transform: "rotate(360deg)" },
        },
        "gold-pulse": {
          "0%,100%": {
            boxShadow:
              "0 0 0 1px rgba(255,214,102,0.7), 0 0 22px 2px rgba(255,196,64,0.55)",
          },
          "50%": {
            boxShadow:
              "0 0 0 2px rgba(255,231,153,0.95), 0 0 40px 6px rgba(255,196,64,0.85)",
          },
        },
        "gold-ring": {
          "0%,100%": { opacity: "0.35" },
          "50%": { opacity: "1" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.6s cubic-bezier(0.22,1,0.36,1) both",
        float: "float 7s ease-in-out infinite",
        shimmer: "shimmer 2.2s infinite",
        "spin-slow": "spin-slow 14s linear infinite",
        "gold-pulse": "gold-pulse 2.4s ease-in-out infinite",
        "gold-ring": "gold-ring 1.8s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
