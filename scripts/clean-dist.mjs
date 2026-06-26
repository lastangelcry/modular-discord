import { rmSync } from 'node:fs';

rmSync('dist', { recursive: true, force: true });
console.log('[clean] dist/ removed');
