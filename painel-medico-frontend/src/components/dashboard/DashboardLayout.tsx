'use client';

import React, { useState, ReactNode } from 'react';
import Sidebar from './Sidebar';
import { Menu as MenuIcon } from 'lucide-react';
import GenerateLinkFormModal from './GenerateLinkFormModal';
import StatisticsOverview from './StatisticsOverview'; // Placeholder for now

interface DashboardLayoutProps {
  children: ReactNode;
}

// Define a type for the possible views in the main content area
type MainContentView = 'default' | 'statistics';

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isGenerateLinkModalOpen, setIsGenerateLinkModalOpen] = useState(false);
  const [mainView, setMainView] = useState<MainContentView>('default'); // State for main content view

  const handleSetMainView = (view: MainContentView) => {
    setMainView(view);
    // Potentially, if view is 'default', ensure navigation to the root dashboard or last route
    // For now, clicking another nav link in Sidebar will handle navigation and reset this via its own logic
  };

  return (
    <div className="flex h-screen bg-slate-100 dark:bg-slate-900 relative">
      <Sidebar 
        isMobileMenuOpen={isMobileMenuOpen} 
        setIsMobileMenuOpen={setIsMobileMenuOpen}
        onOpenGenerateLinkModal={() => {
          setIsGenerateLinkModalOpen(true);
          // setMainView('default'); // Optionally, ensure modals don't conflict with main view changes
        }}
        setCurrentView={handleSetMainView} // Pass function to set the main view
        currentView={mainView} // Pass current view for active state styling in Sidebar
      />
      
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden="true"
        ></div>
      )}

      <main className="flex-1 overflow-x-hidden overflow-y-auto p-6 sm:p-8 md:p-10 md:ml-64">
        <button
          type="button"
          className="md:hidden p-2 mb-4 text-slate-600 hover:text-teal-600 dark:text-slate-400 dark:hover:text-teal-500"
          onClick={() => setIsMobileMenuOpen(true)}
        >
          <span className="sr-only">Abrir menu</span>
          <MenuIcon className="h-6 w-6" />
        </button>
        {mainView === 'statistics' ? (
          <StatisticsOverview />
        ) : (
          children // Render children if mainView is 'default' (or any other non-statistics view)
        )}
      </main>

      {isGenerateLinkModalOpen && (
        <GenerateLinkFormModal
          isOpen={isGenerateLinkModalOpen}
          onClose={() => setIsGenerateLinkModalOpen(false)}
        />
      )}
    </div>
  );
} 