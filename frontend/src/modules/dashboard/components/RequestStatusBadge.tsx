import { statusLabel, type TrackedType } from '../../../core/requests/requestSchema';
import { cn } from '../../../core/utils/cn';

const tones: Record<string, string> = {
  new: 'bg-sand text-charcoal',
  closed: 'bg-charcoal/10 text-charcoal/70',
  rejected: 'bg-red-100 text-red-800',
  connected: 'bg-leaf/20 text-forest',
  processed: 'bg-leaf/20 text-forest',
  engaged: 'bg-leaf/20 text-forest',
};

export function RequestStatusBadge({ status, type }: { status: string; type?: TrackedType }) {
  return (
    <span
      className={cn(
        'inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold',
        tones[status] ?? 'bg-forest/10 text-forest',
      )}
    >
      {statusLabel(status, type)}
    </span>
  );
}
