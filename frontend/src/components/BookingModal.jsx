import React, { useState } from 'react';
import { X, Calendar, Clock, User, CheckCircle2, Building2, Stethoscope } from 'lucide-react';
import api from '../services/api';

const TIME_SLOTS = ['09:00 AM','10:00 AM','11:00 AM','12:00 PM','02:00 PM','03:00 PM','04:00 PM','05:00 PM'];

export default function BookingModal({ hospital, doctor, currentUser, onConfirm, onClose }) {
  const [step, setStep]           = useState(1);
  const [selectedDate, setDate]   = useState('');
  const [selectedTime, setTime]   = useState('');
  const [reason, setReason]       = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');

  const today = new Date().toISOString().split('T')[0];

  const handleConfirm = async () => {
    if (!selectedDate || !selectedTime) { setError('Please select a date and time.'); return; }
    setLoading(true);
    setError('');
    try {
      const payload = {
        hospital_id: hospital?.id,
        hospital_name: hospital?.name,
        doctor_name: doctor?.name || 'Available Specialist',
        doctor_specialty: doctor?.specialty || 'Dermatologist',
        patient_name: currentUser?.name,
        patient_email: currentUser?.email,
        date: selectedDate,
        time: selectedTime,
        reason: reason || 'Skin consultation',
        status: 'confirmed'
      };
      const { data } = await api.post('/api/appointments/book', payload);
      setStep(3);
      setTimeout(() => { onConfirm({ ...payload, ...data, id: Date.now() }); }, 1800);
    } catch (err) {
      setError(err?.response?.data?.detail || 'Booking failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={e => { if(e.target === e.currentTarget) onClose(); }}>
      <div className="modal-box max-w-md w-full">
        {/* Header */}
        <div className="p-5 border-b flex items-center justify-between" style={{borderColor:'#E2E8F0'}}>
          <h2 className="font-bold text-slate-900">Book Appointment</h2>
          <button className="btn btn-icon btn-sm btn-ghost" onClick={onClose}><X size={18}/></button>
        </div>

        {step === 3 ? (
          <div className="p-8 text-center animate-scale-in">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse-ring"
                 style={{background:'#D1FAE5'}}>
              <CheckCircle2 size={32} className="text-green-600"/>
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Appointment Confirmed!</h3>
            <p className="text-slate-500 text-sm mb-1">{hospital?.name}</p>
            <p className="text-slate-600 text-sm font-semibold">{selectedDate} · {selectedTime}</p>
            <p className="text-xs text-slate-400 mt-3">A confirmation will be sent to {currentUser?.email}</p>
          </div>
        ) : (
          <div className="p-5 space-y-5">
            {/* Hospital/Doctor Info */}
            <div className="p-4 rounded-2xl flex items-center gap-3" style={{background:'#F0FDFA', border:'1px solid #CCFBF1'}}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{background:'#CCFBF1'}}>
                <Building2 size={18} className="text-teal-700"/>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800 text-sm truncate">{hospital?.name}</p>
                {doctor && <p className="text-xs text-teal-700 flex items-center gap-1 mt-0.5">
                  <Stethoscope size={11}/> {doctor.name} · {doctor.specialty}
                </p>}
              </div>
            </div>

            {/* Date */}
            <div>
              <label className="label"><Calendar size={13} className="inline mr-1"/>Select Date</label>
              <input
                type="date"
                className="input"
                min={today}
                value={selectedDate}
                onChange={e => setDate(e.target.value)}
              />
            </div>

            {/* Time Slots */}
            {selectedDate && (
              <div>
                <label className="label"><Clock size={13} className="inline mr-1"/>Select Time</label>
                <div className="grid grid-cols-4 gap-2">
                  {TIME_SLOTS.map(t => (
                    <button
                      key={t}
                      className={`py-2 px-1 rounded-xl text-xs font-semibold transition-all border ${
                        selectedTime === t
                          ? 'border-teal-400 text-teal-700 shadow-sm'
                          : 'border-slate-200 text-slate-600 hover:border-teal-300'
                      }`}
                      style={selectedTime === t ? {background:'#CCFBF1'} : {background:'#fff'}}
                      onClick={() => setTime(t)}
                    >{t}</button>
                  ))}
                </div>
              </div>
            )}

            {/* Reason */}
            <div>
              <label className="label">Reason for visit (optional)</label>
              <textarea
                className="textarea h-20"
                placeholder="Brief description of your concern…"
                value={reason}
                onChange={e => setReason(e.target.value)}
              />
            </div>

            {/* Patient */}
            <div className="p-3 rounded-xl flex items-center gap-2" style={{background:'#F8FAFC', border:'1px solid #E2E8F0'}}>
              <User size={14} className="text-slate-400"/>
              <p className="text-xs text-slate-600">Booking as <strong>{currentUser?.name}</strong> · {currentUser?.email}</p>
            </div>

            {error && <p className="text-sm text-red-600 text-center">{error}</p>}

            <button className="btn btn-primary btn-lg w-full" onClick={handleConfirm} disabled={loading}>
              {loading ? 'Confirming…' : 'Confirm Appointment'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
