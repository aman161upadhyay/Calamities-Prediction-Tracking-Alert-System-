import { createRoot } from 'react-dom/client';

import App from './App';
import { ErrorBoundary } from '@/components/error-boundary';

import './index.css';

// ?motion=reduce forces the reduced-motion path, for screenshots and for visitors who ask for it.
if (new URLSearchParams(window.location.search).get('motion') === 'reduce') {
  document.documentElement.dataset.motion = 'reduce';
}

createRoot(document.getElementById('root')!, {
  // Keeps caught errors off reportError(), which would raise the dev overlay.
  onCaughtError: (error, errorInfo) => {
    console.error(error, errorInfo.componentStack);
  },
}).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);
