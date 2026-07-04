import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const SetupLayout: React.FC = () => {
    const { user, loading, isImpersonating, stopImpersonating } = useAuth();

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

    // Render restricted layout (no sidebar, no header, but show impersonation banner if active)
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            {isImpersonating && (
                <div className="bg-amber-500 text-white text-xs font-bold px-4 py-2.5 flex items-center justify-between shadow-sm animate-in slide-in-from-top duration-300 z-50">
                    <div className="flex items-center gap-2">
                        <span className="inline-block w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
                        <span>Impersonation Mode Active: viewing as <strong>{user?.name || user?.email}</strong> ({user?.email})</span>
                    </div>
                    <button 
                        onClick={() => stopImpersonating()}
                        className="bg-white text-amber-700 px-3 py-1 rounded-lg hover:bg-amber-50 transition-all font-black text-[10px] uppercase tracking-wider shadow-sm"
                    >
                        Exit Impersonation
                    </button>
                </div>
            )}
            <div className="flex-1">
                <Outlet />
            </div>
        </div>
    );
};
