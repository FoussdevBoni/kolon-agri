import { z } from 'zod';
import { apiClient } from '../../../core/api/apiClient';
import { type AuthSession, authSessionSchema } from '../../../core/auth/sessionSchema';
import type { LoginFormValues } from '../schemas/authFormSchema';

export async function login(values: LoginFormValues): Promise<AuthSession> {
  const { data } = await apiClient.post('/auth/login', authSessionSchema, { body: values });
  return data;
}

export async function logout(): Promise<void> {
  await apiClient.post('/auth/logout', z.null());
}

export async function setPasswordWithToken(token: string, password: string): Promise<void> {
  await apiClient.post('/auth/reset-password', z.null(), { body: { token, password } });
}

/** Réponse identique que le compte existe ou non (aucune énumération des comptes). */
export async function requestPasswordReset(email: string): Promise<void> {
  await apiClient.post('/auth/forgot-password', z.object({ accepted: z.literal(true) }), {
    body: { email },
  });
}
