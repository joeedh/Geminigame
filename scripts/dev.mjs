import { context } from 'esbuild';
import { cp, mkdir, watch as fsWatch } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const servedir = resolve(root, 'dist');

await mkdir(servedir, { recursive: true });

const htmlSrc = resolve(root, 'src/index.html');
const htmlDest = resolve(servedir, 'index.html');
await cp(htmlSrc, htmlDest);

const ctx = await context({
  entryPoints: [resolve(root, 'src/main.ts')],
  bundle: true,
  format: 'esm',
  target: 'es2022',
  sourcemap: true,
  outfile: resolve(servedir, 'main.js'),
  logLevel: 'info',
});

await ctx.watch();

(async () => {
  const watcher = fsWatch(htmlSrc);
  for await (const _ of watcher) {
    await cp(htmlSrc, htmlDest);
    console.log('index.html updated');
  }
})().catch((err) => console.error('html watcher error:', err));

const port = Number(process.env.PORT ?? 5173);
const host = process.env.HOST ?? '127.0.0.1';

const result = await ctx.serve({
  servedir,
  host,
  port,
  fallback: htmlDest,
});

const reportedHost = result.hosts?.[0] ?? result.host ?? host;
const reportedPort = result.port ?? port;
console.log(`Dev server: http://${reportedHost}:${reportedPort}`);

process.on('SIGINT', async () => {
  await ctx.dispose();
  process.exit(0);
});
