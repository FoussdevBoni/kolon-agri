import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { getErrorMessage } from '../../../core/api/apiError';
import { buttonClassName } from '../../../core/components/buttonStyles';
import { ConfirmDialog } from '../../../core/components/ConfirmDialog';
import { FormField, inputClassName } from '../../../core/components/FormField';
import { formatDateTime } from '../../../core/utils/formatDate';
import {
  ContactCard,
  RequestDetailShell,
} from '../../../modules/dashboard/components/RequestDetailShell';
import { useMatchingAssociations } from '../../../modules/matchingRequests/hooks/useMatchingAssociations';
import {
  type Association,
  associationStatuses,
  associationStatusLabels,
  type AssociationStatus,
  type MatchingDetail,
} from '../../../modules/matchingRequests/schemas/matchingSchema';
import { matchingApi } from '../../../modules/matchingRequests/services/matchingService';
import { usePartnerList } from '../../../modules/partners/hooks/usePartners';
import { partnerCategoryLabels } from '../../../modules/partners/schemas/partnerSchema';

function AddPartner({ request }: { request: MatchingDetail }) {
  const [search, setSearch] = useState('');
  const [partnerId, setPartnerId] = useState('');
  const [note, setNote] = useState('');
  const { associate } = useMatchingAssociations(request.id);
  // Seuls les partenaires actifs et non archivés sont proposés (règle vérifiée aussi par l'API).
  const partners = usePartnerList({
    page: 1,
    search,
    category: request.needCategory,
    region: '',
    status: 'active',
    archived: false,
    limit: 50,
  });
  const alreadyActive = new Set(
    request.associations.filter((item) => item.active).map((item) => item.partner.id),
  );
  const options = (partners.data?.items ?? []).filter((partner) => !alreadyActive.has(partner.id));

  return (
    <form
      className="space-y-3 rounded-lg border border-forest/10 bg-ivory/60 p-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (!partnerId) return;
        associate.mutate(
          { partnerId, note: note.trim() },
          {
            onSuccess: () => {
              setPartnerId('');
              setNote('');
            },
          },
        );
      }}
    >
      <h3 className="text-sm font-semibold">Associer un partenaire de l’annuaire</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField
          id="partner-search"
          label={`Rechercher (${partnerCategoryLabels[request.needCategory]})`}
        >
          <input
            id="partner-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className={inputClassName}
          />
        </FormField>
        <FormField id="partner-choice" label="Partenaire actif">
          <select
            id="partner-choice"
            value={partnerId}
            onChange={(event) => setPartnerId(event.target.value)}
            className={inputClassName}
          >
            <option value="">
              {partners.isPending
                ? 'Chargement…'
                : options.length
                  ? 'Choisir…'
                  : 'Aucun partenaire disponible'}
            </option>
            {options.map((partner) => (
              <option key={partner.id} value={partner.id}>
                {partner.name}
                {partner.regions.length ? ` — ${partner.regions.join(', ')}` : ''}
              </option>
            ))}
          </select>
        </FormField>
      </div>
      <FormField id="association-note" label="Note interne (facultatif)">
        <input
          id="association-note"
          value={note}
          maxLength={2000}
          onChange={(event) => setNote(event.target.value)}
          className={inputClassName}
        />
      </FormField>
      {associate.isError && (
        <p role="alert" className="text-sm text-red-700">
          {getErrorMessage(associate.error)}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={!partnerId || associate.isPending || request.status === 'closed'}
          className={buttonClassName('primary')}
        >
          <Plus aria-hidden="true" className="size-4" />
          Associer
        </button>
        <Link
          to="/dashboard/partners/nouveau"
          className="text-sm font-semibold text-forest hover:underline"
        >
          Créer une fiche partenaire
        </Link>
      </div>
    </form>
  );
}

function AssociationsPanel({ request }: { request: MatchingDetail }) {
  const { update, remove } = useMatchingAssociations(request.id);
  const [toRemove, setToRemove] = useState<Association | null>(null);
  const active = request.associations.filter((item) => item.active);
  const removed = request.associations.filter((item) => !item.active);
  const error = update.error ?? remove.error;

  return (
    <section
      aria-labelledby="associations-title"
      className="space-y-4 rounded-xl border border-forest/10 bg-white p-5"
    >
      <h2 id="associations-title" className="text-lg font-bold">
        Partenaires associés
      </h2>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {getErrorMessage(error)}
        </p>
      )}
      {active.length === 0 ? (
        <p className="text-sm text-charcoal/60">Aucun partenaire associé pour le moment.</p>
      ) : (
        <ul className="space-y-3">
          {active.map((association) => (
            <li key={association.id} className="rounded-lg border border-forest/10 p-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link
                    to={`/dashboard/partners/${association.partner.id}`}
                    className="font-semibold text-forest hover:underline"
                  >
                    {association.partner.name}
                  </Link>
                  <p className="text-xs text-charcoal/60">
                    {[
                      association.partner.contactName,
                      association.partner.phone,
                      association.partner.email,
                    ]
                      .filter(Boolean)
                      .join(' · ') || 'Coordonnées non renseignées'}
                    {association.partner.status === 'inactive' && ' · partenaire désactivé'}
                  </p>
                  {association.note && <p className="mt-1 text-sm">{association.note}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <label className="sr-only" htmlFor={`association-${association.id}`}>
                    Statut de l’association avec {association.partner.name}
                  </label>
                  <select
                    id={`association-${association.id}`}
                    value={association.status}
                    disabled={update.isPending}
                    onChange={(event) =>
                      update.mutate({
                        assignmentId: association.id,
                        status: event.target.value as AssociationStatus,
                      })
                    }
                    className={`${inputClassName} w-48`}
                  >
                    {associationStatuses.map((status) => (
                      <option key={status} value={status}>
                        {associationStatusLabels[status]}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setToRemove(association)}
                    aria-label={`Retirer ${association.partner.name}`}
                    className={buttonClassName('ghost', 'px-3 text-red-700 hover:bg-red-50')}
                  >
                    <Trash2 aria-hidden="true" className="size-4" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      {request.status !== 'closed' && <AddPartner request={request} />}
      {removed.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer font-semibold">
            Associations retirées ({removed.length})
          </summary>
          <ul className="mt-2 space-y-1 text-charcoal/70">
            {removed.map((association) => (
              <li key={association.id}>
                {association.partner.name} — {associationStatusLabels[association.status]}, retirée
                le {formatDateTime(association.removedAt)}
              </li>
            ))}
          </ul>
        </details>
      )}
      <ConfirmDialog
        open={toRemove !== null}
        title="Retirer l’association"
        description={`${toRemove?.partner.name ?? ''} ne sera plus associé à cette demande. L’historique est conservé.`}
        confirmLabel="Retirer"
        tone="danger"
        pending={remove.isPending}
        onCancel={() => setToRemove(null)}
        onConfirm={() => {
          if (toRemove) remove.mutate(toRemove.id, { onSettled: () => setToRemove(null) });
        }}
      />
    </section>
  );
}

export function MatchingDetailPage() {
  const { id = '' } = useParams();
  return (
    <RequestDetailShell type="matching" id={id} api={matchingApi}>
      {(request) => (
        <>
          <ContactCard customer={request.customer} />
          <section
            aria-labelledby="need-title"
            className="space-y-2 rounded-xl border border-forest/10 bg-white p-5"
          >
            <h2 id="need-title" className="text-lg font-bold">
              Besoin exprimé
            </h2>
            <p className="text-sm font-medium">{partnerCategoryLabels[request.needCategory]}</p>
            <p className="whitespace-pre-line text-sm">{request.description}</p>
            {request.timeframe && (
              <p className="text-sm text-charcoal/70">Échéance : {request.timeframe}</p>
            )}
          </section>
          <AssociationsPanel request={request} />
        </>
      )}
    </RequestDetailShell>
  );
}
