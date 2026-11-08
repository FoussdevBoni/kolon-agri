interface LocationParts {
  pathname: string;
  search: string;
  hash: string;
}

const ENCODED_HASH = '%23';

/**
 * Certains terminaux et clients de messagerie encodent le « # » d'un lien en « %23 » à
 * l'ouverture : `/definir-mot-de-passe#token=…` devient `/definir-mot-de-passe%23token=…`,
 * qui ne correspond plus à aucune route. Renvoie l'URL rétablie, ou null si rien à corriger.
 */
export function recoverEncodedFragment({ pathname, search, hash }: LocationParts): string | null {
  if (hash) return null;
  const index = pathname.toUpperCase().indexOf(ENCODED_HASH);
  if (index === -1) return null;
  try {
    const fragment = decodeURIComponent(pathname.slice(index + ENCODED_HASH.length));
    return `${pathname.slice(0, index)}${search}#${fragment}`;
  } catch {
    return null;
  }
}
