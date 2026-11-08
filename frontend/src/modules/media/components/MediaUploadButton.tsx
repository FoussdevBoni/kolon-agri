import { Upload } from 'lucide-react';
import { useId, useRef, useState } from 'react';
import { getErrorMessage } from '../../../core/api/apiError';
import { buttonClassName } from '../../../core/components/buttonStyles';
import { useMediaMutations } from '../hooks/useMedia';
import { ACCEPTED_IMAGE_TYPES, type Media, validateImageFile } from '../schemas/mediaSchema';

interface MediaUploadButtonProps {
  onUploaded?: (media: Media) => void;
  label?: string;
}

/** Téléversement d'une image : contrôle préalable, puis validation définitive par l'API. */
export function MediaUploadButton({
  onUploaded,
  label = 'Téléverser une image',
}: MediaUploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const { upload } = useMediaMutations();
  const [localError, setLocalError] = useState<string | null>(null);

  const onFile = (file: File | undefined) => {
    if (!file) return;
    const error = validateImageFile(file);
    setLocalError(error);
    if (error) return;
    const alt = file.name
      .replace(/\.[^.]+$/, '')
      .replace(/[-_]+/g, ' ')
      .slice(0, 250);
    upload.mutate({ file, alt }, { onSuccess: (media) => onUploaded?.(media) });
  };

  const error = localError ?? (upload.isError ? getErrorMessage(upload.error) : null);

  return (
    <div className="space-y-2">
      <label htmlFor={inputId} className="sr-only">
        {label}
      </label>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES.join(',')}
        className="sr-only"
        onChange={(event) => {
          onFile(event.target.files?.[0]);
          event.target.value = '';
        }}
      />
      <button
        type="button"
        disabled={upload.isPending}
        onClick={() => inputRef.current?.click()}
        className={buttonClassName('secondary')}
      >
        <Upload aria-hidden="true" className="size-4" />
        {upload.isPending ? 'Téléversement…' : label}
      </button>
      <p className="text-xs text-charcoal/60">JPEG, PNG ou WebP, 5 Mo maximum.</p>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
