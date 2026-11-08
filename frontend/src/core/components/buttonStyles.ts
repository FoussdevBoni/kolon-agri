import { cn } from '../utils/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'accent' | 'ghost';

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-forest text-ivory hover:bg-forest/90',
  secondary: 'border border-forest/20 bg-white text-forest hover:bg-sand/40',
  accent: 'bg-sand text-charcoal hover:bg-sand/80',
  ghost: 'text-forest hover:bg-forest/5',
};

export function buttonClassName(variant: ButtonVariant = 'primary', className?: string): string {
  return cn(
    'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60',
    variants[variant],
    className,
  );
}
