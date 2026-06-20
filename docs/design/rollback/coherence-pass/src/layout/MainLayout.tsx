import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export function MainLayout() {
    return (
        <div className="flex min-h-screen bg-background font-sans text-foreground">
            {/* Sidebar - Fixed Width */}
            <Sidebar />

            {/* Main Content Area */}
            <div className="flex flex-1 flex-col transition-all duration-300 md:pl-64">
                <Header />

                <main className="flex-1 p-4 md:p-8 lg:p-12 space-y-8 max-w-[1920px] mx-auto w-full">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
