import { z } from 'zod';
import { requestTypes } from '../../core/requests/requestActivityModel.js';
import { requestListQuerySchema } from '../../core/requests/requestCommon.js';

/** Liste unifiée des demandes (devis, accompagnement, mise en relation). */
export const listRequestsQuerySchema = requestListQuerySchema.extend({
  type: z.enum(requestTypes).optional(),
  /** Statut propre au type ; ignoré par les types qui ne le connaissent pas. */
  status: z.string().trim().max(40).optional(),
});

export const requestSummarySchema = z.object({
  type: z.enum(requestTypes),
  id: z.string(),
  reference: z.string(),
  status: z.string(),
  customerName: z.string(),
  location: z.string(),
  assignee: z.object({ id: z.string(), fullName: z.string() }).nullable(),
  createdAt: z.iso.datetime(),
});

export type ListRequestsQuery = z.infer<typeof listRequestsQuerySchema>;
export type RequestSummaryDto = z.infer<typeof requestSummarySchema>;
