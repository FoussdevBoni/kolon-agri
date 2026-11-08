import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { setCsrfToken } from '../../../core/auth/csrfToken';
import { LOGIN_PATH } from '../../../core/auth/RequireAuth';
import type { SessionState } from '../../../core/auth/sessionSchema';
import { sessionQueryKey } from '../../../core/auth/sessionQuery';
import { toAuthenticatedState } from '../../../core/auth/sessionService';
import * as authService from '../services/authService';

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: authService.login,
    meta: { skipSessionExpiry: true },
    onSuccess: (session) => {
      queryClient.setQueryData(sessionQueryKey, toAuthenticatedState(session));
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return useMutation({
    mutationFn: authService.logout,
    meta: { skipSessionExpiry: true },
    // Déconnexion locale même si la session était déjà expirée côté serveur.
    onSettled: async () => {
      await navigate(`${LOGIN_PATH}?raison=deconnexion`, { replace: true });
      setCsrfToken(null);
      queryClient.removeQueries();
      const anonymous: SessionState = { status: 'anonymous', reason: null };
      queryClient.setQueryData(sessionQueryKey, anonymous);
    },
  });
}

export function useSetPassword() {
  return useMutation({
    mutationFn: ({ token, password }: { token: string; password: string }) =>
      authService.setPasswordWithToken(token, password),
    meta: { skipSessionExpiry: true },
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: authService.requestPasswordReset,
    meta: { skipSessionExpiry: true },
  });
}
