// Greenpack Pro — Main App (Firebase Version)
import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from '@/store/auth';

// Pages
import LoginPage from '@/pages/LoginPage';
import DashboardPage from '@/pages/DashboardPage';
import NewInspectionPage from '@/pages/NewInspectionPage';
import JobsPage from '@/pages/JobsPage';
import ResultPage from '@/pages/ResultPage';
import TemplatesPage from '@/pages/TemplatesPage';
import BatchPage from '@/pages/BatchPage';
import ReportsPage from '@/pages/ReportsPage';
import SettingsPage from '@/pages/SettingsPage';
import { MultiUpInspectionPage, MultiUpResultPage } from '@/pages/MultiUpPage';
import {
  PantoneIdentificationPage,
  TrialComparisonPage,
  PrepressResultPage,
} from '@/pages/PrepressPage';
import Layout from '@/components/layout/Layout';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthStore();
  
  if (loading) {
    return <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1A73E8]"></div>
    </div>;
  }
  
  return user ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  const { checkAuth } = useAuthStore();

  useEffect(() => {
    // Call checkAuth and get unsubscribe function
    const unsubscribe = checkAuth();
    
    // Cleanup subscription on unmount
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [checkAuth]);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: { background: '#0D1B2A', color: '#fff', borderRadius: '8px' },
            success: { iconTheme: { primary: '#22A06B', secondary: '#fff' } },
            error: { iconTheme: { primary: '#E5383B', secondary: '#fff' } },
          }}
        />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <PrivateRoute>
                <Layout />
              </PrivateRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="new-inspection" element={<NewInspectionPage />} />
            <Route path="multi-up/new" element={<MultiUpInspectionPage />} />
            <Route path="multi-up/:jobId" element={<MultiUpResultPage />} />
            <Route path="prepress/pantone" element={<PantoneIdentificationPage />} />
            <Route path="prepress/trial" element={<TrialComparisonPage />} />
            <Route path="prepress/:jobId" element={<PrepressResultPage />} />
            <Route path="jobs" element={<JobsPage />} />
            <Route path="jobs/:jobId/result" element={<ResultPage />} />
            <Route path="templates" element={<TemplatesPage />} />
            <Route path="batch" element={<BatchPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}