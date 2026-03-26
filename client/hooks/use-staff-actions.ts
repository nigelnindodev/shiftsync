'use client';

import { apiClient } from '@/lib/api-client';
import type { RequestSwapDto } from '@/types/scheduling';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export function useRequestSwap() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      assignmentId,
      data,
    }: {
      assignmentId: number;
      data: RequestSwapDto;
    }) => apiClient.requestSwap(assignmentId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-schedule'] });
      toast.success('Swap request sent');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useAcceptSwap() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (assignmentId: number) => apiClient.acceptSwap(assignmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-schedule'] });
      toast.success('Swap accepted');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useRequestDrop() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (assignmentId: number) => apiClient.requestDrop(assignmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-schedule'] });
      toast.success('Drop request sent');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useClaimDrop() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (assignmentId: number) => apiClient.claimDrop(assignmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-schedule'] });
      toast.success('Shift claimed');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
