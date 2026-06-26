import { copyFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const src = join(root, 'pack', 'greeter.pak');
const destDir = join(root, 'modules');
const dest = join(destDir, 'greeter.pak');

mkdirSync(destDir, { recursive: true });
copyFileSync(src, dest);
console.log(`[pack] copied → ${dest}`);
