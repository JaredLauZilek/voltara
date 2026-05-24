import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from './api';
import type { TaskInsert, TaskUpdate } from './types';

export function useTasks() {
  return useQuery({ queryKey: ['tasks'], queryFn: api.listTasks });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (row: TaskInsert) => api.createTask(row),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: TaskUpdate }) => api.updateTask(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteTask(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });
}
