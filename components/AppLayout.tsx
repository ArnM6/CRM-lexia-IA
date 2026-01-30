
import React, { useState } from 'react';
import { AppSidebar } from './AppSidebar';
import { Search, Menu, WifiOff } from 'lucide-react';
import { VoiceAssistant } from './VoiceAssistant';
import { isSupabaseConfigured } from '../services/supabase';

interface AppLayoutProps {
  children: React.ReactNode;
}

const ConnectionStatus: React.FC = () => {
  const isLive = isSupabaseConfigured();
  
  return (
    <div className="fixed bottom-4 right-20 z-40 hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium shadow-sm border bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-800 transition-opacity opacity-75 hover:opacity-100">
      {isLive ? (
        <>
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
          <span className="text-slate-600 dark:text-slate-300">Supabase Connected</span>
        </>
      ) : (
        <>
          <WifiOff className="h-3 w-3 text-slate-400" />
          <span className="text-slate-500">Demo Mode (Local)</span>
        </>
      )}
    </div>
  );
};

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <AppSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="md:pl-64 flex flex-col min-h-screen">
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/80 px-6 backdrop-blur dark:bg-slate-950/80 dark:border-slate-800">
          <div className="flex items-center gap-4">
             <button 
                className="md:hidden p-2 -ml-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md"
                onClick={() => setSidebarOpen(true)}
             >
                <Menu className="h-6 w-6" />
             </button>
             <div className="hidden md:flex items-center relative">
                <Search className="absolute left-2.5 h-4 w-4 text-slate-400" />
                <input 
                    type="text" 
                    placeholder="Search global..." 
                    className="h-9 w-64 rounded-md border border-slate-200 bg-slate-50 pl-9 pr-4 text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                />
             </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Notification button removed as requested */}
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-6 overflow-x-hidden relative">
          {children}
        </main>
      </div>
      
      {/* Visual Status Indicator */}
      <ConnectionStatus />

      {/* Global AI Voice Assistant */}
      <VoiceAssistant />
    </div>
  );
};
