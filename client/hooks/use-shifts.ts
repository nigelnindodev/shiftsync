'use client';

import { apiClient } from '@/lib/api-client';
import type { CreateShiftDto, ShiftResponseDto } from '@/types/scheduling';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export function useShifts(
  locationId: number,
  startDate: string,
  endDate: string,
) {
  return useQuery<ShiftResponseDto[], Error>({
    queryKey: ['shifts', locationId, startDate, endDate],
    queryFn: () => apiClient.getShifts(locationId, startDate, endDate),
    enabled: locationId > 0 && !!startDate && !!endDate,
  });
}

export function useShift(shiftId: number) {
  return useQuery<ShiftResponseDto, Error>({
    queryKey: ['shift', shiftId],
    queryFn: () => apiClient.getShift(shiftId),
    enabled: shiftId > 0,
  });
}

export function useCreateShift() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateShiftDto) => apiClient.createShift(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      toast.success('Shift created');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useCancelShift() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (shiftId: number) => apiClient.cancelShift(shiftId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      toast.success('Shift cancelled');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
