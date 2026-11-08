export const MAIN_CONTENT_ID = 'contenu-principal';

export function SkipLink() {
  return (
    <a
      href={`#${MAIN_CONTENT_ID}`}
      className="sr-only z-50 rounded-lg bg-forest px-4 py-2 text-ivory focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
    >
      Aller au contenu
    </a>
  );
}
