/** @type {import('tailwindcss').Config} */

const { fontFamily } = require("tailwindcss/defaultTheme");

module.exports = {
  darkMode: ["class"],
  safelist: [
    "bg-red-900",
    "bg-pink-900",
    "bg-purple-900",
    "bg-indigo-900",
    "bg-blue-900",
    "bg-cyan-900",
    "bg-teal-900",
    "bg-green-900",
    "bg-lime-900",
    "bg-yellow-900",
    "bg-amber-900",
    "bg-orange-900",
    "text-red-100",
    "text-pink-100",
    "text-purple-100",
    "text-indigo-100",
    "text-blue-100",
    "text-cyan-100",
    "text-teal-100",
    "text-green-100",
    "text-lime-100",
    "text-yellow-100",
    "text-amber-100",
    "text-orange-100",
  ],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
        sm: "393px",
        md: "480px",
        lg: "768px",
      },
    },
    extend: {
      backgroundImage: {
        "gradient-conic": "conic-gradient(var(--tw-gradient-stops))",
      },
      colors: {
        border: "hsl(var(--border) / <alpha-value>)",
        input: "hsl(var(--input) / <alpha-value>)",
        ring: "hsl(var(--ring) / <alpha-value>)",
        background: "hsl(var(--background) / <alpha-value>)",
        foreground: "hsl(var(--foreground) / <alpha-value>)",
        foregroundMuted: "hsl(var(--foreground-muted) / <alpha-value>)",
        primary: {
          DEFAULT: "hsl(var(--primary) / <alpha-value>)",
          foreground: "hsl(var(--primary-foreground) / <alpha-value>)",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary) / <alpha-value>)",
          foreground: "hsl(var(--secondary-foreground) / <alpha-value>)",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
          foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "hsl(var(--muted) / <alpha-value>)",
          foreground: "hsl(var(--muted-foreground) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "hsl(var(--accent) / <alpha-value>)",
          foreground: "hsl(var(--accent-foreground) / <alpha-value>)",
        },
        popover: {
          DEFAULT: "hsl(var(--popover) / <alpha-value>)",
          foreground: "hsl(var(--popover-foreground) / <alpha-value>)",
        },
        card: {
          DEFAULT: "hsl(var(--card) / <alpha-value>)",
          foreground: "hsl(var(--card-foreground) / <alpha-value>)",
        },
        neutral: {
          900: "#101113",
          700: "#363636",
          500: "#86897D",
          200: "#E6E6E7",
          300: "#CECFD2",
          400: "#A5A5A5",
          100: "#F5F5F6",
        },
        zinc: {
          1000: "#181819",
          950: "#060606",
          900: "#1E1F21",
          850: "#212A2B",
          800: "#2D2D2D",
          700: "#333741",
          600: "#595D62",
          500: "#85888E",
        },
        stone: {
          950: "#0F0F10",
          850: "#191C13",
          900: "#1F1F1F",
          300: "#C8C8C8",
        },
        orange: {
          500: "#FF630B",
          600: "#E54A19",
        },
        pink: {
          600: "#B84B6B",
          500: "#D05278",
          50: "#FDF6F6",
        },
        gray: {
          500: "#9197A6",
          900: "#161B26",
        },
        lime: {
          300: "#D6FE50",
        },
        red: {
          400: "#E35F5F",
        },
        violet: {
          600: "#6C48EA",
        },
        teal: {
          100: "#CAF1F3",
        },
        yellow: {
          400: "#F8D313",
        },
        amber: {
          300: "#FFBF43",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        disco: {
          "0%": { transform: "translateY(-50%) rotate(0deg)" },
          "100%": { transform: "translateY(-50%) rotate(360deg)" },
        },
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
        "expand-from-left": {
          "0%": { width: "32px", opacity: 0 },
          "100%": { width: "180px", opacity: 1 }
        },
      },
      shadow: {
        inputFocus: "0px 0px 0px 4px rgba(78, 70, 180, 0.20)",
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        disco: "disco 4s linear infinite",
        "expand-from-left": "expand-from-left 0.9s ease-out forwards",
      },
      fontFamily: {
        sans: ["var(--font-sans)", ...fontFamily.sans],
        serif: ["var(--font-serif)", ...fontFamily.serif],
        primary: ["var(--font-primary)", ...fontFamily.sans],
        label: ["var(--font-label)", ...fontFamily.sans],
      },
      screens: {
        "max-2xl": { max: "1535px" },
        // => @media (max-width: 1535px) { ... }

        "max-xl": { max: "1279px" },
        // => @media (max-width: 1279px) { ... }

        "max-lg": { max: "1023px" },
        // => @media (max-width: 1023px) { ... }

        "max-md": { max: "767px" },
        // => @media (max-width: 767px) { ... }

        "max-sm": { max: "600px" },
        // => @media (max-width: 600px) { ... }

        "max-xs": { max: "360px" },
        // => @media (max-width: 360px) { ... }
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
