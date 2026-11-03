import { defineConfig } from "vite";

// GitHub Pages serves this repository under /Saysay/.
export default defineConfig({
  base: process.env.GITHUB_PAGES === "true" ? "/Saysay/" : "/",
});
