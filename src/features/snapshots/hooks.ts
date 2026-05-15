import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from './api';

const KEY = ['snapshots'] as const;

export function useSnapshots() {
  return useQuery({ queryKey: KEY, queryFn: api.listSnapshots, refetchInterval: 5_000 });
}

export function useTriggerSnapshot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.triggerSnapshot,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteSnapshot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, storagePath }: { id: number; storagePath: string }) =>
      api.deleteSnapshot(id, storagePath),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
