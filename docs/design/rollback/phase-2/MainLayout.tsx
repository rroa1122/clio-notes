import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export function MainLayout() {
    return (
        <div className="flex min-h-screen bg-background font-sans text-foreground">
            {/* Sidebar - Fixed Width */}
            <Sidebar />

            {/* Main Content Area */}
            <div className="flex flex-1 flex-col transition-none md:pl-64">
                <Header />

                <main className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
