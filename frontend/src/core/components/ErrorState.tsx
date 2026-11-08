import { CircleAlert } from 'lucide-react';
import { buttonClassName } from './buttonStyles';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = 'Une erreur est survenue',
  message,
  onRetry,
}: ErrorStateProps) {
  return (
    <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-900">
      <div className="flex items-start gap-3">
        <CircleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
        <div className="space-y-3">
          <div>
            <p className="font-semibold">{title}</p>
            <p className="text-sm">{message}</p>
          </div>
          {onRetry && (
            <button type="button" onClick={onRetry} className={buttonClassName('secondary')}>
              Réessayer
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
