import React, { useState } from 'react';
import {
  History, Calendar, Clock, CheckCircle2, AlertTriangle, XCircle,
  Camera, ChevronRight, Trash2, ShieldAlert, Sparkles, Search,
  MessageSquare, Building2, MapPin, ArrowRight, Eye, Bot
} from 'lucide-react';

export default function UserHistory({
  scanHistory = [],
  appointments = [],
  searchHistory = [],
  currentUser,
  onClearScans,
  onDeleteScan,
  onClearSearches,
  onDeleteSearch,
  onSelectSearchQuery,
}) {
  const [tab, setTab] = useState('scans'); // 'scans' | 'searches' | 'appointments'
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearTarget, setClearTarget] = useState(null); // 'scans' | 'searches'

  const RISK_BADGE = {
    low:      'badge-success',
    moderate: 'badge-warning',
    high:     'badge-danger',
  };

  const APPT_STATUS = {
    confirmed: { cls: 'badge-success', label: 'Confirmed', icon: CheckCircle2 },
    pending:   { cls: 'badge-warning', label: 'Pending',   icon: Clock },
    cancelled: { cls: 'badge-danger',  label: 'Cancelled', icon: XCircle },
  };

  const triggerClear = (target) => {
    setClearTarget(target);
    setShowClearConfirm(true);
  };

  const handleConfirmClear = () => {
    if (clearTarget === 'scans') {
      onClearScans?.();
    } else if (clearTarget === 'searches') {
      onClearSearches?.();
    }
    setShowClearConfirm(false);
    setClearTarget(null);
  };

  return (
    <div className="space-y-5 animate-fade-up">
      {/* Title & Clear Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900" style={{ fontFamily: 'Outfit,sans-serif' }}>
            My Health & Activity Records
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {currentUser
              ? `Account records for ${currentUser.name || currentUser.email}`
              : 'Sign in to access your saved medical scans and consultation history'}
          </p>
        </div>

        {currentUser && (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            {tab === 'scans' && scanHistory.length > 0 && (
              <button
                className="btn btn-sm btn-ghost text-red-600 hover:bg-red-50 flex items-center gap-1.5 text-xs"
                onClick={() => triggerClear('scans')}
              >
                <Trash2 size={13} /> Clear Scans
              </button>
            )}
            {tab === 'searches' && searchHistory.length > 0 && (
              <button
                className="btn btn-sm btn-ghost text-red-600 hover:bg-red-50 flex items-center gap-1.5 text-xs"
                onClick={() => triggerClear('searches')}
              >
                <Trash2 size={13} /> Clear Searches
              </button>
            )}
          </div>
        )}
      </div>

      {/* Clear Confirmation Modal */}
      {showClearConfirm && (
        <div className="modal-backdrop" onClick={() => setShowClearConfirm(false)}>
          <div className="modal-box max-w-sm p-6 text-center space-y-4 animate-fade-up" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 size={24} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {clearTarget === 'scans' ? 'Clear Scan History?' : 'Clear Search & Query History?'}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {clearTarget === 'scans'
                  ? `Are you sure you want to clear all ${scanHistory.length} skin scan records? This action cannot be undone.`
                  : `Are you sure you want to clear all ${searchHistory.length} consultation & search records?`}
              </p>
            </div>
            <div className="flex gap-2">
              <button className="btn btn-secondary flex-1" onClick={() => setShowClearConfirm(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary flex-1"
                style={{ background: '#E11D48', borderColor: '#E11D48' }}
                onClick={handleConfirmClear}
              >
                Yes, Clear All
              </button>
            </div>
          </div>
        </div>
      )}

      {!currentUser && (
        <div className="card p-8 text-center">
          <History size={32} className="text-slate-300 mx-auto mb-3"/>
          <p className="text-slate-600 font-semibold mb-1">Sign In Required</p>
          <p className="text-slate-500 text-sm">Please sign in to track and view your personalized health records and search history.</p>
        </div>
      )}

      {currentUser && (
        <>
          {/* Navigation Tabs (3 Tabs) */}
          <div className="tab-nav">
            <button
              className={`tab-btn ${tab === 'scans' ? 'active' : ''}`}
              onClick={() => setTab('scans')}
            >
              <Camera size={14}/> Skin Scans ({scanHistory.length})
            </button>
            <button
              className={`tab-btn ${tab === 'searches' ? 'active' : ''}`}
              onClick={() => setTab('searches')}
            >
              <Search size={14}/> Search & Queries ({searchHistory.length})
            </button>
            <button
              className={`tab-btn ${tab === 'appointments' ? 'active' : ''}`}
              onClick={() => setTab('appointments')}
            >
              <Calendar size={14}/> Appointments ({appointments.length})
            </button>
          </div>

          {/* 1. SCANS TAB */}
          {tab === 'scans' && (
            <div className="space-y-3">
              {scanHistory.length === 0 ? (
                <div className="card p-8 text-center space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-teal-50 flex items-center justify-center mx-auto text-teal-600">
                    <Sparkles size={24}/>
                  </div>
                  <h3 className="font-bold text-slate-800">No Scan Results Recorded</h3>
                  <p className="text-slate-500 text-xs max-w-sm mx-auto">
                    Your account has no saved scans yet. Upload a skin image under the AI Skin Scan tab to generate a clinical diagnosis.
                  </p>
                </div>
              ) : (
                scanHistory.map(scan => (
                  <div key={scan.id} className="card p-3 sm:p-4 flex items-center gap-2.5 sm:gap-4 card-interactive group">
                    <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-slate-100 border flex items-center justify-center" style={{ borderColor: '#E2E8F0' }}>
                      {scan.previewUrl ? (
                        <img 
                          src={scan.previewUrl} 
                          alt="" 
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        <Camera size={20} className="text-slate-400"/>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 truncate text-sm">{scan.prediction}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {new Date(scan.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                      <p className="text-xs text-teal-600 font-medium mt-0.5">
                        {Math.round((scan.confidence || 0) * 100)}% AI confidence
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`badge ${RISK_BADGE[scan.risk_level] || 'badge-neutral'} uppercase text-[10px]`}>
                        {scan.risk_level || 'standard'}
                      </span>
                      {onDeleteScan && (
                        <button
                          className="btn btn-icon btn-sm btn-ghost text-slate-400 hover:text-red-600 opacity-60 group-hover:opacity-100 transition-opacity"
                          title="Delete scan"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteScan(scan.id);
                          }}
                        >
                          <Trash2 size={15}/>
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* 2. SEARCH & CONSULTATION HISTORY TAB */}
          {tab === 'searches' && (
            <div className="space-y-3">
              {searchHistory.length === 0 ? (
                <div className="card p-8 text-center space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-teal-50 flex items-center justify-center mx-auto text-teal-600">
                    <Search size={24}/>
                  </div>
                  <h3 className="font-bold text-slate-800">No Search History Recorded</h3>
                  <p className="text-slate-500 text-xs max-w-sm mx-auto">
                    When you ask questions in the AI Consultant or search for dermatologists & clinics, your queries will be saved here under your Google account.
                  </p>
                </div>
              ) : (
                searchHistory.map(item => {
                  const isConsultation = item.type !== 'hospital_search';
                  return (
                    <div key={item.id} className="card p-3.5 sm:p-4 card-interactive group transition-all">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                            style={{
                              background: item.type === 'hospital_search' ? '#F0F9FF' : '#F0FDFA',
                              color: item.type === 'hospital_search' ? '#0284C7' : '#0D9488',
                            }}
                          >
                            {item.type === 'hospital_search' ? <Building2 size={18}/> : <MessageSquare size={18}/>}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-semibold text-slate-900 break-words">
                                {item.query}
                              </p>
                              <span
                                className="badge text-[10px] py-0.5"
                                style={{
                                  background: item.type === 'hospital_search' ? '#E0F2FE' : '#CCFBF1',
                                  color: item.type === 'hospital_search' ? '#0369A1' : '#0F766E',
                                }}
                              >
                                {item.type === 'hospital_search' ? 'Clinic Search' : 'AI Consultation'}
                              </span>
                            </div>

                            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                              <Clock size={11} className="flex-shrink-0"/>
                              {new Date(item.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              {item.location && <span>· 📍 {item.location}</span>}
                            </p>

                            {/* Previous AI Answer preview if available */}
                            {isConsultation && item.answer && (
                              <p className="text-xs text-slate-600 mt-2 line-clamp-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                                <span className="font-semibold text-teal-700">AI Response: </span>
                                {item.answer.replace(/[*#]/g, '').slice(0, 160)}...
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {onSelectSearchQuery && (
                            <button
                              type="button"
                              className="btn btn-sm text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                              style={{
                                background: item.type === 'hospital_search' ? '#F0F9FF' : '#F0FDFA',
                                color: item.type === 'hospital_search' ? '#0284C7' : '#0D9488',
                                border: `1px solid ${item.type === 'hospital_search' ? '#BAE6FD' : '#99F6E4'}`,
                              }}
                              onClick={() => onSelectSearchQuery(item)}
                              title={item.type === 'hospital_search' ? 'View nearby clinics & doctors' : 'View this chat conversation history'}
                            >
                              {item.type === 'hospital_search' ? <Building2 size={13} /> : <MessageSquare size={13} />}
                              <span className="font-semibold">
                                {item.type === 'hospital_search' ? 'View Clinics' : 'View Chat'}
                              </span>
                            </button>
                          )}

                          {onDeleteSearch && (
                            <button
                              type="button"
                              className="btn btn-icon btn-sm btn-ghost text-slate-400 hover:text-red-600 opacity-60 group-hover:opacity-100 transition-opacity"
                              title="Delete from history"
                              onClick={() => onDeleteSearch(item.id)}
                            >
                              <Trash2 size={14}/>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* 3. APPOINTMENTS TAB */}
          {tab === 'appointments' && (
            <div className="space-y-3">
              {appointments.length === 0 ? (
                <div className="card p-8 text-center space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-sky-50 flex items-center justify-center mx-auto text-sky-600">
                    <Calendar size={24}/>
                  </div>
                  <h3 className="font-bold text-slate-800">No Appointments Scheduled</h3>
                  <p className="text-slate-500 text-xs max-w-sm mx-auto">
                    You have no active doctor consultations scheduled. Find a nearby clinic to book an appointment.
                  </p>
                </div>
              ) : (
                appointments.map(appt => {
                  const statusCfg = APPT_STATUS[appt.status] || APPT_STATUS.confirmed;
                  const StatusIcon = statusCfg.icon;
                  return (
                    <div key={appt.id} className="card p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-900 truncate">{appt.hospital_name}</p>
                          <p className="text-sm text-slate-600 mt-0.5">{appt.doctor_name || 'Specialist Dermatologist'} · {appt.doctor_specialty || 'Dermatology'}</p>
                          <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-2 text-xs text-slate-500">
                            <span className="flex items-center gap-1"><Calendar size={12}/> {appt.date || appt.preferred_date}</span>
                            <span className="flex items-center gap-1"><Clock size={12}/> {appt.time || appt.preferred_time}</span>
                          </div>
                          {appt.reason && <p className="text-xs text-slate-500 mt-1.5 bg-slate-50 p-2 rounded-lg">📋 {appt.reason}</p>}
                        </div>
                        <span className={`badge ${statusCfg.cls} flex-shrink-0`}>
                          <StatusIcon size={11}/> {statusCfg.label}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
