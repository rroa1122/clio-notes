import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const SetupLayout: React.FC = () => {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="size-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    // Must be logged in
    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // If setup is already complete, redirect to main app
    if (user.setup_complete) {
        return <Navigate to="/" replace />;
    }

    // Render restricted layout (no sidebar, no header)
    return (
        <div className="min-h-screen bg-slate-50">
            <Outlet />
        </div>
    );
};
