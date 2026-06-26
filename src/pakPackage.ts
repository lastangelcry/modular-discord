import { createHash } from 'node:crypto';
import { mkdir, readFile, rm, writeFile, access } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { unzipSync } from 'fflate';

export const PAK_FORMAT_VERSION = 1;
export const PAK_MANIFEST_FILE = 'manifest.json';

export interface PakManifest {
  format: number;
  id: string;
  name: string;
  version: string;
  entry: string;
  description?: string;
  builtAt: string;
}

export interface PreparedPakModule {
  entryPath: string;
  manifest: PakManifest;
  packagePath: string;
}

export async function preparePakModule(
  pakPath: string,
  cacheBasePath: string
): Promise<PreparedPakModule> {
  const archive = await readFile(pakPath);
  const hash = createHash('sha256').update(archive).digest('hex');

  const files = unzipSync(new Uint8Array(archive));
  const manifestData = files[PAK_MANIFEST_FILE];
  if (!manifestData) {
    throw new Error(`Invalid .pak package: missing ${PAK_MANIFEST_FILE}`);
  }

  const manifest = JSON.parse(new TextDecoder().decode(manifestData)) as PakManifest;
  validateManifest(manifest);

  const cacheDir = join(cacheBasePath, manifest.id);
  const hashPath = join(cacheDir, '.source-hash');
  const entryPath = join(cacheDir, manifest.entry);

  const needsExtract = !(await isCacheValid(hashPath, hash, entryPath));

  if (needsExtract) {
    await rm(cacheDir, { recursive: true, force: true });
    await mkdir(cacheDir, { recursive: true });

    for (const [relPath, data] of Object.entries(files)) {
      const outPath = join(cacheDir, relPath);
      await mkdir(dirname(outPath), { recursive: true });
      await writeFile(outPath, data);
    }

    await writeFile(hashPath, hash);
  }

  return { entryPath, manifest, packagePath: pakPath };
}

async function isCacheValid(
  hashPath: string,
  hash: string,
  entryPath: string
): Promise<boolean> {
  try {
    const existingHash = (await readFile(hashPath, 'utf8')).trim();
    if (existingHash !== hash) return false;
    await access(entryPath);
    return true;
  } catch {
    return false;
  }
}

function validateManifest(manifest: PakManifest): void {
  if (manifest.format !== PAK_FORMAT_VERSION) {
    throw new Error(`Unsupported .pak format version: ${manifest.format}`);
  }
  if (!manifest.id || !manifest.entry) {
    throw new Error('Invalid .pak manifest: id and entry are required');
  }
}
