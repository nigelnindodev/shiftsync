'use client';

import { apiClient } from '@/lib/api-client';
import type { PendingApprovalDto } from '@/types/scheduling';
import { useQuery } from '@tanstack/react-query';

export function usePendingApprovals(locationId: number) {
  return useQuery<PendingApprovalDto[], Error>({
    queryKey: ['pending-approvals', locationId],
    queryFn: () => apiClient.getPendingApprovals(locationId),
    enabled: locationId > 0,
  });
}
