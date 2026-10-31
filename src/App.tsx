import React, { Suspense, lazy } from 'react';
import { createBrowserRouter, RouterProvider, createRoutesFromElements, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { ThemeProvider } from './notes-module/context/ThemeContext';
import { CallsProvider } from './context/CallsContext';
import { ToastContainer } from './components/Toast';
import { Toaster } from 'sonner';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { MainLayout } from './layout/MainLayout';
import { SetupLayout } from './layout/SetupLayout';
import { SetupGuard } from './components/auth/SetupGuard';
import { ScreenLockOverlay } from './components/auth/ScreenLockOverlay';
import ErrorBoundary from './components/ErrorBoundary';
import { MfaChallenge } from './pages/MfaChallenge';
import { MfaEnrollment } from './pages/MfaEnrollment';

// Lazy-loaded Route Pages for fast initial bundle
const Record = lazy(() => import('./notes-module/pages/Record'));
const NotesHistory = lazy(() => import('./notes-module/pages/NotesHistory'));
const Templates = lazy(() => import('./notes-module/pages/Templates'));
const PrintNote = lazy(() => import('./notes-module/pages/PrintNote'));
const SignNote = lazy(() => import('./notes-module/pages/SignNote'));
const PrintAssessment = lazy(() => import('./pages/PrintAssessment'));
const Patients = lazy(() => import('./pages/Patients').then(m => ({ default: m.Patients })));
const PatientDetail = lazy(() => import('./pages/PatientDetail').then(m => ({ default: m.PatientDetail })));
const Settings = lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })));
const SyncPortal = lazy(() => import('./pages/SyncPortal').then(m => ({ default: m.SyncPortal })));
const AuditLogs = lazy(() => import('./pages/AuditLogs').then(m => ({ default: m.AuditLogs })));
const PlatformAdmin = lazy(() => import('./pages/PlatformAdmin').then(m => ({ default: m.PlatformAdmin })));
const DocumentationRules = lazy(() => import('./pages/DocumentationRules').then(m => ({ default: m.DocumentationRules })));
const Setup = lazy(() => import('./pages/Setup').then(m => ({ default: m.Setup })));
const Invite = lazy(() => import('./pages/auth/Invite').then(m => ({ default: m.Invite })));
const ResetPassword = lazy(() => import('./pages/auth/ResetPassword').then(m => ({ default: m.ResetPassword })));
const Company = lazy(() => import('./pages/Company').then(m => ({ default: m.Company })));

const PageLoader = () => (
  <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center transition-colors duration-200">
    <div className="w-8 h-8 border-4 border-[#6366f1] border-t-transparent rounded-full animate-spin" />
  </div>
);

const PrimaryAdminRoute = () => {
  const { session, loading } = useAuth();
  if (loading) return null;
  if (!session || session.user?.email !== 'reinier.roa2.0@gmail.com') {
    return <Navigate to="/notes/new" replace />;
  }
  return <Outlet />;
};

const Root = () => {
  const { user, loading, mfaRequired, mfaEnrollmentRequired, isLocked } = useAuth();

  if (loading) {
    return <PageLoader />;
  }

  if (mfaRequired) {
    return <MfaChallenge />;
  }

  if (mfaEnrollmentRequired) {
    return <MfaEnrollment />;
  }

  const router = createBrowserRouter(
    createRoutesFromElements(
      <Route>
        {/* Public Routes */}
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/" replace />} />
        <Route path="/signup" element={!user ? <Signup /> : <Navigate to="/" replace />} />
        <Route path="/auth/invite" element={<Invite />} />
        <Route path="/auth/reset" element={<ResetPassword />} />
        <Route path="/company" element={<Company />} />

        {/* Setup Mode - Strict Isolation (No Sidebar/Header) */}
        <Route element={<SetupLayout />}>
          <Route path="/setup" element={<Setup />} />
        </Route>

        {/* Clean Print Route - No Sidebar/Header */}
        <Route path="/notes/print/:id" element={<PrintNote />} />
        <Route path="/patients/print-assessment/:id" element={<PrintAssessment />} />

        {/* Signature Route - No Auth Required */}
        <Route path="/sign-note/:token" element={<SignNote />} />

        {/* Protected App Routes - Requires Auth & Setup Completion */}
        <Route element={<SetupGuard />}>
          <Route element={<MainLayout />}>
            {/* Redirect root to Notes */}
            <Route path="/" element={<Navigate to="/notes/new" replace />} />

            {/* General Protected Routes (All Auth Users) */}
            <Route path="patients" element={<Patients />} />
            <Route path="patients/:id" element={<PatientDetail />} />
            <Route path="settings" element={<Settings />} />
            <Route path="sync" element={<SyncPortal />} />
            <Route path="audit-logs" element={<AuditLogs />} />
            {/* Clio admins only (checked with is_clio_admin() + RLS) */}
            <Route path="documentation-rules" element={<DocumentationRules />} />

            {/* Platform Admin Route */}
            <Route element={<PrimaryAdminRoute />}>
              <Route path="platform-admin" element={<PlatformAdmin />} />
            </Route>

            {/* Clinical Module Routes */}
            <Route path="notes">
              <Route index element={<Navigate to="new" replace />} />
              <Route path="history" element={<NotesHistory />} />

              <Route element={<PrimaryAdminRoute />}>
                <Route path="templates" element={<Templates />} />
              </Route>

              <Route path="new" element={<Record />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    )
  );

  return (
    <div className="relative w-full h-full">
      <Suspense fallback={<PageLoader />}>
        <RouterProvider router={router} />
      </Suspense>
      {isLocked && <ScreenLockOverlay />}
    </div>
  );
};

function App() {
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('debug') === 'contrast') {
      document.documentElement.classList.add('debug-contrast');
    }
  }, []);

  return (
    <LanguageProvider>
      <AuthProvider>
        <ThemeProvider>
          <CallsProvider>
            <ErrorBoundary>
              <ToastContainer />
              <Toaster richColors position="bottom-right" />
              <Root />
            </ErrorBoundary>
          </CallsProvider>
        </ThemeProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;
