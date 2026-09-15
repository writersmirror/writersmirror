/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./public/index.html"],
  theme: {
    extend: {
      colors: {
        terra: "#059669",
        sage: "#697A65",
        paper: "#F7F6F3",
        surface: "#FFFFFF",
        ink: "#2F2E2C",
        "ink-muted": "#75736C",
        line: "#E6E4DD",
        "line-strong": "#D1CFC7",
      },
      fontFamily: {
        heading: ["Antonio", "sans-serif"],
        body: ["Saira", "sans-serif"],
        mono: ["IBM Plex Mono", "monospace"],
      },
    },
  },
  plugins: [],
};
