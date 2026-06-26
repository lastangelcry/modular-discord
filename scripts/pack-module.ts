import { readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import * as esbuild from 'esbuild';
import { zipSync } from 'fflate';

const PAK_FORMAT_VERSION = 1;

const moduleDir = resolve(process.argv[2] ?? '');
if (!moduleDir) {
  console.error('Usage: modular-discord-pack <path-to-module-dir>');
  process.exit(1);
}

const entryTs = join(moduleDir, 'src/index.ts');
const pkgPath = join(moduleDir, 'package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as { version?: string };

const imported = await import(pathToFileURL(entryTs).href);
const mod = imported.default ?? imported.module;
const meta = mod?.meta;

if (!meta?.id || !meta?.name) {
  console.error(`[pack] ${entryTs} must default-export a Module with meta.id and meta.name`);
  process.exit(1);
}

const bundle = await esbuild.build({
  entryPoints: [entryTs],
  bundle: true,
  write: false,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  external: ['modular-discord', 'discord.js', 'better-sqlite3'],
  minify: true,
});

const indexJs = bundle.outputFiles[0]?.text;
if (!indexJs) {
  console.error('[pack] esbuild produced no output');
  process.exit(1);
}

const manifest = {
  format: PAK_FORMAT_VERSION,
  id: meta.id,
  name: meta.name,
  version: pkg.version ?? '0.0.0',
  entry: 'index.js',
  description: meta.description,
  builtAt: new Date().toISOString(),
};

const archive = zipSync(
  {
    'manifest.json': new TextEncoder().encode(JSON.stringify(manifest, null, 2)),
    'index.js': new TextEncoder().encode(indexJs),
  },
  { level: 9 }
);

const outputPath = join(dirname(moduleDir), `${meta.id}.pak`);
writeFileSync(outputPath, archive);

const sizeKb = (archive.byteLength / 1024).toFixed(1);
console.log(`[pack] ${basename(moduleDir)} → ${outputPath} (${sizeKb} KB)`);
