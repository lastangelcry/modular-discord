import * as esbuild from 'esbuild';

await esbuild.build({
  entryPoints: ['scripts/pack-module.ts'],
  outfile: 'dist/pack-module.js',
  platform: 'node',
  format: 'esm',
  target: 'node22',
  packages: 'external',
  banner: { js: '#!/usr/bin/env node' },
});

console.log('[build] dist/pack-module.js');
