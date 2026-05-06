import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from './api';
import type { CompanyProfileUpdate, FormDesignUpdate, DocType } from './types';

export function useCompanyProfile() {
  return useQuery({ queryKey: ['company_profile'], queryFn: api.getCompanyProfile });
}

export function useFormDesigns() {
  return useQuery({ queryKey: ['form_designs'], queryFn: api.listFormDesigns });
}

export function useUpdateCompanyProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: CompanyProfileUpdate) => api.updateCompanyProfile(patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['company_profile'] }),
  });
}

export function useUpdateFormDesign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ docType, patch }: { docType: DocType; patch: FormDesignUpdate }) =>
      api.updateFormDesign(docType, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['form_designs'] }),
  });
}

export function useDesign(docType: DocType) {
  const profile = useCompanyProfile();
  const designs = useFormDesigns();
  const design = designs.data?.find((d) => d.doc_type === docType);
  return {
    profile: profile.data,
    design,
    isLoading: profile.isLoading || designs.isLoading,
  };
}
