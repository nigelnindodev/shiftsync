'use client';

import { apiClient } from '@/lib/api-client';
import type { LocationResponseDto, SkillResponseDto } from '@/types/scheduling';
import { useQuery } from '@tanstack/react-query';

export function useLocations() {
  return useQuery<LocationResponseDto[], Error>({
    queryKey: ['locations'],
    queryFn: () => apiClient.getLocations(),
    staleTime: 10 * 60 * 1000,
  });
}

export function useManagerLocations() {
  return useQuery<LocationResponseDto[], Error>({
    queryKey: ['manager-locations'],
    queryFn: () => apiClient.getManagerLocations(),
    staleTime: 10 * 60 * 1000,
  });
}

export function useSkills() {
  return useQuery<SkillResponseDto[], Error>({
    queryKey: ['skills'],
    queryFn: () => apiClient.getSkills(),
    staleTime: 10 * 60 * 1000,
  });
}
