export { EmailDesignsScreen } from './EmailDesignsScreen';
export { EmailSendModal } from './EmailSendModal';
export { useEmailDesign, useCompanyEmailProfile, useEmailDesigns } from './hooks';
export { renderEmailHtml } from './render';
export { sendDocEmail } from './send';
export { substitutePlaceholders } from './placeholders';
export { DOC_TYPES } from '@/features/form-designs';
export type {
  CompanyEmailProfile,
  CompanyEmailProfileUpdate,
  EmailDesign,
  EmailDesignUpdate,
  DocType,
  PlaceholderContext,
} from './types';
export type { RenderedEmail, RenderArgs } from './render';
export type { SendDocEmailArgs, SendDocEmailResult } from './send';
