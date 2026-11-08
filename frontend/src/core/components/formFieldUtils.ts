/** Identifiant à placer dans aria-describedby : message d'erreur en priorité, sinon l'aide. */
export function describedBy(
  id: string,
  error: string | undefined,
  hint?: string,
): string | undefined {
  if (error) return `${id}-error`;
  return hint ? `${id}-hint` : undefined;
}
