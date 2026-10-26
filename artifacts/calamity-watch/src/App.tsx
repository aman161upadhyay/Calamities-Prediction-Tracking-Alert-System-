import { lazy, Suspense, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { TopNav, Footer } from '@/components/layout/shell';
import NotFound from '@/pages/not-found';
import Home from '@/pages/home';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';

// The board is the landing page and stays in the first bundle; every other page loads on its first visit.
const HazardPage = lazy(() => import('@/pages/hazard'));
const PlacePage = lazy(() => import('@/pages/place'));
const AlertsPage = lazy(() => import('@/pages/alerts'));
const AlertPage = lazy(() => import('@/pages/alert'));
const ModelPage = lazy(() => import('@/pages/model'));
const ReplayPage = lazy(() => import('@/pages/replay'));
const SubscribePage = lazy(() => import('@/pages/subscribe'));
const VerifyPage = lazy(() => import('@/pages/subscribe').then((m) => ({ default: m.VerifyPage })));
const UnsubscribePage = lazy(() => import('@/pages/subscribe').then((m) => ({ default: m.UnsubscribePage })));
const AboutPage = lazy(() => import('@/pages/about'));

function PageLoading() {
  return (
    <div className="mx-auto max-w-[1440px] px-4 md:px-8 py-16" role="status" aria-live="polite">
      <p className="mono text-[12px] text-ink-muted">Loading the page</p>
    </div>
  );
}

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false, retry: 1 } },
});

function Router() {
  return (
    <RoutedErrorBoundary>
      <Suspense fallback={<PageLoading />}>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/hazards/:hazard" component={HazardPage} />
        <Route path="/places/:placeId" component={PlacePage} />
        <Route path="/alerts" component={AlertsPage} />
        <Route path="/alerts/:alertId" component={AlertPage} />
        <Route path="/model" component={ModelPage} />
        <Route path="/replay" component={ReplayPage} />
        <Route path="/subscribe" component={SubscribePage} />
        <Route path="/subscribe/verify" component={VerifyPage} />
        <Route path="/subscribe/unsubscribe" component={UnsubscribePage} />
        <Route path="/about" component={AboutPage} />
        <Route component={NotFound} />
      </Switch>
      </Suspense>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <div className="min-h-[100dvh] flex flex-col">
            <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 bg-sheet border border-ink px-3 py-2 text-[13px]">Skip to content</a>
            <TopNav />
            <div id="main" tabIndex={-1} className="flex-1 outline-none">
              <Router />
            </div>
            <Footer />
          </div>
        </WouterRouter>
    </QueryClientProvider>
  );
}

export default App;
