import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCurrentSession } from '../../../core/auth/currentSessionContext';
import type { AdminRole } from '../../../core/auth/roles';
import type { AdminUser } from '../../../core/auth/sessionSchema';
import { sessionQueryKey } from '../../../core/auth/sessionQuery';
import type { AdminListFilters, AdminProfileFormValues } from '../schemas/adminSchema';
import * as adminService from '../services/adminService';

export const adminQueryKeys = {
  all: ['admins'] as const,
  list: (filters: AdminListFilters) => ['admins', 'list', filters] as const,
  detail: (id: string) => ['admins', 'detail', id] as const,
};

export function useAdminList(filters: AdminListFilters) {
  return useQuery({
    queryKey: adminQueryKeys.list(filters),
    queryFn: ({ signal }) => adminService.fetchAdmins(filters, signal),
    placeholderData: keepPreviousData,
  });
}

export function useAdmin(id: string) {
  return useQuery({
    queryKey: adminQueryKeys.detail(id),
    queryFn: ({ signal }) => adminService.fetchAdmin(id, signal),
  });
}

export function useCreateAdmin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: adminService.createAdmin,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: adminQueryKeys.all });
    },
  });
}

/** Mutations d'un compte : met à jour le cache, et la session si le compte modifié est le sien. */
export function useAdminMutations(id: string) {
  const queryClient = useQueryClient();
  const { user } = useCurrentSession();

  const onUpdated = async (admin: AdminUser) => {
    queryClient.setQueryData(adminQueryKeys.detail(id), admin);
    await queryClient.invalidateQueries({ queryKey: [...adminQueryKeys.all, 'list'] });
    if (admin.id === user.id) await queryClient.invalidateQueries({ queryKey: sessionQueryKey });
  };

  return {
    updateProfile: useMutation({
      mutationFn: (values: AdminProfileFormValues) => adminService.updateAdmin(id, values),
      onSuccess: onUpdated,
    }),
    changeRole: useMutation({
      mutationFn: (role: AdminRole) => adminService.changeAdminRole(id, role),
      onSuccess: onUpdated,
    }),
    changeStatus: useMutation({
      mutationFn: (status: 'active' | 'disabled') => adminService.changeAdminStatus(id, status),
      onSuccess: onUpdated,
    }),
    issuePasswordLink: useMutation({
      mutationFn: () => adminService.issuePasswordLink(id),
    }),
  };
}
