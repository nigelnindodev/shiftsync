import { apiClient } from '@/lib/api-client';
import { UnauthorizedError } from '@/lib/errors';
import type {
  ExternalEmployeeDetailsDto,
  UpdateEmployeeDto,
} from '@/types/user';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function useProfile() {
  const queryClient = useQueryClient();
  const router = useRouter();

  const {
    data: user,
    isLoading,
    error,
    refetch,
  } = useQuery<ExternalEmployeeDetailsDto, Error>({
    queryKey: ['profile'],
    queryFn: () => apiClient.getProfile(),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (error instanceof UnauthorizedError) {
      queryClient.setQueryData(['profile'], null);
      router.push('/');
    }
  }, [error, router, queryClient]);

  const updateProfileMutation = useMutation({
    mutationFn: (data: UpdateEmployeeDto) => apiClient.updateProfile(data),
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(['profile'], updatedUser);
    },
    onError: (e) => {
      if (e instanceof UnauthorizedError) {
        queryClient.setQueryData(['profile'], null);
        router.push('/');
      }
    },
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user && !error,
    error,
    updateProfile: updateProfileMutation.mutate,
    isUpdating: updateProfileMutation.isPending,
    refetch,
  };
}
