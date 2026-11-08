import { useCallback, useRef } from 'react';

/**
 * Clé d'idempotence par soumission logique : la même clé est réutilisée lors d'un nouvel essai
 * avec un contenu identique (reprise réseau), une nouvelle clé est générée si le contenu change.
 */
export function useIdempotencyKey() {
  const current = useRef<{ key: string; payload: string } | null>(null);

  const keyFor = useCallback((payload: unknown): string => {
    const serialized = JSON.stringify(payload);
    if (current.current?.payload !== serialized) {
      current.current = { key: crypto.randomUUID(), payload: serialized };
    }
    return current.current.key;
  }, []);

  /** À appeler après un succès : la soumission suivante est une nouvelle soumission logique. */
  const reset = useCallback(() => {
    current.current = null;
  }, []);

  return { keyFor, reset };
}
