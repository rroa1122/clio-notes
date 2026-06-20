import { Outlet } from 'react-router-dom';
import { Header } from './Header';

export function MainLayout() {
    return (
        <div className="flex flex-col min-h-screen bg-background font-sans text-foreground">
            <Header />
            <main className="flex-1 p-4 sm:p-6 md:p-8 lg:p-10 space-y-6 md:space-y-8 max-w-7xl mx-auto w-full overflow-x-hidden">
                <Outlet />
            </main>
        </div>
    );
}
