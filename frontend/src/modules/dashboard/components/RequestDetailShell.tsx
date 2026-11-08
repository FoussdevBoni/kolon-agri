import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { getErrorMessage } from '../../../core/api/apiError';
import { ErrorState } from '../../../core/components/ErrorState';
import { LoadingState } from '../../../core/components/LoadingState';
import type { RequestApi } from '../../../core/requests/requestApi';
import {
  type Assignee,
  type TrackedType,
  trackedTypeLabels,
} from '../../../core/requests/requestSchema';
import { useRequestWorkflow } from '../../../core/requests/useRequestWorkflow';
import { formatDateTime } from '../../../core/utils/formatDate';
import { ActivityTimeline, RequestProcessingPanel } from './RequestProcessing';
import { RequestStatusBadge } from './RequestStatusBadge';

interface BaseDetail {
  reference: string;
  status: string;
  allowedTransitions: readonly string[];
  assignee: Assignee;
  createdAt: string;
}

interface CustomerContact {
  name: string;
  phone: string;
  location: string;
  email: string | null;
}

/** Coordonnées du demandeur (données personnelles réservées au traitement). */
export function ContactCard({
  customer,
  locationLabel = 'Localité',
}: {
  customer: CustomerContact;
  locationLabel?: string;
}) {
  return (
    <section
      aria-labelledby="contact-title"
      className="rounded-xl border border-forest/10 bg-white p-5"
    >
      <h2 id="contact-title" className="text-lg font-bold">
        Demandeur
      </h2>
      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-charcoal/60">Nom</dt>
          <dd className="font-medium">{customer.name}</dd>
        </div>
        <div>
          <dt className="text-charcoal/60">Téléphone</dt>
          <dd>
            <a
              href={`tel:${customer.phone.replace(/\s/g, '')}`}
              className="font-medium text-forest hover:underline"
            >
              {customer.phone}
            </a>
          </dd>
        </div>
        <div>
          <dt className="text-charcoal/60">{locationLabel}</dt>
          <dd>{customer.location}</dd>
        </div>
        <div>
          <dt className="text-charcoal/60">Email</dt>
          <dd>
            {customer.email ? (
              <a href={`mailto:${customer.email}`} className="text-forest hover:underline">
                {customer.email}
              </a>
            ) : (
              '—'
            )}
          </dd>
        </div>
      </dl>
    </section>
  );
}

/** Fiche de détail d'une demande : en-tête, contenu propre au type, traitement et historique. */
export function RequestDetailShell<TList, TDetail extends BaseDetail>({
  type,
  id,
  api,
  children,
}: {
  type: TrackedType;
  id: string;
  api: RequestApi<TList, TDetail>;
  children: (detail: TDetail) => ReactNode;
}) {
  const workflow = useRequestWorkflow(type, id, api);
  const { detail } = workflow;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Link
        to={type === 'contact' ? '/dashboard/messages' : `/dashboard/demandes?type=${type}`}
        className="inline-flex items-center gap-2 text-sm font-semibold text-forest"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        {type === 'contact' ? 'Messages' : 'Demandes'}
      </Link>
      {detail.isPending ? (
        <LoadingState
          label={type === 'contact' ? 'Chargement du message…' : 'Chargement de la demande…'}
        />
      ) : detail.isError ? (
        <ErrorState message={getErrorMessage(detail.error)} onRetry={() => void detail.refetch()} />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-mono text-2xl font-extrabold text-forest">
              {detail.data.reference}
            </h1>
            <RequestStatusBadge status={detail.data.status} type={type} />
            <span className="text-sm text-charcoal/70">
              {trackedTypeLabels[type]} · {type === 'contact' ? 'reçu' : 'reçue'} le{' '}
              {formatDateTime(detail.data.createdAt)}
            </span>
          </div>
          <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
            <div className="space-y-6">{children(detail.data)}</div>
            <div className="space-y-6">
              <RequestProcessingPanel
                type={type}
                status={detail.data.status}
                allowedTransitions={detail.data.allowedTransitions}
                assignee={detail.data.assignee}
                changeStatus={workflow.changeStatus}
                assign={workflow.assign}
                onReload={() => {
                  workflow.changeStatus.reset();
                  workflow.assign.reset();
                  void workflow.refresh();
                }}
              />
              <ActivityTimeline
                type={type}
                activities={workflow.activities}
                addNote={workflow.addNote}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
