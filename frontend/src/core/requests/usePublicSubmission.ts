import { useMutation } from '@tanstack/react-query';
import { useIdempotencyKey } from '../forms/useIdempotencyKey';
import type { SubmissionResult } from './requestSchema';

/**
 * Envoi d'un formulaire public : clé d'idempotence conservée pour les nouveaux essais d'un même
 * contenu, aucune nouvelle tentative automatique, double clic sans effet pendant l'envoi.
 */
export function usePublicSubmission<P>(
  submit: (payload: P, key: string) => Promise<SubmissionResult>,
) {
  const idempotency = useIdempotencyKey();
  const mutation = useMutation({
    mutationFn: ({ payload, key }: { payload: P; key: string }) => submit(payload, key),
    onSuccess: () => idempotency.reset(),
  });
  return {
    mutation,
    send: (
      payload: P,
      options?: {
        onSuccess?: (result: SubmissionResult) => void;
        onError?: (error: Error) => void;
      },
    ): void => {
      if (mutation.isPending) return;
      mutation.mutate({ payload, key: idempotency.keyFor(payload) }, options);
    },
  };
}
