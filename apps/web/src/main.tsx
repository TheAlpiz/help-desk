import React from 'react';
import ReactDOM from 'react-dom/client';
// @ts-ignore
import './globals.css';

// i18n must be imported before any component that uses `useTranslation`
import './i18n/config';

import { RouterProvider, createRouter } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from './components/Toast';
import { I18nProvider } from './i18n/I18nProvider';


const queryClient = new QueryClient();

const router = createRouter({
  routeTree,
  context: {
    queryClient,
  },
  defaultPreload: 'intent',
  defaultPreloadStaleTime: 0,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <I18nProvider>
          <RouterProvider router={router} />
        </I18nProvider>
      </ToastProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
