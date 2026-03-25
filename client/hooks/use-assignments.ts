'use client';

import { apiClient } from '@/lib/api-client';
import type {
  ApproveSwapDropDto,
  CreateAssignmentDto,
  EligibleStaffDto,
  SlotAssignmentsResponseDto,
} from '@/types/scheduling';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export function useAssignments(shiftId: number, slotId: number) {
  return useQuery<SlotAssignmentsResponseDto, Error>({
    queryKey: ['assignments', shiftId, slotId],
    queryFn: () => apiClient.getAssignments(shiftId, slotId),
    enabled: shiftId > 0 && slotId > 0,
  });
}

export function useEligibleStaff(shiftId: number, slotId: number) {
  return useQuery<EligibleStaffDto[], Error>({
    queryKey: ['eligible-staff', shiftId, slotId],
    queryFn: () => apiClient.getEligibleStaff(shiftId, slotId),
    enabled: shiftId > 0 && slotId > 0,
  });
}

export function useAssignStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      shiftId,
      slotId,
      data,
    }: {
      shiftId: number;
      slotId: number;
      data: CreateAssignmentDto;
    }) => apiClient.assignStaff(shiftId, slotId, data),
    onSuccess: (_, { shiftId, slotId }) => {
      queryClient.invalidateQueries({
        queryKey: ['assignments', shiftId, slotId],
      });
      queryClient.invalidateQueries({
        queryKey: ['eligible-staff', shiftId, slotId],
      });
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      queryClient.invalidateQueries({ queryKey: ['shift', shiftId] });
      toast.success('Staff assigned');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useRemoveAssignment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      shiftId,
      slotId,
      assignmentId,
    }: {
      shiftId: number;
      slotId: number;
      assignmentId: number;
    }) => apiClient.removeAssignment(shiftId, slotId, assignmentId),
    onSuccess: (_, { shiftId, slotId }) => {
      queryClient.invalidateQueries({
        queryKey: ['assignments', shiftId, slotId],
      });
      queryClient.invalidateQueries({
        queryKey: ['eligible-staff', shiftId, slotId],
      });
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      queryClient.invalidateQueries({ queryKey: ['shift', shiftId] });
      toast.success('Assignment removed');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useApproveSwapDrop() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      shiftId,
      slotId,
      assignmentId,
      data,
    }: {
      shiftId: number;
      slotId: number;
      assignmentId: number;
      data: ApproveSwapDropDto;
    }) => apiClient.approveSwapDrop(shiftId, slotId, assignmentId, data),
    onSuccess: (_, { shiftId, slotId }) => {
      queryClient.invalidateQueries({
        queryKey: ['assignments', shiftId, slotId],
      });
      queryClient.invalidateQueries({ queryKey: ['pending-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      queryClient.invalidateQueries({ queryKey: ['shift', shiftId] });
      toast.success('Decision recorded');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
