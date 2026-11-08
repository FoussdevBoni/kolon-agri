import { useParams } from 'react-router';
import { contactMessageApi } from '../../../modules/contactMessages/services/contactMessageService';
import { RequestDetailShell } from '../../../modules/dashboard/components/RequestDetailShell';

export function MessageDetailPage() {
  const { id = '' } = useParams();
  return (
    <RequestDetailShell type="contact" id={id} api={contactMessageApi}>
      {(message) => (
        <>
          <section
            aria-labelledby="sender-title"
            className="rounded-xl border border-forest/10 bg-white p-5"
          >
            <h2 id="sender-title" className="text-lg font-bold">
              Expéditeur
            </h2>
            <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-charcoal/60">Nom</dt>
                <dd className="font-medium">{message.customer.name}</dd>
              </div>
              <div>
                <dt className="text-charcoal/60">Téléphone</dt>
                <dd>
                  {message.customer.phone ? (
                    <a
                      href={`tel:${message.customer.phone.replace(/\s/g, '')}`}
                      className="font-medium text-forest hover:underline"
                    >
                      {message.customer.phone}
                    </a>
                  ) : (
                    '—'
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-charcoal/60">Email</dt>
                <dd className="break-all">
                  {message.customer.email ? (
                    <a
                      href={`mailto:${message.customer.email}?subject=${encodeURIComponent(`Re: ${message.subject} (${message.reference})`)}`}
                      className="text-forest hover:underline"
                    >
                      {message.customer.email}
                    </a>
                  ) : (
                    '—'
                  )}
                </dd>
              </div>
            </dl>
          </section>
          <section
            aria-labelledby="message-title"
            className="space-y-3 rounded-xl border border-forest/10 bg-white p-5"
          >
            <h2 id="message-title" className="text-lg font-bold">
              {message.subject}
            </h2>
            <p className="text-sm whitespace-pre-line">{message.message}</p>
          </section>
        </>
      )}
    </RequestDetailShell>
  );
}
