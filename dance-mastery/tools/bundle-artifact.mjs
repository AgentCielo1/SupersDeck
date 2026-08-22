// Bundles the Today app (index.html + ES modules) into one self-contained
// HTML file for publishing as a Claude Artifact (private shareable link).
// Usage: node bundle-artifact.mjs <esbuild-bin> <out.html>
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const [esbuild, out] = process.argv.slice(2);
const appDir = join(dirname(fileURLToPath(import.meta.url)), "..", "app");

const js = execFileSync(esbuild, [
  join(appDir, "js", "app.js"),
  "--bundle", "--format=iife", "--minify=false", "--charset=utf8",
], { maxBuffer: 64 * 1024 * 1024 }).toString();

let html = readFileSync(join(appDir, "index.html"), "utf8");
// artifact gets the product name, not the tab caption
html = html.replace(/<title>[^<]*<\/title>/, "<title>Dance Mastery</title>");
// strip PWA bits (no service worker / manifest on the artifact origin)
html = html.replace(/<link rel="manifest"[^>]*>\n?/, "");
html = html.replace(/<script>\s*if \("serviceWorker"[\s\S]*?<\/script>\n?/, "");
// multi-page links don't exist inside a single-page artifact
html = html.replace(/<nav[\s\S]*?<\/nav>\n?/, "");
html = html + `<style>.mlink{pointer-events:none;border-bottom:none}</style>\n`;
// inline the bundle
html = html.replace(
  /<script type="module" src="js\/app.js"><\/script>/,
  `<script>\n${js}\n</script>`
);
// artifact wrapper supplies the document skeleton — strip ours
html = html
  .replace(/^<!doctype html>\s*<html[^>]*>\s*/i, "")
  .replace(/<\/html>\s*$/i, "")
  .replace(/<head>\s*/i, "")
  .replace(/<\/head>\s*/i, "")
  .replace(/<body>\s*/i, "")
  .replace(/<\/body>\s*/i, "");

writeFileSync(out, html);
console.log(`wrote ${out} (${(html.length / 1024).toFixed(0)} KB)`);
