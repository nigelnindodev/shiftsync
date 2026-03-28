'use client';

import { apiClient } from '@/lib/api-client';
import type { PendingApprovalDto } from '@/types/scheduling';
import { useQuery } from '@tanstack/react-query';

export function useStaffPendingRequests() {
  return useQuery<PendingApprovalDto[], Error>({
    queryKey: ['staff-pending-requests'],
    queryFn: () => apiClient.getStaffSwapDropRequests(),
  });
}
