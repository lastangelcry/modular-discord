import type { Client, ClientEvents } from 'discord.js';

type EventHandler<K extends keyof ClientEvents> = (...args: ClientEvents[K]) => void | Promise<void>;

export interface ListenerOptions {
  /** Пропускать обработку, если модуль выключен на сервере (по умолчанию true) */
  checkEnabled?: boolean;
  /** Только события с guildId (по умолчанию true для guild-событий) */
  guildOnly?: boolean;
}

/**
 * Обёртка над client.on с автопроверкой isEnabled и очисткой при выгрузке модуля.
 * Используйте в onLoad, в onUnload вызывается dispose() автоматически ядром.
 */
export class ModuleListeners {
  private readonly disposers: Array<() => void> = [];

  constructor(
    private readonly client: Client,
    private readonly isEnabled: (guildId: string) => boolean,
    readonly moduleId: string
  ) {}

  on<K extends keyof ClientEvents>(
    event: K,
    handler: EventHandler<K>,
    options: ListenerOptions = {}
  ): void {
    const { checkEnabled = true, guildOnly = true } = options;

    const wrapped = ((...args: ClientEvents[K]) => {
      const guildId = extractGuildId(args);
      if (guildOnly && !guildId) return;
      if (checkEnabled && guildId && !this.isEnabled(guildId)) return;
      return handler(...args);
    }) as EventHandler<K>;

    this.client.on(event, wrapped);
    this.disposers.push(() => this.client.off(event, wrapped));
  }

  once<K extends keyof ClientEvents>(
    event: K,
    handler: EventHandler<K>,
    options: ListenerOptions = {}
  ): void {
    const { checkEnabled = true, guildOnly = true } = options;

    const wrapped = ((...args: ClientEvents[K]) => {
      const guildId = extractGuildId(args);
      if (guildOnly && !guildId) return;
      if (checkEnabled && guildId && !this.isEnabled(guildId)) return;
      return handler(...args);
    }) as EventHandler<K>;

    this.client.once(event, wrapped);
    this.disposers.push(() => this.client.off(event, wrapped));
  }

  dispose(): void {
    for (const off of this.disposers.splice(0)) {
      off();
    }
  }
}

function extractGuildId(args: unknown[]): string | null {
  const first = args[0];
  if (!first || typeof first !== 'object') return null;

  if ('guildId' in first && typeof first.guildId === 'string') {
    return first.guildId;
  }
  if ('guild' in first) {
    const guild = (first as { guild: { id: string } | null }).guild;
    return guild?.id ?? null;
  }
  return null;
}
