import React, { useState } from 'react';
import { Lock, Mail, ArrowRight, ShieldCheck, User, AlertCircle, CheckCircle2, UserPlus, LogIn, Database } from 'lucide-react';
import { AuthUser } from '../types';
import { getSupabaseClient } from '../lib/supabase';
import { SupabaseModal } from './SupabaseModal';

interface LoginFormProps {
  onLoginSuccess: (user: AuthUser) => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onLoginSuccess }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    const cleanEmail = email.trim();

    try {
      // 1. Primary Strategy: Authenticate through backend API endpoint
      let serverErrorMsg: string | null = null;
      let serverResponded = false;

      try {
        const endpoint = isSignUp ? '/api/auth/signup' : '/api/auth/login';
        const payload = isSignUp ? { email: cleanEmail, password, fullName } : { email: cleanEmail, password };

        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        // Safely parse JSON or text response to avoid "Unexpected token 'A'" errors
        const responseText = await res.text();
        let data: any = null;
        try {
          data = responseText ? JSON.parse(responseText) : null;
        } catch {
          console.warn('Server returned non-JSON response:', responseText.slice(0, 150));
        }

        if (res.ok && data && data.success) {
          serverResponded = true;
          if (isSignUp) {
            if (data.requiresConfirmation) {
              setSuccessMsg('Account registered! Please check your email inbox to verify your account before logging in.');
              setIsSignUp(false);
              return;
            } else if (data.user) {
              onLoginSuccess(data.user);
              return;
            }
          } else if (data.user) {
            onLoginSuccess(data.user);
            return;
          }
        } else if (data && data.error) {
          serverResponded = true;
          // If the server rejected user credentials explicitly (401 or 400), don't silently fallback
          if (res.status === 401 || (res.status === 400 && !data.error.includes('configured'))) {
            throw new Error(data.error);
          }
          serverErrorMsg = data.error;
        } else {
          serverErrorMsg = `Server response (${res.status}): Serverless function did not return valid JSON.`;
        }
      } catch (serverErr: any) {
        // If this is a real authentication rejection (e.g. invalid password), throw it directly
        if (serverErr.message && (
          serverErr.message.toLowerCase().includes('invalid') ||
          serverErr.message.toLowerCase().includes('password') ||
          serverErr.message.toLowerCase().includes('already registered')
        )) {
          throw serverErr;
        }
        serverErrorMsg = serverErr.message;
        console.warn('Backend server auth failed, testing client-side Supabase client:', serverErr);
      }

      // 2. Secondary Strategy: Direct Client-Side Supabase fallback
      const client = getSupabaseClient();
      if (client) {
        try {
          if (isSignUp) {
            const { data, error: signUpError } = await client.auth.signUp({
              email: cleanEmail,
              password,
              options: {
                data: {
                  full_name: fullName || cleanEmail.split('@')[0],
                },
              },
            });

            if (signUpError) throw new Error(signUpError.message);

            if (data.user && (!data.session || data.user.identities?.length === 0)) {
              setSuccessMsg('Account registered! Please check your email inbox to verify your account before logging in.');
              setIsSignUp(false);
              return;
            }

            if (data.user) {
              const user: AuthUser = {
                id: data.user.id,
                email: data.user.email || cleanEmail,
                name: data.user.user_metadata?.full_name || fullName || cleanEmail.split('@')[0],
                role: 'Finance Lead',
                token: data.session?.access_token,
                isDemo: false,
              };
              onLoginSuccess(user);
              return;
            }
          } else {
            const { data, error: signInError } = await client.auth.signInWithPassword({
              email: cleanEmail,
              password,
            });

            if (signInError) throw new Error(signInError.message);

            if (data.user) {
              const user: AuthUser = {
                id: data.user.id,
                email: data.user.email || cleanEmail,
                name: data.user.user_metadata?.full_name || data.user.user_metadata?.name || cleanEmail.split('@')[0],
                role: 'Finance Lead',
                token: data.session?.access_token,
                isDemo: false,
              };
              onLoginSuccess(user);
              return;
            }
          }
        } catch (clientAuthErr: any) {
          throw clientAuthErr;
        }
      }

      // If both strategies could not authenticate
      if (serverErrorMsg) {
        throw new Error(serverErrorMsg);
      } else {
        throw new Error(
          'Supabase credentials are not configured on Vercel. Please add SUPABASE_URL and SUPABASE_ANON_KEY to your Vercel Project Settings → Environment Variables.'
        );
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your Supabase credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#E4E3E0] flex flex-col justify-center py-12 px-4 sm:px-6 font-sans text-[#141414]">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* App Logo & Header */}
        <div className="flex justify-center mb-3">
          <div className="w-12 h-12 bg-[#141414] flex items-center justify-center text-white font-mono font-bold text-xl rounded-xs shadow-xs">
            FP
          </div>
        </div>
        <h2 className="text-center text-sm font-bold uppercase tracking-widest text-[#141414]">
          FIN-PARSE DATA ENGINE
        </h2>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white border-2 border-[#141414] p-6 sm:p-8">
          {/* Mode Switcher Tabs */}
          <div className="flex border-b border-[#141414] -mx-6 -mt-6 sm:-mx-8 sm:-mt-8 mb-6 bg-gray-50 text-[10px] font-bold uppercase tracking-wider">
            <button
              type="button"
              onClick={() => { setIsSignUp(false); setError(null); setSuccessMsg(null); }}
              className={`flex-1 py-3 px-4 text-center border-r border-[#141414] transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                !isSignUp ? 'bg-[#141414] text-white' : 'hover:bg-gray-200 text-[#141414]'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
            <button
              type="button"
              onClick={() => { setIsSignUp(true); setError(null); setSuccessMsg(null); }}
              className={`flex-1 py-3 px-4 text-center transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                isSignUp ? 'bg-[#141414] text-white' : 'hover:bg-gray-200 text-[#141414]'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Register User</span>
            </button>
          </div>

          {/* Feedback messages */}
          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-500 text-[11px] font-mono text-rose-900 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold">Authentication Error:</strong>
                <p className="mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-500 text-[11px] font-mono text-emerald-900 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>{successMsg}</div>
            </div>
          )}

          <form id="supabase-auth-form" className="space-y-4" onSubmit={handleSubmit}>
            {isSignUp && (
              <div>
                <label htmlFor="full-name" className="block text-[10px] font-bold uppercase tracking-wider text-[#141414] mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <input
                    id="full-name"
                    name="fullName"
                    type="text"
                    autoComplete="name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono bg-white border border-[#141414] text-[#141414] outline-none focus:ring-1 focus:ring-[#141414]"
                    placeholder="John Doe"
                  />
                </div>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-[10px] font-bold uppercase tracking-wider text-[#141414] mb-1">
                Supabase Account Email
              </label>
              <div className="relative">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono bg-white border border-[#141414] text-[#141414] outline-none focus:ring-1 focus:ring-[#141414]"
                  placeholder="your-supabase-user@example.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-[10px] font-bold uppercase tracking-wider text-[#141414] mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete={isSignUp ? 'new-password' : 'current-password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono bg-white border border-[#141414] text-[#141414] outline-none focus:ring-1 focus:ring-[#141414]"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-[10px] font-mono text-gray-600">
              <span className="flex items-center gap-1 font-semibold uppercase">
                <Lock className="w-3 h-3 text-[#141414]" />
                Supabase Auth RLS
              </span>
            </div>

            <div>
              <button
                id="auth-submit-btn"
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-[#141414] text-white text-xs font-bold uppercase tracking-[0.2em] hover:bg-gray-800 active:bg-black transition-colors cursor-pointer disabled:opacity-50 flex justify-center items-center gap-2"
              >
                {loading ? (
                  <span>AUTHENTICATING...</span>
                ) : (
                  <>
                    <span>{isSignUp ? 'CREATE SUPABASE ACCOUNT' : 'AUTHENTICATE & ENTER'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Security & Project Status Footer */}
          <div className="mt-5 pt-4 border-t border-gray-200 flex flex-col items-center gap-2 text-[10px] font-mono text-gray-500">
            <div className="flex items-center justify-center gap-1.5 uppercase">
              <ShieldCheck className="w-3.5 h-3.5 text-green-700" />
              <span>AUTHENTICATED VIA SUPABASE SECRETS</span>
            </div>
            <button
              type="button"
              onClick={() => setIsSupabaseModalOpen(true)}
              className="text-[10px] text-gray-600 hover:text-black hover:underline flex items-center gap-1 mt-1 cursor-pointer font-bold uppercase tracking-wider"
            >
              <Database className="w-3 h-3 text-blue-600" />
              <span>Vercel Environment Setup & SQL Schema</span>
            </button>
          </div>
        </div>
      </div>

      <SupabaseModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
      />
    </div>
  );
};
