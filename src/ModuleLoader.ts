import { access, readdir } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { preparePakModule } from './pakPackage.js';
import type { LoadedModule, Module } from './types.js';

const MODULE_ENTRY_FILES = ['dist/index.js', 'src/index.ts'];
const PAK_EXTENSION = '.pak';

export async function discoverModules(
  modulesPath: string,
  cachePath?: string
): Promise<LoadedModule[]> {
  const absolutePath = resolve(modulesPath);
  const moduleCachePath = cachePath ?? join(dirname(absolutePath), 'data', '.module-cache');

  let entries: import('node:fs').Dirent[];
  try {
    entries = await readdir(absolutePath, { withFileTypes: true });
  } catch {
    return [];
  }

  const pakIds = new Set(
    entries
      .filter((e) => e.isFile() && e.name.endsWith(PAK_EXTENSION))
      .map((e) => basename(e.name, PAK_EXTENSION))
  );

  const loaded: LoadedModule[] = [];
  const loadedIds = new Set<string>();

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(PAK_EXTENSION)) continue;

    const pakPath = join(absolutePath, entry.name);
    try {
      const prepared = await preparePakModule(pakPath, moduleCachePath);
      const mod = await importModuleEntry(prepared.entryPath);

      if (loadedIds.has(mod.meta.id)) {
        console.warn(`[modules] Skipping "${entry.name}": module id "${mod.meta.id}" already loaded`);
        continue;
      }

      loadedIds.add(mod.meta.id);
      loaded.push({
        meta: mod.meta,
        instance: mod,
        path: prepared.packagePath,
      });
    } catch (err) {
      console.warn(`[modules] Failed to load "${entry.name}":`, err);
    }
  }

  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith('.')) continue;

    if (pakIds.has(entry.name)) {
      console.log(`[modules] Skipping folder "${entry.name}": using ${entry.name}${PAK_EXTENSION}`);
      continue;
    }

    const moduleDir = join(absolutePath, entry.name);
    const imported = await tryLoadDirectoryModule(moduleDir, entry.name);
    if (!imported) continue;

    if (loadedIds.has(imported.meta.id)) {
      console.warn(
        `[modules] Skipping folder "${entry.name}": module id "${imported.meta.id}" already loaded`
      );
      continue;
    }

    loadedIds.add(imported.meta.id);
    loaded.push({
      meta: imported.meta,
      instance: imported,
      path: moduleDir,
    });
  }

  return loaded;
}

async function tryLoadDirectoryModule(moduleDir: string, label: string): Promise<Module | null> {
  const entry = await findEntry(moduleDir);
  if (!entry) {
    console.warn(`[modules] Skipping "${label}": no entry file found`);
    return null;
  }

  try {
    return await importModuleEntry(entry);
  } catch (err) {
    console.warn(`[modules] Failed to load "${label}":`, err);
    return null;
  }
}

async function importModuleEntry(entryPath: string): Promise<Module> {
  const imported = await import(pathToFileURL(entryPath).href);
  const mod: Module | undefined = imported.default ?? imported.module;

  if (!mod?.meta?.id) {
    throw new Error('missing default export with meta.id');
  }

  return mod;
}

async function findEntry(moduleDir: string): Promise<string | null> {
  for (const file of MODULE_ENTRY_FILES) {
    const full = join(moduleDir, file);
    try {
      await access(full);
      return full;
    } catch {
      continue;
    }
  }
  return null;
}
