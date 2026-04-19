import { build } from 'esbuild';
import { cp, mkdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const outdir = resolve(root, 'dist');

await rm(outdir, { recursive: true, force: true });
await mkdir(outdir, { recursive: true });

await build({
  entryPoints: [resolve(root, 'src/main.ts')],
  bundle: true,
  format: 'esm',
  target: 'es2022',
  sourcemap: true,
  minify: true,
  outfile: resolve(outdir, 'main.js'),
  logLevel: 'info',
});

await cp(resolve(root, 'src/index.html'), resolve(outdir, 'index.html'));

console.log(`Build complete -> ${outdir}`);
