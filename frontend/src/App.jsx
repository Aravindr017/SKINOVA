import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity, Sparkles, MapPin, Camera, Building2, MessageSquare,
  History, User, Heart, LayoutDashboard, ChevronRight, Bell,
  LogOut, Menu, X, Footprints, Flame, Droplets, Moon, Dumbbell,
  TrendingUp, CheckCircle2, AlertTriangle, Info, ChevronLeft,
  Settings, FileText, Shield
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

import api from './services/api';
import { getUserCoordinates, getCityFromCoordinates } from './utils/location';

// ─── Nav Items ──────────────────────────────────────────────
const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard',     icon: LayoutDashboard },
  { id: 'scan',      label: 'AI Skin Scan',  icon: Camera },
  { id: 'chat',      label: 'AI Consultant', icon: MessageSquare },
  { id: 'hospitals', label: 'Find Doctors',  icon: Building2 },
  { id: 'health',    label: 'Health & Fit',  icon: Heart },
  { id: 'history',   label: 'My Scans',      icon: History },
  { id: 'profile',   label: 'My Profile',    icon: User },
];

export function App() {
  const [activeTab, setActiveTab]   = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Location - defaults to Thiruvananthapuram, Kerala until live GPS updates
  const [userLocation, setUserLocation]         = useState({ lat: 8.5241, lon: 76.9366, lng: 76.9366 });
  const [locationName, setLocationName]         = useState('Thiruvananthapuram, Kerala');

  // Auth
  const [currentUser, setCurrentUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('skinova_user')); } catch { return null; }
  });
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // Scan state
  const [selectedFile, setSelectedFile]   = useState(null);
  const [previewUrl, setPreviewUrl]       = useState(null);
  const [diagnosisResult, setDiagnosisResult] = useState(null);
  const [isScanning, setIsScanning]       = useState(false);
  const [scanError, setScanError]         = useState(null);

  // Appointments & history (localStorage)
  const [bookedAppointments, setBookedAppointments] = useState(() => {
    try { return JSON.parse(localStorage.getItem('skinova_appointments')) || []; } catch { return []; }
  });
  const [scanHistory, setScanHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem('skinova_scans')) || []; } catch { return []; }
  });

  // Modals
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen]   = useState(false);
  const [selectedHospital, setSelectedHospital] = useState(null);
  const [selectedDoctor, setSelectedDoctor]     = useState(null);

  // Notifications
  const [notifCount, setNotifCount] = useState(2);

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

  useEffect(() => {
    localStorage.setItem('skinova_appointments', JSON.stringify(bookedAppointments));
  }, [bookedAppointments]);

  useEffect(() => {
    localStorage.setItem('skinova_scans', JSON.stringify(scanHistory));
  }, [scanHistory]);

  // ── Handlers ──────────────────────────────────────────────
  const handleClearScans = useCallback(async () => {
    setScanHistory([]);
    localStorage.removeItem('skinova_scans');
    if (currentUser) {
      localStorage.removeItem(`skinova_scans_${currentUser.id}`);
      try {
        await api.post('/api/scans/clear', { user_id: currentUser.id });
      } catch (err) {
        console.warn('Scans clear API error:', err);
      }
    }
  }, [currentUser]);

  const handleDeleteScan = useCallback((scanId) => {
    setScanHistory(prev => {
      const updated = prev.filter(s => s.id !== scanId);
      localStorage.setItem('skinova_scans', JSON.stringify(updated));
      if (currentUser) {
        localStorage.setItem(`skinova_scans_${currentUser.id}`, JSON.stringify(updated));
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
      const formData = new FormData();
      formData.append('file', selectedFile);
      const { data } = await api.post('/api/predict', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
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
        userId: currentUser.id
      };
      setScanHistory(h => [entry, ...h].slice(0, 50));
      localStorage.setItem(`skinova_scans_${currentUser.id}`, JSON.stringify([entry, ...scanHistory].slice(0, 20)));
    } catch (err) {
      setScanError(err?.message || 'Scan failed. Please try again.');
    } finally {
      setIsScanning(false);
    }
  }, [selectedFile, currentUser, previewUrl, scanHistory]);

  const handleBookAppointment = useCallback((hospital, doctor) => {
    setSelectedHospital(hospital);
    setSelectedDoctor(doctor);
    if (!currentUser) { setAuthModalOpen(true); return; }
    setBookingModalOpen(true);
  }, [currentUser]);

  const handleConfirmBooking = useCallback(booking => {
    const newBooking = { ...booking, id: Date.now(), userId: currentUser?.id };
    setBookedAppointments(prev => [newBooking, ...prev]);
    setBookingModalOpen(false);
  }, [currentUser]);

  // ── Dashboard ──────────────────────────────────────────────
  const DashboardView = () => (
    <div className="space-y-5 sm:space-y-6 animate-fade-up">
      {/* Hero */}
      <div className="card p-4 sm:p-6 overflow-hidden relative"
           style={{background: 'linear-gradient(135deg, #0D9488 0%, #0891B2 100%)'}}>
        <div className="absolute inset-0 opacity-10"
             style={{backgroundImage: 'radial-gradient(circle at 80% 50%, white 0%, transparent 60%)'}}>
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="badge text-[11px] py-0.5" style={{background:'rgba(255,255,255,0.2)', color:'#fff'}}>
              ✦ AI-Powered
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white mb-1" style={{fontFamily:'Outfit,sans-serif'}}>
            Good {getGreeting()}, {currentUser?.name?.split(' ')[0] || 'there'} 👋
          </h1>
          <p className="text-teal-100 text-xs sm:text-sm mb-3.5 sm:mb-4 truncate max-w-lg">
            Your health dashboard is ready. {locationName && `📍 ${locationName}`}
          </p>
          <div className="flex gap-2 sm:gap-3 flex-wrap">
            <button className="btn btn-sm text-xs sm:text-sm" onClick={() => setActiveTab('scan')}
              style={{background:'rgba(255,255,255,0.2)', color:'#fff', border:'1px solid rgba(255,255,255,0.3)'}}>
              <Camera size={14}/> Start Scan
            </button>
            <button className="btn btn-sm text-xs sm:text-sm" onClick={() => setActiveTab('chat')}
              style={{background:'rgba(255,255,255,0.15)', color:'#fff', border:'1px solid rgba(255,255,255,0.2)'}}>
              <MessageSquare size={14}/> Ask AI
            </button>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="stats-grid">
        {[
          { label: 'Scans Done',     value: scanHistory.length,        icon: Camera,    color: '#0D9488', bg: '#F0FDFA' },
          { label: 'Appointments',   value: bookedAppointments.length, icon: Building2, color: '#0284C7', bg: '#F0F9FF' },
          { label: 'AI Consults',    value: 0,                         icon: MessageSquare, color: '#7C3AED', bg: '#F5F3FF' },
          { label: 'Reports Saved',  value: scanHistory.length,        icon: FileText,  color: '#D97706', bg: '#FFFBEB' },
        ].map((stat, i) => (
          <div key={stat.label} className={`stat-card animate-fade-up delay-${(i+1)*100}`}>
            <div className="stat-icon" style={{background: stat.bg}}>
              <stat.icon size={18} style={{color: stat.color}}/>
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
            { label: 'Skin Analysis',  icon: Camera,      tab: 'scan',      color: '#0D9488', bg: '#F0FDFA' },
            { label: 'AI Consultant',  icon: MessageSquare, tab: 'chat',    color: '#7C3AED', bg: '#F5F3FF' },
            { label: 'Find Doctors',   icon: MapPin,      tab: 'hospitals', color: '#0284C7', bg: '#F0F9FF' },
            { label: 'Health Tracker', icon: Heart,       tab: 'health',    color: '#E11D48', bg: '#FFF1F2' },
          ].map(a => (
            <button key={a.label} onClick={() => setActiveTab(a.tab)}
              className="card-sm p-3 sm:p-4 flex flex-col items-center gap-1.5 sm:gap-2 cursor-pointer card-interactive transition-all">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                   style={{background: a.bg}}>
                <a.icon size={17} style={{color: a.color}}/>
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
              View all <ChevronRight size={13}/>
            </button>
          </div>
          <div className="space-y-2.5 sm:space-y-3">
            {scanHistory.slice(0, 3).map(scan => (
              <div key={scan.id} className="flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
                <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-slate-200">
                  {scan.previewUrl && <img src={scan.previewUrl} alt="" className="w-full h-full object-cover"/>}
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
            <Sparkles size={24} className="text-teal-600"/>
          </div>
          <h3 className="text-base sm:text-lg font-bold text-slate-800 mb-1 sm:mb-2">Start your first scan</h3>
          <p className="text-xs sm:text-sm text-slate-500 mb-4 max-w-sm mx-auto">Upload a skin image and let our AI detect conditions instantly with clinical-grade accuracy.</p>
          <button className="btn btn-primary btn-sm sm:btn-md" onClick={() => setActiveTab('scan')}>
            <Camera size={15}/> Scan Now
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
        <div className="card p-3.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3" style={{borderColor:'#FDE68A', background:'#FFFBEB'}}>
          <div className="flex items-center gap-2.5">
            <AlertTriangle size={18} className="text-amber-500 flex-shrink-0"/>
            <div>
              <p className="text-xs sm:text-sm font-semibold text-amber-800">Sign in to save results</p>
              <p className="text-[11px] sm:text-xs text-amber-600 mt-0.5">Your scan history and reports will be saved when you're signed in.</p>
            </div>
          </div>
          <button className="btn btn-sm sm:ml-auto w-full sm:w-auto" onClick={() => setAuthModalOpen(true)}
            style={{background:'#D97706', color:'#fff'}}>Sign In</button>
        </div>
      )}

      <ImageUploader
        onFileSelect={handleFileSelect}
        selectedFile={selectedFile}
        previewUrl={previewUrl}
        isScanning={isScanning}
        onScan={handleScan}
      />

      {scanError && (
        <div className="card p-3.5 sm:p-4 flex items-center gap-3" style={{borderColor:'#FCA5A5', background:'#FFF5F5'}}>
          <AlertTriangle size={18} className="text-red-500 flex-shrink-0"/>
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
    <div className="flex h-screen overflow-hidden" style={{background:'#F8FAFC'}}>
      {/* ── Desktop Sidebar ─────────────────────────── */}
      <aside className="sidebar-desktop w-64 h-full flex-shrink-0 border-r flex flex-col"
             style={{background:'#fff', borderColor:'#E2E8F0'}}>
        {/* Logo (Clickable to Dashboard) */}
        <div
          className="p-5 border-b cursor-pointer hover:bg-slate-50 transition-colors"
          style={{borderColor:'#E2E8F0'}}
          onClick={() => setActiveTab('dashboard')}
          title="Return to Dashboard"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center transition-transform hover:scale-105"
                 style={{background:'linear-gradient(135deg,#14B8A6,#0F766E)'}}>
              <Activity size={18} className="text-white"/>
            </div>
            <div>
              <span className="font-bold text-slate-900 text-base" style={{fontFamily:'Outfit,sans-serif'}}>
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
              <item.icon size={18} className="flex-shrink-0"/>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* User Card */}
        <div className="p-4 border-t" style={{borderColor:'#E2E8F0'}}>
          {currentUser ? (
            <div className="flex items-center gap-3">
              <img src={currentUser.picture} alt={currentUser.name}
                   className="w-9 h-9 rounded-full object-cover flex-shrink-0 border-2"
                   style={{borderColor:'#CCFBF1'}}
                   onError={e => { e.target.style.display='none'; }}/>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">{currentUser.name}</p>
                <p className="text-xs text-slate-400 truncate">{currentUser.email}</p>
              </div>
              <button className="btn btn-icon btn-sm btn-ghost" title="Sign out" onClick={handleLogout}>
                <LogOut size={15}/>
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
               onClick={() => setSidebarOpen(false)}/>
          <aside className="relative z-50 w-72 max-w-[84vw] h-full flex flex-col border-r animate-slide-left shadow-2xl"
                 style={{background:'#fff', borderColor:'#E2E8F0'}}>
            <div className="p-4 border-b flex items-center justify-between" style={{borderColor:'#E2E8F0'}}>
              <div
                className="flex items-center gap-2.5 cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => { setActiveTab('dashboard'); setSidebarOpen(false); }}
                title="Return to Dashboard"
              >
                <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                     style={{background:'linear-gradient(135deg,#14B8A6,#0F766E)'}}>
                  <Activity size={16} className="text-white"/>
                </div>
                <span className="font-bold text-slate-900 text-base" style={{fontFamily:'Outfit,sans-serif'}}>SKINOVA</span>
              </div>
              <button className="btn btn-icon btn-sm btn-ghost" onClick={() => setSidebarOpen(false)}>
                <X size={18}/>
              </button>
            </div>
            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
              {NAV_ITEMS.map(item => (
                <button
                  key={item.id}
                  className={`sidebar-link ${activeTab === item.id ? 'active' : ''}`}
                  onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
                >
                  <item.icon size={18} className="flex-shrink-0"/>
                  <span className="truncate">{item.label}</span>
                  {activeTab === item.id && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-teal-600"/>
                  )}
                </button>
              ))}
            </nav>
            <div className="p-4 border-t" style={{borderColor:'#E2E8F0'}}>
              {currentUser ? (
                <div className="flex items-center gap-3">
                  <img src={currentUser.picture} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                       onError={e => { e.target.style.display='none'; }}/>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{currentUser.name}</p>
                    <p className="text-xs text-slate-400 truncate">{currentUser.email}</p>
                  </div>
                  <button className="btn btn-icon btn-sm btn-ghost" onClick={handleLogout} title="Sign Out">
                    <LogOut size={15}/>
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
                style={{background:'#fff', borderColor:'#E2E8F0'}}>
          <div className="flex items-center gap-2 min-w-0">
            {/* Mobile menu hamburger */}
            <button className="btn btn-icon btn-sm btn-ghost md:hidden flex-shrink-0" onClick={() => setSidebarOpen(true)} title="Open Navigation Menu">
              <Menu size={19}/>
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
            {locationName && (
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 px-3 py-1.5 rounded-full"
                   style={{background:'#F1F5F9'}}>
                <MapPin size={12} className="text-teal-600 flex-shrink-0"/>
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
              <Bell size={18}/>
              {notifCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 rounded-full text-white text-[10px] font-bold flex items-center justify-center"
                      style={{background:'#F43F5E'}}>{notifCount}</span>
              )}
            </button>
            {currentUser ? (
              <button className="w-8 h-8 rounded-full overflow-hidden border-2 flex-shrink-0 hover:ring-2 hover:ring-teal-400 transition-all"
                      style={{borderColor:'#CCFBF1'}}
                      title="View Profile"
                      onClick={() => setActiveTab('profile')}>
                <img src={currentUser.picture} alt="" className="w-full h-full object-cover"
                     onError={e => { e.target.style.display='none'; }}/>
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
        <main className="flex-1 overflow-y-auto main-content">
          <div className="max-w-4xl mx-auto p-3.5 sm:p-6">
            {activeTab === 'dashboard' && <DashboardView />}
            {activeTab === 'scan'      && <ScanView />}
            {activeTab === 'chat'      && <RAGChatbot currentUser={currentUser} lastResult={diagnosisResult} />}
            {activeTab === 'hospitals' && (
              <HospitalFinder
                userLocation={userLocation}
                locationName={locationName}
                onBookAppointment={handleBookAppointment}
                currentUser={currentUser}
                onLoginRequest={() => setAuthModalOpen(true)}
              />
            )}
            {activeTab === 'health'    && (
              <HealthDashboard currentUser={currentUser} onLoginRequest={() => setAuthModalOpen(true)}/>
            )}
            {activeTab === 'history'   && (
              <UserHistory
                scanHistory={scanHistory}
                appointments={bookedAppointments}
                currentUser={currentUser}
                onClearScans={handleClearScans}
                onDeleteScan={handleDeleteScan}
              />
            )}
            {activeTab === 'profile'   && (
              <UserProfile
                currentUser={currentUser}
                onLoginRequest={() => setAuthModalOpen(true)}
                onUserUpdate={user => { setCurrentUser(user); localStorage.setItem('skinova_user', JSON.stringify(user)); }}
              />
            )}
          </div>
        </main>

        {/* Mobile Bottom Nav (5 Adaptive Tabs) */}
        <nav className="mobile-nav fixed bottom-0 left-0 right-0 z-30 border-t"
             style={{background:'#fff', borderColor:'#E2E8F0', paddingBottom: 'env(safe-area-inset-bottom, 6px)'}}>
          <div className="flex items-center">
            {/* 1. Dashboard */}
            <button
              className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 px-1 transition-colors min-h-[48px]"
              style={{color: activeTab === 'dashboard' ? '#0D9488' : '#94A3B8'}}
              onClick={() => setActiveTab('dashboard')}
            >
              <LayoutDashboard size={19}/>
              <span className="text-[10px] font-medium leading-none">Home</span>
            </button>

            {/* 2. Scan */}
            <button
              className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 px-1 transition-colors min-h-[48px]"
              style={{color: activeTab === 'scan' ? '#0D9488' : '#94A3B8'}}
              onClick={() => setActiveTab('scan')}
            >
              <Camera size={19}/>
              <span className="text-[10px] font-medium leading-none">AI Scan</span>
            </button>

            {/* 3. Chat */}
            <button
              className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 px-1 transition-colors min-h-[48px]"
              style={{color: activeTab === 'chat' ? '#0D9488' : '#94A3B8'}}
              onClick={() => setActiveTab('chat')}
            >
              <MessageSquare size={19}/>
              <span className="text-[10px] font-medium leading-none">AI Chat</span>
            </button>

            {/* 4. Doctors */}
            <button
              className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 px-1 transition-colors min-h-[48px]"
              style={{color: activeTab === 'hospitals' ? '#0D9488' : '#94A3B8'}}
              onClick={() => setActiveTab('hospitals')}
            >
              <Building2 size={19}/>
              <span className="text-[10px] font-medium leading-none">Doctors</span>
            </button>

            {/* 5. More / Menu (Direct drawer trigger or active extended tab indicator) */}
            <button
              className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 px-1 transition-colors relative min-h-[48px]"
              style={{color: ['health', 'history', 'profile'].includes(activeTab) ? '#0D9488' : '#94A3B8'}}
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={19}/>
              <span className="text-[10px] font-medium leading-none">
                {activeTab === 'health' ? 'Health' : activeTab === 'history' ? 'History' : activeTab === 'profile' ? 'Profile' : 'More'}
              </span>
              {['health', 'history', 'profile'].includes(activeTab) && (
                <span className="absolute top-1.5 right-1/4 w-1.5 h-1.5 rounded-full bg-teal-600"/>
              )}
            </button>
          </div>
        </nav>
      </div>

      {/* ── Global Modals ───────────────────────────── */}
      {authModalOpen && (
        <AuthModal onLogin={handleLogin} onClose={() => setAuthModalOpen(false)}/>
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
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

export default App;
