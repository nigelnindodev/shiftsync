'use client';

import { apiClient } from '@/lib/api-client';
import type { TestingEmployeeDto } from '@/types/scheduling';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export function useTestingEmployees() {
  return useQuery<TestingEmployeeDto[], Error>({
    queryKey: ['testing-employees'],
    queryFn: () => apiClient.getTestingEmployees(),
    staleTime: Infinity,
  });
}

export function useTestingLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (identifier: string) => apiClient.testingLogin(identifier),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useTestingLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.testingLogout(),
    onSuccess: () => {
      queryClient.clear();
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useResetDatabase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.resetDatabase(),
    onSuccess: () => {
      queryClient.clear();
      toast.success('Database reset successfully');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
