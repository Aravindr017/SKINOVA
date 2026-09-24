import React, { useState, useEffect } from 'react';
import {
  AlertTriangle, CheckCircle2, Info, ChevronDown, ChevronUp,
  FileText, MapPin, Sparkles, TrendingUp, Shield, AlertCircle,
  Building2, Calendar, Compass, Clock, Star, ChevronRight
} from 'lucide-react';
import { api } from '../services/api';

const RISK_CONFIG = {
  low:      { color: '#10B981', bg: '#D1FAE5', label: 'Low Risk',      icon: CheckCircle2 },
  moderate: { color: '#F59E0B', bg: '#FEF3C7', label: 'Moderate Risk', icon: AlertTriangle },
  high:     { color: '#F43F5E', bg: '#FFE4E6', label: 'High Risk',     icon: AlertCircle },
  critical: { color: '#DC2626', bg: '#FEE2E2', label: 'Critical Risk', icon: AlertCircle },
  urgent:   { color: '#DC2626', bg: '#FEE2E2', label: 'Urgent Care',   icon: AlertCircle },
};

export default function DiagnosisCard({
  result,
  userLocation,
  locationName,
  onViewReport,
  onFindHospital,
  onBookAppointment,
}) {
  const [showDetails, setShowDetails] = useState(false);
  const [recommendedHospitals, setRecommendedHospitals] = useState([]);
  const [loadingHospitals, setLoadingHospitals] = useState(false);

  if (!result) return null;

  const risk     = RISK_CONFIG[result.risk_level] || RISK_CONFIG.moderate;
  const RiskIcon = risk.icon;
  const confPct  = Math.round((result.confidence || 0) * 100);
  const topClasses = result.top_classes || [];

  // Fetch condition-specific recommended hospitals near the user's live location
  useEffect(() => {
    let isMounted = true;
    const fetchRecommendations = async () => {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        setLoadingHospitals(false);
        return;
      }
      setLoadingHospitals(true);
      try {
        const lat = userLocation?.lat;
        const lon = userLocation?.lon || userLocation?.lng;
        const data = await api.getNearbyHospitals({
          lat: lat != null ? lat : undefined,
          lon: lon != null ? lon : undefined,
          limit: 3,
        });
        if (isMounted) {
          setRecommendedHospitals((data.hospitals || []).slice(0, 2));
        }
      } catch (err) {
        console.warn('Could not fetch recommended hospitals:', err);
      } finally {
        if (isMounted) setLoadingHospitals(false);
      }
    };

    fetchRecommendations();
    return () => { isMounted = false; };
  }, [userLocation, result.risk_level, result.prediction]);

  return (
    <div className="space-y-4 animate-fade-up">
      {/* Main Result Card */}
      <div className="card overflow-hidden">
        {/* Risk Banner */}
        <div
          className="px-5 py-3 flex items-center gap-2"
          style={{ background: risk.bg, borderBottom: `1px solid ${risk.color}22` }}
        >
          <RiskIcon size={16} style={{ color: risk.color }} />
          <span className="text-sm font-bold" style={{ color: risk.color }}>{risk.label}</span>
          <span className="ml-auto text-xs font-semibold" style={{ color: risk.color }}>
            {confPct}% confidence
          </span>
        </div>

        <div className="p-5">
          {/* Prediction & Confidence */}
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Detected Skin Condition
              </p>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 truncate" style={{ fontFamily: 'Outfit,sans-serif' }}>
                {result.prediction}
              </h2>
              {result.icd_code && (
                <p className="text-xs text-slate-400 mt-0.5">ICD-10 Clinical Code: {result.icd_code}</p>
              )}
            </div>
            <div className="flex-shrink-0 text-right">
              <p className="text-xs text-slate-400 mb-0.5 sm:mb-1">Confidence</p>
              <div className="text-2xl sm:text-3xl font-extrabold gradient-text" style={{ fontFamily: 'Outfit,sans-serif' }}>
                {confPct}%
              </div>
            </div>
          </div>

          {/* Confidence Bar */}
          <div className="mb-4">
            <div className="progress-track">
              <div
                className={`progress-fill ${result.risk_level === 'high' ? 'danger' : result.risk_level === 'moderate' ? 'warning' : 'success'}`}
                style={{ width: `${confPct}%` }}
              />
            </div>
          </div>

          {/* AI Clinical Summary */}
          {result.llm_summary && (
            <div className="p-3.5 sm:p-4 rounded-xl mb-4" style={{ background: '#F0FDFA', border: '1px solid #99F6E4' }}>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={14} className="text-teal-600 flex-shrink-0" />
                <span className="text-xs font-bold text-teal-800 uppercase tracking-wider">
                  AI Clinical Consultation Analysis
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">{result.llm_summary}</p>
            </div>
          )}

          {/* Probability Distribution */}
          {topClasses.length > 0 && (
            <div className="mb-5">
              <button
                type="button"
                className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-teal-600 transition-colors uppercase tracking-wider"
                onClick={() => setShowDetails(!showDetails)}
              >
                <TrendingUp size={14} />
                Differential Classification Probabilities
                {showDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              {showDetails && (
                <div className="mt-3 space-y-2.5 animate-fade-up p-3 bg-slate-50 rounded-xl border border-slate-200">
                  {topClasses.map(([cls, prob]) => (
                    <div key={cls}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-semibold text-slate-700">{cls}</span>
                        <span className="text-slate-500 font-bold">{Math.round(prob * 100)}%</span>
                      </div>
                      <div className="progress-track" style={{ height: '6px' }}>
                        <div className="progress-fill" style={{ width: `${Math.round(prob * 100)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Recommended Nearby Hospitals Section (Tailored to Live Location & Condition) */}
          <div className="p-3.5 sm:p-4 rounded-2xl border mb-5 space-y-3" style={{ background: '#F8FAFC', borderColor: '#E2E8F0' }}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <div className="flex items-center gap-2">
                <Building2 size={15} className="text-teal-600 flex-shrink-0" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider truncate">
                  Recommended Specialists for {result.prediction.split(' ')[0]}
                </h3>
              </div>
              <span className="text-[11px] text-teal-700 font-medium">
                📍 {locationName || 'Near your location'}
              </span>
            </div>

            {loadingHospitals ? (
              <div className="p-4 text-center text-xs text-slate-400">Finding nearest specialist clinics…</div>
            ) : recommendedHospitals.length === 0 ? (
              <p className="text-xs text-slate-500">Find doctors tab has full directory of specialist clinics.</p>
            ) : (
              <div className="space-y-2.5">
                {recommendedHospitals.map(hosp => {
                  const doc = hosp.doctors?.[0];
                  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(hosp.name + ' ' + (hosp.address || ''))}`;
                  return (
                    <div
                      key={hosp.id}
                      className="p-3 bg-white rounded-xl border border-slate-200 hover:border-teal-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-bold text-slate-900 truncate">{hosp.name}</p>
                          {hosp.distance_km != null && (
                            <span className="badge badge-primary text-[10px] py-0.5">
                              📍 {hosp.distance_km.toFixed(1)} km away
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 truncate flex items-center gap-1">
                          <MapPin size={11} className="text-slate-400 flex-shrink-0"/> {hosp.address}
                        </p>
                        {doc && (
                          <p className="text-xs text-teal-700 font-medium mt-1">
                            👨‍⚕️ {doc.name} · {doc.specialization}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto justify-end">
                        <a
                          href={mapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-sm btn-ghost text-xs text-slate-500 hover:text-teal-700 flex items-center gap-1"
                          title="Open in Google Maps"
                        >
                          <Compass size={13} /> Maps
                        </a>
                        <button
                          type="button"
                          className="btn btn-sm btn-primary text-xs flex items-center gap-1 flex-1 sm:flex-initial"
                          onClick={() => {
                            if (onBookAppointment) {
                              onBookAppointment(hosp, doc || null);
                            } else {
                              onFindHospital?.();
                            }
                          }}
                        >
                          <Calendar size={13} /> Book Now
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3">
            <button className="btn btn-primary flex-1 text-xs sm:text-sm" onClick={onFindHospital}>
              <MapPin size={15}/> View All Nearby Dermatologists
            </button>
            <button className="btn btn-secondary text-xs sm:text-sm" onClick={onViewReport}>
              <FileText size={15}/> Download Full Report
            </button>
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="card-sm p-3.5 flex items-start gap-2.5 bg-slate-50 border border-slate-200">
        <Shield size={14} className="text-slate-400 mt-0.5 flex-shrink-0"/>
        <p className="text-xs text-slate-500 leading-relaxed">
          <strong>Clinical Notice:</strong> This AI screening does not constitute a definitive medical diagnosis. If you have an irregular lesion, bleeding, or color asymmetry, please consult a qualified dermatologist immediately.
        </p>
      </div>
    </div>
  );
}
