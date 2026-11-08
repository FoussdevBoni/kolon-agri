import { z } from 'zod';

export const paginationMetaSchema = z.object({
  page: z.number().int(),
  limit: z.number().int(),
  total: z.number().int(),
  totalPages: z.number().int(),
});

export type PaginationMeta = z.infer<typeof paginationMetaSchema>;

export interface Paginated<T> {
  items: T[];
  meta: PaginationMeta;
}
