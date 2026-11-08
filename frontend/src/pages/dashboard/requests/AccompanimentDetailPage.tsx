import { useParams } from 'react-router';
import { formatFcfa } from '../../../core/utils/formatPrice';
import {
  projectPhaseLabels,
  projectTypeLabels,
} from '../../../modules/accompanimentRequests/schemas/accompanimentSchema';
import { accompanimentApi } from '../../../modules/accompanimentRequests/services/accompanimentService';
import {
  ContactCard,
  RequestDetailShell,
} from '../../../modules/dashboard/components/RequestDetailShell';

export function AccompanimentDetailPage() {
  const { id = '' } = useParams();
  return (
    <RequestDetailShell type="accompaniment" id={id} api={accompanimentApi}>
      {(request) => (
        <>
          <ContactCard customer={request.customer} locationLabel="Lieu du projet" />
          <section
            aria-labelledby="project-title"
            className="space-y-4 rounded-xl border border-forest/10 bg-white p-5"
          >
            <h2 id="project-title" className="text-lg font-bold">
              Projet
            </h2>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-charcoal/60">Type</dt>
                <dd className="font-medium">{projectTypeLabels[request.project.type]}</dd>
              </div>
              <div>
                <dt className="text-charcoal/60">Avancement</dt>
                <dd className="font-medium">{projectPhaseLabels[request.project.phase]}</dd>
              </div>
              <div>
                <dt className="text-charcoal/60">Surface</dt>
                <dd>
                  {request.project.surfaceHectares === null
                    ? '—'
                    : `${String(request.project.surfaceHectares)} ha`}
                </dd>
              </div>
              <div>
                <dt className="text-charcoal/60">Budget global</dt>
                <dd>
                  {request.project.budgetFcfa === null
                    ? '—'
                    : formatFcfa(request.project.budgetFcfa)}
                </dd>
              </div>
            </dl>
            <div>
              <h3 className="text-sm font-semibold">Description</h3>
              <p className="mt-1 whitespace-pre-line text-sm">{request.project.description}</p>
            </div>
            <div>
              <h3 className="text-sm font-semibold">Besoins</h3>
              <p className="mt-1 whitespace-pre-line text-sm">{request.project.needs}</p>
            </div>
          </section>
        </>
      )}
    </RequestDetailShell>
  );
}
