# modular-discord

> **Пример бота:** см. [`example/`](https://github.com/lastangelcry/modular-discord/tree/main/example) — мини-бот со всеми возможностями библиотеки.

Библиотека для модульного Discord-бота: загрузка модулей из папок и `.pak`-архивов, поддержка нескольких СУБД, slash-команды, lifecycle-хуки модулей.

## Установка

```bash
npm install modular-discord discord.js
```

По умолчанию используется **SQLite** (встроен). Для других баз установите нужный драйвер:

```bash
npm install pg          # PostgreSQL
npm install mysql2      # MySQL / MariaDB
npm install mongodb     # MongoDB
```

## Быстрый старт (SQLite)

```ts
import 'dotenv/config';
import { join } from 'node:path';
import { BotCore } from 'modular-discord';

const bot = new BotCore({
  token: process.env.DISCORD_TOKEN!,
  clientId: process.env.DISCORD_CLIENT_ID!,
  modulesPath: join(process.cwd(), 'modules'),
  database: { type: 'sqlite', path: join(process.cwd(), 'data', 'bot.sqlite') },
});

await bot.start();
```

`databasePath` по-прежнему поддерживается как сокращение для SQLite.

## Выбор базы данных

### PostgreSQL

```ts
const bot = new BotCore({
  // ...
  database: {
    type: 'postgres',
    url: process.env.DATABASE_URL!,
  },
});
```

### MySQL

```ts
const bot = new BotCore({
  // ...
  database: {
    type: 'mysql',
    host: 'localhost',
    database: 'mybot',
    user: 'root',
    password: 'secret',
  },
});
```

### MongoDB

Для MongoDB модули получают document-store API вместо SQL:

```ts
import { isDocumentStore } from 'modular-discord';

const bot = new BotCore({
  // ...
  database: {
    type: 'mongodb',
    url: 'mongodb://localhost:27017',
    database: 'mybot',
  },
});

// В модуле:
if (isDocumentStore(ctx.db)) {
  await ctx.db.insertOne('users', { guild_id: '123', xp: 0 });
  const users = await ctx.db.find('users', { guild_id: '123' });
}
```

### Свой драйвер

```ts
database: {
  type: 'custom',
  create: async () => myDatabaseClient,
}
```

## API модулей (SQL)

Методы базы **асинхронные**. Используйте `?` в запросах — для PostgreSQL плейсхолдеры конвертируются автоматически.

```ts
export const module = {
  meta: { id: 'stats', name: 'Stats', description: '...' },
  async onLoad(ctx) {
    const table = ctx.db.table('events');
    await ctx.db.exec(`CREATE TABLE IF NOT EXISTS ${table} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      count INTEGER NOT NULL DEFAULT 0
    )`);
  },
};
```

## Модули

Бот ищет модули в `modulesPath`:

- `modules/my-module.pak` — упакованный модуль (приоритет)
- `modules/my-module/src/index.ts` — разработка из папки

Распакованные `.pak` кэшируются в `data/.module-cache/`.

## Сборка .pak

```bash
npx modular-discord-pack ./path/to/module
```

## Разработка

```bash
npm install
npm run build
```

## Публикация

1. Убедитесь, что вы залогинены: `npm whoami` (иначе `npm login`)
2. Соберите и проверьте tarball:

```bash
npm run build
npm pack --dry-run
```

3. Опубликуйте (при включённой 2FA нужен OTP):

```bash
npm publish --access public
# или с OTP:
npm publish --access public --otp=КОД
```

На npm последний релиз — **1.1.1**.
