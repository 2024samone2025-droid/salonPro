import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
      // Canonical type scale — the single source of truth for text sizing.
      // Named roles map to the sizes already in use, so adopting them is a
      // ZERO visual change. Arbitrary `text-[Npx]` is banned (npm run lint:design);
      // use a role below, or a Tailwind step (xs 12 / sm 14 / base 16 / lg 18 /
      // xl 20 / 2xl 24) which remain valid scale steps. See DESIGN_SYSTEM.md.
      fontSize: {
        micro: ["10px", { lineHeight: "14px" }], // dense metadata, footnotes
        caption: ["11px", { lineHeight: "16px" }], // captions, badges, chips
        body: ["13px", { lineHeight: "18px" }], // default body / table text
        subtitle: ["15px", { lineHeight: "22px" }], // card titles, emphasized body
        title: ["22px", { lineHeight: "28px" }], // page / section headings
      },
      borderWidth: {
        hairline: "0.5px",
      },
      colors: {
        /* Semantic tokens — canonical names, values live in globals.css */
        surface: {
          DEFAULT: "hsl(var(--surface))",
          raised: "hsl(var(--surface-raised))",
          hover: "hsl(var(--surface-hover))",
        },
        ink: {
          DEFAULT: "hsl(var(--ink))",
          muted: "hsl(var(--ink-muted))",
          faint: "hsl(var(--ink-faint))",
        },
        line: {
          DEFAULT: "hsl(var(--line))",
          strong: "hsl(var(--line-strong))",
        },
        /* accent = THE pink. (The old shadcn hover token now maps to muted.) */
        accent: {
          DEFAULT: "hsl(var(--accent))",
          deep: "hsl(var(--accent-deep))",
          foreground: "hsl(var(--accent-contrast))",
          tint: "hsl(var(--accent-tint))",
          "tint-fg": "hsl(var(--accent-tint-fg))",
        },
        status: {
          "booked-bg": "hsl(var(--status-booked-bg))",
          "booked-fg": "hsl(var(--status-booked-fg))",
          "confirmed-bg": "hsl(var(--status-confirmed-bg))",
          "confirmed-fg": "hsl(var(--status-confirmed-fg))",
          "progress-bg": "hsl(var(--status-progress-bg))",
          "progress-fg": "hsl(var(--status-progress-fg))",
          "completed-bg": "hsl(var(--status-completed-bg))",
          "completed-fg": "hsl(var(--status-completed-fg))",
          "noshow-bg": "hsl(var(--status-noshow-bg))",
          "noshow-fg": "hsl(var(--status-noshow-fg))",
        },

        /* shadcn token names (aliases of the semantic set) */
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        sidebar: {
          DEFAULT: "hsl(var(--sidebar))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          primaryForeground: "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          accentForeground: "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [tailwindcssAnimate],
};
export default config;
