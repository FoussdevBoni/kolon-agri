/** Analyse l'en-tête Cookie ; la première occurrence d'un nom l'emporte. */
export function parseCookies(header: string | undefined): Map<string, string> {
  const cookies = new Map<string, string>();
  if (!header) return cookies;
  for (const part of header.split(';')) {
    const separator = part.indexOf('=');
    if (separator <= 0) continue;
    const name = part.slice(0, separator).trim();
    if (!name || cookies.has(name)) continue;
    let value = part.slice(separator + 1).trim();
    if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    try {
      cookies.set(name, decodeURIComponent(value));
    } catch {
      // Valeur mal encodée : ignorée.
    }
  }
  return cookies;
}
