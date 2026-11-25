import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './index.css';
import { ClerkProvider } from '@clerk/react';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import { BrowserRouter } from 'react-router-dom';
import { PostHogErrorBoundary, PostHogProvider } from '@posthog/react';
import { posthog } from './observability';
import { t } from './lib/language';

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PostHogProvider client={posthog}>
      <ClerkProvider publishableKey={publishableKey ?? ''}>
        <BrowserRouter>
          <ThemeProvider>
            <LanguageProvider>
              <AuthProvider>
                <PostHogErrorBoundary
                  additionalProperties={{ surface: 'react-render' }}
                  fallback={
                    <div className="p-8 text-center">
                      {t("Something went wrong. Please refresh the page and try again.")}
                    </div>
                  }
                >
                  <App />
                </PostHogErrorBoundary>
              </AuthProvider>
            </LanguageProvider>
          </ThemeProvider>
        </BrowserRouter>
      </ClerkProvider>
    </PostHogProvider>
  </React.StrictMode>,
);
