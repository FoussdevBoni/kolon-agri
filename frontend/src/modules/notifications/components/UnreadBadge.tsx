import { cn } from '../../../core/utils/cn';
import { useUnreadNotificationCount } from '../hooks/useNotifications';

/** Pastille du nombre de notifications non lues (navigation), annoncée aux lecteurs d'écran. */
export function UnreadBadge({ className }: { className?: string }) {
  const { data: count = 0 } = useUnreadNotificationCount();
  if (count === 0) return null;
  return (
    <span
      className={cn(
        'inline-flex min-w-5 items-center justify-center rounded-full bg-red-700 px-1.5 text-[11px] leading-5 font-bold text-white',
        className,
      )}
    >
      <span aria-hidden="true">{count > 99 ? '99+' : count}</span>
      <span className="sr-only">
        {count} notification{count > 1 ? 's' : ''} non lue{count > 1 ? 's' : ''}
      </span>
    </span>
  );
}
