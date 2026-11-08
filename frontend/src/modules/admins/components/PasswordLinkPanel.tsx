import { Check, Copy, KeyRound, MailCheck } from 'lucide-react';
import { useId, useState } from 'react';
import { buttonClassName } from '../../../core/components/buttonStyles';
import { inputClassName } from '../../../core/components/FormField';
import { formatDateTime } from '../../../core/utils/formatDate';
import type { PasswordLink } from '../schemas/adminSchema';

type DisplayedLink = Extract<PasswordLink, { delivery: 'link' }>;

/**
 * Lien d'invitation ou de réinitialisation : confirmation d'envoi par email lorsque l'envoi est
 * configuré, sinon affichage unique du lien à transmettre au titulaire.
 */
export function PasswordLinkPanel({ link }: { link: PasswordLink }) {
  if (link.delivery === 'email') {
    const title = link.purpose === 'invitation' ? 'Invitation envoyée' : 'Lien envoyé';
    return (
      <section
        role="status"
        aria-label={title}
        className="rounded-xl border border-leaf/30 bg-leaf/5 p-4 sm:p-5"
      >
        <div className="flex items-start gap-3">
          <MailCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-forest" />
          <div>
            <p className="font-semibold">{title}</p>
            <p className="text-sm break-all text-charcoal/75">
              Un email contenant un lien à usage unique part vers {link.email}. Le lien n’est jamais
              affiché ici.
            </p>
          </div>
        </div>
      </section>
    );
  }
  return <DisplayedLinkPanel link={link} />;
}

function DisplayedLinkPanel({ link }: { link: DisplayedLink }) {
  const [copied, setCopied] = useState(false);
  const inputId = useId();
  const title = link.purpose === 'invitation' ? 'Lien d’invitation' : 'Lien de réinitialisation';

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link.url);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section aria-label={title} className="rounded-xl border border-leaf/30 bg-leaf/5 p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <KeyRound aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-forest" />
        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <p className="font-semibold">{title}</p>
            <p className="text-sm text-charcoal/75">
              À transmettre au titulaire par un canal sûr. Usage unique, valable jusqu’au{' '}
              {formatDateTime(link.expiresAt)}. Il ne sera plus affiché ensuite.
            </p>
          </div>
          <label htmlFor={inputId} className="sr-only">
            {title}
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              id={inputId}
              readOnly
              value={link.url}
              onFocus={(event) => event.currentTarget.select()}
              className={`${inputClassName} font-mono text-xs`}
            />
            <button
              type="button"
              onClick={() => void copy()}
              className={buttonClassName('secondary', 'shrink-0')}
            >
              {copied ? (
                <Check aria-hidden="true" className="size-4" />
              ) : (
                <Copy aria-hidden="true" className="size-4" />
              )}
              {copied ? 'Copié' : 'Copier'}
            </button>
          </div>
          <p aria-live="polite" className="sr-only">
            {copied ? 'Lien copié dans le presse-papiers' : ''}
          </p>
        </div>
      </div>
    </section>
  );
}
