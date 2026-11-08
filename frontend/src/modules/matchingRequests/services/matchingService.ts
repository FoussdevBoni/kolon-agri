import { z } from 'zod';
import { apiClient } from '../../../core/api/apiClient';
import { createRequestApi, submitPublicRequest } from '../../../core/requests/requestApi';
import type { SubmissionResult } from '../../../core/requests/requestSchema';
import {
  type Association,
  associationSchema,
  type AssociationStatus,
  matchingDetailSchema,
  matchingListItemSchema,
  type toMatchingPayload,
} from '../schemas/matchingSchema';

export function submitMatching(
  payload: ReturnType<typeof toMatchingPayload>,
  key: string,
): Promise<SubmissionResult> {
  return submitPublicRequest('/matching-requests', payload, key);
}

export const matchingApi = createRequestApi(
  '/matching-requests',
  matchingListItemSchema,
  matchingDetailSchema,
);

const partnersPath = (id: string) => `/matching-requests/${encodeURIComponent(id)}/partners`;

export async function associatePartner(
  id: string,
  partnerId: string,
  note: string,
): Promise<Association[]> {
  return (
    await apiClient.post(partnersPath(id), z.array(associationSchema), {
      body: { partnerId, note },
    })
  ).data;
}

export async function updateAssociation(
  id: string,
  assignmentId: string,
  changes: { status?: AssociationStatus; note?: string },
): Promise<Association[]> {
  return (
    await apiClient.patch(
      `${partnersPath(id)}/${encodeURIComponent(assignmentId)}`,
      z.array(associationSchema),
      {
        body: changes,
      },
    )
  ).data;
}

export async function removeAssociation(id: string, assignmentId: string): Promise<Association[]> {
  return (
    await apiClient.delete(
      `${partnersPath(id)}/${encodeURIComponent(assignmentId)}`,
      z.array(associationSchema),
    )
  ).data;
}
