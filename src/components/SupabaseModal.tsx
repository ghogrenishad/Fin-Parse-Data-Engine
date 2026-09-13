import React, { useState } from 'react';
import { X, Database, ShieldCheck, Check, Key, Code2, Copy, Sparkles, RefreshCw, Server, Globe } from 'lucide-react';

interface SupabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  serverStatus?: {
    hasGeminiKey: boolean;
    hasSupabase: boolean;
    supabaseTable: string;
  };
  onRefreshStatus?: () => void;
}

export const SUPABASE_SQL_SCHEMA = `-- ============================================================
-- FIN-PARSE / INVOICING_DATA SUPABASE TABLE SCHEMA
-- ============================================================

-- 1. Create table invoicing_data
CREATE TABLE IF NOT EXISTS public.invoicing_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice TEXT NOT NULL UNIQUE,
    amount NUMERIC NOT NULL DEFAULT 0,
    vendor TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL DEFAULT 'Other',
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    raw_snippet TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.invoicing_data ENABLE ROW LEVEL SECURITY;

-- 3. Access Policy (Full access for application operations)
CREATE POLICY "Enable all operations for app users"
ON public.invoicing_data
FOR ALL
USING (true)
WITH CHECK (true);`;

export const SupabaseModal: React.FC<SupabaseModalProps> = ({ 
  isOpen, 
  onClose, 
  serverStatus = { hasGeminiKey: false, hasSupabase: false, supabaseTable: 'invoicing_data' },
  onRefreshStatus
}) => {
  const [activeTab, setActiveTab] = useState<'status' | 'sql'>('status');
  const [copiedSql, setCopiedSql] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  if (!isOpen) return null;

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    if (onRefreshStatus) {
      await onRefreshStatus();
    }
    setTimeout(() => setRefreshing(false), 500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#141414]/60 backdrop-blur-xs font-sans text-[#141414]">
      <div className="bg-white border-2 border-[#141414] w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-3 border-b border-[#141414] flex items-center justify-between bg-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-[#141414] text-white flex items-center justify-center font-bold text-xs">
              <Server className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#141414]">SERVER SECRETS & SUPABASE DB</h3>
              <p className="text-[10px] font-mono text-gray-500">TARGET TABLE: [invoicing_data]</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 border border-transparent hover:border-[#141414] text-gray-500 hover:text-[#141414] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#141414] bg-gray-50 text-[10px] font-bold uppercase tracking-wider">
          <button
            type="button"
            onClick={() => setActiveTab('status')}
            className={`flex-1 py-2 px-3 text-center border-r border-[#141414] transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'status' ? 'bg-[#141414] text-white' : 'hover:bg-gray-200 text-[#141414]'
            }`}
          >
            <Key className="w-3 h-3" />
            <span>Environment Secrets</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('sql')}
            className={`flex-1 py-2 px-3 text-center transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'sql' ? 'bg-[#141414] text-white' : 'hover:bg-gray-200 text-[#141414]'
            }`}
          >
            <Code2 className="w-3 h-3" />
            <span>SQL Table Schema</span>
          </button>
        </div>

        {/* Content */}
        {activeTab === 'status' ? (
          <div className="p-4 space-y-4 text-xs overflow-y-auto">
            {/* Status overview banner */}
            <div className="p-3 bg-gray-50 border border-[#141414] space-y-2">
              <div className="font-bold text-[10px] uppercase tracking-wider flex items-center justify-between text-[#141414]">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-green-700" />
                  <span>SERVER-SIDE SECRETS CONFIGURATION</span>
                </div>
                <button
                  type="button"
                  onClick={handleRefresh}
                  className="p-1 hover:bg-gray-200 border border-gray-300 rounded-xs text-[10px] flex items-center gap-1 text-gray-700"
                  title="Refresh Server Health"
                >
                  <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
                  <span className="font-mono">CHECK</span>
                </button>
              </div>
              <p className="text-[11px] text-gray-600 leading-relaxed font-mono">
                All 3 keys are processed strictly on the backend server. The Gemini API key and Supabase credentials are never exposed to the client browser.
              </p>
            </div>

            {/* Keys Status Grid */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-600">
                Active Environment Variables:
              </span>

              {/* GEMINI_API_KEY */}
              <div className="p-2.5 border border-[#141414] bg-white flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="font-mono font-bold text-[11px] flex items-center gap-1.5 text-[#141414]">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <span>GEMINI_API_KEY</span>
                  </div>
                  <div className="text-[10px] text-gray-500 font-mono">
                    Routes AI parsing through backend via @google/genai
                  </div>
                </div>
                <div>
                  {serverStatus.hasGeminiKey ? (
                    <span className="inline-flex items-center px-2 py-0.5 bg-green-100 border border-green-800 text-green-900 text-[9px] font-bold font-mono uppercase">
                      ● DETECTED & ACTIVE
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 bg-amber-50 border border-amber-600 text-amber-800 text-[9px] font-bold font-mono uppercase">
                      HEURISTIC FALLBACK
                    </span>
                  )}
                </div>
              </div>

              {/* SUPABASE_URL */}
              <div className="p-2.5 border border-[#141414] bg-white flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="font-mono font-bold text-[11px] flex items-center gap-1.5 text-[#141414]">
                    <Database className="w-3.5 h-3.5 text-blue-600" />
                    <span>SUPABASE_URL</span>
                  </div>
                  <div className="text-[10px] text-gray-500 font-mono">
                    Database Host endpoint for <code className="text-black font-bold">invoicing_data</code>
                  </div>
                </div>
                <div>
                  {serverStatus.hasSupabase ? (
                    <span className="inline-flex items-center px-2 py-0.5 bg-green-100 border border-green-800 text-green-900 text-[9px] font-bold font-mono uppercase">
                      ● CONNECTED
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 bg-gray-100 border border-gray-400 text-gray-700 text-[9px] font-bold font-mono uppercase">
                      LOCAL FALLBACK
                    </span>
                  )}
                </div>
              </div>

              {/* SUPABASE_ANON_KEY */}
              <div className="p-2.5 border border-[#141414] bg-white flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="font-mono font-bold text-[11px] flex items-center gap-1.5 text-[#141414]">
                    <Key className="w-3.5 h-3.5 text-purple-600" />
                    <span>SUPABASE_ANON_KEY</span>
                  </div>
                  <div className="text-[10px] text-gray-500 font-mono">
                    Authentication token for PostgreSQL mutations
                  </div>
                </div>
                <div>
                  {serverStatus.hasSupabase ? (
                    <span className="inline-flex items-center px-2 py-0.5 bg-green-100 border border-green-800 text-green-900 text-[9px] font-bold font-mono uppercase">
                      ● CONNECTED
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 bg-gray-100 border border-gray-400 text-gray-700 text-[9px] font-bold font-mono uppercase">
                      LOCAL FALLBACK
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Vercel Deployment Note */}
            <div className="p-3 bg-gray-100 border border-dashed border-[#141414] space-y-1.5">
              <div className="font-bold text-[10px] uppercase tracking-wider flex items-center gap-1.5 text-[#141414]">
                <Globe className="w-3.5 h-3.5 text-blue-700" />
                <span>VERCEL DEPLOYMENT READY</span>
              </div>
              <p className="text-[10px] text-gray-700 font-mono leading-relaxed">
                When importing this repository into Vercel, set these 3 Environment Variables under <strong>Project Settings → Environment Variables</strong>:
              </p>
              <ul className="text-[10px] font-mono text-gray-800 list-disc list-inside space-y-0.5 pl-1">
                <li><code className="font-bold">GEMINI_API_KEY</code></li>
                <li><code className="font-bold">SUPABASE_URL</code></li>
                <li><code className="font-bold">SUPABASE_ANON_KEY</code></li>
              </ul>
            </div>

            <div className="pt-2 flex items-center justify-end border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1 text-[10px] font-bold uppercase border border-[#141414] bg-[#141414] text-white hover:bg-gray-800"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4 flex flex-col gap-3 overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-600">
                Run this in your Supabase SQL Editor:
              </span>
              <button
                type="button"
                onClick={handleCopySql}
                className="px-2.5 py-1 text-[10px] font-bold uppercase border border-[#141414] bg-white hover:bg-[#141414] hover:text-white transition-colors flex items-center gap-1"
              >
                {copiedSql ? (
                  <>
                    <Check className="w-3 h-3 text-green-600" />
                    <span>COPIED!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>COPY SQL</span>
                  </>
                )}
              </button>
            </div>
            <pre className="p-3 bg-[#141414] text-gray-200 text-[10px] font-mono leading-relaxed overflow-auto border border-[#141414] flex-1 max-h-[340px] select-all">
              {SUPABASE_SQL_SCHEMA}
            </pre>
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1 text-[10px] font-bold uppercase border border-[#141414] bg-[#141414] text-white hover:bg-gray-800"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
