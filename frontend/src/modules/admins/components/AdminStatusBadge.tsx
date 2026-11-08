import { type AccountStatus, statusLabels } from '../../../core/auth/roles';
import { cn } from '../../../core/utils/cn';

const tones: Record<AccountStatus, string> = {
  active: 'bg-leaf/15 text-forest',
  pending: 'bg-sand text-charcoal',
  disabled: 'bg-charcoal/10 text-charcoal/70',
};

export function AdminStatusBadge({ status }: { status: AccountStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
        tones[status],
      )}
    >
      {statusLabels[status]}
    </span>
  );
}
