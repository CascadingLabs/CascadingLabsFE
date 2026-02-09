// @ts-check
import solidJs from "@astrojs/solid-js";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
  site: "https://cascadinglabs.com",
  output: "static",
  integrations: [solidJs()],

  vite: {
    plugins: [tailwindcss()],
  },
});
