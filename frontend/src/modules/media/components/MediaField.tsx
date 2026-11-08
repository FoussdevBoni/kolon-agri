import { ImagePlus } from 'lucide-react';
import { useState } from 'react';
import { buttonClassName } from '../../../core/components/buttonStyles';
import { cloudinaryUrl } from '../../../core/utils/cloudinaryImage';
import { useMediaDetail } from '../hooks/useMedia';
import type { MediaSummary } from '../schemas/mediaSchema';
import { MediaPicker } from './MediaPicker';

interface MediaFieldProps {
  label: string;
  value: string | null;
  onChange: (mediaId: string | null) => void;
  /** Aperçu déjà connu (évite un appel supplémentaire). */
  preview?: MediaSummary | undefined;
  required?: boolean;
  error?: string | undefined;
}

/** Champ « image » : aperçu, choix dans la médiathèque et retrait. */
export function MediaField({
  label,
  value,
  onChange,
  preview,
  required = false,
  error,
}: MediaFieldProps) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<MediaSummary | undefined>(preview);
  const known = selected?.id === value ? selected : preview?.id === value ? preview : undefined;
  const detail = useMediaDetail(value && !known ? value : null);
  const image = known ?? detail.data;

  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">
        {label}
        {!required && <span className="font-normal text-charcoal/60"> (facultatif)</span>}
      </legend>
      <div className="flex items-center gap-4">
        <div className="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-forest/10 bg-ivory">
          {value && image ? (
            <img
              src={cloudinaryUrl(image.url, 200)}
              alt={image.alt}
              className="h-full w-full object-cover"
            />
          ) : (
            <ImagePlus aria-hidden="true" className="size-6 text-charcoal/40" />
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className={buttonClassName('secondary')}
          >
            {value ? 'Changer' : 'Choisir une image'}
          </button>
          {value && !required && (
            <button
              type="button"
              onClick={() => onChange(null)}
              className={buttonClassName('ghost')}
            >
              Retirer
            </button>
          )}
        </div>
      </div>
      {error && <p className="text-sm text-red-700">{error}</p>}
      <MediaPicker
        open={open}
        onClose={() => setOpen(false)}
        onSelect={(media) => {
          setSelected(media);
          onChange(media.id);
        }}
      />
    </fieldset>
  );
}
