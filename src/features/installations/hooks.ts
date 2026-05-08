import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from './api';
import type { InstallationInsert, InstallationUpdate } from './types';

export function useInstallations() {
  return useQuery({ queryKey: ['installations'], queryFn: api.listInstallations });
}

export function useCreateInstallation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (row: InstallationInsert) => api.createInstallation(row),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['installations'] }),
  });
}

export function useUpdateInstallation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: InstallationUpdate }) => api.updateInstallation(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['installations'] }),
  });
}

export function useDeleteInstallation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteInstallation(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['installations'] }),
  });
}
