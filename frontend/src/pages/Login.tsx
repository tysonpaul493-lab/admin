import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Shield, AlertCircle, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Login: React.FC = () => {
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();

  // Clean, secure administrator credentials state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [mfaRequired, setMfaRequired] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password.trim()) {
      setError('Please enter your administrator email and password.');
      return;
    }

    try {
      const res = await login(email.trim(), password, mfaRequired ? mfaCode.trim() : undefined);
      if (res.mfa_required) {
        setMfaRequired(true);
        return;
      }
      if (res.success) {
        navigate('/');
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify your credentials.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans">
      {/* Subtle Background Glow */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full relative z-10">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-white border-2 border-slate-200 shadow-md mb-3 overflow-hidden">
            <img src="/app_logo.png" alt="All India Tamil Annai Trust Logo" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-snug">
            ஆல் இந்தியா தமிழ் அன்னை அறக்கட்டளை
          </h1>
          <p className="text-xs sm:text-sm font-bold text-sky-600 mt-1 tracking-wide">
            தமிழ்நாடு அவசர ஊர்தி ஓட்டுநர் கன்சோல்
          </p>
          <div className="inline-block mt-2.5 px-3 py-1 rounded-full bg-white border border-slate-200 text-[11px] text-slate-500 font-medium shadow-xs">
            Restricted Access • Authorized Dispatch Personnel Only
          </div>
        </div>

        {/* Login Box */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 shadow-xl">

          {error && (
            <div className="mb-4 p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 font-mono">
                Staff Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={mfaRequired}
                  className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-300 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 disabled:opacity-50"
                  placeholder="staff.admin@liferoute.org"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 font-mono">
                Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={mfaRequired}
                  className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-300 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 disabled:opacity-50"
                  placeholder="••••••••••••"
                />
              </div>
            </div>

            {/* MFA Code Input (If required) */}
            {mfaRequired && (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-2">
                <div className="flex items-center justify-between text-xs text-amber-800 font-semibold">
                  <span className="flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-amber-600" />
                    Two-Factor TOTP Verification
                  </span>
                </div>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value)}
                  className="w-full text-center tracking-widest font-mono text-lg py-2.5 rounded-xl bg-white border border-amber-300 text-slate-900 focus:outline-none focus:border-teal-600 shadow-xs"
                  placeholder="••••••"
                  autoFocus
                />
                <p className="text-[11px] text-amber-700 text-center">
                  Enter the 6-digit authenticator code assigned to your account.
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 font-bold text-white text-sm transition shadow-md shadow-teal-950/20 flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
            >
              <Lock className="w-4 h-4" />
              {isLoading ? 'Verifying...' : mfaRequired ? 'Verify TOTP & Sign In' : 'Sign In to Command Center'}
            </button>
          </form>
        </div>

        {/* Security Disclaimers */}
        <div className="mt-5 text-center text-xs text-slate-500 space-y-1">
          <p>Protected by LifeRoute Central Hospital Security Gateway.</p>
          <p>All administrative and dispatch sessions are encrypted and audited.</p>
        </div>
      </div>
    </div>
  );
};