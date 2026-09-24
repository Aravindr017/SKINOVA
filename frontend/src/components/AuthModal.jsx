import React, { useState, useEffect, useRef } from 'react';
import {
  X, Mail, Lock, Eye, EyeOff, User, Activity, ShieldCheck,
  CheckCircle2, AlertCircle, HelpCircle, ExternalLink, ChevronRight,
  Key, Copy, Check
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
  const [hasGsiButton, setHasGsiButton]         = useState(false);
  const [copiedStep, setCopiedStep]             = useState(null);
  const googleBtnRef                            = useRef(null);

  // Read Google Client ID from environment or user provided client id
  const envClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '214708130432-6hqa6padbocn27dfj259megu3uvje88v.apps.googleusercontent.com';

  // Initialize official Google Identity Services if available
  useEffect(() => {
    const handleGoogleCredential = async (response) => {
      setLoading(true);
      setError('');
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
        console.error('Google Sign-In Error:', err);
        setError(err?.message || 'Google sign in failed. Please use email.');
      } finally {
        setLoading(false);
      }
    };

    if (window.google?.accounts?.id && googleBtnRef.current) {
      try {
        window.google.accounts.id.initialize({
          client_id: envClientId,
          callback: handleGoogleCredential,
          auto_select: false,
          cancel_on_tap_outside: true,
        });
        const btnWidth = typeof window !== 'undefined'
          ? Math.min(Math.max(window.innerWidth - 64, 240), 360)
          : 320;
        window.google.accounts.id.renderButton(googleBtnRef.current, {
          theme: 'outline',
          size: 'large',
          width: btnWidth,
          text: mode === 'register' ? 'signup_with' : 'signin_with',
          shape: 'rectangular',
          logo_alignment: 'left',
        });
        setHasGsiButton(true);
      } catch (e) {
        console.warn('Google GSI button rendering skipped:', e);
        setHasGsiButton(false);
      }
    }
  }, [mode, onLogin, envClientId]);

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

  // Genuine Google OAuth 2.0 Popup Sign-In
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
              setError(`Google Sign-In Notice: ${tokenResponse.error_description || tokenResponse.error}. Ensure http://localhost:5173 is added to Authorized JavaScript Origins in Google Cloud Console.`);
              setShowGuide(true);
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
        window.google.accounts.id.prompt((notification) => {
          setLoading(false);
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            setError('Google Sign-In prompt could not open. Please ensure http://localhost:5173 is added to Authorized JavaScript Origins in Google Cloud Console.');
            setShowGuide(true);
          }
        });
        return;
      } catch (err) {
        setLoading(false);
        setError(err?.message || 'Google Sign-In prompt failed.');
        return;
      }
    }

    setLoading(false);
    setError('Google Identity Services script is loading. Please try again or use email sign in.');
  };

  const copyToClipboard = (text, idx) => {
    navigator.clipboard?.writeText(text);
    setCopiedStep(idx);
    setTimeout(() => setCopiedStep(null), 2000);
  };

  return (
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-box max-w-md w-full animate-fade-up">
        {/* Header */}
        <div className="p-4 sm:p-6 pb-0 flex items-start justify-between">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shadow-xs flex-shrink-0"
              style={{ background: 'linear-gradient(135deg,#14B8A6,#0F766E)' }}
            >
              <Activity size={18} className="text-white"/>
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900" style={{ fontFamily: 'Outfit,sans-serif' }}>
                {mode === 'login' ? 'Welcome to SKINOVA' : 'Create Your Health Account'}
              </h2>
              <p className="text-xs text-slate-500">
                {mode === 'login' ? 'Sign in to access your scans & records' : 'Set up your AI health profile'}
              </p>
            </div>
          </div>
          <button className="btn btn-icon btn-sm btn-ghost" onClick={onClose}><X size={18}/></button>
        </div>

        <div className="p-4 sm:p-6 space-y-4">
          {/* OFFICIAL GOOGLE SIGN IN BUTTON */}
          <div className="space-y-2">
            <div
              ref={googleBtnRef}
              className={`w-full flex justify-center min-h-[44px] ${hasGsiButton ? '' : 'hidden'}`}
            />

            {!hasGsiButton && (
              <button
                type="button"
                className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl font-semibold text-xs sm:text-sm transition-all border hover:bg-slate-50 hover:shadow-xs active:scale-[0.99]"
                style={{ border: '1.5px solid #E2E8F0', color: '#1E293B', background: '#fff' }}
                onClick={handleGoogleSignIn}
                disabled={loading}
              >
                <svg width="18" height="18" viewBox="0 0 48 48">
                  <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.9 7.2v6h7.9c4.6-4.2 7.3-10.5 7.3-17.2z"/>
                  <path fill="#34A853" d="M24 47c6.5 0 11.9-2.1 15.8-5.8l-7.9-6c-2.1 1.4-4.8 2.3-7.9 2.3-6.1 0-11.2-4.1-13.1-9.6H2.7v6.2C6.6 41.9 14.7 47 24 47z"/>
                  <path fill="#FBBC05" d="M10.9 28.8c-.5-1.4-.7-2.8-.7-4.3s.2-3 .7-4.3V14H2.7C1 17.2 0 20.5 0 24s1 6.8 2.7 10l8.2-5.2z"/>
                  <path fill="#EA4335" d="M24 9.5c3.4 0 6.5 1.2 8.9 3.5l6.6-6.6C35.9 2.6 30.5 0 24 0 14.7 0 6.6 5.1 2.7 12.5l8.2 5.2C12.8 13.6 17.9 9.5 24 9.5z"/>
                </svg>
                <span>Continue with Google</span>
              </button>
            )}

            {/* Helper link for Google Cloud Console Setup */}
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => setShowGuide(!showGuide)}
                className="text-[11px] text-teal-700 hover:text-teal-900 hover:underline flex items-center gap-1 font-medium transition-colors"
              >
                <HelpCircle size={12} />
                <span>Want to connect your Google Cloud Client ID? Guide</span>
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
                  Click <strong>Create Credentials</strong> &gt; <strong>OAuth client ID</strong>.
                </li>
                <li>
                  Select Application type: <strong>Web application</strong>.
                </li>
                <li>
                  Under <strong>Authorized JavaScript origins</strong>, add:
                  <div className="flex items-center gap-2 mt-1 bg-white p-1.5 rounded-lg border border-slate-200">
                    <code className="text-teal-700 font-mono text-[10px] flex-1">http://localhost:5173</code>
                    <button
                      type="button"
                      onClick={() => copyToClipboard('http://localhost:5173', 1)}
                      className="text-slate-400 hover:text-teal-600"
                      title="Copy origin"
                    >
                      {copiedStep === 1 ? <Check size={12} className="text-green-600"/> : <Copy size={12}/>}
                    </button>
                  </div>
                </li>
                <li>
                  Save and copy your <strong>Client ID</strong>, then paste into <code>frontend/.env</code>:
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

          <div className="relative my-2">
            <div className="divider my-0"/>
            <span className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-3 text-xs text-slate-400 font-medium">
              or continue with email
            </span>
          </div>

          {/* Mode Switch Tabs */}
          <div className="tab-nav">
            <button
              type="button"
              className={`tab-btn ${mode === 'login' ? 'active' : ''}`}
              onClick={() => { setMode('login'); setError(''); setSuccessMsg(''); }}
            >
              Sign In
            </button>
            <button
              type="button"
              className={`tab-btn ${mode === 'register' ? 'active' : ''}`}
              onClick={() => { setMode('register'); setError(''); setSuccessMsg(''); }}
            >
              Create Account
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {mode === 'register' && (
              <div>
                <label className="label">Full Name</label>
                <div className="relative">
                  <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                  <input
                    className="input pl-9"
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
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                <input
                  className="input pl-9"
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
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                <input
                  className="input pl-9 pr-10"
                  type={showPwd ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  onClick={() => setShowPwd(!showPwd)}
                >
                  {showPwd ? <EyeOff size={15}/> : <Eye size={15}/>}
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
                  <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                  <input
                    className="input pl-9"
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
              <div className="p-3 rounded-xl text-xs sm:text-sm text-red-700 flex items-center gap-2" style={{ background: '#FFF5F5', border: '1px solid #FCA5A5' }}>
                <AlertCircle size={15} className="flex-shrink-0 text-red-500" />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 rounded-xl text-xs sm:text-sm text-green-700 flex items-center gap-2" style={{ background: '#F0FDF4', border: '1px solid #86EFAC' }}>
                <CheckCircle2 size={15} className="flex-shrink-0 text-green-500" />
                <span>{successMsg}</span>
              </div>
            )}

            <button type="submit" className="btn btn-primary btn-lg w-full" disabled={loading}>
              {loading ? 'Processing…' : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          {/* Privacy note */}
          <div className="flex items-center gap-2 p-2.5 rounded-xl" style={{ background: '#F0FDFA', border: '1px solid #99F6E4' }}>
            <ShieldCheck size={14} className="text-teal-600 flex-shrink-0"/>
            <p className="text-xs text-teal-700">Protected with 256-bit encryption. Private and HIPAA compliant.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
