export interface AttemptLimiterOptions {
  maxAttempts: number;
  windowMs: number;
  /** Nombre maximal de clés suivies, pour borner la mémoire. */
  maxEntries?: number;
}

interface Entry {
  count: number;
  resetAt: number;
}

/**
 * Compteur d'échecs à fenêtre fixe, en mémoire du processus.
 * Limite : non partagé entre plusieurs instances de l'API.
 */
export class AttemptLimiter {
  private readonly entries = new Map<string, Entry>();
  private readonly options: Required<AttemptLimiterOptions>;
  private readonly now: () => number;

  constructor(options: AttemptLimiterOptions, now: () => number = Date.now) {
    this.options = { maxEntries: 10_000, ...options };
    this.now = now;
  }

  /** Délai restant avant une nouvelle tentative, 0 si la clé n'est pas bloquée. */
  getRetryAfterMs(key: string): number {
    const entry = this.getActiveEntry(key);
    if (!entry || entry.count < this.options.maxAttempts) return 0;
    return entry.resetAt - this.now();
  }

  registerFailure(key: string): void {
    const entry = this.getActiveEntry(key);
    if (entry) {
      entry.count += 1;
      return;
    }
    this.prune();
    this.entries.set(key, { count: 1, resetAt: this.now() + this.options.windowMs });
  }

  reset(key: string): void {
    this.entries.delete(key);
  }

  clear(): void {
    this.entries.clear();
  }

  private getActiveEntry(key: string): Entry | undefined {
    const entry = this.entries.get(key);
    if (entry && entry.resetAt <= this.now()) {
      this.entries.delete(key);
      return undefined;
    }
    return entry;
  }

  private prune(): void {
    if (this.entries.size < this.options.maxEntries) return;
    const now = this.now();
    for (const [key, entry] of this.entries) {
      if (entry.resetAt <= now) this.entries.delete(key);
    }
    // Map conserve l'ordre d'insertion : on retire les clés les plus anciennes.
    for (const key of this.entries.keys()) {
      if (this.entries.size < this.options.maxEntries) break;
      this.entries.delete(key);
    }
  }
}
