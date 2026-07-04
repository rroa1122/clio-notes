import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export const SetupGuard: React.FC = () => {
    const { user, loading } = useAuth();
    const location = useLocation();

    console.log('[SetupGuard] Check', {
        pathname: location.pathname,
        loading,
        user: user ? { id: user.id, setup_complete: user.setup_complete } : null
    });

    if (loading) {
        return null; // Or a spinner
    }

    if (!user) {
        console.log('[SetupGuard] No user, redirecting to login');
        return <Navigate to="/login" replace />;
    }

    const isSuperAdmin = user.role === 'super_admin' || user.email === 'reinier.roa2.0@gmail.com';
    const impersonatingId = sessionStorage.getItem('clio_impersonating_user_id');
    const isImpersonating = !!impersonatingId;

    if (!user.setup_complete && !(isSuperAdmin && !isImpersonating)) {
        // Deterministic redirect to setup if not complete
        // This covers null, undefined, and false
        return <Navigate to="/setup" replace />;
    }

    return <Outlet />;
};
