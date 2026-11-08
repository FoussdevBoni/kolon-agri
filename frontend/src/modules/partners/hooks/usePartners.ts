import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Partner, PartnerFormValues } from '../schemas/partnerSchema';
import * as partnerService from '../services/partnerService';
import type { PartnerFilters } from '../services/partnerService';

export const partnerQueryKeys = {
  all: ['partners'] as const,
  list: (filters: PartnerFilters) => ['partners', 'list', filters] as const,
  detail: (id: string) => ['partners', 'detail', id] as const,
};

export function usePartnerList(filters: PartnerFilters, enabled = true) {
  return useQuery({
    queryKey: partnerQueryKeys.list(filters),
    queryFn: ({ signal }) => partnerService.fetchPartners(filters, signal),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function usePartner(id: string | undefined) {
  return useQuery({
    queryKey: partnerQueryKeys.detail(id ?? ''),
    queryFn: ({ signal }) => partnerService.fetchPartner(id ?? '', signal),
    enabled: Boolean(id),
  });
}

export function usePartnerMutations() {
  const queryClient = useQueryClient();
  const onSaved = async (partner: Partner) => {
    queryClient.setQueryData(partnerQueryKeys.detail(partner.id), partner);
    await queryClient.invalidateQueries({ queryKey: partnerQueryKeys.all });
  };
  return {
    create: useMutation({ mutationFn: partnerService.createPartner, onSuccess: onSaved }),
    update: useMutation({
      mutationFn: ({ id, values }: { id: string; values: PartnerFormValues }) =>
        partnerService.updatePartner(id, values),
      onSuccess: onSaved,
    }),
    setStatus: useMutation({
      mutationFn: ({ id, status }: { id: string; status: 'active' | 'inactive' }) =>
        partnerService.setPartnerStatus(id, status),
      onSuccess: onSaved,
    }),
    archive: useMutation({ mutationFn: partnerService.archivePartner, onSuccess: onSaved }),
  };
}
