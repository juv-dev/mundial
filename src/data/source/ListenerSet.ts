/** Lightweight pub/sub helper to avoid duplicating the listener-set pattern across sources. */
export class ListenerSet {
  private listeners = new Set<() => void>()

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  notify(): void {
    for (const l of this.listeners) l()
  }
}
