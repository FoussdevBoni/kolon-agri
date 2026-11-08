import { z } from 'zod';
import { apiClient } from '../../../core/api/apiClient';
import { type Paginated, paginationMetaSchema } from '../../../core/api/paginationSchema';
import {
  type Media,
  type MediaDetail,
  mediaDetailSchema,
  mediaSchema,
} from '../schemas/mediaSchema';

export const MEDIA_PAGE_SIZE = 24;

export async function fetchMediaPage(
  params: { page: number; search: string },
  signal?: AbortSignal,
): Promise<Paginated<Media>> {
  const { data, meta } = await apiClient.get('/media', z.array(mediaSchema), {
    signal,
    query: { page: params.page, limit: MEDIA_PAGE_SIZE, search: params.search || undefined },
  });
  return { items: data, meta: paginationMetaSchema.parse(meta) };
}

export async function fetchMedia(id: string, signal?: AbortSignal): Promise<MediaDetail> {
  const { data } = await apiClient.get(`/media/${encodeURIComponent(id)}`, mediaDetailSchema, {
    signal,
  });
  return data;
}

export async function uploadMedia(file: File, alt: string): Promise<Media> {
  const { data } = await apiClient.post('/media', mediaSchema, {
    body: file,
    query: { alt, filename: file.name.slice(0, 200) },
  });
  return data;
}

export async function updateMediaAlt(id: string, alt: string): Promise<Media> {
  const { data } = await apiClient.patch(`/media/${encodeURIComponent(id)}`, mediaSchema, {
    body: { alt },
  });
  return data;
}

export async function deleteMedia(id: string): Promise<void> {
  await apiClient.delete(`/media/${encodeURIComponent(id)}`, z.null());
}
