# Пример бота modular-discord

Мини-бот, демонстрирующий весь функционал библиотеки: модули из папок и `.pak`, slash-команды, SQLite/MongoDB, lifecycle-хуки и слушатели событий.

## Быстрый старт

```bash
cd example
cp .env.example .env
# заполните DISCORD_TOKEN и DISCORD_CLIENT_ID

npm install
npm run pack:greeter   # собрать greeter.pak → modules/
npm start
```

## Что демонстрируется

| API / функция | Где смотреть |
|---------------|--------------|
| `BotCore`, `start()` / `stop()` | `src/index.ts` |
| `BotConfig`: `database`, `dataPath`, `moduleCachePath` | `src/index.ts` |
| `discoverModules()` | `src/index.ts` (предпросмотр до запуска) |
| `/settings` (встроенная команда ядра) | включите/выключите `vault` |
| `onLoad` / `onUnload` | все модули |
| `onEnable` / `onDisable` | `welcome`, `vault` |
| `defaultEnabled: false` | `vault` |
| `ModuleListeners.on` / `.once` | `welcome` |
| `registerCommands` + subcommands | `stats`, `vault`, `storage`, `greeter` |
| Опции: string, boolean, integer, user, choices | `stats` |
| `handleInteraction` | все модули с командами |
| `ctx.db.table()`, SQL CRUD, `transaction` | `stats`, `vault` |
| `isSqlStore` / `isDocumentStore` | `storage` |
| MongoDB: `insertOne`, `find` | `storage` (при `DATABASE_TYPE=mongodb`) |
| Загрузка из папки `modules/*/src` | `welcome`, `stats`, `vault`, `storage` |
| Загрузка из `.pak` | `modules/greeter.pak` ← `pack/greeter` |
| `modular-discord-pack` | `npm run pack:greeter` |

## Модули

### welcome
Слушатели Discord-событий (`GuildMemberAdd`, `MessageCreate` с `once`). Хуки `onEnable` / `onDisable`.

### stats
Slash-команда `/stats` с subcommands и всеми типами опций. SQLite-счётчик с `transaction`.

### vault
Выключен по умолчанию (`defaultEnabled: false`). Включите через `/settings module vault enabled:true`.

### storage
Универсальное хранилище заметок: SQL (`/storage save`, `/storage list`) или MongoDB при смене типа БД.

### greeter (.pak)
Собранный модуль `/hello`. Исходники в `pack/greeter/`, архив — `modules/greeter.pak`.

## Выбор базы данных

По умолчанию SQLite (`data/bot.sqlite`). В `.env`:

```env
DATABASE_TYPE=sqlite   # по умолчанию
# DATABASE_TYPE=postgres
# DATABASE_URL=postgresql://...

# DATABASE_TYPE=mysql
# DATABASE_URL=mysql://...

# DATABASE_TYPE=mongodb
# MONGODB_URL=mongodb://localhost:27017
# MONGODB_DATABASE=modular_discord_example
```

Для postgres/mysql/mongodb установите соответствующий драйвер в корне монорепо или в `example`:

```bash
npm install pg        # postgres
npm install mysql2    # mysql
npm install mongodb   # mongodb
```

> Модули `stats` и `vault` используют SQL. При MongoDB работают `storage`, `welcome`, `greeter` и ядро (`/settings`).

## Команды в Discord

- `/settings list` — список модулей
- `/settings module` — вкл/выкл модуль
- `/stats ping|add|mention|echo|me`
- `/vault set|get` (после включения модуля)
- `/storage save|list`
- `/hello` (из .pak)
