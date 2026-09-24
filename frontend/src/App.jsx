import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity, Sparkles, MapPin, Camera, Building2, MessageSquare,
  History, User, Heart, LayoutDashboard, ChevronRight, Bell,
  LogOut, Menu, X, Footprints, Flame, Droplets, Moon, Dumbbell,
  TrendingUp, CheckCircle2, AlertTriangle, Info, ChevronLeft,
  Settings, FileText, Shield, Wifi, WifiOff, Search, ArrowRight,
  Clock
} from 'lucide-react';

import AuthModal from './components/AuthModal';
import ImageUploader from './components/ImageUploader';
import DiagnosisCard from './components/DiagnosisCard';
import HospitalFinder from './components/HospitalFinder';
import BookingModal from './components/BookingModal';
import RAGChatbot from './components/RAGChatbot';
import UserHistory from './components/UserHistory';
import ReportModal from './components/ReportModal';
import UserProfile from './components/UserProfile';
import HealthDashboard from './components/HealthDashboard';
import InteractiveBackground from './components/InteractiveBackground';

import api from './services/api';
import { predictOffline } from './services/offlineScanner';
import { getUserCoordinates, getCityFromCoordinates } from './utils/location';

// ─── Nav Items ──────────────────────────────────────────────
const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'scan', label: 'AI Skin Scan', icon: Camera },
  { id: 'chat', label: 'AI Consultant', icon: MessageSquare },
  { id: 'hospitals', label: 'Find Doctors', icon: Building2 },
  { id: 'health', label: 'Health & Fit', icon: Heart },
  { id: 'history', label: 'My Activity', icon: History },
  { id: 'profile', label: 'My Profile', icon: User },
];

export function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Live Internet Connectivity (Online / Offline) + Manual Demo Toggle
  const [isOnline, setIsOnline] = useState(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));
  const [forceOffline, setForceOffline] = useState(false);
  const effectiveOnline = isOnline && !forceOffline;

  // Location - defaults to Thiruvananthapuram, Kerala until live GPS updates
  const [userLocation, setUserLocation] = useState({ lat: 8.5241, lon: 76.9366, lng: 76.9366 });
  const [locationName, setLocationName] = useState('Thiruvananthapuram, Kerala');

  // Auth
  const [currentUser, setCurrentUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('skinova_user')); } catch { return null; }
  });
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // Scan state
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [diagnosisResult, setDiagnosisResult] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState(null);

  // Query handoff between Search History and Chat / Hospital Finder
  const [activeChatQuery, setActiveChatQuery] = useState('');
  const [activeHospitalQuery, setActiveHospitalQuery] = useState('');

  // User-Isolated State: Scans, Searches, Appointments
  const [bookedAppointments, setBookedAppointments] = useState(() => {
    try {
      const user = JSON.parse(localStorage.getItem('skinova_user'));
      if (user?.id) {
        return JSON.parse(localStorage.getItem(`skinova_appointments_${user.id}`)) || [];
      }
      return JSON.parse(localStorage.getItem('skinova_appointments')) || [];
    } catch { return []; }
  });

  const [scanHistory, setScanHistory] = useState(() => {
    try {
      const user = JSON.parse(localStorage.getItem('skinova_user'));
      if (user?.id) {
        return JSON.parse(localStorage.getItem(`skinova_scans_${user.id}`)) || [];
      }
      return JSON.parse(localStorage.getItem('skinova_scans')) || [];
    } catch { return []; }
  });

  const [searchHistory, setSearchHistory] = useState(() => {
    try {
      const user = JSON.parse(localStorage.getItem('skinova_user'));
      if (user?.id) {
        return JSON.parse(localStorage.getItem(`skinova_searches_${user.id}`)) || [];
      }
      return JSON.parse(localStorage.getItem('skinova_searches')) || [];
    } catch { return []; }
  });

  // Modals
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [selectedHospital, setSelectedHospital] = useState(null);
  const [selectedDoctor, setSelectedDoctor] = useState(null);

  // Notifications
  const [notifCount, setNotifCount] = useState(2);

  // ── Network Connectivity Listener (Live Online / Offline) ──────
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const interval = setInterval(() => {
      if (typeof navigator !== 'undefined') {
        setIsOnline(navigator.onLine);
      }
    }, 4000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  // ── User Data Isolation & Cross-Device Cloud Sync Effect ───────
  useEffect(() => {
    if (currentUser?.id) {
      // 1. Load User Scans from localStorage
      let localScans = [];
      const userScans = localStorage.getItem(`skinova_scans_${currentUser.id}`);
      if (userScans) {
        try { localScans = JSON.parse(userScans); } catch { localScans = []; }
      } else {
        const legacy = localStorage.getItem('skinova_scans');
        if (legacy) {
          try {
            const parsed = JSON.parse(legacy);
            localScans = parsed.filter(s => !s.userId || s.userId === currentUser.id);
            localStorage.setItem(`skinova_scans_${currentUser.id}`, JSON.stringify(localScans));
          } catch { localScans = []; }
        }
      }
      setScanHistory(localScans);

      // 2. Load User Searches from localStorage
      let localSearches = [];
      const userSearches = localStorage.getItem(`skinova_searches_${currentUser.id}`);
      if (userSearches) {
        try { localSearches = JSON.parse(userSearches); } catch { localSearches = []; }
      }
      setSearchHistory(localSearches);

      // 3. Load User Appointments from localStorage
      let localAppts = [];
      const userAppts = localStorage.getItem(`skinova_appointments_${currentUser.id}`);
      if (userAppts) {
        try { localAppts = JSON.parse(userAppts); } catch { localAppts = []; }
      } else {
        const legacyAppts = localStorage.getItem('skinova_appointments');
        if (legacyAppts) {
          try {
            const parsed = JSON.parse(legacyAppts);
            localAppts = parsed.filter(a => !a.userId || a.userId === currentUser.id);
            localStorage.setItem(`skinova_appointments_${currentUser.id}`, JSON.stringify(localAppts));
          } catch { localAppts = []; }
        }
      }
      setBookedAppointments(localAppts);

      // 4. Bi-Directional Cloud Sync (Sync across all devices with same Google Account)
      api.syncUserActivity?.({
        userId: currentUser.id,
        email: currentUser.email,
        scans: localScans,
        searches: localSearches,
        appointments: localAppts,
      }).then(res => {
        if (res?.activity) {
          const act = res.activity;
          if (Array.isArray(act.scans)) {
            setScanHistory(act.scans);
            localStorage.setItem(`skinova_scans_${currentUser.id}`, JSON.stringify(act.scans));
          }
          if (Array.isArray(act.searches)) {
            setSearchHistory(act.searches);
            localStorage.setItem(`skinova_searches_${currentUser.id}`, JSON.stringify(act.searches));
          }
          if (Array.isArray(act.appointments)) {
            setBookedAppointments(act.appointments);
            localStorage.setItem(`skinova_appointments_${currentUser.id}`, JSON.stringify(act.appointments));
          }
        }
      }).catch(err => {
        console.warn('Cross-device cloud sync background warning:', err?.message || err);
      });
    } else {
      // Clean slate when signed out for security and privacy
      setScanHistory([]);
      setSearchHistory([]);
      setBookedAppointments([]);
    }
  }, [currentUser?.id, currentUser?.email]);

  // ── Effects ──────────────────────────────────────────────
  useEffect(() => {
    getUserCoordinates().then(async coords => {
      setUserLocation(coords);
      if (coords.city) {
        setLocationName(coords.city);
      } else {
        try {
          const lon = coords.lon != null ? coords.lon : coords.lng;
          const city = await getCityFromCoordinates(coords.lat, lon);
          setLocationName(city);
        } catch { setLocationName('Your live location'); }
      }
    }).catch(() => setLocationName('Your location'));
  }, []);

  // ── Search & Consultation History Tracking (with Cloud Sync) ─
  const handleRecordSearch = useCallback((query, type = 'ai_consultation', metadata = {}) => {
    if (!query || !query.trim()) return;
    const searchEntry = {
      id: Date.now(),
      query: query.trim(),
      type, // 'ai_consultation' | 'hospital_search'
      date: new Date().toISOString(),
      userId: currentUser?.id || 'guest',
      userEmail: currentUser?.email || 'guest',
      ...metadata,
    };
    setSearchHistory(prev => {
      const filtered = prev.filter(s => !(s.query.toLowerCase() === query.trim().toLowerCase() && s.type === type));
      const updated = [searchEntry, ...filtered].slice(0, 50);
      if (currentUser?.id) {
        localStorage.setItem(`skinova_searches_${currentUser.id}`, JSON.stringify(updated));
        // Cross-device cloud sync
        api.syncUserActivity?.({
          userId: currentUser.id,
          email: currentUser.email,
          searches: updated,
        }).catch(() => {});
      } else {
        localStorage.setItem('skinova_searches_guest', JSON.stringify(updated));
      }
      return updated;
    });
  }, [currentUser]);

  const handleClearSearches = useCallback(() => {
    setSearchHistory([]);
    if (currentUser?.id) {
      localStorage.removeItem(`skinova_searches_${currentUser.id}`);
      api.syncUserActivity?.({
        userId: currentUser.id,
        email: currentUser.email,
        searches: [],
      }).catch(() => {});
    } else {
      localStorage.removeItem('skinova_searches_guest');
    }
  }, [currentUser]);

  const handleDeleteSearch = useCallback((searchId) => {
    setSearchHistory(prev => {
      const updated = prev.filter(s => s.id !== searchId);
      if (currentUser?.id) {
        localStorage.setItem(`skinova_searches_${currentUser.id}`, JSON.stringify(updated));
        api.syncUserActivity?.({
          userId: currentUser.id,
          email: currentUser.email,
          searches: updated,
        }).catch(() => {});
      } else {
        localStorage.setItem('skinova_searches_guest', JSON.stringify(updated));
      }
      return updated;
    });
  }, [currentUser]);

  const handleSelectSearchQuery = useCallback((queryOrItem, explicitType) => {
    const isObj = typeof queryOrItem === 'object' && queryOrItem !== null;
    const query = isObj ? (queryOrItem.query || '') : (queryOrItem || '');
    const type = isObj ? (queryOrItem.type || explicitType) : explicitType;
    const answer = isObj ? (queryOrItem.answer || '') : '';
    const sources = isObj ? (queryOrItem.sources || []) : [];
    const messages = isObj ? (queryOrItem.messages || null) : null;
    const date = isObj ? queryOrItem.date : new Date().toISOString();
    const id = isObj ? queryOrItem.id : Date.now();

    if (type === 'hospital_search') {
      setActiveHospitalQuery(query);
      setActiveTab('hospitals');
    } else {
      setActiveChatQuery({ id, query, answer, sources, messages, date });
      setActiveTab('chat');
    }
  }, []);

  // ── Scans Handlers (with Cloud Sync) ─────────────────────
  const handleClearScans = useCallback(async () => {
    setScanHistory([]);
    if (currentUser?.id) {
      localStorage.removeItem(`skinova_scans_${currentUser.id}`);
      try {
        await api.post('/api/scans/clear', { user_id: currentUser.id });
        api.syncUserActivity?.({
          userId: currentUser.id,
          email: currentUser.email,
          scans: [],
        }).catch(() => {});
      } catch (err) {
        console.warn('Scans clear API error:', err);
      }
    } else {
      localStorage.removeItem('skinova_scans_guest');
    }
  }, [currentUser]);

  const handleDeleteScan = useCallback((scanId) => {
    setScanHistory(prev => {
      const updated = prev.filter(s => s.id !== scanId);
      if (currentUser?.id) {
        localStorage.setItem(`skinova_scans_${currentUser.id}`, JSON.stringify(updated));
        api.syncUserActivity?.({
          userId: currentUser.id,
          email: currentUser.email,
          scans: updated,
        }).catch(() => {});
      } else {
        localStorage.setItem('skinova_scans_guest', JSON.stringify(updated));
      }
      return updated;
    });
  }, [currentUser]);

  const handleLogin = useCallback(user => {
    setCurrentUser(user);
    localStorage.setItem('skinova_user', JSON.stringify(user));
    setAuthModalOpen(false);
  }, []);

  const handleLogout = useCallback(() => {
    setCurrentUser(null);
    localStorage.removeItem('skinova_user');
    setScanHistory([]);
    setSearchHistory([]);
    setBookedAppointments([]);
    setDiagnosisResult(null);
  }, []);

  const handleFileSelect = useCallback((file, url) => {
    setSelectedFile(file);
    setPreviewUrl(url);
    setDiagnosisResult(null);
    setScanError(null);
  }, []);

  const handleScan = useCallback(async () => {
    if (!selectedFile) return;
    if (!currentUser) { setAuthModalOpen(true); return; }
    setIsScanning(true);
    setScanError(null);
    try {
      let data;
      if (!effectiveOnline) {
        // 100% In-Browser Offline On-Device Inference via WebAssembly ONNX
        data = await predictOffline(selectedFile);
      } else {
        try {
          const formData = new FormData();
          formData.append('file', selectedFile);
          const res = await api.post('/api/predict', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 60000,
          });
          data = res.data;
        } catch (netErr) {
          // If network error (backend down or lost connection), seamlessly run offline on-device!
          console.warn('[SKINOVA] Cloud scan failed, falling back to local on-device inference:', netErr);
          data = await predictOffline(selectedFile);
        }
      }

      // Normalize: ensure frontend-friendly field names exist alongside backend ones
      const normalized = {
        ...data,
        prediction: data.prediction || data.class_name || 'Unknown',
        confidence: data.confidence ?? 0,
        top_classes: data.top_classes || (data.all_probabilities || []).map(p => [p.name || p.class_code, (p.probability || p.percentage / 100) || 0]),
        llm_summary: data.llm_summary || data.description || '',
        risk_level: (data.risk_level || 'moderate').toLowerCase().split(' ')[0],
        icd_code: data.icd_code || null,
      };
      setDiagnosisResult(normalized);
      const entry = {
        id: Date.now(),
        date: new Date().toISOString(),
        prediction: normalized.prediction,
        confidence: normalized.confidence,
        risk_level: normalized.risk_level,
        predicted_class: data.predicted_class,
        previewUrl,
        userId: currentUser.id,
        userEmail: currentUser.email,
        isOffline: Boolean(data.is_offline),
      };
      setScanHistory(h => {
        const updated = [entry, ...h.filter(s => s.id !== entry.id)].slice(0, 50);
        if (currentUser?.id) {
          localStorage.setItem(`skinova_scans_${currentUser.id}`, JSON.stringify(updated));
          // Cross-device cloud sync if online
          if (effectiveOnline) {
            api.syncUserActivity?.({
              userId: currentUser.id,
              email: currentUser.email,
              scans: updated,
            }).catch(() => {});
          }
        } else {
          localStorage.setItem('skinova_scans_guest', JSON.stringify(updated));
        }
        return updated;
      });
    } catch (err) {
      setScanError(err?.message || 'Scan failed. Please try again.');
    } finally {
      setIsScanning(false);
    }
  }, [selectedFile, currentUser, previewUrl, effectiveOnline]);

  const handleBookAppointment = useCallback((hospital, doctor) => {
    setSelectedHospital(hospital);
    setSelectedDoctor(doctor);
    if (!currentUser) { setAuthModalOpen(true); return; }
    setBookingModalOpen(true);
  }, [currentUser]);

  const handleConfirmBooking = useCallback(booking => {
    const newBooking = {
      ...booking,
      id: Date.now(),
      userId: currentUser?.id,
      userEmail: currentUser?.email,
      status: 'confirmed'
    };
    setBookedAppointments(prev => {
      const updated = [newBooking, ...prev];
      if (currentUser?.id) {
        localStorage.setItem(`skinova_appointments_${currentUser.id}`, JSON.stringify(updated));
        // Cross-device cloud sync
        api.syncUserActivity?.({
          userId: currentUser.id,
          email: currentUser.email,
          appointments: updated,
        }).catch(() => {});
      }
      return updated;
    });
    setBookingModalOpen(false);
  }, [currentUser]);

  // ── Dashboard ──────────────────────────────────────────────
  const DashboardView = () => (
    <div className="space-y-5 sm:space-y-6 animate-fade-up">
      {/* Offline Alert Banner */}
      {!isOnline && (
        <div className="card p-3 sm:p-4 border-amber-300 bg-amber-50 flex items-center justify-between gap-3 text-amber-800 animate-pulse">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
            </span>
            <div>
              <p className="text-xs sm:text-sm font-semibold text-amber-900">Offline Mode Active</p>
              <p className="text-[11px] sm:text-xs text-amber-700">You are browsing offline. Cached scans, reports, and search histories remain accessible.</p>
            </div>
          </div>
          <span className="badge text-[10px] bg-amber-200 text-amber-900 font-bold uppercase tracking-wider flex-shrink-0">Offline</span>
        </div>
      )}

      {/* Hero */}
      <div className="card p-4 sm:p-6 overflow-hidden relative"
        style={{ background: 'linear-gradient(135deg, #0D9488 0%, #0891B2 100%)' }}>
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 80% 50%, white 0%, transparent 60%)' }}>
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="badge text-[11px] py-0.5" style={{ background: 'rgba(255,255,255,0.2)', color: '#fff' }}>
              ✦ AI-Powered
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white mb-1" style={{ fontFamily: 'Outfit,sans-serif' }}>
            Good {getGreeting()}, {currentUser?.name?.split(' ')[0] || 'there'} 👋
          </h1>
          <p className="text-teal-100 text-xs sm:text-sm mb-3.5 sm:mb-4 truncate max-w-lg">
            Your health dashboard is ready. {locationName && `📍 ${locationName}`}
          </p>
          <div className="flex gap-2 sm:gap-3 flex-wrap">
            <button className="btn btn-sm text-xs sm:text-sm" onClick={() => setActiveTab('scan')}
              style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)' }}>
              <Camera size={14} /> Start Scan
            </button>
            <button className="btn btn-sm text-xs sm:text-sm" onClick={() => setActiveTab('chat')}
              style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}>
              <MessageSquare size={14} /> Ask AI
            </button>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="stats-grid">
        {[
          { label: 'Scans Done', value: scanHistory.length, icon: Camera, color: '#0D9488', bg: '#F0FDFA' },
          { label: 'Appointments', value: bookedAppointments.length, icon: Building2, color: '#0284C7', bg: '#F0F9FF' },
          { label: 'AI Consults', value: searchHistory.length, icon: MessageSquare, color: '#7C3AED', bg: '#F5F3FF' },
          { label: 'Reports Saved', value: scanHistory.length, icon: FileText, color: '#D97706', bg: '#FFFBEB' },
        ].map((stat, i) => (
          <div key={stat.label} className={`stat-card animate-fade-up delay-${(i + 1) * 100}`}>
            <div className="stat-icon" style={{ background: stat.bg }}>
              <stat.icon size={18} style={{ color: stat.color }} />
            </div>
            <div className="stat-value">{stat.value}</div>
            <div className="stat-label">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="card p-4 sm:p-5">
        <h2 className="text-sm sm:text-base font-semibold text-slate-700 mb-3 sm:mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
          {[
            { label: 'Skin Analysis', icon: Camera, tab: 'scan', color: '#0D9488', bg: '#F0FDFA' },
            { label: 'AI Consultant', icon: MessageSquare, tab: 'chat', color: '#7C3AED', bg: '#F5F3FF' },
            { label: 'Find Doctors', icon: MapPin, tab: 'hospitals', color: '#0284C7', bg: '#F0F9FF' },
            { label: 'Health Tracker', icon: Heart, tab: 'health', color: '#E11D48', bg: '#FFF1F2' },
          ].map(a => (
            <button key={a.label} onClick={() => setActiveTab(a.tab)}
              className="card-sm p-3 sm:p-4 flex flex-col items-center gap-1.5 sm:gap-2 cursor-pointer card-interactive transition-all">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: a.bg }}>
                <a.icon size={17} style={{ color: a.color }} />
              </div>
              <span className="text-[11px] sm:text-xs font-semibold text-slate-600 text-center leading-tight">{a.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Recent History */}
      {scanHistory.length > 0 && (
        <div className="card p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h2 className="text-sm sm:text-base font-semibold text-slate-700">Recent Scans</h2>
            <button className="btn btn-sm btn-ghost text-xs" onClick={() => setActiveTab('history')}>
              View all <ChevronRight size={13} />
            </button>
          </div>
          <div className="space-y-2.5 sm:space-y-3">
            {scanHistory.slice(0, 3).map(scan => (
              <div key={scan.id} className="flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
                <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-teal-50 border border-teal-100 flex items-center justify-center">
                  {scan.previewUrl ? (
                    <img 
                      src={scan.previewUrl} 
                      alt="" 
                      className="w-full h-full object-cover" 
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  ) : (
                    <Sparkles size={16} className="text-teal-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-semibold text-slate-800 truncate">{scan.prediction}</p>
                  <p className="text-[10px] sm:text-xs text-slate-500">{new Date(scan.date).toLocaleDateString()}</p>
                </div>
                <span className={`badge flex-shrink-0 text-[10px] ${scan.risk_level === 'low' ? 'badge-success' : scan.risk_level === 'high' ? 'badge-danger' : 'badge-warning'}`}>
                  {scan.risk_level}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No scan CTA */}
      {scanHistory.length === 0 && (
        <div className="card p-6 sm:p-8 text-center">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-teal-50 flex items-center justify-center mx-auto mb-3 sm:mb-4">
            <Sparkles size={24} className="text-teal-600" />
          </div>
          <h3 className="text-base sm:text-lg font-bold text-slate-800 mb-1 sm:mb-2">Start your first scan</h3>
          <p className="text-xs sm:text-sm text-slate-500 mb-4 max-w-sm mx-auto">Upload a skin image and let our AI detect conditions instantly with clinical-grade accuracy.</p>
          <button className="btn btn-primary btn-sm sm:btn-md" onClick={() => setActiveTab('scan')}>
            <Camera size={15} /> Scan Now
          </button>
        </div>
      )}
    </div>
  );

  // ── Scan View ──────────────────────────────────────────────
  const ScanView = () => (
    <div className="space-y-4 sm:space-y-5 animate-fade-up">
      <div>
        <h1 className="text-lg sm:text-xl font-bold text-slate-900">AI Skin Analysis</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Upload a dermoscopic or clinical skin image for instant AI diagnosis</p>
      </div>

      {!currentUser && (
        <div className="card p-3.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3" style={{ borderColor: '#FDE68A', background: '#FFFBEB' }}>
          <div className="flex items-center gap-2.5">
            <AlertTriangle size={18} className="text-amber-500 flex-shrink-0" />
            <div>
              <p className="text-xs sm:text-sm font-semibold text-amber-800">Sign in to save results</p>
              <p className="text-[11px] sm:text-xs text-amber-600 mt-0.5">Your scan history and reports will be saved when you're signed in.</p>
            </div>
          </div>
          <button className="btn btn-sm sm:ml-auto w-full sm:w-auto" onClick={() => setAuthModalOpen(true)}
            style={{ background: '#D97706', color: '#fff' }}>Sign In</button>
        </div>
      )}

      <ImageUploader
        onFileSelect={handleFileSelect}
        selectedFile={selectedFile}
        previewUrl={previewUrl}
        isScanning={isScanning}
        onScan={handleScan}
        isOnline={effectiveOnline}
      />

      {scanError && (
        <div className="card p-3.5 sm:p-4 flex items-center gap-3" style={{ borderColor: '#FCA5A5', background: '#FFF5F5' }}>
          <AlertTriangle size={18} className="text-red-500 flex-shrink-0" />
          <p className="text-xs sm:text-sm text-red-700">{scanError}</p>
        </div>
      )}

      {diagnosisResult && (
        <DiagnosisCard
          result={diagnosisResult}
          userLocation={userLocation}
          locationName={locationName}
          onViewReport={() => setReportModalOpen(true)}
          onFindHospital={() => setActiveTab('hospitals')}
          onBookAppointment={handleBookAppointment}
        />
      )}
    </div>
  );

  return (
    <InteractiveBackground>
      <div className="flex h-screen overflow-hidden bg-transparent">
      {/* ── Desktop Sidebar ─────────────────────────── */}
      <aside className="sidebar-desktop w-64 h-full flex-shrink-0 border-r flex flex-col"
        style={{ background: '#fff', borderColor: '#E2E8F0' }}>
        {/* Logo (Clickable to Dashboard) */}
        <div
          className="p-5 border-b cursor-pointer hover:bg-slate-50 transition-colors"
          style={{ borderColor: '#E2E8F0' }}
          onClick={() => setActiveTab('dashboard')}
          title="Return to Dashboard"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center transition-transform hover:scale-105"
              style={{ background: 'linear-gradient(135deg,#14B8A6,#0F766E)' }}>
              <Activity size={18} className="text-white" />
            </div>
            <div>
              <span className="font-bold text-slate-900 text-base" style={{ fontFamily: 'Outfit,sans-serif' }}>
                SKINOVA
              </span>
              <p className="text-xs text-slate-400">AI Dermatology</p>
            </div>
          </div>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              className={`sidebar-link ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              <item.icon size={18} className="flex-shrink-0" />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* User Card */}
        <div className="p-4 border-t" style={{ borderColor: '#E2E8F0' }}>
          {currentUser ? (
            <div className="flex items-center gap-3">
              <img src={currentUser.picture} alt={currentUser.name}
                className="w-9 h-9 rounded-full object-cover flex-shrink-0 border-2"
                style={{ borderColor: '#CCFBF1' }}
                onError={e => { e.target.style.display = 'none'; }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">{currentUser.name}</p>
                <p className="text-xs text-slate-400 truncate">{currentUser.email}</p>
              </div>
              <button className="btn btn-icon btn-sm btn-ghost" title="Sign out" onClick={handleLogout}>
                <LogOut size={15} />
              </button>
            </div>
          ) : (
            <button className="btn btn-primary w-full" onClick={() => setAuthModalOpen(true)}>
              Sign In
            </button>
          )}
        </div>
      </aside>

      {/* ── Mobile Sidebar Drawer ───────────────────── */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity"
            onClick={() => setSidebarOpen(false)} />
          <aside className="relative z-50 w-72 max-w-[84vw] h-full flex flex-col border-r animate-slide-left shadow-2xl"
            style={{ background: '#fff', borderColor: '#E2E8F0' }}>
            <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: '#E2E8F0' }}>
              <div
                className="flex items-center gap-2.5 cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => { setActiveTab('dashboard'); setSidebarOpen(false); }}
                title="Return to Dashboard"
              >
                <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg,#14B8A6,#0F766E)' }}>
                  <Activity size={16} className="text-white" />
                </div>
                <span className="font-bold text-slate-900 text-base" style={{ fontFamily: 'Outfit,sans-serif' }}>SKINOVA</span>
              </div>
              <button className="btn btn-icon btn-sm btn-ghost" onClick={() => setSidebarOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
              {NAV_ITEMS.map(item => (
                <button
                  key={item.id}
                  className={`sidebar-link ${activeTab === item.id ? 'active' : ''}`}
                  onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
                >
                  <item.icon size={18} className="flex-shrink-0" />
                  <span className="truncate">{item.label}</span>
                  {activeTab === item.id && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-teal-600" />
                  )}
                </button>
              ))}
            </nav>
            <div className="p-4 border-t" style={{ borderColor: '#E2E8F0' }}>
              {currentUser ? (
                <div className="flex items-center gap-3">
                  <img src={currentUser.picture} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                    onError={e => { e.target.style.display = 'none'; }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{currentUser.name}</p>
                    <p className="text-xs text-slate-400 truncate">{currentUser.email}</p>
                  </div>
                  <button className="btn btn-icon btn-sm btn-ghost" onClick={handleLogout} title="Sign Out">
                    <LogOut size={15} />
                  </button>
                </div>
              ) : (
                <button className="btn btn-primary w-full" onClick={() => { setAuthModalOpen(true); setSidebarOpen(false); }}>
                  Sign In
                </button>
              )}
            </div>
          </aside>
        </div>
      )}

      {/* ── Main Area ───────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="flex-shrink-0 h-14 flex items-center justify-between gap-2 px-3 sm:px-6 border-b"
          style={{ background: '#fff', borderColor: '#E2E8F0' }}>
          <div className="flex items-center gap-2 min-w-0">
            {/* Mobile menu hamburger */}
            <button className="btn btn-icon btn-sm btn-ghost md:hidden flex-shrink-0" onClick={() => setSidebarOpen(true)} title="Open Navigation Menu">
              <Menu size={19} />
            </button>

            {/* Brand icon on mobile + page title */}
            <button
              type="button"
              onClick={() => setActiveTab('dashboard')}
              className="flex items-center gap-2 cursor-pointer hover:opacity-85 transition-opacity text-left min-w-0"
              title="Return to Dashboard"
            >
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center md:hidden flex-shrink-0"
                style={{ background: 'linear-gradient(135deg,#14B8A6,#0F766E)' }}
              >
                <Activity size={14} className="text-white" />
              </div>
              <h2 className="text-sm sm:text-base font-semibold text-slate-800 truncate">
                {NAV_ITEMS.find(n => n.id === activeTab)?.label || 'Dashboard'}
              </h2>
            </button>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            {/* Live Network Online / Offline Status Indicator & Manual Offline Demo Switch */}
            <button
              onClick={() => setForceOffline(prev => !prev)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer transition-all shadow-xs hover:opacity-90 active:scale-95 ${effectiveOnline
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-amber-50 text-amber-900 border border-amber-300'
                }`}
              title={effectiveOnline ? '🟢 Connected (Cloud AI Consensus) — Click to test Offline / Airplane Mode' : '⚡ Offline Mode (On-Device WASM Engine Active) — Click to switch to Online'}
            >
              <span className="relative flex h-2 w-2 flex-shrink-0">
                {effectiveOnline && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                )}
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${effectiveOnline ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}
                />
              </span>
              <span className="text-[11px] font-semibold select-none hidden min-[360px]:inline">
                {effectiveOnline ? 'Online' : 'Offline Mode'}
              </span>
            </button>

            {locationName && (
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 px-3 py-1.5 rounded-full"
                style={{ background: '#F1F5F9' }}>
                <MapPin size={12} className="text-teal-600 flex-shrink-0" />
                <span className="truncate max-w-[140px]">{locationName}</span>
              </div>
            )}
            <button
              className="btn btn-icon btn-sm btn-ghost relative"
              title="Notifications & Reminders"
              onClick={() => {
                setActiveTab('profile');
                setNotifCount(0);
              }}
            >
              <Bell size={18} />
              {notifCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 rounded-full text-white text-[10px] font-bold flex items-center justify-center"
                  style={{ background: '#F43F5E' }}>{notifCount}</span>
              )}
            </button>
            {currentUser ? (
              <button className="w-8 h-8 rounded-full overflow-hidden border-2 flex-shrink-0 hover:ring-2 hover:ring-teal-400 transition-all"
                style={{ borderColor: '#CCFBF1' }}
                title="View Profile"
                onClick={() => setActiveTab('profile')}>
                <img src={currentUser.picture} alt="" className="w-full h-full object-cover"
                  onError={e => { e.target.style.display = 'none'; }} />
              </button>
            ) : (
              <button
                className="btn btn-sm btn-primary text-xs px-2.5 sm:px-3.5"
                onClick={() => setAuthModalOpen(true)}
              >
                Sign In
              </button>
            )}
          </div>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto main-content bg-transparent">
          <div className="max-w-4xl mx-auto p-3.5 sm:p-6">
            {activeTab === 'dashboard' && <DashboardView />}
            {activeTab === 'scan' && <ScanView />}
            {activeTab === 'chat' && (
              <RAGChatbot
                currentUser={currentUser}
                lastResult={diagnosisResult}
                onRecordSearch={handleRecordSearch}
                initialQuery={activeChatQuery}
                isOnline={effectiveOnline}
              />
            )}
            {activeTab === 'hospitals' && (
              <HospitalFinder
                userLocation={userLocation}
                locationName={locationName}
                onBookAppointment={handleBookAppointment}
                currentUser={currentUser}
                onLoginRequest={() => setAuthModalOpen(true)}
                onRecordSearch={handleRecordSearch}
                initialSearchTerm={activeHospitalQuery}
              />
            )}
            {activeTab === 'health' && (
              <HealthDashboard currentUser={currentUser} onLoginRequest={() => setAuthModalOpen(true)} />
            )}
            {activeTab === 'history' && (
              <UserHistory
                scanHistory={scanHistory}
                appointments={bookedAppointments}
                searchHistory={searchHistory}
                currentUser={currentUser}
                onClearScans={handleClearScans}
                onDeleteScan={handleDeleteScan}
                onClearSearches={handleClearSearches}
                onDeleteSearch={handleDeleteSearch}
                onSelectSearchQuery={handleSelectSearchQuery}
              />
            )}
            {activeTab === 'profile' && (
              <UserProfile
                currentUser={currentUser}
                onLoginRequest={() => setAuthModalOpen(true)}
                onUserUpdate={user => { setCurrentUser(user); localStorage.setItem('skinova_user', JSON.stringify(user)); }}
              />
            )}
          </div>
        </main>

        {/* Mobile Bottom Nav (5 Adaptive Tabs - Full Width Distributed) */}
        <nav
          className="mobile-nav fixed bottom-0 left-0 right-0 w-full z-30 border-t"
          style={{
            background: '#FFFFFF',
            borderColor: '#E2E8F0',
            paddingBottom: 'env(safe-area-inset-bottom, 6px)',
          }}
        >
          <div className="w-full grid grid-cols-5 items-stretch">
            {/* 1. Dashboard */}
            <button
              className="flex flex-col items-center justify-center gap-0.5 py-2 px-1 transition-colors min-h-[48px] w-full"
              style={{ color: activeTab === 'dashboard' ? '#0D9488' : '#94A3B8' }}
              onClick={() => setActiveTab('dashboard')}
            >
              <LayoutDashboard size={19} />
              <span className="text-[10px] font-medium leading-none">Home</span>
            </button>

            {/* 2. Scan */}
            <button
              className="flex flex-col items-center justify-center gap-0.5 py-2 px-1 transition-colors min-h-[48px] w-full"
              style={{ color: activeTab === 'scan' ? '#0D9488' : '#94A3B8' }}
              onClick={() => setActiveTab('scan')}
            >
              <Camera size={19} />
              <span className="text-[10px] font-medium leading-none">AI Scan</span>
            </button>

            {/* 3. Chat */}
            <button
              className="flex flex-col items-center justify-center gap-0.5 py-2 px-1 transition-colors min-h-[48px] w-full"
              style={{ color: activeTab === 'chat' ? '#0D9488' : '#94A3B8' }}
              onClick={() => setActiveTab('chat')}
            >
              <MessageSquare size={19} />
              <span className="text-[10px] font-medium leading-none">AI Chat</span>
            </button>

            {/* 4. Doctors */}
            <button
              className="flex flex-col items-center justify-center gap-0.5 py-2 px-1 transition-colors min-h-[48px] w-full"
              style={{ color: activeTab === 'hospitals' ? '#0D9488' : '#94A3B8' }}
              onClick={() => setActiveTab('hospitals')}
            >
              <Building2 size={19} />
              <span className="text-[10px] font-medium leading-none">Doctors</span>
            </button>

            {/* 5. More / Menu (Direct drawer trigger or active extended tab indicator) */}
            <button
              className="flex flex-col items-center justify-center gap-0.5 py-2 px-1 transition-colors relative min-h-[48px] w-full"
              style={{ color: ['health', 'history', 'profile'].includes(activeTab) ? '#0D9488' : '#94A3B8' }}
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={19} />
              <span className="text-[10px] font-medium leading-none">
                {activeTab === 'health' ? 'Health' : activeTab === 'history' ? 'History' : activeTab === 'profile' ? 'Profile' : 'More'}
              </span>
              {['health', 'history', 'profile'].includes(activeTab) && (
                <span className="absolute top-1.5 right-1/4 w-1.5 h-1.5 rounded-full bg-teal-600" />
              )}
            </button>
          </div>
        </nav>
      </div>

      {/* ── Global Modals ───────────────────────────── */}
      {authModalOpen && (
        <AuthModal onLogin={handleLogin} onClose={() => setAuthModalOpen(false)} />
      )}
      {bookingModalOpen && (
        <BookingModal
          hospital={selectedHospital}
          doctor={selectedDoctor}
          currentUser={currentUser}
          onConfirm={handleConfirmBooking}
          onClose={() => setBookingModalOpen(false)}
        />
      )}
      {reportModalOpen && diagnosisResult && (
        <ReportModal
          result={diagnosisResult}
          previewUrl={previewUrl}
          currentUser={currentUser}
          onClose={() => setReportModalOpen(false)}
        />
      )}
      </div>
    </InteractiveBackground>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

export default App;
