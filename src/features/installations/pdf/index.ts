import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import type { CompanyProfile, FormDesign } from '@/features/form-designs';
import type { Customer } from '@/features/customers';
import type { Product } from '@/features/products';
import type { Quote } from '@/features/sales';
import type { Installation } from '../types';
import { DeliveryOrderDocument } from './DeliveryOrderDocument';

export interface RenderDeliveryOrderArgs {
  installation: Installation;
  quote: Quote | null;
  customer: Customer | null;
  products: Product[];
  profile: CompanyProfile;
  design: FormDesign;
}

export function renderDeliveryOrderHTML(args: RenderDeliveryOrderArgs): string {
  const markup = renderToStaticMarkup(createElement(DeliveryOrderDocument, args));
  return `<!DOCTYPE html>${markup}`;
}

/**
 * Renders the delivery order into a hidden iframe and triggers the browser's
 * print dialog. The user picks "Save as PDF" (or any installed PDF printer)
 * to download. No PDF library required.
 */
export function downloadDeliveryOrderPDF(args: RenderDeliveryOrderArgs): void {
  const html = renderDeliveryOrderHTML(args);
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;';
  iframe.srcdoc = html;
  document.body.appendChild(iframe);

  const cleanup = () => {
    if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
  };

  iframe.onload = () => {
    const win = iframe.contentWindow;
    if (!win) {
      cleanup();
      return;
    }
    // Slight delay so webfonts have a chance to load before print snapshot.
    window.setTimeout(() => {
      try {
        win.focus();
        win.print();
      } finally {
        // Give the print dialog a moment to capture the iframe before removal.
        window.setTimeout(cleanup, 5_000);
      }
    }, 250);
  };
}
