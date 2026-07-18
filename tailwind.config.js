/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Charte ANSUT
        pass: {
          blue: "#1D56A3",
          "blue-dark": "#164281",
          "blue-light": "#E8F0FA",
          orange: "#F08221",
          "orange-light": "#FDEEDF",
        },
      },
      fontFamily: {
        sans: ["Marianne", "Inter", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
    },
  },
  plugins: [],
};
