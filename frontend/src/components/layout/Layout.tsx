import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import ErrorBoundary from '../ErrorBoundary';
import { checkDueBills } from '../../lib/api';

export default function Layout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    // Check and generate notifications for any due supplier bills upon successful login/app load
    checkDueBills().catch(console.error);
  }, []);

  return (
    <div className="flex min-h-screen w-full bg-background selection:bg-primary/10 selection:text-primary">
      <Sidebar isMobileOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
      <div className="flex flex-1 flex-col min-w-0">
        <div className="sticky top-0 z-40 w-full bg-card shadow-sm border-b">
          <Header onMenuClick={() => setIsMobileMenuOpen(true)} />
        </div>
        <main className="flex-1 bg-muted/20 p-4 md:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl h-full">
            <ErrorBoundary fallbackTitle="Page Rendering Error">
              <Outlet />
            </ErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  );
}
