'use client';

import { apiClient } from '@/lib/api-client';
import type { CreateStaffDto, StaffLocationDto } from '@/types/scheduling';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export function useStaffForLocation(locationId: number) {
  return useQuery<StaffLocationDto[], Error>({
    queryKey: ['location-staff', locationId],
    queryFn: () => apiClient.getStaffForLocation(locationId),
    enabled: locationId > 0,
  });
}

export function useCreateStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      locationId,
      data,
    }: {
      locationId: number;
      data: CreateStaffDto;
    }) => apiClient.createStaff(locationId, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['location-staff', variables.locationId],
      });
      toast.success('Staff member created');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
