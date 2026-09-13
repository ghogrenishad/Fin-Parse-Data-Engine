import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { LoginForm } from './components/LoginForm';
import { Screen1Input } from './components/Screen1Input';
import { Screen2Spreadsheet } from './components/Screen2Spreadsheet';
import { SupabaseModal } from './components/SupabaseModal';
import { AuthUser, InvoiceRecord } from './types';
import { safeFetchJson } from './lib/api';

export default function App() {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const saved = localStorage.getItem('auth_user');
      const parsed = saved ? JSON.parse(saved) : null;
      // If previous user was a demo/mock user with no real token or isDemo true, force real auth
      if (parsed && (parsed.isDemo || !parsed.id || parsed.id.startsWith('usr-') || parsed.id.startsWith('demo-'))) {
        localStorage.removeItem('auth_user');
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  });

  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'split' | 'screen1' | 'screen2'>('split');
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);
  const [serverStatus, setServerStatus] = useState<{
    hasGeminiKey: boolean;
    hasSupabase: boolean;
    supabaseTable: string;
  }>({
    hasGeminiKey: false,
    hasSupabase: false,
    supabaseTable: 'invoicing_data',
  });

  // Verify stored session on initial mount
  useEffect(() => {
    const verifySavedSession = async () => {
      const saved = localStorage.getItem('auth_user');
      if (!saved) return;
      try {
        const parsed: AuthUser = JSON.parse(saved);
        if (parsed.token) {
          const res = await fetch('/api/auth/verify', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${parsed.token}`,
            },
          });
          const data = await safeFetchJson<any>(res);
          if (!data || !data.success) {
            // Token is invalid/expired
            console.warn('Session verification failed, requiring re-authentication');
            setUser(null);
            localStorage.removeItem('auth_user');
          } else if (data.user) {
            setUser({ ...parsed, ...data.user });
          }
        }
      } catch (err) {
        console.warn('Session check error:', err);
      }
    };

    verifySavedSession();
  }, []);

  // Check Server Environment Secrets & Status (Supabase & Gemini on Server)
  const checkServerStatus = useCallback(async () => {
    try {
      const data = await safeFetchJson<any>('/api/health');
      setServerStatus({
        hasGeminiKey: Boolean(data?.hasGeminiKey),
        hasSupabase: Boolean(data?.hasSupabase),
        supabaseTable: data?.supabaseTable || 'invoicing_data',
      });
    } catch (err) {
      console.warn('Health check error:', err);
    }
  }, []);

  useEffect(() => {
    checkServerStatus();
  }, [checkServerStatus, isSupabaseModalOpen]);

  // Load Invoices from server-side database endpoint
  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const json = await safeFetchJson<any>('/api/invoicing-data');
      if (json && json.success && Array.isArray(json.data)) {
        setInvoices(json.data);
      }
    } catch (err) {
      console.error('Failed to load invoicing data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchInvoices();
    }
  }, [user, fetchInvoices]);

  // Handle Login
  const handleLoginSuccess = (authUser: AuthUser) => {
    setUser(authUser);
    localStorage.setItem('auth_user', JSON.stringify(authUser));
  };

  // Handle Logout
  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    setUser(null);
    localStorage.removeItem('auth_user');
  };

  // Handle Parse Success (from Screen 1)
  const handleParseSuccess = (newRecords: InvoiceRecord[]) => {
    fetchInvoices();
    if (window.innerWidth < 768) {
      setActiveView('screen2');
    }
  };

  // Handle Update Invoice (Screen 2 inline spreadsheet edits)
  const handleUpdateInvoice = async (id: string, updatedFields: Partial<InvoiceRecord>) => {
    // 1. Optimistic UI update
    setInvoices((prev) =>
      prev.map((inv) => (inv.id === id ? { ...inv, ...updatedFields } : inv))
    );

    // 2. Persist to server / Supabase invoicing_data table
    setSavingId(id);
    try {
      await fetch(`/api/invoicing-data/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedFields),
      });
    } catch (err) {
      console.error('Error saving invoice update:', err);
    } finally {
      setTimeout(() => setSavingId(null), 500);
    }
  };

  // Handle Delete Invoice
  // 1. Triggers Supabase DB deletion call using the record's unique identifier
  // 2. Once the deletion is successful, the record is removed from the UI
  // 3. Handles database deletion failures gracefully and does NOT remove the row if DB operation fails
  const handleDeleteInvoice = async (id: string) => {
    try {
      const result = await safeFetchJson<any>(`/api/invoicing-data/${id}`, {
        method: 'DELETE',
      });

      if (!result || !result.success) {
        throw new Error(result?.error || 'Failed to permanently delete record from database.');
      }

      // Successful deletion in DB: now safely remove row from UI
      setInvoices((prev) => prev.filter((inv) => inv.id !== id && inv.invoice !== id));
    } catch (err: any) {
      console.error('Error deleting invoice from database:', err);
      // Graceful error notification; row is retained in UI
      alert(`Database deletion failed: ${err.message || 'Network error'}. The record has not been removed.`);
    }
  };

  // Handle Add Manual Row
  const handleAddManualRow = async () => {
    const newInvoice: InvoiceRecord = {
      id: `inv-${Date.now()}`,
      invoice: `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      amount: 0,
      vendor: 'New Vendor',
      category: 'Software & SaaS',
      date: new Date().toISOString().slice(0, 10),
      rawSnippet: 'Manual entry created in spreadsheet UI',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setInvoices((prev) => [newInvoice, ...prev]);

    try {
      await fetch('/api/invoicing-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newInvoice),
      });
    } catch (err) {
      console.error('Error saving new invoice row:', err);
    }
  };

  // If not authenticated, STRICTLY show Login Form only
  if (!user) {
    return <LoginForm onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-[#E4E3E0] flex flex-col font-sans text-[#141414]">
      {/* Global Header */}
      <Header
        user={user}
        onLogout={handleLogout}
        onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
        supabaseConnected={serverStatus.hasSupabase}
        activeView={activeView}
        setActiveView={setActiveView}
        recordCount={invoices.length}
      />

      {/* Main Workspace Layout */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto p-3 sm:p-4 md:p-6 flex flex-col">
        {activeView === 'split' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6 flex-1 items-start">
            {/* Screen 1: Raw Data Ingest (4.5 cols on desktop) */}
            <div className="lg:col-span-5 h-full flex flex-col">
              <Screen1Input
                onParseSuccess={handleParseSuccess}
                onLogout={handleLogout}
              />
            </div>

            {/* Screen 2: Interactive InvoicingData Spreadsheet (7.5 cols on desktop) */}
            <div className="lg:col-span-7 h-full flex flex-col">
              <Screen2Spreadsheet
                invoices={invoices}
                loading={loading}
                savingId={savingId}
                onUpdateInvoice={handleUpdateInvoice}
                onDeleteInvoice={handleDeleteInvoice}
                onAddManualRow={handleAddManualRow}
                onRefresh={fetchInvoices}
                onLogout={handleLogout}
              />
            </div>
          </div>
        )}

        {activeView === 'screen1' && (
          <div className="max-w-3xl mx-auto w-full flex-1">
            <Screen1Input
              onParseSuccess={handleParseSuccess}
              onLogout={handleLogout}
            />
          </div>
        )}

        {activeView === 'screen2' && (
          <div className="w-full flex-1">
            <Screen2Spreadsheet
              invoices={invoices}
              loading={loading}
              savingId={savingId}
              onUpdateInvoice={handleUpdateInvoice}
              onDeleteInvoice={handleDeleteInvoice}
              onAddManualRow={handleAddManualRow}
              onRefresh={fetchInvoices}
              onLogout={handleLogout}
            />
          </div>
        )}
      </main>

      {/* Database & Vercel Secrets Status / SQL Modal */}
      <SupabaseModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
        serverStatus={serverStatus}
        onRefreshStatus={checkServerStatus}
      />
    </div>
  );
}
