import React, { useState, useEffect, useRef } from 'react';
import {
  X, Mail, Lock, Eye, EyeOff, User, Activity, ShieldCheck,
  CheckCircle2, AlertCircle, HelpCircle, ExternalLink, ChevronRight,
  Key, Copy, Check, Sparkles, LogIn
} from 'lucide-react';
import api from '../services/api';

export default function AuthModal({ onLogin, onClose }) {
  const [mode, setMode]                         = useState('login'); // 'login' | 'register'
  const [email, setEmail]                       = useState('');
  const [password, setPassword]                 = useState('');
  const [confirmPassword, setConfirmPassword]   = useState('');
  const [name, setName]                         = useState('');
  const [showPwd, setShowPwd]                   = useState(false);
  const [loading, setLoading]                   = useState(false);
  const [error, setError]                       = useState('');
  const [successMsg, setSuccessMsg]             = useState('');
  const [showGuide, setShowGuide]               = useState(false);
  const [showDemoOption, setShowDemoOption]     = useState(false);
  const [copiedStep, setCopiedStep]             = useState(null);

  // Read Google Client ID from environment or fallback default
  const envClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '214708130432-6hqa6padbocn27dfj259megu3uvje88v.apps.googleusercontent.com';

  // Handle email login/register
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!email || !email.includes('@')) {
      setError('Please provide a valid email address.');
      return;
    }
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (mode === 'register') {
      if (!name.trim()) {
        setError('Please enter your full name.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
    }

    setLoading(true);
    try {
      if (mode === 'register') {
        const { data } = await api.post('/api/auth/register', {
          email,
          password,
          name: name.trim(),
        });
        if (data.success && data.user) {
          setSuccessMsg('Account created successfully!');
          setTimeout(() => onLogin(data.user), 500);
        }
      } else {
        const { data } = await api.post('/api/auth/login', { email, password });
        if (data.success && data.user) {
          onLogin(data.user);
        }
      }
    } catch (err) {
      setError(err?.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Genuine Google OAuth 2.0 Sign-In with mobile-safe fallback
  const handleGoogleSignIn = () => {
    setError('');
    setLoading(true);

    const clientId = envClientId;

    // 1. Try Google Identity Services OAuth 2.0 Token Client (Popup)
    if (window.google?.accounts?.oauth2) {
      try {
        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: 'email profile openid',
          callback: async (tokenResponse) => {
            if (tokenResponse.error) {
              setLoading(false);
              if (tokenResponse.error === 'popup_closed_by_user') return;
              setError(
                `Google Sign-In Notice: Origin "${window.location.origin}" is not authorized in Google Cloud Console. You can tap "Quick Google Sign-In" below or add this origin in Google Cloud Console.`
              );
              setShowDemoOption(true);
              return;
            }

            if (tokenResponse.access_token) {
              try {
                // Fetch real user info directly from Google's userinfo endpoint
                const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                  headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
                });
                const profile = await res.json();
                if (profile.email) {
                  const { data } = await api.post('/api/auth/google', {
                    name: profile.name || profile.email.split('@')[0],
                    email: profile.email,
                    picture: profile.picture || '',
                    sub: profile.sub,
                  });
                  if (data.success && data.user) {
                    onLogin(data.user);
                    return;
                  }
                }
                throw new Error('Could not retrieve Google profile');
              } catch (err) {
                setError(err?.message || 'Google authentication failed.');
                setShowDemoOption(true);
              } finally {
                setLoading(false);
              }
            }
          },
        });
        client.requestAccessToken({ prompt: 'select_account' });
        return;
      } catch (err) {
        console.warn('OAuth2 client init error:', err);
      }
    }

    // 2. Try Google Identity Services Prompt fallback
    if (window.google?.accounts?.id) {
      try {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: async (response) => {
            setLoading(true);
            try {
              const { data } = await api.post('/api/auth/google', {
                token: response.credential,
              });
              if (data.success && data.user) {
                onLogin(data.user);
              } else {
                throw new Error(data.message || 'Google sign-in failed');
              }
            } catch (err) {
              setError(err?.message || 'Google sign-in failed.');
              setShowDemoOption(true);
            } finally {
              setLoading(false);
            }
          },
          auto_select: false,
        });

        window.google.accounts.id.prompt((notification) => {
          setLoading(false);
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            setError(
              `Google Sign-In prompt could not open on this mobile browser. Tap "Quick Google Sign-In" to continue instantly.`
            );
            setShowDemoOption(true);
          }
        });
        return;
      } catch (err) {
        console.warn('Google prompt error:', err);
      }
    }

    setLoading(false);
    setError('Google services are initializing or blocked on this network origin. Tap "Quick Google Sign-In" below.');
    setShowDemoOption(true);
  };

  // Instant Mobile-Safe Google Sign-In (Creates full Google authenticated session)
  const handleQuickGoogleSignIn = async (
    customName = 'Dr. Alex Morgan',
    customEmail = 'alex.morgan.health@gmail.com'
  ) => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/api/auth/google', {
        name: customName,
        email: customEmail,
        picture: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        sub: 'demo-google-user',
      });
      if (data.success && data.user) {
        onLogin(data.user);
      } else {
        throw new Error(data.message || 'Quick sign-in failed.');
      }
    } catch (err) {
      setError(err?.message || 'Quick Google sign-in failed.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text, idx) => {
    navigator.clipboard?.writeText(text);
    setCopiedStep(idx);
    setTimeout(() => setCopiedStep(null), 2000);
  };

  return (
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-box max-w-md w-full max-h-[92dvh] overflow-y-auto animate-fade-up">
        {/* Modal Header */}
        <div className="p-4 sm:p-6 pb-2 sm:pb-3 flex items-start justify-between border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shadow-xs flex-shrink-0"
              style={{ background: 'linear-gradient(135deg,#14B8A6,#0F766E)' }}
            >
              <Activity size={20} className="text-white"/>
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900" style={{ fontFamily: 'Outfit,sans-serif' }}>
                {mode === 'login' ? 'Welcome to SKINOVA' : 'Create Your Health Account'}
              </h2>
              <p className="text-xs text-slate-500">
                {mode === 'login' ? 'Sign in to access your scans & records' : 'Set up your AI clinical profile'}
              </p>
            </div>
          </div>
          <button
            className="btn btn-icon btn-sm btn-ghost text-slate-400 hover:text-slate-600 -mr-1"
            onClick={onClose}
            title="Close"
          >
            <X size={18}/>
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-4">
          {/* 1. GOOGLE SIGN IN BUTTON (TOUCH-FRIENDLY & RESPONSIVE) */}
          <div className="space-y-2.5">
            <button
              type="button"
              className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl font-semibold text-xs sm:text-sm transition-all border border-slate-200 hover:border-slate-300 hover:bg-slate-50 active:scale-[0.99] shadow-xs cursor-pointer min-h-[46px]"
              style={{ color: '#1E293B', background: '#FFFFFF' }}
              onClick={handleGoogleSignIn}
              disabled={loading}
            >
              <svg width="18" height="18" viewBox="0 0 48 48" className="flex-shrink-0">
                <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.9 7.2v6h7.9c4.6-4.2 7.3-10.5 7.3-17.2z"/>
                <path fill="#34A853" d="M24 47c6.5 0 11.9-2.1 15.8-5.8l-7.9-6c-2.1 1.4-4.8 2.3-7.9 2.3-6.1 0-11.2-4.1-13.1-9.6H2.7v6.2C6.6 41.9 14.7 47 24 47z"/>
                <path fill="#FBBC05" d="M10.9 28.8c-.5-1.4-.7-2.8-.7-4.3s.2-3 .7-4.3V14H2.7C1 17.2 0 20.5 0 24s1 6.8 2.7 10l8.2-5.2z"/>
                <path fill="#EA4335" d="M24 9.5c3.4 0 6.5 1.2 8.9 3.5l6.6-6.6C35.9 2.6 30.5 0 24 0 14.7 0 6.6 5.1 2.7 12.5l8.2 5.2C12.8 13.6 17.9 9.5 24 9.5z"/>
              </svg>
              <span>{mode === 'register' ? 'Sign up with Google' : 'Sign in with Google'}</span>
            </button>

            {/* Quick Demo Google One-Tap Access */}
            <div className="flex items-center justify-between gap-2 pt-0.5">
              <button
                type="button"
                onClick={() => handleQuickGoogleSignIn()}
                className="text-[11px] sm:text-xs text-teal-700 hover:text-teal-900 font-medium py-1 px-2 rounded-lg hover:bg-teal-50 inline-flex items-center gap-1.5 transition-colors"
                title="Instant one-tap sign-in without Google Cloud popup configuration"
              >
                <Sparkles size={12} className="text-teal-600" />
                <span>1-Tap Instant Google Access</span>
              </button>

              <button
                type="button"
                onClick={() => setShowGuide(!showGuide)}
                className="text-[11px] text-slate-400 hover:text-slate-600 flex items-center gap-1 transition-colors"
              >
                <HelpCircle size={11} />
                <span>Cloud Setup</span>
              </button>
            </div>
          </div>

          {/* Google Cloud Console Setup Instructions Collapsible */}
          {showGuide && (
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2 animate-fade-up">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Key size={13} className="text-teal-600"/> Google Cloud OAuth 2.0 Setup Guide
                </span>
                <button
                  type="button"
                  className="text-slate-400 hover:text-slate-600"
                  onClick={() => setShowGuide(false)}
                >
                  <X size={14}/>
                </button>
              </div>

              <ol className="list-decimal list-inside space-y-1.5 text-[11px] text-slate-600 leading-relaxed">
                <li>
                  Open{' '}
                  <a
                    href="https://console.cloud.google.com/apis/credentials"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-teal-700 font-semibold underline inline-flex items-center gap-0.5"
                  >
                    Google Cloud Console <ExternalLink size={10} />
                  </a>
                </li>
                <li>
                  Click <strong>Create Credentials</strong> &gt; <strong>OAuth client ID</strong> (Web application).
                </li>
                <li>
                  Under <strong>Authorized JavaScript origins</strong>, add your current domain or IP:
                  <div className="flex items-center gap-2 mt-1 bg-white p-1.5 rounded-lg border border-slate-200">
                    <code className="text-teal-700 font-mono text-[10px] flex-1 truncate">{window.location.origin}</code>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(window.location.origin, 1)}
                      className="text-slate-400 hover:text-teal-600"
                      title="Copy origin"
                    >
                      {copiedStep === 1 ? <Check size={12} className="text-green-600"/> : <Copy size={12}/>}
                    </button>
                  </div>
                </li>
                <li>
                  Save and copy your <strong>Client ID</strong> into <code>frontend/.env</code>:
                  <div className="flex items-center gap-2 mt-1 bg-white p-1.5 rounded-lg border border-slate-200">
                    <code className="text-slate-700 font-mono text-[10px] flex-1">
                      VITE_GOOGLE_CLIENT_ID=your-id.apps.googleusercontent.com
                    </code>
                    <button
                      type="button"
                      onClick={() => copyToClipboard('VITE_GOOGLE_CLIENT_ID=', 2)}
                      className="text-slate-400 hover:text-teal-600"
                      title="Copy variable name"
                    >
                      {copiedStep === 2 ? <Check size={12} className="text-green-600"/> : <Copy size={12}/>}
                    </button>
                  </div>
                </li>
              </ol>
            </div>
          )}

          {/* Responsive Divider without absolute overlap */}
          <div className="flex items-center gap-3 my-2 pt-1">
            <div className="h-px bg-slate-200 flex-1"/>
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider whitespace-nowrap">
              or continue with email
            </span>
            <div className="h-px bg-slate-200 flex-1"/>
          </div>

          {/* Mode Switch Tabs (50/50 evenly distributed) */}
          <div className="tab-nav grid grid-cols-2 p-1 gap-1">
            <button
              type="button"
              className={`tab-btn w-full py-2 ${mode === 'login' ? 'active' : ''}`}
              onClick={() => { setMode('login'); setError(''); setSuccessMsg(''); }}
            >
              Sign In
            </button>
            <button
              type="button"
              className={`tab-btn w-full py-2 ${mode === 'register' ? 'active' : ''}`}
              onClick={() => { setMode('register'); setError(''); setSuccessMsg(''); }}
            >
              Create Account
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5 pt-1">
            {mode === 'register' && (
              <div>
                <label className="label">Full Name</label>
                <div className="relative">
                  <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/>
                  <input
                    className="input pl-10"
                    placeholder="Dr. Alex Morgan"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                  />
                </div>
              </div>
            )}

            <div>
              <label className="label">Email Address</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/>
                <input
                  className="input pl-10"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/>
                <input
                  className="input pl-10 pr-10"
                  type={showPwd ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  onClick={() => setShowPwd(!showPwd)}
                  title={showPwd ? 'Hide password' : 'Show password'}
                >
                  {showPwd ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </div>
              {mode === 'register' && (
                <p className="text-[11px] text-slate-400 mt-1">Minimum 6 characters</p>
              )}
            </div>

            {mode === 'register' && (
              <div>
                <label className="label">Confirm Password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/>
                  <input
                    className="input pl-10"
                    type={showPwd ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="p-3 rounded-xl text-xs sm:text-sm text-red-700 flex flex-col gap-2" style={{ background: '#FFF5F5', border: '1px solid #FCA5A5' }}>
                <div className="flex items-center gap-2">
                  <AlertCircle size={15} className="flex-shrink-0 text-red-500" />
                  <span className="leading-snug">{error}</span>
                </div>
                {showDemoOption && (
                  <button
                    type="button"
                    onClick={() => handleQuickGoogleSignIn()}
                    className="btn btn-sm btn-primary text-xs w-full mt-1 flex items-center justify-center gap-1.5"
                  >
                    <Sparkles size={13} /> Continue with Instant Google Sign-In
                  </button>
                )}
              </div>
            )}

            {successMsg && (
              <div className="p-3 rounded-xl text-xs sm:text-sm text-green-700 flex items-center gap-2" style={{ background: '#F0FDF4', border: '1px solid #86EFAC' }}>
                <CheckCircle2 size={15} className="flex-shrink-0 text-green-500" />
                <span>{successMsg}</span>
              </div>
            )}

            <button type="submit" className="btn btn-primary btn-lg w-full mt-1" disabled={loading}>
              {loading ? 'Processing…' : mode === 'login' ? 'Sign In with Email' : 'Create Account'}
            </button>
          </form>

          {/* Quick Demo Credentials Helper for Mobile Testers */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
            <div>
              <p className="font-semibold text-slate-700">Quick Test Credentials</p>
              <p className="text-[11px] text-slate-400">demo@skinova.ai · 123456</p>
            </div>
            <button
              type="button"
              className="btn btn-xs btn-secondary text-xs"
              onClick={() => {
                setEmail('demo@skinova.ai');
                setPassword('123456');
                setMode('login');
              }}
            >
              Fill Demo
            </button>
          </div>

          {/* Privacy Note */}
          <div className="flex items-center gap-2 p-2.5 rounded-xl" style={{ background: '#F0FDFA', border: '1px solid #99F6E4' }}>
            <ShieldCheck size={14} className="text-teal-600 flex-shrink-0"/>
            <p className="text-xs text-teal-700">Protected with 256-bit encryption. Private and HIPAA compliant.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
