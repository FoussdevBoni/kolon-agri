import { cloudinarySrcSet, cloudinaryUrl } from '../utils/cloudinaryImage';
import { cn } from '../utils/cn';

export interface ImageSource {
  url: string;
  width: number;
  height: number;
  alt: string;
}

interface ResponsiveImageProps {
  image: ImageSource;
  sizes: string;
  className?: string;
  /** Image principale au-dessus de la ligne de flottaison : chargement prioritaire. */
  priority?: boolean;
  alt?: string;
}

const WIDTHS = [320, 640, 960, 1280, 1920] as const;

/** Image optimisée (srcset Cloudinary, dimensions réservées contre les décalages de mise en page). */
export function ResponsiveImage({
  image,
  sizes,
  className,
  priority = false,
  alt,
}: ResponsiveImageProps) {
  return (
    <img
      src={cloudinaryUrl(image.url, 960)}
      srcSet={cloudinarySrcSet(image.url, WIDTHS)}
      sizes={sizes}
      width={image.width}
      height={image.height}
      alt={alt ?? image.alt}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      className={cn('object-cover', className)}
    />
  );
}
