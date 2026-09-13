import React from 'react';
import { LogOut, Database, Sparkles, FileSpreadsheet, ShieldCheck } from 'lucide-react';
import { AuthUser } from '../types';

interface HeaderProps {
  user: AuthUser | null;
  onLogout: () => void;
  onOpenSupabaseModal: () => void;
  supabaseConnected: boolean;
  activeView: 'split' | 'screen1' | 'screen2';
  setActiveView: (view: 'split' | 'screen1' | 'screen2') => void;
  recordCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  onLogout,
  onOpenSupabaseModal,
  supabaseConnected,
  activeView,
  setActiveView,
  recordCount,
}) => {
  return (
    <header id="main-header" className="border-b border-[#141414] bg-white sticky top-0 z-30">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          {/* Brand & Title */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#141414] flex items-center justify-center text-white font-bold rounded-xs shrink-0">
              <span className="text-sm font-mono tracking-tighter">FP</span>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <h1 className="text-xs sm:text-sm font-bold uppercase tracking-widest text-[#141414]">
                FIN-PARSE DATA ENGINE <span className="text-[10px] text-gray-500 font-mono">v1.2</span>
              </h1>
              <span className="hidden lg:inline-flex items-center px-1.5 py-0.5 bg-gray-100 text-[#141414] border border-[#141414] text-[9px] font-bold uppercase tracking-wider">
                <Sparkles className="w-2.5 h-2.5 mr-1 text-orange-600" /> AI TRIAGE ACTIVE
              </span>
            </div>
          </div>

          {/* View Mode Toggle (Desktop / Tablet) */}
          <div className="hidden md:flex items-center border border-[#141414] bg-gray-100 p-0.5 text-[10px] font-bold uppercase tracking-wider">
            <button
              id="view-split-btn"
              onClick={() => setActiveView('split')}
              className={`px-3 py-1 transition-colors ${
                activeView === 'split'
                  ? 'bg-[#141414] text-white'
                  : 'text-[#141414] hover:bg-gray-200'
              }`}
            >
              Split Screen
            </button>
            <button
              id="view-screen1-btn"
              onClick={() => setActiveView('screen1')}
              className={`px-3 py-1 border-l border-[#141414] transition-colors ${
                activeView === 'screen1'
                  ? 'bg-[#141414] text-white'
                  : 'text-[#141414] hover:bg-gray-200'
              }`}
            >
              Invoice Entry
            </button>
            <button
              id="view-screen2-btn"
              onClick={() => setActiveView('screen2')}
              className={`px-3 py-1 border-l border-[#141414] transition-colors ${
                activeView === 'screen2'
                  ? 'bg-[#141414] text-white'
                  : 'text-[#141414] hover:bg-gray-200'
              }`}
            >
              Visualize
            </button>
          </div>

          {/* User Profile & Actions */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Supabase Status Pill */}
            <button
              id="supabase-config-btn"
              onClick={onOpenSupabaseModal}
              title="Supabase Database & Auth status"
              className={`inline-flex items-center px-2 py-1 text-[10px] font-bold uppercase border transition-colors ${
                supabaseConnected
                  ? 'bg-green-100 text-green-900 border-[#141414] hover:bg-green-200'
                  : 'bg-gray-200 text-gray-800 border-[#141414] hover:bg-gray-300'
              }`}
            >
              <Database className="w-3 h-3 mr-1 text-[#141414]" />
              <span className="hidden sm:inline">DB:</span>
              <span className="ml-1 font-mono">invoicing_data</span>
              <span className="w-1.5 h-1.5 bg-green-600 rounded-full ml-1.5" />
            </button>

            {/* User Meta */}
            {user && (
              <div className="hidden sm:flex items-center text-[10px] uppercase font-semibold text-gray-600">
                <span>User:</span>
                <span className="text-[#141414] font-bold ml-1 font-mono">{user.email}</span>
              </div>
            )}

            {/* Logout Button */}
            <button
              id="header-logout-btn"
              onClick={onLogout}
              className="px-3 py-1 text-[10px] font-bold uppercase border border-[#141414] bg-white text-[#141414] hover:bg-[#141414] hover:text-white transition-colors"
            >
              Log Out
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

