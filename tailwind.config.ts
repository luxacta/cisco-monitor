import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        cisco: {
          blue: "#049fd9",
          dark: "#0d274d",
          green: "#6cc04a",
          red: "#e2231a",
          amber: "#f5a623",
        },
      },
    },
  },
  plugins: [],
};
export default config;
