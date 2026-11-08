import { useMutation, useQueryClient } from '@tanstack/react-query';
import { requestQueryKeys } from '../../../core/requests/useRequestWorkflow';
import type { AssociationStatus } from '../schemas/matchingSchema';
import * as matchingService from '../services/matchingService';

/** Associations partenaires d'une demande : détail et historique rafraîchis après chaque action. */
export function useMatchingAssociations(id: string) {
  const queryClient = useQueryClient();
  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: requestQueryKeys.detail('matching', id) });
    await queryClient.invalidateQueries({ queryKey: requestQueryKeys.activities('matching', id) });
  };
  return {
    associate: useMutation({
      mutationFn: ({ partnerId, note }: { partnerId: string; note: string }) =>
        matchingService.associatePartner(id, partnerId, note),
      onSuccess: refresh,
    }),
    update: useMutation({
      mutationFn: ({ assignmentId, status }: { assignmentId: string; status: AssociationStatus }) =>
        matchingService.updateAssociation(id, assignmentId, { status }),
      onSuccess: refresh,
    }),
    remove: useMutation({
      mutationFn: (assignmentId: string) => matchingService.removeAssociation(id, assignmentId),
      onSuccess: refresh,
    }),
  };
}
