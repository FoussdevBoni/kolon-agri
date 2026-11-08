import { LoaderCircle } from 'lucide-react';
import { cn } from '../utils/cn';

interface LoadingStateProps {
  label?: string;
  fullPage?: boolean;
}

export function LoadingState({ label = 'Chargement…', fullPage = false }: LoadingStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'flex items-center justify-center gap-3 p-8 text-sm text-charcoal/70',
        fullPage && 'min-h-dvh',
      )}
    >
      <LoaderCircle aria-hidden="true" className="size-5 text-leaf motion-safe:animate-spin" />
      <span>{label}</span>
    </div>
  );
}
