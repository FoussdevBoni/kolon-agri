import type { LucideIcon } from 'lucide-react';
import { Inbox } from 'lucide-react';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: ReactNode;
}

export function EmptyState({ title, description, icon: Icon = Inbox, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-forest/20 bg-white px-6 py-12 text-center">
      <Icon aria-hidden="true" className="size-8 text-leaf" />
      <p className="mt-4 font-display text-lg font-semibold">{title}</p>
      {description && <p className="mt-1 max-w-md text-sm text-charcoal/70">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
