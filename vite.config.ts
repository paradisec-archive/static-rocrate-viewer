import tailwindcss from "@tailwindcss/vite";
import tanstackRouter from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import type { Plugin } from "vite";
import { defineConfig } from "vite";

const classicScript = (): Plugin => ({
  name: "classic-script",
  enforce: "post",
  transformIndexHtml(html) {
    return html.replace(/ type="module" crossorigin/g, " defer");
  },
});

export default defineConfig({
  base: "./",
  build: {
    modulePreload: false,
    rollupOptions: {
      output: {
        format: "iife",
        inlineDynamicImports: true,
      },
    },
  },
  plugins: [
    tanstackRouter({ quoteStyle: "single" }),
    react(),
    tailwindcss(),
    classicScript(),
  ],
});
