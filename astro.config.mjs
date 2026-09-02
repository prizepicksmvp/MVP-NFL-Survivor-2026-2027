import { defineConfig } from "astro/config";

// Webflow Cloud sets base path and asset prefix at build time from the
// environment mount path. Only GitHub Pages needs the repository subpath.
const githubPagesBase = process.env.GITHUB_PAGES === "true"
  ? "/MVP-NFL-Survivor-2026-2027/"
  : undefined;

export default defineConfig({
  base: githubPagesBase,
});
