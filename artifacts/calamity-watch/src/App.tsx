import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { TopNav, Footer } from '@/components/layout/shell';
import NotFound from '@/pages/not-found';
import Home from '@/pages/home';
import HazardPage from '@/pages/hazard';
import PlacePage from '@/pages/place';
import AlertsPage from '@/pages/alerts';
import AlertPage from '@/pages/alert';
import ModelPage from '@/pages/model';
import ReplayPage from '@/pages/replay';
import SubscribePage, { UnsubscribePage, VerifyPage } from '@/pages/subscribe';
import AboutPage from '@/pages/about';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false, retry: 1 } },
});

function Router() {
  return (
    <RoutedErrorBoundary>
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
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <div className="min-h-[100dvh] flex flex-col">
            <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 bg-surface-2 px-3 py-2 rounded-[4px]">Skip to content</a>
            <TopNav />
            <div id="main" className="flex-1">
              <Router />
            </div>
            <Footer />
          </div>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
