import { useQuery } from '@tanstack/react-query';
import * as api from './api';

export function useInstallations() {
  return useQuery({ queryKey: ['installations'], queryFn: api.listInstallations });
}
