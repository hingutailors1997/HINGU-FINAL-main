import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App.tsx'
import { GlobalSearchProvider } from './contexts/GlobalSearchContext'
import './index.css'

const queryClient = new QueryClient()

// Auto-reload the page if a chunk fails to load (e.g. after a new deployment on Vercel)
window.addEventListener('vite:preloadError', (event) => {
  window.location.reload();
});

// Also catch uncaught promise rejections for dynamic import failures
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason && event.reason.message && event.reason.message.includes('Failed to fetch dynamically imported module')) {
    event.preventDefault();
    window.location.reload();
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <GlobalSearchProvider>
          <App />
        </GlobalSearchProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
