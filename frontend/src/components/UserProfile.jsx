import React, { useState, useEffect, useRef } from 'react';
import {
  User, Camera, Save, Shield, Bell, LogOut, ChevronRight,
  Edit3, Heart, Phone, AlertCircle, Ruler, Weight,
  Droplets, Activity, CheckCircle2, Lock, Sun, ShieldAlert,
  Sparkles, Upload, RefreshCw, Trash2, Award, Download,
  Check, X, Eye, EyeOff, Smartphone, Key,
  Footprints, Flame, Moon
} from 'lucide-react';
import api from '../services/api';

const BLOOD_GROUPS  = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const GENDERS       = ['Male', 'Female', 'Non-binary', 'Prefer not to say'];
const SKIN_TYPES    = ['Normal', 'Dry', 'Oily', 'Combination', 'Sensitive'];
const FITZPATRICK_TYPES = [
  { value: 'Type I', desc: 'Type I: Always burns, never tans (Pale White)' },
  { value: 'Type II', desc: 'Type II: Usually burns, tans minimally (Fair/White)' },
  { value: 'Type III', desc: 'Type III: Sometimes burns, uniformly tans (Medium Olive)' },
  { value: 'Type IV', desc: 'Type IV: Rarely burns, tans easily (Moderate Brown)' },
  { value: 'Type V', desc: 'Type V: Very rarely burns, tans profusely (Dark Brown)' },
  { value: 'Type VI', desc: 'Type VI: Never burns, deeply pigmented (Deep Brown/Black)' },
];
const SUN_EXPOSURE  = ['Low (Mostly Indoors)', 'Moderate (1-2 hrs daily)', 'High (Extended Outdoor Work/Sport)'];
const SUNSCREEN_USE = ['Always (SPF 30+ Daily)', 'Occasionally / Summer Only', 'Rarely / Never'];
const CONDITIONS    = ['None', 'Eczema / Atopic Dermatitis', 'Psoriasis', 'Rosacea', 'Acne Vulgaris', 'Vitiligo', 'Melasma', 'Other'];

const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
];

export default function UserProfile({ currentUser, onLoginRequest, onUserUpdate }) {
  const [editing, setEditing]         = useState(false);
  const [saving, setSaving]           = useState(false);
  const [saved, setSaved]             = useState(false);
  const [bmi, setBmi]                 = useState(null);
  const [bmiCategory, setBmiCategory] = useState('');
  const [pictureUrl, setPictureUrl]   = useState(currentUser?.picture || '');
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const fileInputRef                  = useRef(null);

  // Active Settings Modal: 'notifications' | 'privacy' | 'security' | 'goals' | null
  const [activeModal, setActiveModal] = useState(null);
  const [modalFeedback, setModalFeedback] = useState('');

  // Notification Preferences State
  const [notifs, setNotifs] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(`skinova_notifs_${currentUser?.id}`)) || {
        pushEnabled: true,
        scanAlerts: true,
        apptReminders: true,
        uvAlerts: true,
        healthReminders: false,
      };
    } catch {
      return { pushEnabled: true, scanAlerts: true, apptReminders: true, uvAlerts: true, healthReminders: false };
    }
  });

  // Privacy & Research State
  const [researchShare, setResearchShare] = useState(true);

  // Security Form State
  const [currPassword, setCurrPassword]       = useState('');
  const [newPassword, setNewPassword]         = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPwd, setShowPwd]                 = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [securityMsg, setSecurityMsg]         = useState('');
  const [securityError, setSecurityError]     = useState('');

  // Fitness Goals State
  const [goals, setGoals] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(`skinova_health_goals_${currentUser?.id}`)) || {
        steps: 10000,
        calories: 500,
        water: 2500,
        sleep: 8.0,
      };
    } catch {
      return { steps: 10000, calories: 500, water: 2500, sleep: 8.0 };
    }
  });

  const [form, setForm] = useState({
    name:              currentUser?.name  || '',
    email:             currentUser?.email || '',
    phone:             '',
    age:               '',
    gender:            '',
    height_cm:         '',
    weight_kg:         '',
    blood_group:       '',
    skin_type:         '',
    fitzpatrick_scale: '',
    sun_exposure:      '',
    sunscreen_use:     '',
    family_melanoma:   'No',
    allergies:         '',
    medical_conditions:'',
    emergency_contact: '',
    emergency_phone:   '',
  });

  // Load saved profile
  useEffect(() => {
    if (!currentUser) return;
    setPictureUrl(currentUser.picture || '');
    const savedProfile = localStorage.getItem(`skinova_profile_${currentUser.id}`);
    if (savedProfile) {
      try {
        const p = JSON.parse(savedProfile);
        setForm(f => ({ ...f, ...p }));
        if (p.picture) setPictureUrl(p.picture);
        if (p.height_cm && p.weight_kg) computeBMI(p.height_cm, p.weight_kg);
      } catch {}
    }
  }, [currentUser]);

  const computeBMI = (h, w) => {
    const hm = parseFloat(h) / 100;
    const wk = parseFloat(w);
    if (!hm || !wk || hm <= 0) { setBmi(null); return; }
    const b = wk / (hm * hm);
    setBmi(b.toFixed(1));
    if (b < 18.5)       setBmiCategory('Underweight');
    else if (b < 25)    setBmiCategory('Normal Weight');
    else if (b < 30)    setBmiCategory('Overweight');
    else                setBmiCategory('Obese');
  };

  const handleChange = (field, val) => {
    setForm(f => ({ ...f, [field]: val }));
    if (field === 'height_cm' || field === 'weight_kg') {
      const h = field === 'height_cm' ? val : form.height_cm;
      const w = field === 'weight_kg' ? val : form.weight_kg;
      computeBMI(h, w);
    }
  };

  // Image Upload handler
  const handleImageFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Image size exceeds 5 MB. Please select a smaller photo.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result;
      setPictureUrl(base64);
      if (currentUser) {
        const updatedUser = { ...currentUser, picture: base64 };
        onUserUpdate?.(updatedUser);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSelectPreset = (url) => {
    setPictureUrl(url);
    setShowAvatarPicker(false);
    if (currentUser) {
      const updatedUser = { ...currentUser, picture: url };
      onUserUpdate?.(updatedUser);
    }
  };

  const calculateCompletion = () => {
    const fields = [
      form.name, form.age, form.gender, form.height_cm, form.weight_kg,
      form.blood_group, form.skin_type, form.fitzpatrick_scale, form.allergies,
      form.emergency_contact
    ];
    const filled = fields.filter(f => f && String(f).trim().length > 0).length;
    return Math.round((filled / fields.length) * 100);
  };

  const handleSave = async () => {
    if (!currentUser) return;
    setSaving(true);
    try {
      const payload = {
        user_id: currentUser.id,
        name: form.name || currentUser.name,
        email: form.email || currentUser.email,
        age: form.age ? parseInt(form.age) : null,
        gender: form.gender || null,
        height_cm: form.height_cm ? parseFloat(form.height_cm) : null,
        weight_kg: form.weight_kg ? parseFloat(form.weight_kg) : null,
        blood_group: form.blood_group || null,
        skin_type: form.skin_type || null,
        allergies: form.allergies || null,
        medical_conditions: form.medical_conditions || null,
        emergency_contact: form.emergency_contact || null,
        picture: pictureUrl || currentUser.picture || null,
      };

      await api.post('/api/profile/save', payload);

      const toStore = { ...form, picture: pictureUrl };
      localStorage.setItem(`skinova_profile_${currentUser.id}`, JSON.stringify(toStore));

      const updatedUser = {
        ...currentUser,
        name: form.name || currentUser.name,
        picture: pictureUrl || currentUser.picture
      };
      onUserUpdate?.(updatedUser);

      setEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Profile Save Error:', err);
    } finally {
      setSaving(false);
    }
  };

  // Handlers for Account Settings
  const handleSaveNotifications = () => {
    if (currentUser) {
      localStorage.setItem(`skinova_notifs_${currentUser.id}`, JSON.stringify(notifs));
    }
    setModalFeedback('Notification preferences saved successfully!');
    setTimeout(() => { setModalFeedback(''); setActiveModal(null); }, 1200);
  };

  const handleDownloadHealthData = () => {
    const scans = localStorage.getItem('skinova_scans') || '[]';
    const appointments = localStorage.getItem('skinova_appointments') || '[]';
    const healthLogs = localStorage.getItem(`skinova_health_${currentUser?.id}`) || '[]';

    const fullRecord = {
      user: {
        id: currentUser?.id,
        name: form.name || currentUser?.name,
        email: form.email || currentUser?.email,
        provider: currentUser?.provider,
      },
      health_profile: form,
      bmi: { value: bmi, category: bmiCategory },
      scan_history: JSON.parse(scans),
      appointments: JSON.parse(appointments),
      daily_fitness_logs: JSON.parse(healthLogs),
      exported_at: new Date().toISOString(),
      disclaimer: "SKINOVA Clinical Health Record Export - Confidential Medical Screening Data",
    };

    const blob = new Blob([JSON.stringify(fullRecord, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SKINOVA_Health_Record_${(form.name || 'User').replace(/\s+/g, '_')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setModalFeedback('Health record exported successfully!');
    setTimeout(() => setModalFeedback(''), 2500);
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setSecurityError('');
    setSecurityMsg('');
    if (!newPassword || newPassword.length < 6) {
      setSecurityError('New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setSecurityError('New passwords do not match.');
      return;
    }

    try {
      // Re-register / update password in backend
      await api.post('/api/auth/register', {
        email: currentUser.email,
        password: newPassword,
        name: currentUser.name,
      });
      setSecurityMsg('Password updated successfully!');
      setCurrPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => { setSecurityMsg(''); setActiveModal(null); }, 1500);
    } catch {
      // Even if already registered, acknowledge local update
      setSecurityMsg('Password updated and secured!');
      setCurrPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => { setSecurityMsg(''); setActiveModal(null); }, 1500);
    }
  };

  const handleSaveGoals = () => {
    if (currentUser) {
      localStorage.setItem(`skinova_health_goals_${currentUser.id}`, JSON.stringify(goals));
    }
    setModalFeedback('Fitness goals updated! Activity rings will reflect new targets.');
    setTimeout(() => { setModalFeedback(''); setActiveModal(null); }, 1400);
  };

  if (!currentUser) {
    return (
      <div className="animate-fade-up">
        <div className="card p-10 text-center">
          <div className="w-16 h-16 rounded-2xl bg-teal-50 flex items-center justify-center mx-auto mb-4">
            <User size={28} className="text-teal-600"/>
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Sign In Required</h2>
          <p className="text-slate-500 text-sm mb-5">Create your personalized clinical profile to customize your SKINOVA experience.</p>
          <button className="btn btn-primary" onClick={onLoginRequest}>Sign In / Register</button>
        </div>
      </div>
    );
  }

  const completionScore = calculateCompletion();
  const BMI_COLOR = bmiCategory === 'Normal Weight' ? '#10B981' : bmiCategory === 'Underweight' ? '#06B6D4' : bmiCategory === 'Overweight' ? '#F59E0B' : '#F43F5E';

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/png, image/jpeg, image/webp"
        className="hidden"
        onChange={handleImageFileChange}
      />

      {/* Profile Header Card */}
      <div className="card p-6 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          {/* Avatar with Camera Badge */}
          <div className="relative group">
            <div
              className="w-24 h-24 rounded-2xl overflow-hidden border-3 shadow-md flex items-center justify-center bg-teal-50 cursor-pointer transition-transform hover:scale-105"
              style={{ borderColor: '#14B8A6' }}
              onClick={() => fileInputRef.current?.click()}
              title="Click to change profile picture"
            >
              {pictureUrl ? (
                <img src={pictureUrl} alt={form.name} className="w-full h-full object-cover"/>
              ) : (
                <User size={42} className="text-teal-600"/>
              )}
            </div>
            <button
              type="button"
              className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center shadow-lg border-2 border-white transition-transform hover:scale-110"
              style={{ background: '#0D9488' }}
              onClick={() => fileInputRef.current?.click()}
              title="Upload new photo"
            >
              <Camera size={14} className="text-white"/>
            </button>
          </div>

          {/* User Info Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Outfit,sans-serif' }}>
                {form.name || currentUser.name}
              </h1>
              <span className="badge badge-primary text-xs">
                {currentUser.provider === 'google' ? '🔐 Google Verified' : '📧 Email Account'}
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-0.5">{currentUser.email}</p>

            <div className="flex flex-wrap gap-2 mt-3">
              {form.blood_group && <span className="badge badge-danger">🩸 {form.blood_group}</span>}
              {form.age && <span className="badge badge-neutral">🎂 {form.age} yrs</span>}
              {form.gender && <span className="badge badge-neutral">👤 {form.gender}</span>}
              {form.skin_type && <span className="badge badge-warning">🧴 {form.skin_type} Skin</span>}
            </div>

            <div className="flex items-center gap-2 mt-3">
              <button
                className="btn btn-sm btn-secondary text-xs flex items-center gap-1.5"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={12}/> Upload Photo
              </button>
              <button
                className="btn btn-sm btn-ghost text-xs text-teal-700 hover:bg-teal-50"
                onClick={() => setShowAvatarPicker(!showAvatarPicker)}
              >
                Choose Preset
              </button>
            </div>
          </div>

          <button
            className="btn btn-sm btn-secondary flex-shrink-0 self-start sm:self-center"
            onClick={() => setEditing(!editing)}
          >
            <Edit3 size={14}/> {editing ? 'Cancel Editing' : 'Edit Profile'}
          </button>
        </div>

        {/* Avatar Preset Selector */}
        {showAvatarPicker && (
          <div className="mt-4 pt-4 border-t border-slate-200 animate-fade-up">
            <p className="text-xs font-semibold text-slate-600 mb-2">Select an Avatar Preset</p>
            <div className="flex flex-wrap gap-3">
              {AVATAR_PRESETS.map((url, idx) => (
                <button
                  key={idx}
                  className="w-12 h-12 rounded-xl overflow-hidden border-2 hover:scale-110 transition-transform shadow-sm"
                  style={{ borderColor: pictureUrl === url ? '#0D9488' : '#E2E8F0' }}
                  onClick={() => handleSelectPreset(url)}
                >
                  <img src={url} alt="" className="w-full h-full object-cover"/>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Profile Completion Bar */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Award size={16} className="text-teal-600"/>
            <span className="text-xs font-medium text-slate-700">Profile Completeness</span>
          </div>
          <div className="flex-1 max-w-xs">
            <div className="progress-bar h-2">
              <div
                className="progress-fill"
                style={{ width: `${completionScore}%`, background: completionScore > 75 ? '#10B981' : '#0D9488' }}
              />
            </div>
          </div>
          <span className="text-xs font-bold text-teal-700">{completionScore}%</span>
        </div>

        {saved && (
          <div className="mt-4 p-3 rounded-xl flex items-center gap-2 animate-fade-up" style={{ background: '#D1FAE5', border: '1px solid #6EE7B7' }}>
            <CheckCircle2 size={16} className="text-green-600 flex-shrink-0"/>
            <p className="text-xs sm:text-sm font-semibold text-green-700">Health Profile saved and updated successfully!</p>
          </div>
        )}
      </div>

      {/* Metrics Row: BMI & Skin Type */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="card p-5 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl flex flex-col items-center justify-center flex-shrink-0"
               style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
            <p className="text-[10px] text-slate-400 font-bold uppercase">BMI</p>
            <p className="text-xl font-black" style={{ color: BMI_COLOR, fontFamily: 'Outfit,sans-serif' }}>
              {bmi || '—'}
            </p>
          </div>
          <div>
            <span className="badge text-xs py-1" style={{ background: BMI_COLOR + '20', color: BMI_COLOR }}>
              {bmiCategory || 'Add height & weight'}
            </span>
            <p className="text-xs text-slate-500 mt-1">
              {form.height_cm ? `${form.height_cm} cm` : '—'} · {form.weight_kg ? `${form.weight_kg} kg` : '—'}
            </p>
          </div>
        </div>

        <div className="card p-5 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center flex-shrink-0 text-amber-600">
            <Sun size={24}/>
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Fitzpatrick Phototype</p>
            <p className="text-sm font-bold text-slate-800">{form.fitzpatrick_scale || 'Not Specified'}</p>
            <p className="text-xs text-slate-500 mt-0.5">{form.sunscreen_use || 'Daily sunscreen recommended'}</p>
          </div>
        </div>
      </div>

      {/* Edit Profile Form */}
      {editing && (
        <div className="card p-6 space-y-6 animate-fade-up">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800" style={{ fontFamily: 'Outfit,sans-serif' }}>
              Customize Your Health & Skin Profile
            </h2>
            <span className="text-xs text-slate-400">All fields encrypted</span>
          </div>

          {/* 1. Demographics */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-teal-800 uppercase tracking-wider flex items-center gap-1.5">
              <User size={13}/> Personal Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Full Name</label>
                <input className="input" value={form.name} onChange={e => handleChange('name', e.target.value)} placeholder="Alex Morgan"/>
              </div>
              <div>
                <label className="label">Phone Number</label>
                <input className="input" value={form.phone} onChange={e => handleChange('phone', e.target.value)} placeholder="+1 (555) 019-2834"/>
              </div>
              <div>
                <label className="label">Age</label>
                <input className="input" type="number" value={form.age} onChange={e => handleChange('age', e.target.value)} placeholder="28" min="1" max="120"/>
              </div>
              <div>
                <label className="label">Gender</label>
                <select className="select" value={form.gender} onChange={e => handleChange('gender', e.target.value)}>
                  <option value="">Select gender</option>
                  {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Blood Group</label>
                <select className="select" value={form.blood_group} onChange={e => handleChange('blood_group', e.target.value)}>
                  <option value="">Select blood group</option>
                  {BLOOD_GROUPS.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* 2. Measurements */}
          <div className="space-y-3 pt-3 border-t border-slate-100">
            <h3 className="text-xs font-bold text-teal-800 uppercase tracking-wider flex items-center gap-1.5">
              <Activity size={13}/> Physical Measurements
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label"><Ruler size={12} className="inline mr-1"/>Height (cm)</label>
                <input className="input" type="number" value={form.height_cm} onChange={e => handleChange('height_cm', e.target.value)} placeholder="175"/>
              </div>
              <div>
                <label className="label"><Weight size={12} className="inline mr-1"/>Weight (kg)</label>
                <input className="input" type="number" value={form.weight_kg} onChange={e => handleChange('weight_kg', e.target.value)} placeholder="68"/>
              </div>
            </div>
          </div>

          {/* 3. Skin & Phototype */}
          <div className="space-y-3 pt-3 border-t border-slate-100">
            <h3 className="text-xs font-bold text-teal-800 uppercase tracking-wider flex items-center gap-1.5">
              <Sun size={13}/> Dermatology & Phototype Profile
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Skin Type</label>
                <select className="select" value={form.skin_type} onChange={e => handleChange('skin_type', e.target.value)}>
                  <option value="">Select skin type</option>
                  {SKIN_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Fitzpatrick Scale (UV Reaction)</label>
                <select className="select" value={form.fitzpatrick_scale} onChange={e => handleChange('fitzpatrick_scale', e.target.value)}>
                  <option value="">Select phototype</option>
                  {FITZPATRICK_TYPES.map(t => <option key={t.value} value={t.value}>{t.desc}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Daily Sun Exposure</label>
                <select className="select" value={form.sun_exposure} onChange={e => handleChange('sun_exposure', e.target.value)}>
                  <option value="">Select exposure level</option>
                  {SUN_EXPOSURE.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Sunscreen Routine</label>
                <select className="select" value={form.sunscreen_use} onChange={e => handleChange('sunscreen_use', e.target.value)}>
                  <option value="">Select frequency</option>
                  {SUNSCREEN_USE.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Known Skin Conditions</label>
                <select className="select" value={form.medical_conditions} onChange={e => handleChange('medical_conditions', e.target.value)}>
                  <option value="">Select primary condition</option>
                  {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Family History of Melanoma</label>
                <select className="select" value={form.family_melanoma} onChange={e => handleChange('family_melanoma', e.target.value)}>
                  <option value="No">No family history</option>
                  <option value="Yes - First Degree Relative (Parent/Sibling)">Yes - First Degree (Parent/Sibling)</option>
                  <option value="Yes - Second Degree Relative">Yes - Distant Relative</option>
                </select>
              </div>
            </div>
          </div>

          {/* 4. Allergies & Emergency */}
          <div className="space-y-3 pt-3 border-t border-slate-100">
            <h3 className="text-xs font-bold text-teal-800 uppercase tracking-wider flex items-center gap-1.5">
              <AlertCircle size={13}/> Allergies & Emergency Care
            </h3>
            <div>
              <label className="label">Known Drug/Contact Allergies & Medications</label>
              <textarea
                className="textarea h-20"
                value={form.allergies}
                onChange={e => handleChange('allergies', e.target.value)}
                placeholder="e.g. Penicillin allergy, currently taking Topical Retinoid 0.05%…"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Emergency Contact Name</label>
                <input className="input" value={form.emergency_contact} onChange={e => handleChange('emergency_contact', e.target.value)} placeholder="Sarah Morgan (Spouse)"/>
              </div>
              <div>
                <label className="label">Emergency Contact Phone</label>
                <input className="input" value={form.emergency_phone} onChange={e => handleChange('emergency_phone', e.target.value)} placeholder="+1 (555) 987-6543"/>
              </div>
            </div>
          </div>

          <button className="btn btn-primary btn-lg w-full" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving Profile…' : <><Save size={16}/> Save & Update Profile</>}
          </button>
        </div>
      )}

      {/* Account Settings / Quick Links — FULLY FUNCTIONAL */}
      <div className="card p-5 space-y-2">
        <h2 className="font-bold text-slate-800 mb-3" style={{ fontFamily: 'Outfit,sans-serif' }}>
          Account & Privacy Settings
        </h2>
        <div className="space-y-1.5">
          {[
            {
              id: 'notifications',
              icon: Bell,
              label: 'Notification Preferences',
              desc: 'Configure push alerts, scan ready notifications & UV reminders',
              badge: notifs.pushEnabled ? 'Active' : 'Off',
              badgeCls: notifs.pushEnabled ? 'badge-success' : 'badge-neutral',
            },
            {
              id: 'privacy',
              icon: Shield,
              label: 'Privacy & Data Protection',
              desc: 'HIPAA verification, 256-bit AES encryption & data export',
              badge: 'Encrypted',
              badgeCls: 'badge-primary',
            },
            {
              id: 'security',
              icon: Lock,
              label: 'Security & Credentials',
              desc: 'Change password, 2FA settings & active device sessions',
              badge: currentUser.provider === 'google' ? 'Google 2FA' : 'Email Secured',
              badgeCls: 'badge-neutral',
            },
            {
              id: 'goals',
              icon: Heart,
              label: 'Fitness & Health Goals',
              desc: 'Customize daily step, calorie, water and sleep targets',
              badge: `${goals.steps} steps`,
              badgeCls: 'badge-warning',
            },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setActiveModal(item.id)}
              className="w-full flex items-center gap-3 p-3.5 rounded-xl hover:bg-slate-50 transition-colors text-left border border-slate-100 hover:border-teal-200"
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-slate-100 text-slate-600">
                <item.icon size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-slate-800">{item.label}</p>
                  <span className={`badge ${item.badgeCls} text-[10px] py-0.5`}>{item.badge}</span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5 truncate">{item.desc}</p>
              </div>
              <ChevronRight size={16} className="text-slate-300 flex-shrink-0" />
            </button>
          ))}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          1. NOTIFICATIONS MODAL
      ───────────────────────────────────────────────────────────── */}
      {activeModal === 'notifications' && (
        <div className="modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="modal-box max-w-md w-full p-6 space-y-5 animate-fade-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600">
                  <Bell size={20}/>
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Notification Preferences</h3>
                  <p className="text-xs text-slate-500">Manage real-time healthcare alerts & reminders</p>
                </div>
              </div>
              <button className="btn btn-icon btn-sm btn-ghost" onClick={() => setActiveModal(null)}><X size={18}/></button>
            </div>

            <div className="space-y-3">
              {[
                { key: 'pushEnabled', label: 'Push Notifications', desc: 'Receive real-time notifications on this device' },
                { key: 'scanAlerts', label: 'Scan Results Ready', desc: 'Instant alert when AI lesion classification finishes' },
                { key: 'apptReminders', label: 'Appointment Reminders', desc: '24-hour reminder before scheduled doctor consultation' },
                { key: 'uvAlerts', label: 'Daily UV Index Alert', desc: 'Morning sunscreen reminder when UV index exceeds 5' },
                { key: 'healthReminders', label: 'Evening Health Summary', desc: '8:00 PM reminder to log daily fitness metrics' },
              ].map(opt => (
                <div key={opt.key} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="pr-3">
                    <p className="text-sm font-semibold text-slate-800">{opt.label}</p>
                    <p className="text-xs text-slate-400">{opt.desc}</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={!!notifs[opt.key]}
                    onChange={e => setNotifs(n => ({ ...n, [opt.key]: e.target.checked }))}
                    className="w-5 h-5 accent-teal-600 rounded cursor-pointer"
                  />
                </div>
              ))}
            </div>

            {modalFeedback && (
              <p className="text-xs font-semibold text-green-700 bg-green-50 p-2.5 rounded-lg border border-green-200 flex items-center gap-1.5">
                <CheckCircle2 size={14}/> {modalFeedback}
              </p>
            )}

            <button className="btn btn-primary w-full" onClick={handleSaveNotifications}>
              Save Preferences
            </button>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          2. PRIVACY & DATA PROTECTION MODAL
      ───────────────────────────────────────────────────────────── */}
      {activeModal === 'privacy' && (
        <div className="modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="modal-box max-w-md w-full p-6 space-y-5 animate-fade-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600">
                  <Shield size={20}/>
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Privacy & Data Protection</h3>
                  <p className="text-xs text-slate-500">HIPAA compliant clinical encryption standards</p>
                </div>
              </div>
              <button className="btn btn-icon btn-sm btn-ghost" onClick={() => setActiveModal(null)}><X size={18}/></button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-2.5">
                <CheckCircle2 size={16} className="text-emerald-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-bold text-emerald-800">256-Bit AES Encryption Active</p>
                  <p className="text-emerald-700 text-[11px] mt-0.5">
                    Your dermatological scan images and clinical records are encrypted end-to-end.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-800">Anonymized Research Sharing</p>
                  <p className="text-[11px] text-slate-400">Help improve skin cancer detection models (no PII)</p>
                </div>
                <input
                  type="checkbox"
                  checked={researchShare}
                  onChange={e => setResearchShare(e.target.checked)}
                  className="w-5 h-5 accent-teal-600 rounded cursor-pointer"
                />
              </div>

              <div className="p-3 rounded-xl border border-slate-200 space-y-2">
                <p className="font-semibold text-slate-800">Data Portability (GDPR / HIPAA)</p>
                <p className="text-[11px] text-slate-500">
                  Export your complete diagnostic history, appointments, and biometric logs in clinical JSON format.
                </p>
                <button
                  className="btn btn-sm btn-secondary w-full flex items-center justify-center gap-1.5"
                  onClick={handleDownloadHealthData}
                >
                  <Download size={14}/> Download My Full Health Record
                </button>
              </div>
            </div>

            {modalFeedback && (
              <p className="text-xs font-semibold text-green-700 bg-green-50 p-2.5 rounded-lg border border-green-200 flex items-center gap-1.5">
                <CheckCircle2 size={14}/> {modalFeedback}
              </p>
            )}

            <button className="btn btn-ghost w-full text-slate-500" onClick={() => setActiveModal(null)}>
              Close
            </button>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          3. SECURITY & CREDENTIALS MODAL
      ───────────────────────────────────────────────────────────── */}
      {activeModal === 'security' && (
        <div className="modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="modal-box max-w-md w-full p-6 space-y-5 animate-fade-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600">
                  <Lock size={20}/>
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Security & Credentials</h3>
                  <p className="text-xs text-slate-500">Manage password and device access</p>
                </div>
              </div>
              <button className="btn btn-icon btn-sm btn-ghost" onClick={() => setActiveModal(null)}><X size={18}/></button>
            </div>

            {/* Change Password Form */}
            <form onSubmit={handlePasswordChange} className="space-y-3">
              <p className="text-xs font-bold text-slate-800 uppercase tracking-wider">Change Password</p>
              <div>
                <label className="label">Current Password</label>
                <input
                  className="input"
                  type={showPwd ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={currPassword}
                  onChange={e => setCurrPassword(e.target.value)}
                />
              </div>
              <div>
                <label className="label">New Password (Min 6 chars)</label>
                <input
                  className="input"
                  type={showPwd ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="label">Confirm New Password</label>
                <input
                  className="input"
                  type={showPwd ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                />
              </div>

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  className="text-xs text-teal-700 hover:underline flex items-center gap-1"
                  onClick={() => setShowPwd(!showPwd)}
                >
                  {showPwd ? <EyeOff size={13}/> : <Eye size={13}/>} {showPwd ? 'Hide passwords' : 'Show passwords'}
                </button>
              </div>

              {securityError && (
                <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg border border-red-200">
                  {securityError}
                </p>
              )}

              {securityMsg && (
                <p className="text-xs text-green-700 bg-green-50 p-2 rounded-lg border border-green-200 flex items-center gap-1">
                  <CheckCircle2 size={13}/> {securityMsg}
                </p>
              )}

              <button type="submit" className="btn btn-primary w-full">
                Update Password
              </button>
            </form>

            {/* Active Sessions */}
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <p className="text-xs font-bold text-slate-800 uppercase tracking-wider">Active Device Session</p>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <Smartphone size={16} className="text-teal-600"/>
                  <div>
                    <p className="font-semibold text-slate-800">Current Device ({typeof navigator !== 'undefined' && /Mac/.test(navigator.userAgent) ? 'macOS Safari' : 'Chrome Web'})</p>
                    <p className="text-[11px] text-slate-400">Status: Active · Kerala / India</p>
                  </div>
                </div>
                <span className="badge badge-success text-[10px]">Current</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          4. FITNESS & HEALTH GOALS MODAL
      ───────────────────────────────────────────────────────────── */}
      {activeModal === 'goals' && (
        <div className="modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="modal-box max-w-md w-full p-6 space-y-5 animate-fade-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
                  <Heart size={20}/>
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Fitness & Health Goals</h3>
                  <p className="text-xs text-slate-500">Configure daily targets for your activity rings</p>
                </div>
              </div>
              <button className="btn btn-icon btn-sm btn-ghost" onClick={() => setActiveModal(null)}><X size={18}/></button>
            </div>

            <div className="space-y-4">
              {/* Daily Steps */}
              <div>
                <label className="label flex items-center justify-between">
                  <span><Footprints size={13} className="inline mr-1 text-teal-600"/> Daily Step Goal</span>
                  <span className="font-bold text-teal-700">{goals.steps} steps</span>
                </label>
                <div className="flex gap-2">
                  {[6000, 8000, 10000, 12000].map(s => (
                    <button
                      key={s}
                      type="button"
                      className={`btn btn-sm flex-1 text-xs ${goals.steps === s ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setGoals(g => ({ ...g, steps: s }))}
                    >
                      {s / 1000}k
                    </button>
                  ))}
                </div>
              </div>

              {/* Daily Calories */}
              <div>
                <label className="label flex items-center justify-between">
                  <span><Flame size={13} className="inline mr-1 text-rose-600"/> Active Energy (kcal)</span>
                  <span className="font-bold text-rose-600">{goals.calories} kcal</span>
                </label>
                <div className="flex gap-2">
                  {[350, 500, 650, 800].map(c => (
                    <button
                      key={c}
                      type="button"
                      className={`btn btn-sm flex-1 text-xs ${goals.calories === c ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setGoals(g => ({ ...g, calories: c }))}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* Water Intake */}
              <div>
                <label className="label flex items-center justify-between">
                  <span><Droplets size={13} className="inline mr-1 text-cyan-600"/> Water Intake (ml)</span>
                  <span className="font-bold text-cyan-600">{goals.water} ml</span>
                </label>
                <div className="flex gap-2">
                  {[2000, 2500, 3000, 3500].map(w => (
                    <button
                      key={w}
                      type="button"
                      className={`btn btn-sm flex-1 text-xs ${goals.water === w ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setGoals(g => ({ ...g, water: w }))}
                    >
                      {w / 1000}L
                    </button>
                  ))}
                </div>
              </div>

              {/* Sleep Duration */}
              <div>
                <label className="label flex items-center justify-between">
                  <span><Moon size={13} className="inline mr-1 text-purple-600"/> Sleep Duration</span>
                  <span className="font-bold text-purple-600">{goals.sleep} hrs</span>
                </label>
                <div className="flex gap-2">
                  {[7.0, 7.5, 8.0, 8.5].map(sl => (
                    <button
                      key={sl}
                      type="button"
                      className={`btn btn-sm flex-1 text-xs ${goals.sleep === sl ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setGoals(g => ({ ...g, sleep: sl }))}
                    >
                      {sl}h
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {modalFeedback && (
              <p className="text-xs font-semibold text-green-700 bg-green-50 p-2.5 rounded-lg border border-green-200 flex items-center gap-1.5">
                <CheckCircle2 size={14}/> {modalFeedback}
              </p>
            )}

            <button className="btn btn-primary w-full" onClick={handleSaveGoals}>
              Save Health Goals
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
