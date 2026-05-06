import { useQuery } from '@tanstack/react-query';
import * as api from './api';

export function useOrders() {
  return useQuery({ queryKey: ['orders'], queryFn: api.listOrders });
}
