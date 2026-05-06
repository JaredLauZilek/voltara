import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from './api';

export function useSeoSummary() {
  return useQuery({ queryKey: ['seo', 'summary'], queryFn: api.getSummary });
}

export function useSeoKeywords() {
  return useQuery({ queryKey: ['seo', 'keywords'], queryFn: api.listKeywords });
}

export function useSeoTopMovers() {
  return useQuery({ queryKey: ['seo', 'top-movers'], queryFn: api.listTopMovers });
}

export function useSeoPages() {
  return useQuery({ queryKey: ['seo', 'pages'], queryFn: api.listPages });
}

export function useSeoTraffic(days: number = 28) {
  return useQuery({ queryKey: ['seo', 'traffic', days], queryFn: () => api.listTraffic(days) });
}

export function useSeoBacklinks() {
  return useQuery({ queryKey: ['seo', 'backlinks'], queryFn: api.listBacklinks });
}

export function useSeoCompetitors() {
  return useQuery({ queryKey: ['seo', 'competitors'], queryFn: api.listCompetitors });
}

export function useSeoAlerts() {
  return useQuery({ queryKey: ['seo', 'alerts'], queryFn: api.listAlerts });
}

export function useSeoIntegrations() {
  return useQuery({ queryKey: ['seo', 'integrations'], queryFn: api.listIntegrations });
}

export function useUnacknowledgedAlertsCount() {
  const { data } = useQuery({
    queryKey: ['seo', 'alerts', 'open-count'],
    queryFn: api.countOpenAlerts,
    refetchInterval: 60_000,
  });
  return data ?? 0;
}

export function useAcknowledgeAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.acknowledgeAlert(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['seo', 'alerts'] });
      qc.invalidateQueries({ queryKey: ['seo', 'summary'] });
    },
  });
}
