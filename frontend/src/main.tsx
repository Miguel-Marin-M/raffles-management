import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App';
import { SessionProvider } from './features/auth/session';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // The board is shared reality: refetching on focus is how a second
      // device notices numbers taken elsewhere.
      staleTime: 10_000,
      retry: 1,
    },
  },
});

const container = document.getElementById('root');
if (container === null) throw new Error('The #root element is missing from index.html');

createRoot(container).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <App />
      </SessionProvider>
    </QueryClientProvider>
  </StrictMode>,
);
