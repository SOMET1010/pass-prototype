/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Charte graphique officielle ANSUT
        pass: {
          blue: "#2256A3", // Pantone 7685 C
          "blue-dark": "#1A4382",
          "blue-light": "#E7EEF8",
          orange: "#F08224", // Pantone 158 C
          "orange-light": "#FDEEDF",
          gris: "#878787",
          "gris-clair": "#E0E0DE",
          noir: "#1D1D1B",
        },
      },
      fontFamily: {
        // Police principale ANSUT : Avenir ; secondaire : Helvetica
        sans: ['"Avenir Next"', "Avenir", '"Helvetica Neue"', "Helvetica", "Arial", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
