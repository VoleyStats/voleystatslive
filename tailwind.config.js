/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{vue,js,ts,jsx,tsx}"],
  darkMode: "selector",
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#070A12",
          900: "#0B0F1A",
          850: "#0F1524",
          800: "#141C30",
          750: "#1A2440",
          700: "#24304F",
          600: "#33426A",
        },
        brand: {
          200: "#C7D8FF",
          300: "#9CB8FF",
          400: "#6E93FF",
          500: "#3D6BFF",
          600: "#2C52E6",
          700: "#2140B4",
        },
        volt: {
          300: "#E4FF87",
          400: "#CBFB45",
          500: "#B6EE1F",
          600: "#9BCB16",
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(61,107,255,0.25), 0 20px 60px -15px rgba(61,107,255,0.45)",
        "glow-volt": "0 0 0 1px rgba(203,251,69,0.25), 0 20px 60px -15px rgba(203,251,69,0.35)",
        card: "0 24px 60px -25px rgba(0,0,0,0.6)",
      },
      backgroundImage: {
        grid: "linear-gradient(to right, rgba(120,140,190,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(120,140,190,0.08) 1px, transparent 1px)",
      },
      backgroundSize: {
        grid: "56px 56px",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "pulse-ring": {
          "0%": { transform: "scale(0.9)", opacity: "0.7" },
          "70%, 100%": { transform: "scale(1.6)", opacity: "0" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        float: "float 6s ease-in-out infinite",
        "pulse-ring": "pulse-ring 2.4s cubic-bezier(0.4,0,0.6,1) infinite",
        shimmer: "shimmer 8s linear infinite",
      },
    },
  },
  plugins: [],
};
