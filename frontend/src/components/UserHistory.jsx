import React, { useState } from 'react';
import { History, Calendar, Clock, CheckCircle2, AlertTriangle, XCircle, Camera, ChevronRight, Trash2, ShieldAlert, Sparkles } from 'lucide-react';

export default function UserHistory({ scanHistory = [], appointments = [], currentUser, onClearScans, onDeleteScan }) {
  const [tab, setTab] = useState('scans');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

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

  const handleConfirmClear = () => {
    onClearScans?.();
    setShowClearConfirm(false);
  };

  return (
    <div className="space-y-5 animate-fade-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900" style={{ fontFamily: 'Outfit,sans-serif' }}>My Health Records</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Your scan history and doctor appointment records</p>
        </div>
        {currentUser && tab === 'scans' && scanHistory.length > 0 && (
          <button
            className="btn btn-sm btn-ghost text-red-600 hover:bg-red-50 flex items-center gap-1.5 self-start sm:self-auto text-xs"
            onClick={() => setShowClearConfirm(true)}
          >
            <Trash2 size={13} /> Clear All Scans
          </button>
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
              <h3 className="text-base font-bold text-slate-900">Clear Scan History?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to clear all {scanHistory.length} scan records? This action cannot be undone.
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
          <p className="text-slate-500 text-sm">Please sign in to view and manage your saved health history.</p>
        </div>
      )}

      {currentUser && (
        <>
          <div className="tab-nav">
            <button className={`tab-btn ${tab === 'scans' ? 'active' : ''}`} onClick={() => setTab('scans')}>
              <Camera size={14}/> Skin Scans ({scanHistory.length})
            </button>
            <button className={`tab-btn ${tab === 'appointments' ? 'active' : ''}`} onClick={() => setTab('appointments')}>
              <Calendar size={14}/> Appointments ({appointments.length})
            </button>
          </div>

          {tab === 'scans' && (
            <div className="space-y-3">
              {scanHistory.length === 0 ? (
                <div className="card p-8 text-center space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-teal-50 flex items-center justify-center mx-auto text-teal-600">
                    <Sparkles size={24}/>
                  </div>
                  <h3 className="font-bold text-slate-800">No Scan Results Recorded</h3>
                  <p className="text-slate-500 text-xs max-w-sm mx-auto">
                    Your history is clean. Upload a skin image under the AI Skin Scan tab to generate a clinical diagnosis.
                  </p>
                </div>
              ) : (
                scanHistory.map(scan => (
                  <div key={scan.id} className="card p-3 sm:p-4 flex items-center gap-2.5 sm:gap-4 card-interactive group">
                    <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-slate-100 border" style={{ borderColor: '#E2E8F0' }}>
                      {scan.previewUrl ? (
                        <img src={scan.previewUrl} alt="" className="w-full h-full object-cover"/>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Camera size={20} className="text-slate-400"/>
                        </div>
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

          {tab === 'appointments' && (
            <div className="space-y-3">
              {appointments.length === 0 ? (
                <div className="card p-8 text-center space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-sky-50 flex items-center justify-center mx-auto text-sky-600">
                    <Calendar size={24}/>
                  </div>
                  <h3 className="font-bold text-slate-800">No Appointments Scheduled</h3>
                  <p className="text-slate-500 text-xs max-w-sm mx-auto">
                    You have no active doctor consultations. Find a nearby clinic to book an appointment.
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
