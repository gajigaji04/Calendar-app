import AppShell from '@/components/layout/AppShell';
import ErrorBoundary from '@/components/ErrorBoundary';

export default function MainLayout({ children }) {
  return (
    <AppShell>
      <ErrorBoundary>
        {children}
      </ErrorBoundary>
    </AppShell>
  );
}
