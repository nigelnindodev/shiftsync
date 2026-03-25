'use client';

import { apiClient } from '@/lib/api-client';
import type { StaffScheduleEntryDto } from '@/types/scheduling';
import { useQuery } from '@tanstack/react-query';

export function useMySchedule(startDate: string, endDate: string) {
  return useQuery<StaffScheduleEntryDto[], Error>({
    queryKey: ['my-schedule', startDate, endDate],
    queryFn: () => apiClient.getMySchedule(startDate, endDate),
    enabled: !!startDate && !!endDate,
  });
}
