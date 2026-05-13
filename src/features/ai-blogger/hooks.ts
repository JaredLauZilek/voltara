import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from './api';
import type {
  BlogCompetitorInsert, BlogCompetitorUpdate,
  BlogKeywordInsert,
  BlogDraftInsert, BlogDraftUpdate,
  AIBloggerConfigUpdate,
} from './types';

const KEYS = {
  competitors: ['ai_blogger', 'competitors'],
  keywords:    ['ai_blogger', 'keywords'],
  drafts:      ['ai_blogger', 'drafts'],
  snapshots:   (draftId: string) => ['ai_blogger', 'snapshots', draftId],
  config:      ['ai_blogger', 'config'],
};

// competitors
export function useCompetitors() {
  return useQuery({ queryKey: KEYS.competitors, queryFn: api.listCompetitors });
}
export function useCreateCompetitor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (row: BlogCompetitorInsert) => api.createCompetitor(row),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.competitors }),
  });
}
export function useUpdateCompetitor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: BlogCompetitorUpdate }) => api.updateCompetitor(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.competitors }),
  });
}
export function useDeleteCompetitor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteCompetitor(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.competitors }),
  });
}

// keywords
export function useKeywords() {
  return useQuery({ queryKey: KEYS.keywords, queryFn: api.listKeywords });
}
export function useCreateKeyword() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (row: BlogKeywordInsert) => api.createKeyword(row),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.keywords }),
  });
}
export function useDeleteKeyword() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteKeyword(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.keywords }),
  });
}

// drafts
export function useDrafts() {
  return useQuery({ queryKey: KEYS.drafts, queryFn: api.listDrafts });
}
export function useCreateDraft() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (row: BlogDraftInsert) => api.createDraft(row),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.drafts }),
  });
}
export function useUpdateDraft() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: BlogDraftUpdate }) => api.updateDraft(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.drafts }),
  });
}
export function useDeleteDraft() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteDraft(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.drafts }),
  });
}

// snapshots
export function useSnapshots(draftId: string | null) {
  return useQuery({
    queryKey: draftId ? KEYS.snapshots(draftId) : ['ai_blogger', 'snapshots', 'none'],
    queryFn: () => api.listSnapshots(draftId!),
    enabled: !!draftId,
  });
}

// config
export function useConfig() {
  return useQuery({ queryKey: KEYS.config, queryFn: api.getConfig });
}
export function useUpdateConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: AIBloggerConfigUpdate) => api.updateConfig(patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.config }),
  });
}

// Agent action mutations
export function useGenerateDraft() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { topic?: string; keyword_ids?: string[]; competitor_ids?: string[] }) =>
      api.invokeDraftFunction(args),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.drafts }),
  });
}
export function usePublishDraft() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (draftId: string) => api.invokePublishFunction(draftId),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.drafts }),
  });
}
export function useFetchSeoSnapshot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (draftId: string) => api.invokeSeoSnapshotFunction(draftId),
    onSuccess: (_d, draftId) => qc.invalidateQueries({ queryKey: KEYS.snapshots(draftId) }),
  });
}
