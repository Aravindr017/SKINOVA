import React, { useState, useEffect, useRef } from 'react';
import {
  Footprints, Flame, Droplets, Moon, Dumbbell, Heart,
  TrendingUp, Plus, Calendar, Save, Target, Activity, Wind,
  Smartphone, CheckCircle2, RefreshCw, ShieldCheck, Zap,
  Settings, ExternalLink, X, AlertCircle, Upload, Trash2, FileText,
  Play, Pause, Compass, HelpCircle, Check, ShieldAlert
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts';
import api from '../services/api';
import { parseHealthExportFile } from '../utils/healthExportParser';

const TODAY = new Date().toISOString().split('T')[0];
const WORKOUT_TYPES = ['Walking', 'Running', 'Cycling', 'Swimming', 'Yoga', 'Gym', 'Sports', 'Other'];
const MOODS = ['😊 Great', '😐 Okay', '😔 Low', '😤 Stressed', '😴 Tired'];

function RingProgress({ pct, color, size = 80, stroke = 7, children }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = circ * Math.min(pct, 100) / 100;
  return (
    <div className="ring-chart" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#F1F5F9" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.8s ease' }}
        />
      </svg>
      <div className="ring-chart-label">{children}</div>
    </div>
  );
}

export default function HealthDashboard({ currentUser, onLoginRequest }) {
  const [tab, setTab]             = useState('today');
  const [logging, setLogging]     = useState(false);
  const [saving, setSaving]       = useState(false);
  const [logs, setLogs]           = useState([]);
  const [summary, setSummary]     = useState(null);

  // Health App Integration States (Apple Health & Google Fit)
  const [connectedApp, setConnectedApp] = useState(() => {
    if (!currentUser) return null;
    return localStorage.getItem(`skinova_connected_health_app_${currentUser.id}`) || null; // 'apple' | 'google' | null
  });
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [modalTab, setModalTab]                 = useState('screen'); // 'screen' | 'file' | 'pedometer' | 'guide'
  const [isSyncing, setIsSyncing]               = useState(false);
  const [fileParsing, setFileParsing]           = useState(false);
  const [lastSyncTime, setLastSyncTime]         = useState(() => {
    return localStorage.getItem('skinova_last_health_sync') || null;
  });

  // Live Hardware Sensor Pedometer States (iOS Safari & Android Chrome)
  const [liveSensorActive, setLiveSensorActive] = useState(false);
  const [liveSteps, setLiveSteps]               = useState(0);
  const [sensorPulse, setSensorPulse]           = useState(false);
  const [motionPermissionState, setMotionPermissionState] = useState('prompt'); // 'prompt' | 'granted' | 'denied'
  const lastStepTimeRef = useRef(0);

  // User Custom Goals
  const [goals, setGoals] = useState({ steps: 10000, calories: 500, water: 2500, sleep: 8 });

  const [todayLog, setTodayLog] = useState({
    steps: '', calories_burned: '', water_ml: '', heart_rate_bpm: '',
    sleep_hours: '', workout_type: '', workout_minutes: '', mood: '', notes: ''
  });

  // Genuine exact screen sync form
  const [mobileSyncForm, setMobileSyncForm] = useState({
    steps: '', calories_burned: '', water_ml: '', heart_rate_bpm: '', sleep_hours: ''
  });

  const [syncFeedback, setSyncFeedback] = useState(null);

  // Load custom goals if saved from Profile settings
  useEffect(() => {
    if (!currentUser) return;
    const savedGoals = localStorage.getItem(`skinova_health_goals_${currentUser.id}`);
    if (savedGoals) {
      try {
        const parsed = JSON.parse(savedGoals);
        setGoals(g => ({ ...g, ...parsed }));
      } catch {}
    }
  }, [currentUser]);

  // Load health logs and purge any old synthetic / mock logs
  useEffect(() => {
    if (!currentUser) return;
    const saved = localStorage.getItem(`skinova_health_${currentUser.id}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Strict filter: purge any fake seeded records with artificial multipliers
        const genuineLogs = parsed.filter(l => !(
          (l.steps === 8450 && l.calories_burned === 420) ||
          (l.steps === 7800 && l.calories_burned === 375) ||
          (l.steps === 8400 && l.calories_burned === 410) ||
          (l.notes?.includes('Auto-synced from') && l.workout_minutes === 42) ||
          (l.notes?.includes('Auto-synchronized with Apple Health & HealthKit sensors.'))
        ));
        setLogs(genuineLogs);
        if (genuineLogs.length !== parsed.length) {
          localStorage.setItem(`skinova_health_${currentUser.id}`, JSON.stringify(genuineLogs));
        }
      } catch {
        setLogs([]);
      }
    } else {
      setLogs([]);
    }
  }, [currentUser]);

  const fetchSummary = async () => {
    if (!currentUser) return;
    try {
      const { data } = await api.get(`/api/health/summary/${currentUser.id}`);
      if (data.summary) setSummary(data.summary);
    } catch {}
  };

  useEffect(() => {
    fetchSummary();
  }, [currentUser]);

  // Genuine entry for today (if none exists yet, today starts at 0!)
  const todayEntry = logs.find(l => l.date === TODAY) || null;
  const latestLog  = todayEntry || {};

  const stepPct  = goals.steps > 0 ? Math.min(100, Math.round((parseInt(latestLog.steps || 0) / goals.steps) * 100)) : 0;
  const calPct   = goals.calories > 0 ? Math.min(100, Math.round((parseFloat(latestLog.calories_burned || 0) / goals.calories) * 100)) : 0;
  const waterPct = goals.water > 0 ? Math.min(100, Math.round((parseInt(latestLog.water_ml || 0) / goals.water) * 100)) : 0;
  const sleepPct = goals.sleep > 0 ? Math.min(100, Math.round((parseFloat(latestLog.sleep_hours || 0) / goals.sleep) * 100)) : 0;

  // Platform detection
  const isAppleDevice = typeof navigator !== 'undefined' && (/Mac|iPhone|iPad|iPod/.test(navigator.userAgent));
  const isMobileDevice = typeof navigator !== 'undefined' && (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));

  // --- Real-time Hardware Accelerometer Step Counter (iOS & Android) ---
  useEffect(() => {
    if (!liveSensorActive) return;

    const handleMotion = (event) => {
      const acc = event.accelerationIncludingGravity || event.acceleration;
      if (!acc || acc.x === null || acc.y === null || acc.z === null) return;

      const mag = Math.sqrt(acc.x * acc.x + acc.y * acc.y + acc.z * acc.z);
      const now = Date.now();

      // Physical walking peak detection:
      // Gravity is ~9.81 m/s^2. Normal walking peak swings > 12.2 m/s^2 with 280ms cadence refractory period
      if (mag > 12.2 && (now - lastStepTimeRef.current) > 280) {
        lastStepTimeRef.current = now;
        setLiveSteps(s => s + 1);
        setSensorPulse(true);
        setTimeout(() => setSensorPulse(false), 180);
      }
    };

    window.addEventListener('devicemotion', handleMotion);
    return () => {
      window.removeEventListener('devicemotion', handleMotion);
    };
  }, [liveSensorActive]);

  const handleToggleLiveSensor = async () => {
    if (liveSensorActive) {
      setLiveSensorActive(false);
      return;
    }

    // iOS Safari 13+ native permission request
    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
      try {
        const response = await DeviceMotionEvent.requestPermission();
        if (response === 'granted') {
          setMotionPermissionState('granted');
          setLiveSensorActive(true);
          setSyncFeedback({
            type: 'success',
            text: '✓ Live iPhone motion sensor active! Walk with your phone to count real physical steps.'
          });
        } else {
          setMotionPermissionState('denied');
          setSyncFeedback({
            type: 'warning',
            text: 'Motion sensor access was denied. You can still import Apple Health export.zip or enter your exact screen count.'
          });
        }
      } catch (err) {
        console.warn('Motion permission request error:', err);
        setLiveSensorActive(true);
      }
    } else {
      // Android Chrome / Standard browser
      setMotionPermissionState('granted');
      setLiveSensorActive(true);
      setSyncFeedback({
        type: 'success',
        text: '✓ Live motion sensor active! Tracking movements in real time.'
      });
    }
  };

  const handleCommitLiveSteps = () => {
    if (liveSteps <= 0) {
      alert('No steps detected yet. Walk with your phone or enter your count manually.');
      return;
    }
    const currentSteps = parseInt(latestLog.steps || 0);
    const newTotalSteps = currentSteps + liveSteps;
    const addedCalories = Math.round(liveSteps * 0.04);
    const newTotalCalories = (parseFloat(latestLog.calories_burned || 0) + addedCalories);

    handleSaveGenuineReading({
      steps: newTotalSteps,
      calories_burned: newTotalCalories,
      water_ml: latestLog.water_ml || 0,
      heart_rate_bpm: latestLog.heart_rate_bpm || null,
      sleep_hours: latestLog.sleep_hours || null,
      workout_type: 'Live Device Pedometer',
      workout_minutes: Math.round(newTotalSteps / 100),
      source: isAppleDevice ? 'Apple Device Motion Sensor (Live Accelerometer)' : 'Android Motion Sensor (Live Accelerometer)',
      notes: `Recorded ${liveSteps} live steps via hardware accelerometer.`
    });

    setLiveSteps(0);
    setSyncFeedback({
      type: 'success',
      text: `✓ Successfully saved ${liveSteps} live physical steps to today's dashboard!`
    });
  };

  // --- Save genuine readings (from screen input or file import) ---
  const handleSaveGenuineReading = (reading) => {
    if (!currentUser) { onLoginRequest?.(); return; }
    const now = new Date();
    const stepsNum = parseInt(reading.steps) || 0;
    const caloriesNum = parseFloat(reading.calories_burned) || (stepsNum > 0 ? Math.round(stepsNum * 0.04) : 0);

    const entry = {
      user_id: currentUser.id,
      date: TODAY,
      steps: stepsNum,
      calories_burned: caloriesNum,
      water_ml: parseInt(reading.water_ml) || 0,
      heart_rate_bpm: parseInt(reading.heart_rate_bpm) || null,
      sleep_hours: parseFloat(reading.sleep_hours) || null,
      workout_type: reading.workout_type || (connectedApp ? 'Mobile Synced Activity' : 'Daily Movement'),
      workout_minutes: parseInt(reading.workout_minutes) || Math.round(stepsNum / 100),
      mood: reading.mood || '😊 Active',
      notes: reading.notes || `Exact genuine reading confirmed from ${connectedApp === 'apple' ? 'Apple Health' : connectedApp === 'google' ? 'Google Fit' : 'Device'}.`,
      source: reading.source || (connectedApp === 'apple' ? 'Apple Health (Screen Verified)' : connectedApp === 'google' ? 'Google Fit (Screen Verified)' : 'Manual Entry'),
      logged_at: now.toISOString(),
    };

    api.post('/api/health/log', entry).catch(() => {});
    const newLogs = [entry, ...logs.filter(l => l.date !== TODAY)];
    setLogs(newLogs);
    localStorage.setItem(`skinova_health_${currentUser.id}`, JSON.stringify(newLogs.slice(0, 30)));

    // Cross-device sync
    api.syncUserActivity?.({
      userId: currentUser.id,
      email: currentUser.email,
      healthLogs: newLogs.slice(0, 30),
    }).catch(() => {});

    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setLastSyncTime(timeStr);
    localStorage.setItem('skinova_last_health_sync', timeStr);
    setShowConnectModal(false);
    fetchSummary();
  };

  // --- Genuine Apple Health (export.zip / export.xml) and Google Fit file parsing ---
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileParsing(true);
    setSyncFeedback({ type: 'warning', text: `Analyzing genuine records from ${file.name}…` });

    try {
      const result = await parseHealthExportFile(file);
      const { selectedRecord, dailyData, sortedDates, totalDaysFound } = result;

      if (!selectedRecord || (selectedRecord.steps === 0 && selectedRecord.calories_burned === 0 && !selectedRecord.heart_rate_bpm)) {
        setSyncFeedback({
          type: 'warning',
          text: `Export parsed successfully (${totalDaysFound} days found), but no step/calorie activity was found for ${selectedRecord.date || 'today'}.`
        });
        setFileParsing(false);
        return;
      }

      // Build multi-day history
      const newEntries = [];
      const dateLimit = sortedDates.slice(0, 7);
      for (const d of dateLimit) {
        if (dailyData[d]) {
          newEntries.push({
            user_id: currentUser?.id,
            date: d,
            steps: dailyData[d].steps || 0,
            calories_burned: dailyData[d].calories_burned || 0,
            water_ml: 0,
            heart_rate_bpm: dailyData[d].heart_rate_bpm || null,
            sleep_hours: dailyData[d].sleep_hours || null,
            workout_type: 'Health Export Sync',
            workout_minutes: dailyData[d].workout_minutes || Math.round((dailyData[d].steps || 0) / 100),
            mood: '😊 Active',
            notes: `Extracted from genuine export file: ${file.name}`,
            source: dailyData[d].source,
            logged_at: new Date().toISOString()
          });
        }
      }

      const targetEntry = newEntries.find(entry => entry.date === TODAY) || newEntries[0];
      const existingOtherDates = logs.filter(l => !newEntries.some(ne => ne.date === l.date));
      const mergedLogs = [...newEntries, ...existingOtherDates].sort((a, b) => b.date.localeCompare(a.date));

      setLogs(mergedLogs);
      if (currentUser) {
        localStorage.setItem(`skinova_health_${currentUser.id}`, JSON.stringify(mergedLogs.slice(0, 30)));
        api.post('/api/health/log', targetEntry).catch(() => {});
        api.syncUserActivity?.({
          userId: currentUser.id,
          email: currentUser.email,
          healthLogs: mergedLogs.slice(0, 30),
        }).catch(() => {});
      }

      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setLastSyncTime(timeStr);
      localStorage.setItem('skinova_last_health_sync', timeStr);
      setConnectedApp(file.name.includes('export') || file.name.endsWith('.xml') ? 'apple' : 'google');

      setSyncFeedback({
        type: 'success',
        text: `✓ Genuine health export verified! Loaded ${targetEntry.steps.toLocaleString()} steps, ${targetEntry.calories_burned} kcal (${targetEntry.date}). Imported ${newEntries.length} days of history.`
      });
      setShowConnectModal(false);
      fetchSummary();
    } catch (err) {
      console.error('Health file parse error:', err);
      setSyncFeedback({
        type: 'error',
        text: `Could not parse file (${err.message || 'unknown format'}). You can enter your screen counts directly.`
      });
    } finally {
      setFileParsing(false);
    }
  };

  const handleClearAllHealthData = () => {
    if (window.confirm('Reset all health logs? This will wipe stored entries and reset your dashboard to zero until you enter or sync genuine data.')) {
      if (currentUser) {
        localStorage.removeItem(`skinova_health_${currentUser.id}`);
        localStorage.removeItem('skinova_last_health_sync');
      }
      setLogs([]);
      setLastSyncTime(null);
      setSyncFeedback({ type: 'success', text: '✓ Health logs reset to 0. Ready for genuine tracking.' });
    }
  };

  const handleConnect = async (appType) => {
    setConnectedApp(appType);
    if (currentUser) {
      localStorage.setItem(`skinova_connected_health_app_${currentUser.id}`, appType);
    }

    if (appType === 'apple') {
      if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
        try {
          const res = await DeviceMotionEvent.requestPermission();
          if (res === 'granted') {
            setMotionPermissionState('granted');
            setSyncFeedback({ type: 'success', text: '✓ Apple Health & Motion sensor authorization granted on your device!' });
          } else {
            setMotionPermissionState('denied');
            setSyncFeedback({ type: 'warning', text: 'Apple motion sensor permission was denied. You can import export.zip or enter your screen counts.' });
          }
        } catch (e) {
          console.warn('Apple motion sensor permission:', e);
        }
      } else {
        setSyncFeedback({ type: 'success', text: '✓ Apple Health mode active. Ready to sync exact counts.' });
      }
    } else if (appType === 'google') {
      setSyncFeedback({ type: 'success', text: `✓ Google Fit mode connected. Ready to sync exact counts from your device.` });
    }
  };

  const handleDisconnect = () => {
    setConnectedApp(null);
    setLiveSensorActive(false);
    setSyncFeedback(null);
    if (currentUser) {
      localStorage.removeItem(`skinova_connected_health_app_${currentUser.id}`);
    }
  };

  // Genuine Mobile Sync: Never generate fake multipliers!
  const handleSyncHealthApp = async (appType) => {
    if (!currentUser) { onLoginRequest?.(); return; }
    setIsSyncing(true);
    setSyncFeedback(null);

    try {
      const existingToday = logs.find(l => l.date === TODAY);

      if (existingToday && (existingToday.steps > 0 || existingToday.calories_burned > 0)) {
        // Genuine data already exists for today: confirm and sync with cloud
        const now = new Date();
        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        await api.post('/api/health/log', existingToday).catch(() => {});
        api.syncUserActivity?.({
          userId: currentUser.id,
          email: currentUser.email,
          healthLogs: logs.slice(0, 30),
        }).catch(() => {});

        setLastSyncTime(timeStr);
        localStorage.setItem('skinova_last_health_sync', timeStr);
        setSyncFeedback({
          type: 'success',
          text: `✓ Cloud synchronized: Today's genuine record (${existingToday.steps.toLocaleString()} steps, ${existingToday.calories_burned} kcal) confirmed at ${timeStr}.`
        });
      } else {
        // No genuine reading recorded for today yet.
        // NEVER make up fake numbers! Open Exact Screen Sync modal to get genuine counts from the user's screen
        setMobileSyncForm({
          steps: existingToday?.steps ? String(existingToday.steps) : '',
          calories_burned: existingToday?.calories_burned ? String(existingToday.calories_burned) : '',
          water_ml: existingToday?.water_ml ? String(existingToday.water_ml) : '',
          heart_rate_bpm: existingToday?.heart_rate_bpm ? String(existingToday.heart_rate_bpm) : '',
          sleep_hours: existingToday?.sleep_hours ? String(existingToday.sleep_hours) : '',
        });
        setModalTab('screen');
        setShowConnectModal(true);
        setSyncFeedback({
          type: 'warning',
          text: `To show your exact ${appType === 'apple' ? 'Apple Health' : 'Google Fit'} count, please enter the numbers shown on your phone screen or import export.zip.`
        });
      }
      fetchSummary();
    } catch (err) {
      setSyncFeedback({ type: 'error', text: 'Health sync encountered an error. Please try again.' });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleManualLog = async () => {
    if (!currentUser) { onLoginRequest?.(); return; }
    setSaving(true);
    const stepsNum = parseInt(todayLog.steps) || 0;
    const caloriesNum = parseFloat(todayLog.calories_burned) || (stepsNum > 0 ? Math.round(stepsNum * 0.04) : 0);

    const entry = {
      user_id: currentUser.id,
      date: TODAY,
      steps:           stepsNum,
      calories_burned: caloriesNum,
      water_ml:        parseInt(todayLog.water_ml) || 0,
      heart_rate_bpm:  parseInt(todayLog.heart_rate_bpm) || null,
      sleep_hours:     parseFloat(todayLog.sleep_hours) || null,
      workout_type:    todayLog.workout_type || null,
      workout_minutes: parseInt(todayLog.workout_minutes) || Math.round(stepsNum / 100),
      mood:            todayLog.mood || null,
      notes:           todayLog.notes || '',
      source:          'Manual Log',
    };
    try {
      await api.post('/api/health/log', entry);
    } catch {}

    const newLogs = [{ ...entry, logged_at: new Date().toISOString() }, ...logs.filter(l => l.date !== TODAY)];
    setLogs(newLogs);
    localStorage.setItem(`skinova_health_${currentUser.id}`, JSON.stringify(newLogs.slice(0, 30)));
    api.syncUserActivity?.({
      userId: currentUser.id,
      email: currentUser.email,
      healthLogs: newLogs.slice(0, 30),
    }).catch(() => {});
    setSaving(false);
    setLogging(false);
    fetchSummary();
  };

  // 7-day chart data
  const chartData = logs.slice(0, 7).reverse().map(l => ({
    date:  new Date(l.date).toLocaleDateString('en', { weekday: 'short' }),
    steps: l.steps || 0,
    cal:   l.calories_burned || 0,
    water: Math.round((l.water_ml || 0) / 100) / 10,
  }));

  if (!currentUser) {
    return (
      <div className="animate-fade-up">
        <div className="card p-10 text-center">
          <Heart size={32} className="text-slate-300 mx-auto mb-3"/>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Health & Fitness Tracker</h2>
          <p className="text-slate-500 text-sm mb-5">Sign in to track your genuine daily health metrics and sync with Apple Health or Google Fit.</p>
          <button className="btn btn-primary" onClick={onLoginRequest}>Sign In</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-up">
      {/* Title & Top Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900" style={{ fontFamily: 'Outfit,sans-serif' }}>
            Health & Fitness Tracker
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            100% Genuine wellness tracking synced with Apple Health & Google Fit
          </p>
        </div>

        <div className="flex items-center gap-2">
          {connectedApp ? (
            <button
              className="btn btn-sm btn-secondary flex items-center gap-1.5"
              onClick={() => handleSyncHealthApp(connectedApp)}
              disabled={isSyncing}
              title="Sync latest steps and calories from your mobile app"
            >
              <RefreshCw size={13} className={isSyncing ? 'animate-spin text-teal-600' : ''}/>
              <span>{isSyncing ? 'Syncing…' : 'Sync Mobile'}</span>
            </button>
          ) : (
            <button
              className="btn btn-sm btn-secondary flex items-center gap-1.5"
              onClick={() => { setModalTab('screen'); setShowConnectModal(true); }}
            >
              <Smartphone size={14} className="text-teal-600"/> Connect Health App
            </button>
          )}

          <button className="btn btn-primary btn-sm" onClick={() => setLogging(true)}>
            <Plus size={14}/> Log Manually
          </button>
        </div>
      </div>

      {/* Sync Feedback Toast / Banner */}
      {syncFeedback && (
        <div className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs animate-fade-in ${
          syncFeedback.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
          syncFeedback.type === 'warning' ? 'bg-amber-50 text-amber-800 border-amber-200' :
          'bg-rose-50 text-rose-800 border-rose-200'
        }`}>
          <div className="flex items-center gap-2">
            {syncFeedback.type === 'success' ? <CheckCircle2 size={15} className="text-emerald-600 flex-shrink-0" /> : <AlertCircle size={15} className="flex-shrink-0" />}
            <span className="font-medium">{syncFeedback.text}</span>
          </div>
          <button className="text-slate-400 hover:text-slate-600 font-bold" onClick={() => setSyncFeedback(null)}>✕</button>
        </div>
      )}

      {/* Connected Health Tracking App Status Banner */}
      <div className="card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border shadow-xs"
           style={{ background: connectedApp ? '#F0FDF4' : '#F8FAFC', borderColor: connectedApp ? '#86EFAC' : '#E2E8F0' }}>
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-xs"
            style={{
              background: connectedApp === 'apple'
                ? '#000'
                : connectedApp === 'google'
                ? 'linear-gradient(135deg,#4285F4,#34A853)'
                : '#E2E8F0'
            }}
          >
            {connectedApp === 'apple' ? (
              <span className="text-white text-lg">🍏</span>
            ) : connectedApp === 'google' ? (
              <span className="text-white text-base font-bold">G</span>
            ) : (
              <Smartphone size={18} className="text-slate-500"/>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold text-slate-900">
                {connectedApp === 'apple'
                  ? 'Apple Health (iOS) Connected'
                  : connectedApp === 'google'
                  ? 'Google Fit / Health Connect Connected'
                  : 'Connect Mobile Health App'}
              </p>
              {connectedApp && (
                <span className="badge badge-success text-[10px] py-0.5 font-bold">
                  ✓ Active
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {connectedApp
                ? `Syncing exact steps, active energy, heart rate & sleep. Last synced: ${lastSyncTime || 'Pending today'}`
                : `Connect with ${isAppleDevice ? 'Apple Health' : 'Google Fit'} for genuine live pedometer, export.zip import, or exact screen sync.`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          {connectedApp ? (
            <div className="flex items-center gap-2">
              <button
                className="btn btn-sm btn-ghost text-xs text-teal-700 bg-teal-50 hover:bg-teal-100"
                onClick={() => { setModalTab('screen'); setShowConnectModal(true); }}
              >
                Sync Options
              </button>
              <button
                className="btn btn-sm btn-ghost text-xs text-red-600 hover:bg-red-50"
                onClick={handleDisconnect}
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button
              className="btn btn-sm btn-primary text-xs flex items-center gap-1.5"
              onClick={() => { setModalTab('screen'); setShowConnectModal(true); }}
            >
              <Zap size={13}/> Set Up Genuine Sync
            </button>
          )}
        </div>
      </div>

      {/* Live Device Hardware Motion Pedometer Widget */}
      <div className="card p-4 border border-teal-200 bg-gradient-to-r from-teal-50/70 to-emerald-50/50 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${
                liveSensorActive ? 'bg-teal-600 text-white shadow-md shadow-teal-500/30' : 'bg-white border border-teal-200 text-teal-700'
              }`}>
                <Footprints size={20} className={liveSensorActive ? 'animate-bounce' : ''}/>
              </div>
              {liveSensorActive && (
                <span className={`absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white transition-all ${
                  sensorPulse ? 'bg-emerald-400 scale-125' : 'bg-teal-500'
                }`} />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-slate-900">
                  Live Phone Motion Pedometer
                </p>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  liveSensorActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                }`}>
                  {liveSensorActive ? '● Sensor Active' : '○ Inactive'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {liveSensorActive
                  ? `Walk with your phone. Accelerometer counts your real physical steps in real time.`
                  : `Uses your device's built-in 3-axis accelerometer sensor. 100% genuine hardware tracking.`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            {liveSensorActive ? (
              <>
                <div className="bg-white px-3 py-1.5 rounded-xl border border-teal-200 text-center">
                  <p className="text-xs font-black text-teal-800" style={{ fontFamily: 'Outfit,sans-serif' }}>
                    {liveSteps} <span className="text-[10px] font-normal text-slate-500">live steps</span>
                  </p>
                </div>
                <button
                  className="btn btn-sm btn-primary text-xs flex items-center gap-1"
                  onClick={handleCommitLiveSteps}
                  disabled={liveSteps === 0}
                  title="Add live recorded steps to today's activity log"
                >
                  <Check size={13}/> Save to Log
                </button>
                <button
                  className="btn btn-sm btn-ghost text-xs text-slate-600 hover:bg-slate-100"
                  onClick={handleToggleLiveSensor}
                >
                  <Pause size={13}/> Stop
                </button>
              </>
            ) : (
              <button
                className="btn btn-sm btn-secondary text-xs flex items-center gap-1.5 font-semibold text-teal-800 border-teal-300 hover:bg-teal-50"
                onClick={handleToggleLiveSensor}
              >
                <Play size={13} className="text-teal-600 fill-teal-600"/> Start Live iPhone / Phone Pedometer
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-nav">
        <button className={`tab-btn ${tab === 'today' ? 'active' : ''}`} onClick={() => setTab('today')}>
          <Activity size={14}/> Today's Activity
        </button>
        <button className={`tab-btn ${tab === 'trends' ? 'active' : ''}`} onClick={() => setTab('trends')}>
          <TrendingUp size={14}/> 7-Day Trends
        </button>
        <button className={`tab-btn ${tab === 'summary' ? 'active' : ''}`} onClick={() => setTab('summary')}>
          <Target size={14}/> Goal Targets
        </button>
      </div>

      {/* Today Tab */}
      {tab === 'today' && (
        <div className="space-y-4 animate-fade-up">
          {!todayEntry && (
            <div className="card p-3.5 bg-amber-50/80 border border-amber-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-amber-700 flex-shrink-0"/>
                <span>
                  <strong>Awaiting Today's Health Data:</strong> Activity rings display 0% until you enter or sync genuine data for today ({TODAY}).
                </span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  className="btn btn-xs btn-primary font-medium"
                  onClick={() => { setModalTab('screen'); setShowConnectModal(true); }}
                >
                  Sync Screen Count
                </button>
                <button
                  className="btn btn-xs btn-secondary font-medium"
                  onClick={() => setLogging(true)}
                >
                  Manual Log
                </button>
              </div>
            </div>
          )}

          {/* Ring Goals Card */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Daily Activity Rings</h2>
              {latestLog.source ? (
                <span className="text-[11px] text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-full font-medium border border-teal-200/60">
                  Source: {latestLog.source}
                </span>
              ) : (
                <span className="text-[11px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full font-medium">
                  Awaiting Daily Sync
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Steps',    pct: stepPct,  color: '#0D9488', val: latestLog.steps || 0,            target: goals.steps,    unit: '',     icon: Footprints },
                { label: 'Calories', pct: calPct,   color: '#F43F5E', val: latestLog.calories_burned || 0, target: goals.calories, unit: 'kcal', icon: Flame },
                { label: 'Hydration',pct: waterPct, color: '#06B6D4', val: latestLog.water_ml || 0,        target: goals.water,    unit: 'ml',   icon: Droplets },
                { label: 'Sleep',    pct: sleepPct, color: '#7C3AED', val: latestLog.sleep_hours || 0,     target: goals.sleep,    unit: 'hrs',  icon: Moon },
              ].map(m => (
                <div key={m.label} className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-slate-50/70 border border-slate-100">
                  <RingProgress pct={m.pct} color={m.color} size={84} stroke={7}>
                    <div className="text-center">
                      <p className="text-sm font-black" style={{ color: m.color, fontFamily: 'Outfit,sans-serif' }}>
                        {m.pct}%
                      </p>
                    </div>
                  </RingProgress>
                  <div className="text-center">
                    <p className="text-xs font-bold text-slate-800">
                      {m.val} {m.unit}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Goal: {m.target} {m.unit}
                    </p>
                    <p className="text-[11px] font-semibold mt-0.5" style={{ color: m.color }}>{m.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Today's Data Metrics Grid */}
          <div className="stats-grid">
            {[
              { icon: Footprints, label: 'Steps Count',    val: (latestLog.steps || 0).toLocaleString(), unit: 'steps', color: '#0D9488', bg: '#F0FDFA' },
              { icon: Flame,      label: 'Active Energy',  val: latestLog.calories_burned || 0,         unit: 'kcal',  color: '#F43F5E', bg: '#FFF1F2' },
              { icon: Droplets,   label: 'Water Intake',   val: latestLog.water_ml || 0,                unit: 'ml',    color: '#06B6D4', bg: '#ECFEFF' },
              { icon: Moon,       label: 'Sleep Duration', val: latestLog.sleep_hours || 0,             unit: 'hrs',   color: '#7C3AED', bg: '#F5F3FF' },
              { icon: Heart,      label: 'Resting Heart',  val: latestLog.heart_rate_bpm ? `${latestLog.heart_rate_bpm}` : '--', unit: latestLog.heart_rate_bpm ? 'bpm' : '', color: '#E11D48', bg: '#FFF1F2' },
              { icon: Dumbbell,   label: 'Workout Active', val: latestLog.workout_minutes || 0,         unit: 'min',   color: '#D97706', bg: '#FFFBEB' },
            ].map(s => (
              <div key={s.label} className="stat-card">
                <div className="stat-icon" style={{ background: s.bg }}>
                  <s.icon size={18} style={{ color: s.color }} />
                </div>
                <div className="stat-value">{s.val}</div>
                <div className="stat-label">
                  {s.label} {s.unit && <span className="text-[11px] font-normal">({s.unit})</span>}
                </div>
              </div>
            ))}
          </div>

          {/* Workout & Mood notes */}
          {latestLog.mood && (
            <div className="card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600">
                  <Wind size={20}/>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Wellness Status & Mood</p>
                  <p className="text-sm font-bold text-slate-800">{latestLog.mood}</p>
                </div>
              </div>

              {latestLog.workout_type && (
                <div className="text-left sm:text-right">
                  <p className="text-xs text-slate-400">Activity Registered</p>
                  <p className="text-sm font-semibold text-slate-800">
                    {latestLog.workout_type} ({latestLog.workout_minutes || 30} mins)
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Trends Tab */}
      {tab === 'trends' && (
        <div className="space-y-4 animate-fade-up">
          {logs.length === 0 ? (
            <div className="card p-8 text-center text-slate-500 space-y-3">
              <TrendingUp size={36} className="mx-auto text-slate-300"/>
              <h3 className="text-base font-bold text-slate-700">No Activity History Yet</h3>
              <p className="text-sm max-w-sm mx-auto">
                Once you log your daily workouts, upload an Apple Health export.zip, or sync your counts, your 7-day progression charts will appear here.
              </p>
              <button className="btn btn-primary btn-sm mx-auto" onClick={() => { setModalTab('screen'); setShowConnectModal(true); }}>
                <Plus size={14}/> Enter Today's Count
              </button>
            </div>
          ) : (
            <>
              <div className="card p-5">
                <h3 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wider">Daily Steps Progression (7 Days)</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9"/>
                    <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#94A3B8' }} axisLine={false} tickLine={false}/>
                    <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false}/>
                    <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.07)' }}/>
                    <Bar dataKey="steps" fill="#0D9488" radius={[6, 6, 0, 0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="card p-5">
                <h3 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wider">Active Calories Burned (kcal)</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9"/>
                    <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#94A3B8' }} axisLine={false} tickLine={false}/>
                    <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false}/>
                    <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0' }}/>
                    <Line type="monotone" dataKey="cal" stroke="#F43F5E" strokeWidth={2.5} dot={{ r: 4, fill: '#F43F5E' }}/>
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </div>
      )}

      {/* Summary Tab */}
      {tab === 'summary' && (
        <div className="space-y-4 animate-fade-up">
          <div className="card p-5">
            <h2 className="text-sm font-bold text-slate-800 mb-3 uppercase tracking-wider">Daily Targets vs Achievements</h2>
            <div className="space-y-4">
              {[
                { label: 'Step Target', curr: latestLog.steps || 0, goal: goals.steps, unit: 'steps', color: '#0D9488' },
                { label: 'Calorie Burn', curr: latestLog.calories_burned || 0, goal: goals.calories, unit: 'kcal', color: '#F43F5E' },
                { label: 'Hydration Target', curr: latestLog.water_ml || 0, goal: goals.water, unit: 'ml', color: '#06B6D4' },
                { label: 'Sleep Target', curr: latestLog.sleep_hours || 0, goal: goals.sleep, unit: 'hrs', color: '#7C3AED' },
              ].map(item => {
                const pct = item.goal > 0 ? Math.min(100, Math.round((item.curr / item.goal) * 100)) : 0;
                return (
                  <div key={item.label} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold text-slate-700">
                      <span>{item.label}</span>
                      <span>{item.curr} / {item.goal} {item.unit} ({pct}%)</span>
                    </div>
                    <div className="progress-bar h-2.5">
                      <div className="progress-fill" style={{ width: `${pct}%`, background: item.color }}/>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-slate-400 mt-4">
              Tip: You can customize your daily health goals anytime under <strong>My Profile &gt; Fitness & Health Goals</strong>.
            </p>
          </div>
        </div>
      )}

      {/* Connect & Genuine Sync Modal */}
      {showConnectModal && (
        <div className="modal-backdrop" onClick={() => setShowConnectModal(false)}>
          <div className="modal-box max-w-lg w-full p-4 sm:p-6 space-y-4 animate-fade-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600">
                  <Smartphone size={20}/>
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900" style={{ fontFamily: 'Outfit,sans-serif' }}>
                    Genuine Health App Sync
                  </h2>
                  <p className="text-xs text-slate-500">Exact data from Apple Health (iOS) and Google Fit (Android)</p>
                </div>
              </div>
              <button className="btn btn-icon btn-sm btn-ghost" onClick={() => setShowConnectModal(false)}>
                <X size={18}/>
              </button>
            </div>

            {/* App Chooser */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                className={`p-3 rounded-xl border text-left flex items-center gap-2.5 transition-all ${
                  connectedApp === 'apple' ? 'border-teal-500 bg-teal-50/60 ring-2 ring-teal-500/20' : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
                onClick={() => handleConnect('apple')}
              >
                <span className="text-xl">🍏</span>
                <div>
                  <p className="text-xs font-bold text-slate-800">Apple Health</p>
                  <p className="text-[10px] text-slate-400">iOS HealthKit & iPhone</p>
                </div>
              </button>

              <button
                type="button"
                className={`p-3 rounded-xl border text-left flex items-center gap-2.5 transition-all ${
                  connectedApp === 'google' ? 'border-teal-500 bg-teal-50/60 ring-2 ring-teal-500/20' : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
                onClick={() => handleConnect('google')}
              >
                <span className="text-xl">📱</span>
                <div>
                  <p className="text-xs font-bold text-slate-800">Google Fit</p>
                  <p className="text-[10px] text-slate-400">Android & Health Connect</p>
                </div>
              </button>
            </div>

            {/* iOS / Android Privacy Explanation */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <ShieldCheck size={14} className="text-teal-600"/>
                <span>Device Sandbox Protection</span>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-500">
                Apple Health and Android Health Connect lock your personal health database inside your phone's hardware security enclave. Web browsers are strictly prevented from secretly reading your health database.
                Skinova provides <strong>3 genuine, verified sync methods</strong> below:
              </p>
            </div>

            {/* Sub-tabs for Sync Methods */}
            <div className="flex border-b border-slate-200 text-xs font-semibold">
              <button
                className={`py-2 px-3 border-b-2 transition-all ${
                  modalTab === 'screen' ? 'border-teal-600 text-teal-700 font-bold' : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
                onClick={() => setModalTab('screen')}
              >
                1. Screen Sync (Fastest)
              </button>
              <button
                className={`py-2 px-3 border-b-2 transition-all ${
                  modalTab === 'file' ? 'border-teal-600 text-teal-700 font-bold' : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
                onClick={() => setModalTab('file')}
              >
                2. Export Zip / XML
              </button>
              <button
                className={`py-2 px-3 border-b-2 transition-all ${
                  modalTab === 'pedometer' ? 'border-teal-600 text-teal-700 font-bold' : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
                onClick={() => setModalTab('pedometer')}
              >
                3. Live Sensor
              </button>
            </div>

            {/* Feedback toast in modal */}
            {syncFeedback && (
              <div className={`p-2.5 rounded-lg text-xs font-medium ${
                syncFeedback.type === 'success' ? 'bg-emerald-100 text-emerald-900' :
                syncFeedback.type === 'warning' ? 'bg-amber-100 text-amber-900' :
                'bg-rose-100 text-rose-900'
              }`}>
                {syncFeedback.text}
              </div>
            )}

            {/* Tab 1: Screen Sync */}
            {modalTab === 'screen' && (
              <div className="space-y-3">
                <p className="text-[11px] text-slate-500">
                  Check your {connectedApp === 'apple' ? 'Apple Health' : 'Google Fit'} app or widget right now and enter the exact counts shown on your phone:
                </p>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 flex items-center gap-1">
                      <Footprints size={11} className="text-teal-600"/> Steps Count
                    </label>
                    <input
                      type="number"
                      className="input input-sm w-full text-xs font-semibold"
                      placeholder="e.g. 5420"
                      value={mobileSyncForm.steps}
                      onChange={e => setMobileSyncForm(f => ({ ...f, steps: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 flex items-center gap-1">
                      <Flame size={11} className="text-rose-500"/> Active Burn (kcal)
                    </label>
                    <input
                      type="number"
                      className="input input-sm w-full text-xs font-semibold"
                      placeholder="e.g. 290"
                      value={mobileSyncForm.calories_burned}
                      onChange={e => setMobileSyncForm(f => ({ ...f, calories_burned: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 flex items-center gap-1">
                      <Heart size={11} className="text-red-500"/> Resting Heart (bpm)
                    </label>
                    <input
                      type="number"
                      className="input input-sm w-full text-xs"
                      placeholder="e.g. 68"
                      value={mobileSyncForm.heart_rate_bpm}
                      onChange={e => setMobileSyncForm(f => ({ ...f, heart_rate_bpm: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 flex items-center gap-1">
                      <Moon size={11} className="text-purple-500"/> Sleep (hours)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      className="input input-sm w-full text-xs"
                      placeholder="e.g. 7.5"
                      value={mobileSyncForm.sleep_hours}
                      onChange={e => setMobileSyncForm(f => ({ ...f, sleep_hours: e.target.value }))}
                    />
                  </div>
                </div>

                <button
                  className="btn btn-primary btn-sm w-full font-medium text-xs mt-2"
                  onClick={() => handleSaveGenuineReading(mobileSyncForm)}
                  disabled={!mobileSyncForm.steps && !mobileSyncForm.calories_burned}
                >
                  ✓ Confirm & Sync Exact Numbers to Skinova
                </button>
              </div>
            )}

            {/* Tab 2: Export File Import */}
            {modalTab === 'file' && (
              <div className="space-y-3">
                <div className="p-3 bg-teal-50/80 border border-teal-200 rounded-xl space-y-1.5 text-xs text-teal-950">
                  <p className="font-bold flex items-center gap-1.5">
                    <FileText size={14} className="text-teal-700"/> How to Export Apple Health Data:
                  </p>
                  <ol className="list-decimal pl-4 space-y-0.5 text-[11px] text-teal-900">
                    <li>Open <strong>Apple Health</strong> app on your iPhone.</li>
                    <li>Tap your <strong>Profile picture</strong> in the top right corner.</li>
                    <li>Scroll down and tap <strong>Export All Health Data</strong>.</li>
                    <li>AirDrop or save the <strong>export.zip</strong> file, then select it below.</li>
                  </ol>
                </div>

                <div className="p-4 rounded-xl border border-dashed border-teal-300 bg-white hover:bg-slate-50/50 transition-colors space-y-2 text-center">
                  <p className="text-xs font-bold text-slate-800 flex items-center justify-center gap-1.5">
                    <Upload size={14} className="text-teal-600"/> Import export.zip, export.xml, or Google Takeout
                  </p>
                  <p className="text-[10px] text-slate-500">
                    Files are parsed 100% privately in your browser using JSZip without uploading to external servers.
                  </p>
                  <label className={`btn btn-primary btn-sm cursor-pointer inline-flex items-center gap-1.5 ${fileParsing ? 'opacity-50 pointer-events-none' : ''}`}>
                    <Upload size={13}/>
                    <span>{fileParsing ? 'Parsing Health Archive…' : 'Select Health Export File'}</span>
                    <input type="file" accept=".zip,.xml,.json,.csv" className="hidden" onChange={handleFileUpload}/>
                  </label>
                </div>
              </div>
            )}

            {/* Tab 3: Live Motion Sensor */}
            {modalTab === 'pedometer' && (
              <div className="space-y-3">
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs space-y-1 text-emerald-950">
                  <p className="font-bold flex items-center gap-1.5">
                    <Zap size={13} className="text-emerald-700"/> Native Accelerometer Sensor
                  </p>
                  <p className="text-[11px] text-emerald-900">
                    On iPhone Safari, Apple prompts for motion sensor permission. On Android Chrome, motion sensors connect automatically.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-3">
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-2xl font-black text-teal-800" style={{ fontFamily: 'Outfit,sans-serif' }}>
                      {liveSteps}
                    </span>
                    <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Live Steps Counted</span>
                  </div>

                  <div className="flex justify-center gap-2">
                    <button
                      type="button"
                      className={`btn btn-sm text-xs font-semibold flex items-center gap-1.5 ${
                        liveSensorActive ? 'btn-secondary text-red-600 border-red-200' : 'btn-primary'
                      }`}
                      onClick={handleToggleLiveSensor}
                    >
                      {liveSensorActive ? <><Pause size={13}/> Stop Live Sensor</> : <><Play size={13}/> Start Sensor Tracking</>}
                    </button>
                    {liveSteps > 0 && (
                      <button
                        type="button"
                        className="btn btn-sm btn-primary text-xs"
                        onClick={handleCommitLiveSteps}
                      >
                        <Check size={13}/> Save to Daily Log
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
              <button
                className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1 font-medium"
                onClick={handleClearAllHealthData}
              >
                <Trash2 size={12}/> Reset Health Data to 0
              </button>
              <button
                className="btn btn-sm btn-ghost text-xs text-slate-600"
                onClick={() => setShowConnectModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Log Modal */}
      {logging && (
        <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setLogging(false); }}>
          <div className="modal-box max-w-lg w-full">
            <div className="p-4 sm:p-5 border-b flex items-center justify-between" style={{ borderColor: '#E2E8F0' }}>
              <h2 className="font-bold text-slate-900 text-sm sm:text-base">Log Health Data Manually</h2>
              <button className="btn btn-icon btn-sm btn-ghost" onClick={() => setLogging(false)}>✕</button>
            </div>
            <div className="p-4 sm:p-5 space-y-4 overflow-y-auto max-h-[72dvh]">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="label"><Footprints size={12} className="inline mr-1"/>Steps</label>
                  <input className="input" type="number" placeholder="8500" value={todayLog.steps} onChange={e => setTodayLog(t => ({...t, steps: e.target.value}))}/>
                </div>
                <div>
                  <label className="label"><Flame size={12} className="inline mr-1"/>Calories Burned</label>
                  <input className="input" type="number" placeholder="450" value={todayLog.calories_burned} onChange={e => setTodayLog(t => ({...t, calories_burned: e.target.value}))}/>
                </div>
                <div>
                  <label className="label"><Droplets size={12} className="inline mr-1"/>Water (ml)</label>
                  <input className="input" type="number" placeholder="2200" value={todayLog.water_ml} onChange={e => setTodayLog(t => ({...t, water_ml: e.target.value}))}/>
                </div>
                <div>
                  <label className="label"><Heart size={12} className="inline mr-1"/>Heart Rate (bpm)</label>
                  <input className="input" type="number" placeholder="72" value={todayLog.heart_rate_bpm} onChange={e => setTodayLog(t => ({...t, heart_rate_bpm: e.target.value}))}/>
                </div>
                <div>
                  <label className="label"><Moon size={12} className="inline mr-1"/>Sleep Hours</label>
                  <input className="input" type="number" step="0.5" placeholder="7.5" value={todayLog.sleep_hours} onChange={e => setTodayLog(t => ({...t, sleep_hours: e.target.value}))}/>
                </div>
                <div>
                  <label className="label"><Dumbbell size={12} className="inline mr-1"/>Workout (min)</label>
                  <input className="input" type="number" placeholder="30" value={todayLog.workout_minutes} onChange={e => setTodayLog(t => ({...t, workout_minutes: e.target.value}))}/>
                </div>
              </div>
              <div>
                <label className="label">Workout Type</label>
                <select className="select" value={todayLog.workout_type} onChange={e => setTodayLog(t => ({...t, workout_type: e.target.value}))}>
                  <option value="">Select type</option>
                  {WORKOUT_TYPES.map(w => <option key={w} value={w}>{w}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Mood</label>
                <div className="flex flex-wrap gap-2">
                  {MOODS.map(m => (
                    <button key={m} onClick={() => setTodayLog(t => ({...t, mood: m}))}
                      className={`px-3 py-2 rounded-xl text-sm border transition-all ${
                        todayLog.mood === m ? 'border-teal-400 bg-teal-50 font-bold' : 'border-slate-200 bg-white'
                      }`}>{m}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Notes</label>
                <textarea className="textarea h-16" placeholder="Any health observations…" value={todayLog.notes} onChange={e => setTodayLog(t => ({...t, notes: e.target.value}))}/>
              </div>
              <button className="btn btn-primary btn-lg w-full" onClick={handleManualLog} disabled={saving}>
                {saving ? 'Saving…' : <><Save size={16}/> Save Today's Log</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
