'use client';

import { apiClient } from '@/lib/api-client';
import type {
  StaffAvailabilityExceptionResponseDto,
  StaffAvailabilityResponseDto,
  UpsertAvailabilityDto,
  UpsertExceptionDto,
} from '@/types/scheduling';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export function useAvailability(staffId: number) {
  return useQuery<StaffAvailabilityResponseDto[], Error>({
    queryKey: ['availability', staffId],
    queryFn: () => apiClient.getAvailability(staffId),
    enabled: staffId > 0,
  });
}

export function useAvailabilityExceptions(
  staffId: number,
  startDate: string,
  endDate: string,
) {
  return useQuery<StaffAvailabilityExceptionResponseDto[], Error>({
    queryKey: ['availability-exceptions', staffId, startDate, endDate],
    queryFn: () =>
      apiClient.getAvailabilityExceptions(staffId, startDate, endDate),
    enabled: staffId > 0 && !!startDate && !!endDate,
  });
}

export function useUpsertAvailability() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpsertAvailabilityDto) =>
      apiClient.upsertAvailability(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['availability'] });
      toast.success('Availability saved');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteAvailability() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (availabilityId: number) =>
      apiClient.deleteAvailability(availabilityId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['availability'] });
      toast.success('Availability removed');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpsertException() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpsertExceptionDto) => apiClient.upsertException(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['availability-exceptions'] });
      toast.success('Exception saved');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteException() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (exceptionId: number) => apiClient.deleteException(exceptionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['availability-exceptions'] });
      toast.success('Exception removed');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
