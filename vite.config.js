import { cpSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

const root = import.meta.dirname;

// The openings, the gallery and the other pages are plain HTML with classic scripts and relative
// paths, and the gallery loads the openings into frames by file name. Vite would rewrite them, so
// only the home page goes through Vite; the build copies everything else into dist byte for byte.
const pages = readdirSync(root).filter(f => f.endsWith('.html') && f !== 'index.html');
const copied = [...pages, 'opening-embed.js', 'music', 'pencil', 'assets'];

function copyStaticPages() {
  let outDir;
  return {
    name: 'copy-static-pages',
    apply: 'build',
    configResolved(config) { outDir = resolve(config.root, config.build.outDir); },
    writeBundle() {
      for (const f of copied) cpSync(resolve(root, f), resolve(outDir, f), { recursive: true });
    },
  };
}

export default defineConfig({
  // relative URLs, like the rest of the site, so the build works from any folder
  base: './',
  plugins: [copyStaticPages()],
  build: {
    // hashed files from the home page go here, so they can't collide with the copied assets/ folder
    assetsDir: '_home',
  },
});
