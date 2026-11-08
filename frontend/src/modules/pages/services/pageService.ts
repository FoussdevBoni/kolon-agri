import { z } from 'zod';
import { apiClient } from '../../../core/api/apiClient';
import {
  type PageDraft,
  pageDraftSchema,
  type PageSeoFormValues,
  type PageSummary,
  pageSummarySchema,
  type PublicPage,
  publicPageSchema,
} from '../schemas/pageSchema';
import type { SectionType } from '../schemas/sectionSchema';

const base = (id: string) => `/pages/${encodeURIComponent(id)}`;

export async function fetchPublishedPage(key: string, signal?: AbortSignal): Promise<PublicPage> {
  const { data } = await apiClient.get(base(key), publicPageSchema, { signal });
  return data;
}

export async function fetchPages(signal?: AbortSignal): Promise<PageSummary[]> {
  const { data } = await apiClient.get('/pages', z.array(pageSummarySchema), { signal });
  return data;
}

export async function fetchPageDraft(id: string, signal?: AbortSignal): Promise<PageDraft> {
  const { data } = await apiClient.get(`${base(id)}/draft`, pageDraftSchema, { signal });
  return data;
}

export async function addSection(
  id: string,
  input: {
    expectedRevision: number;
    type: SectionType;
    data: Record<string, unknown>;
    position?: number;
  },
): Promise<PageDraft> {
  const { data } = await apiClient.post(`${base(id)}/sections`, pageDraftSchema, { body: input });
  return data;
}

export async function updateSection(
  id: string,
  sectionId: string,
  input: { expectedVersion: number; data: Record<string, unknown> },
): Promise<PageDraft> {
  const { data } = await apiClient.patch(
    `${base(id)}/sections/${encodeURIComponent(sectionId)}`,
    pageDraftSchema,
    {
      body: input,
    },
  );
  return data;
}

export async function deleteSection(
  id: string,
  sectionId: string,
  expectedRevision: number,
): Promise<PageDraft> {
  const { data } = await apiClient.delete(
    `${base(id)}/sections/${encodeURIComponent(sectionId)}`,
    pageDraftSchema,
    {
      query: { expectedRevision },
    },
  );
  return data;
}

export async function reorderSections(
  id: string,
  input: { expectedRevision: number; sectionIds: string[] },
): Promise<PageDraft> {
  const { data } = await apiClient.put(`${base(id)}/sections/order`, pageDraftSchema, {
    body: input,
  });
  return data;
}

export async function updateSeo(
  id: string,
  input: { expectedRevision: number; seo: PageSeoFormValues },
): Promise<PageDraft> {
  const { data } = await apiClient.patch(`${base(id)}/seo`, pageDraftSchema, { body: input });
  return data;
}

export async function publishPage(id: string, expectedRevision: number): Promise<PageDraft> {
  const { data } = await apiClient.post(`${base(id)}/publish`, pageDraftSchema, {
    body: { expectedRevision },
  });
  return data;
}

export async function unpublishPage(id: string): Promise<PageDraft> {
  const { data } = await apiClient.post(`${base(id)}/unpublish`, pageDraftSchema);
  return data;
}

export async function restoreVersion(
  id: string,
  number: number,
  expectedRevision: number,
): Promise<PageDraft> {
  const { data } = await apiClient.post(
    `${base(id)}/versions/${String(number)}/restore`,
    pageDraftSchema,
    {
      body: { expectedRevision },
    },
  );
  return data;
}
