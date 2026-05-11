import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/shared/lib/query';
import '@/shared/styles.css';
import { App } from './App';
import { PasswordGate } from './PasswordGate';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PasswordGate>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </PasswordGate>
  </StrictMode>
);
