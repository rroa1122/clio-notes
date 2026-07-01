import React from 'react';
import { createBrowserRouter, RouterProvider, createRoutesFromElements, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './notes-module/context/ThemeContext';
import { CallsProvider } from './context/CallsContext';
import { ToastContainer } from './components/Toast';
import { Toaster } from 'sonner';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { MainLayout } from './layout/MainLayout';
import { SetupLayout } from './layout/SetupLayout';
import { Settings } from './pages/Settings';
import { Patients } from './pages/Patients';
import { PatientDetail } from './pages/PatientDetail';
import { Invite } from './pages/auth/Invite';
import { ResetPassword } from './pages/auth/ResetPassword';
import { Company } from './pages/Company';
import { Setup } from './pages/Setup';
import { SetupGuard } from './components/auth/SetupGuard';

// Notes Module Pages (Real)
import Record from './notes-module/pages/Record';
import NotesHistory from './notes-module/pages/NotesHistory';
import Templates from './notes-module/pages/Templates';
import PrintNote from './notes-module/pages/PrintNote';
import SignNote from './notes-module/pages/SignNote';
import ErrorBoundary from './components/ErrorBoundary';
import { AuditLogs } from './pages/AuditLogs';
import { MfaChallenge } from './pages/MfaChallenge';
import { MfaEnrollment } from './pages/MfaEnrollment';

const PrimaryAdminRoute = () => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user || user.email !== 'reinier.roa2.0@gmail.com') {
    return <Navigate to="/notes/new" replace />;
  }
  return <Outlet />;
};

const RoleProtectedRoute = ({ allowedRoles }: { allowedRoles: string[] }) => {
  const { user, loading } = useAuth();

  if (loading) return null;

  // For now, any authenticated user can access basic clinical notes
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

const Root = () => {
  const { user, loading, mfaRequired, mfaEnrollmentRequired } = useAuth();
 
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
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
            <Route path="audit-logs" element={<AuditLogs />} />

            {/* Clinical Module Routes */}
            <Route path="notes">
              {/* Standard Clinical Access (All Auth Users) */}
              <Route index element={<Navigate to="new" replace />} />
              <Route path="history" element={<NotesHistory />} />

              {/* Restricted Clinical Pages (Primary Admin Only) */}
              <Route element={<PrimaryAdminRoute />}>
                <Route path="templates" element={<Templates />} />
              </Route>

              {/* Public/Staff Accessible Notes Pages */}
              <Route path="new" element={<Record />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    )
  );

  return <RouterProvider router={router} />;
};

function App() {
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('debug') === 'contrast') {
      document.documentElement.classList.add('debug-contrast');
    }
  }, []);

  return (
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
  );
}

export default App;
