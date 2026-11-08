import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AdminService, ServiceFormValues } from '../schemas/serviceSchema';
import * as serviceService from '../services/serviceService';

export const serviceQueryKeys = {
  all: ['services'] as const,
  public: ['services', 'public'] as const,
  admin: ['services', 'admin'] as const,
  adminDetail: (id: string) => ['services', 'admin', id] as const,
};

export function usePublicServices() {
  return useQuery({
    queryKey: serviceQueryKeys.public,
    queryFn: ({ signal }) => serviceService.fetchPublicServices(signal),
  });
}

export function useAdminServices() {
  return useQuery({
    queryKey: serviceQueryKeys.admin,
    queryFn: ({ signal }) => serviceService.fetchAdminServices(signal),
  });
}

export function useAdminService(id: string | undefined) {
  return useQuery({
    queryKey: serviceQueryKeys.adminDetail(id ?? ''),
    queryFn: ({ signal }) => serviceService.fetchAdminService(id ?? '', signal),
    enabled: Boolean(id),
  });
}

export function useServiceMutations() {
  const queryClient = useQueryClient();
  const onSaved = async (service?: AdminService) => {
    if (service) queryClient.setQueryData(serviceQueryKeys.adminDetail(service.id), service);
    await queryClient.invalidateQueries({ queryKey: serviceQueryKeys.all });
  };
  return {
    create: useMutation({ mutationFn: serviceService.createService, onSuccess: onSaved }),
    update: useMutation({
      mutationFn: ({ id, values }: { id: string; values: ServiceFormValues }) =>
        serviceService.updateService(id, values),
      onSuccess: onSaved,
    }),
    setPublication: useMutation({
      mutationFn: ({ id, published }: { id: string; published: boolean }) =>
        serviceService.setServicePublication(id, published),
      onSuccess: onSaved,
    }),
    reorder: useMutation({
      mutationFn: serviceService.reorderServices,
      onSuccess: () => onSaved(),
    }),
    remove: useMutation({ mutationFn: serviceService.deleteService, onSuccess: () => onSaved() }),
  };
}
