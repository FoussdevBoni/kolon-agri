const UPLOAD_SEGMENT = '/image/upload/';

/**
 * URL Cloudinary redimensionnée, au format et à la qualité automatiques.
 * Une URL non Cloudinary est renvoyée telle quelle.
 */
export function cloudinaryUrl(url: string, width: number): string {
  const index = url.indexOf(UPLOAD_SEGMENT);
  if (index === -1) return url;
  const prefix = url.slice(0, index + UPLOAD_SEGMENT.length);
  return `${prefix}f_auto,q_auto,c_limit,w_${String(Math.round(width))}/${url.slice(prefix.length)}`;
}

export function cloudinarySrcSet(url: string, widths: readonly number[]): string {
  return widths.map((width) => `${cloudinaryUrl(url, width)} ${String(width)}w`).join(', ');
}
