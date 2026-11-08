import { apiClient } from '../../../core/api/apiClient';
import { type HealthStatus, healthStatusSchema } from '../schemas/healthSchema';

export async function fetchHealth(signal?: AbortSignal): Promise<HealthStatus> {
  const { data } = await apiClient.get('/health', healthStatusSchema, { signal });
  return data;
}
