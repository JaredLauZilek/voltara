import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from './api';
import type { CompanyEmailProfileUpdate, EmailDesignUpdate, DocType } from './types';

export function useCompanyEmailProfile() {
  return useQuery({ queryKey: ['company_email_profile'], queryFn: api.getCompanyEmailProfile });
}

export function useEmailDesigns() {
  return useQuery({ queryKey: ['email_designs'], queryFn: api.listEmailDesigns });
}

export function useUpdateCompanyEmailProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: CompanyEmailProfileUpdate) => api.updateCompanyEmailProfile(patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['company_email_profile'] }),
  });
}

export function useUpdateEmailDesign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ docType, patch }: { docType: DocType; patch: EmailDesignUpdate }) =>
      api.updateEmailDesign(docType, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['email_designs'] }),
  });
}

/**
 * Derived hook combining profile + per-doc design. Mirrors form-designs'
 * useDesign(docType). Used both by the settings UI and the send pipeline.
 */
export function useEmailDesign(docType: DocType) {
  const profile = useCompanyEmailProfile();
  const designs = useEmailDesigns();
  const design = designs.data?.find((d) => d.doc_type === docType);
  return {
    profile: profile.data,
    design,
    isLoading: profile.isLoading || designs.isLoading,
  };
}
