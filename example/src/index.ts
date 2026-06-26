import 'dotenv/config';
import { join } from 'node:path';
import {
  BotCore,
  discoverModules,
  type BotConfig,
  type DatabaseConfig,
} from 'modular-discord';

const root = process.cwd();
const dataPath = join(root, 'data');
const modulesPath = join(root, 'modules');
const moduleCachePath = join(dataPath, '.module-cache');

function resolveDatabase(): DatabaseConfig {
  const type = process.env.DATABASE_TYPE ?? 'sqlite';

  switch (type) {
    case 'postgres':
      if (!process.env.DATABASE_URL) {
        throw new Error('DATABASE_URL is required when DATABASE_TYPE=postgres');
      }
      return { type: 'postgres', url: process.env.DATABASE_URL };

    case 'mysql':
      if (!process.env.DATABASE_URL) {
        throw new Error('DATABASE_URL is required when DATABASE_TYPE=mysql');
      }
      return { type: 'mysql', url: process.env.DATABASE_URL };

    case 'mongodb':
      if (!process.env.MONGODB_URL) {
        throw new Error('MONGODB_URL is required when DATABASE_TYPE=mongodb');
      }
      return {
        type: 'mongodb',
        url: process.env.MONGODB_URL,
        database: process.env.MONGODB_DATABASE ?? 'modular_discord_example',
      };

    default:
      return { type: 'sqlite', path: join(dataPath, 'bot.sqlite'), wal: true };
  }
}

const config: BotConfig = {
  token: requiredEnv('DISCORD_TOKEN'),
  clientId: requiredEnv('DISCORD_CLIENT_ID'),
  modulesPath,
  dataPath,
  moduleCachePath,
  database: resolveDatabase(),
};

// discoverModules — отдельный API для предпросмотра модулей до запуска ядра
const preview = await discoverModules(modulesPath, moduleCachePath);
console.log(
  '[example] Modules to load:',
  preview.map((m) => `${m.meta.name} (${m.meta.id})`).join(', ') || 'none'
);

const bot = new BotCore(config);

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    void (async () => {
      console.log(`\n[example] ${signal}, stopping…`);
      await bot.stop();
      process.exit(0);
    })();
  });
}

await bot.start();

console.log('[example] Bot is running. Try /settings, /stats, /hello, /storage save');
console.log('[example] Loaded modules:', bot.listModules().map((m) => m.meta.id).join(', '));

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name} in .env (copy .env.example)`);
  }
  return value;
}
