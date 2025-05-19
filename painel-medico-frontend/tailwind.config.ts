import type { Config } from "tailwindcss";

const config = {
  darkMode: "class",
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))", // Azul claro de fundo #EAF2FA
        foreground: "hsl(var(--foreground))", // Azul escuro para texto #1A2A44
        primary: {
          DEFAULT: "#25392C", // Verde escuro premium
          foreground: "#F0F2F0", // Cinza claro para contraste
        },
        secondary: {
          DEFAULT: "#C4E8C9", // Verde menta
          foreground: "#25392C", // Verde escuro para contraste
        },
        tertiary: {
          DEFAULT: "#F0F2F0", // Cinza claro
          foreground: "#25392C",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Novas cores personalizadas
        'azul-escuro': '#1A2A44',
        'azul-claro': '#EAF2FA',
        'teal-principal': '#4DB6AC',
        'teal-secundario': '#3B9C8D',
        'dourado-realce': '#D4AF37',
        'fundo-gradiente-de': '#EAF2FA',
        'fundo-gradiente-para': '#F5F9FD',
        'sidebar-item-ativo': '#2A3B5A',
        // Cores customizadas para fácil uso
        'verde-escuro': '#25392C',
        'verde-menta': '#C4E8C9',
        'cinza-claro': '#F0F2F0',
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'sans-serif'], // Adicionando Inter como principal
        montserrat: ['var(--font-montserrat)', 'sans-serif'], // Adicionando Montserrat
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;

export default config; 