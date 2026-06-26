# modular-discord

Ядро для модульного Discord-бота: загрузка модулей из папок и `.pak`-архивов, SQLite с префиксами таблиц, slash-команды, lifecycle-хуки модулей.

## Установка

```bash
npm install modular-discord discord.js
```

## Быстрый старт

```ts
import 'dotenv/config';
import { join } from 'node:path';
import { BotCore } from 'modular-discord';

const bot = new BotCore({
  token: process.env.DISCORD_TOKEN!,
  clientId: process.env.DISCORD_CLIENT_ID!,
  databasePath: join(process.cwd(), 'data', 'bot.sqlite'),
  modulesPath: join(process.cwd(), 'modules'),
});

await bot.start();
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

```bash
npm publish --otp=КОД
```
