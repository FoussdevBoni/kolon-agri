import type { ReactNode } from 'react';
import { Link } from 'react-router';

interface SmartLinkProps {
  href: string;
  className?: string;
  children: ReactNode;
}

/** Lien éditorial : navigation interne pour « /… », lien externe sécurisé sinon. */
export function SmartLink({ href, className, children }: SmartLinkProps) {
  if (href.startsWith('/') && !href.startsWith('//')) {
    return (
      <Link to={href} className={className}>
        {children}
      </Link>
    );
  }
  const external = href.startsWith('https://');
  return (
    <a
      href={href}
      className={className}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    >
      {children}
    </a>
  );
}
