import React, { useState, useEffect, useCallback } from 'react';
import {
  MapPin, Phone, Star, Clock, Search, Loader2, Navigation,
  Calendar, ChevronRight, Building2, Stethoscope, Filter,
  Compass, ExternalLink, ShieldCheck, RefreshCw, ChevronDown, Check
} from 'lucide-react';
import { api } from '../services/api';
import { getUserCoordinates, getCityFromCoordinates, geocodeLocationQuery } from '../utils/location';

const QUICK_CITIES = [
  { name: 'Thiruvananthapuram', lat: 8.5241, lon: 76.9366 },
  { name: 'Kochi / Ernakulam',  lat: 9.9816, lon: 76.2999 },
  { name: 'Coimbatore',         lat: 11.0168, lon: 76.9558 },
  { name: 'Chennai',            lat: 13.0827, lon: 80.2707 },
  { name: 'Bengaluru',          lat: 12.9716, lon: 77.5946 },
  { name: 'Hyderabad',          lat: 17.3850, lon: 78.4867 },
  { name: 'Mumbai',             lat: 19.0760, lon: 72.8777 },
  { name: 'New Delhi',          lat: 28.6139, lon: 77.2090 },
];

export default function HospitalFinder({
  userLocation: initialLocation,
  locationName: initialLocationName,
  onBookAppointment,
  currentUser,
  onLoginRequest,
  onRecordSearch,
  initialSearchTerm = '',
}) {
  const [userLocation, setUserLocation] = useState(
    initialLocation || { lat: 8.5241, lon: 76.9366, lng: 76.9366 }
  );
  const [locationName, setLocationName] = useState(
    initialLocationName || 'Thiruvananthapuram, Kerala'
  );
  const [hospitals, setHospitals]       = useState([]);
  const [loading, setLoading]           = useState(false);
  const [locating, setLocating]         = useState(false);
  const [searchTerm, setSearchTerm]     = useState(
    typeof initialSearchTerm === 'object' && initialSearchTerm !== null
      ? (initialSearchTerm.query || '')
      : (typeof initialSearchTerm === 'string' ? initialSearchTerm : '')
  );
  const [specialty, setSpecialty]       = useState('');
  const [sortBy, setSortBy]             = useState('distance');
  const [selected, setSelected]         = useState(null);

  useEffect(() => {
    if (initialSearchTerm) {
      setSearchTerm(
        typeof initialSearchTerm === 'object' && initialSearchTerm !== null
          ? (initialSearchTerm.query || '')
          : (typeof initialSearchTerm === 'string' ? initialSearchTerm : '')
      );
    }
  }, [initialSearchTerm]);

  // City Picker Dropdown / Modal state
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [customCityInput, setCustomCityInput] = useState('');
  const [geocodingCity, setGeocodingCity]   = useState(false);
  const [geocodeError, setGeocodeError]     = useState('');

  const SPECIALTIES = [
    'All Specialties',
    'Dermatology',
    'Skin Cancer Specialist',
    'Dermato-Oncology & Melanoma',
    'Mohs Surgery',
    'Cosmetic Dermatology',
    'Pediatric Dermatology'
  ];

  // Refresh live GPS / IP coordinates
  const refreshLocation = async () => {
    setLocating(true);
    try {
      const coords = await getUserCoordinates();
      setUserLocation(coords);
      const name = coords.city || await getCityFromCoordinates(coords.lat, coords.lon || coords.lng);
      setLocationName(name);
      setShowCityPicker(false);
    } catch (err) {
      console.warn('Geolocation refresh warning:', err.message);
    } finally {
      setLocating(false);
    }
  };

  // Handle manual city selection
  const handleSelectQuickCity = (city) => {
    setUserLocation({ lat: city.lat, lon: city.lon, lng: city.lon });
    setLocationName(city.name);
    setShowCityPicker(false);
    setGeocodeError('');
  };

  // Handle custom city or address geocode search
  const handleGeocodeSearch = async (e) => {
    e?.preventDefault();
    if (!customCityInput.trim()) return;
    setGeocodingCity(true);
    setGeocodeError('');
    try {
      const geo = await geocodeLocationQuery(customCityInput.trim());
      if (geo) {
        setUserLocation({ lat: geo.lat, lon: geo.lon, lng: geo.lng });
        setLocationName(geo.displayName);
        setShowCityPicker(false);
        setCustomCityInput('');
      } else {
        setGeocodeError('Could not find location. Please check spelling or try a nearby city.');
      }
    } catch {
      setGeocodeError('Location search failed. Please try again.');
    } finally {
      setGeocodingCity(false);
    }
  };

  // If initialLocation changed from parent App.jsx
  useEffect(() => {
    if (initialLocation && (!userLocation || userLocation.lat !== initialLocation.lat)) {
      setUserLocation(initialLocation);
    }
    if (initialLocationName && locationName === 'Detecting…') {
      setLocationName(initialLocationName);
    }
  }, [initialLocation, initialLocationName]);

  const fetchHospitals = useCallback(async () => {
    setLoading(true);
    try {
      const lat = userLocation?.lat;
      const lon = userLocation?.lon || userLocation?.lng;
      const data = await api.getNearbyHospitals({
        lat: lat != null ? lat : undefined,
        lon: lon != null ? lon : undefined,
        specialty: specialty && specialty !== 'All Specialties' ? specialty : undefined,
        limit: 15,
      });
      setHospitals(data.hospitals || []);
    } catch (err) {
      console.error('Hospital fetch error:', err.message);
      try {
        const data = await api.getNearbyHospitals({ limit: 15 });
        setHospitals(data.hospitals || []);
      } catch {
        setHospitals([]);
      }
    } finally {
      setLoading(false);
    }
  }, [userLocation, specialty]);

  useEffect(() => {
    fetchHospitals();
  }, [fetchHospitals]);

  const filtered = hospitals.filter(h => {
    const term = searchTerm.toLowerCase();
    return (
      !searchTerm ||
      h.name.toLowerCase().includes(term) ||
      h.address?.toLowerCase().includes(term) ||
      h.city?.toLowerCase().includes(term) ||
      h.specialties?.some(s => s.toLowerCase().includes(term))
    );
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0);
    if (sortBy === 'distance') {
      const distA = a.distance_km != null ? a.distance_km : 9999;
      const distB = b.distance_km != null ? b.distance_km : 9999;
      return distA - distB;
    }
    return 0;
  });

  return (
    <div className="space-y-5 animate-fade-up">
      {/* Header & Location Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900" style={{ fontFamily: 'Outfit,sans-serif' }}>
            Find Dermatologists & Hospitals
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Verified skin care clinics & dermato-oncology centers near your live coordinates
          </p>
        </div>

        {/* Live Location / City Selector Button */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowCityPicker(!showCityPicker)}
            className="inline-flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:py-2 rounded-xl text-xs font-semibold text-teal-900 transition-all hover:bg-teal-100/90 border shadow-xs max-w-full"
            style={{ background: '#F0FDFA', borderColor: '#99F6E4' }}
            title="Click to change location or re-scan GPS"
          >
            {locating ? (
              <Loader2 size={13} className="animate-spin text-teal-600 flex-shrink-0" />
            ) : (
              <Navigation size={13} className="text-teal-600 flex-shrink-0" />
            )}
            <span className="max-w-[150px] sm:max-w-[200px] truncate">{locationName || 'Detecting Location…'}</span>
            <ChevronDown size={12} className="text-teal-600 ml-0.5 flex-shrink-0" />
          </button>

          {/* Location Selector Popup */}
          {showCityPicker && (
            <div
              className="absolute right-0 top-full mt-2 w-[calc(100vw-2rem)] max-w-sm rounded-2xl bg-white border shadow-xl p-3.5 sm:p-4 z-40 space-y-3 animate-fade-up"
              style={{ borderColor: '#E2E8F0' }}
            >
              <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: '#F1F5F9' }}>
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Select Location</span>
                <button
                  className="text-xs text-teal-700 hover:underline flex items-center gap-1 font-semibold"
                  onClick={refreshLocation}
                  disabled={locating}
                >
                  <RefreshCw size={11} className={locating ? 'animate-spin' : ''}/>
                  {locating ? 'Scanning…' : 'Use Current Live GPS'}
                </button>
              </div>

              {/* City or Pincode Search form */}
              <form onSubmit={handleGeocodeSearch} className="flex gap-2">
                <input
                  className="input text-xs py-1.5 flex-1"
                  placeholder="Type city or area (e.g. Kochi, Coimbatore)…"
                  value={customCityInput}
                  onChange={e => setCustomCityInput(e.target.value)}
                />
                <button
                  type="submit"
                  className="btn btn-sm btn-primary text-xs flex-shrink-0"
                  disabled={geocodingCity || !customCityInput.trim()}
                >
                  {geocodingCity ? <Loader2 size={12} className="animate-spin"/> : 'Search'}
                </button>
              </form>

              {geocodeError && (
                <p className="text-[11px] text-red-600">{geocodeError}</p>
              )}

              {/* Quick Select Cities */}
              <div>
                <p className="text-[11px] text-slate-400 font-medium mb-1.5">Popular Regions:</p>
                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
                  {QUICK_CITIES.map(c => {
                    const isCurrent = locationName?.toLowerCase().includes(c.name.split(' ')[0].toLowerCase());
                    return (
                      <button
                        key={c.name}
                        type="button"
                        className={`text-xs px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1 ${
                          isCurrent
                            ? 'bg-teal-50 border-teal-400 text-teal-800 font-bold'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-teal-300'
                        }`}
                        onClick={() => handleSelectQuickCity(c)}
                      >
                        {isCurrent && <Check size={11} className="text-teal-600"/>}
                        {c.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="card p-4 space-y-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-9"
            placeholder="Search by clinic name, doctor, or landmark…"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && searchTerm.trim()) {
                onRecordSearch?.(searchTerm.trim(), 'hospital_search', { location: locationName });
              }
            }}
            onBlur={() => {
              if (searchTerm.trim().length >= 3) {
                onRecordSearch?.(searchTerm.trim(), 'hospital_search', { location: locationName });
              }
            }}
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-2.5">
          <select
            className="select flex-1 min-w-0"
            value={specialty}
            onChange={e => setSpecialty(e.target.value)}
          >
            {SPECIALTIES.map(s => (
              <option key={s} value={s === 'All Specialties' ? '' : s}>
                {s}
              </option>
            ))}
          </select>
          <select
            className="select w-full sm:w-40"
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
          >
            <option value="distance">📍 Nearest First</option>
            <option value="rating">⭐ Highest Rated</option>
          </select>
        </div>
      </div>

      {/* Results Header Count */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
        <span>Found {sorted.length} healthcare facilities near <strong>{locationName}</strong></span>
        {userLocation && (
          <span className="text-[11px] text-slate-400">
            Coordinates: {userLocation.lat?.toFixed(4)}, {userLocation.lon?.toFixed(4)}
          </span>
        )}
      </div>

      {/* Results List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="card p-5 space-y-3">
              <div className="shimmer h-5 w-2/3 rounded-lg" />
              <div className="shimmer h-4 w-1/2 rounded-lg" />
              <div className="shimmer h-4 w-1/3 rounded-lg" />
            </div>
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <div className="card p-8 text-center space-y-3">
          <Building2 size={36} className="text-slate-300 mx-auto" />
          <div>
            <h3 className="font-bold text-slate-800">No Hospitals Found in this Radius</h3>
            <p className="text-xs text-slate-500 mt-1">
              Try clicking "Use Current Live GPS" or selecting a major city nearby.
            </p>
          </div>
          <button
            className="btn btn-sm btn-primary"
            onClick={refreshLocation}
          >
            <RefreshCw size={13}/> Scan Live Coordinates
          </button>
        </div>
      ) : (
        <div className="space-y-3.5">
          {sorted.map(hospital => (
            <HospitalCard
              key={hospital.id}
              hospital={hospital}
              onBook={(doctor) => {
                if (!currentUser) {
                  onLoginRequest?.();
                  return;
                }
                onBookAppointment(hospital, doctor);
              }}
              isSelected={selected?.id === hospital.id}
              onSelect={() => setSelected(selected?.id === hospital.id ? null : hospital)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function HospitalCard({ hospital, onBook, isSelected, onSelect }) {
  const stars = Math.round(hospital.rating || 4.8);
  const directionsUrl = hospital.google_maps_directions_url ||
    `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(hospital.name + ' ' + (hospital.address || ''))}&travelmode=driving`;
  const searchUrl = hospital.google_maps_search_url ||
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(hospital.name + ' ' + (hospital.address || ''))}`;

  return (
    <div className={`card overflow-hidden transition-all ${isSelected ? 'ring-2 ring-teal-500 shadow-md' : 'hover:border-teal-200 shadow-xs'}`}>
      <div className="p-5">
        <div className="flex items-start gap-4">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm"
            style={{ background: 'linear-gradient(135deg,#CCFBF1,#99F6E4)' }}
          >
            <Building2 size={22} className="text-teal-700" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-bold text-slate-900 text-sm sm:text-base leading-snug">{hospital.name}</h3>
              <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                {hospital.driving_distance_km != null ? (
                  <span className="badge badge-primary text-xs font-semibold" title="Accurate road driving distance calculated for Google Maps navigation">
                    🚗 ~{hospital.driving_distance_km} km drive
                  </span>
                ) : hospital.distance_km != null ? (
                  <span className="badge badge-primary text-xs font-semibold">
                    📍 {hospital.distance_km.toFixed(1)} km
                  </span>
                ) : null}
                {hospital.distance_km != null && hospital.driving_distance_km != null && (
                  <span className="text-[10px] text-slate-400 font-medium" title="Straight-line aerial distance">
                    ({hospital.distance_km.toFixed(1)} km direct)
                  </span>
                )}
              </div>
            </div>

            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              <MapPin size={12} className="text-slate-400 flex-shrink-0" />
              <span className="truncate">{hospital.address}</span>
            </p>

            <div className="flex flex-wrap items-center gap-3 mt-2.5">
              {/* Rating */}
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map(s => (
                  <Star
                    key={s}
                    size={11}
                    fill={s <= stars ? '#F59E0B' : 'none'}
                    stroke={s <= stars ? '#F59E0B' : '#CBD5E1'}
                  />
                ))}
                <span className="text-xs font-bold text-slate-700 ml-1">
                  {hospital.rating?.toFixed(1) || '4.8'}
                </span>
                <span className="text-[11px] text-slate-400">({hospital.review_count || 120} reviews)</span>
              </div>

              {/* Genuine Public Phone */}
              {hospital.phone && (
                <a
                  href={`tel:${hospital.phone}`}
                  className="text-xs text-teal-700 font-medium flex items-center gap-1 hover:underline"
                  onClick={e => e.stopPropagation()}
                  title="Call hospital directly"
                >
                  <Phone size={10} /> {hospital.phone}
                </a>
              )}

              {/* Consultation Fee */}
              {hospital.consultation_fee && (
                <span className="text-xs text-slate-600 font-medium">
                  Fee: {hospital.currency === 'USD' ? '$' : hospital.currency === 'GBP' ? '£' : '₹'}{hospital.consultation_fee}
                </span>
              )}

              {/* Tele-consult badge */}
              {hospital.tele_consult_available && (
                <span className="badge badge-success text-[10px] py-0.5">
                  ✓ Tele-Consult
                </span>
              )}

              {/* Verified Public Listing Badge */}
              <span className="badge text-[10px] py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                <ShieldCheck size={10} /> Verified Public Listing
              </span>
            </div>

            {/* Specialties tags */}
            {hospital.specialties?.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2.5">
                {hospital.specialties.slice(0, 3).map(s => (
                  <span key={s} className="badge badge-neutral text-[10px]">{s}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2 mt-4 pt-3 border-t border-slate-100">
          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-sm btn-secondary text-xs flex items-center justify-center gap-1.5 hover:bg-teal-50"
            title="Open turn-by-turn driving directions in Google Maps"
          >
            <Navigation size={13} className="text-teal-600" /> Directions (Maps)
          </a>

          <a
            href={searchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-sm btn-ghost text-xs text-slate-600 flex items-center justify-center gap-1 hover:text-teal-700"
            title="Open genuine Google Maps listing"
          >
            <Compass size={13} /> Google Info
          </a>

          <button
            className="btn btn-sm btn-secondary flex-1 text-xs"
            onClick={onSelect}
          >
            <Stethoscope size={13} /> {isSelected ? 'Hide Specialists' : `View Doctors (${hospital.doctors?.length || 1})`}
          </button>

          <button
            className="btn btn-sm btn-primary flex-1 text-xs"
            onClick={() => onBook(hospital.doctors?.[0] || null)}
          >
            <Calendar size={13} /> Book Consultation
          </button>
        </div>
      </div>

      {/* Specialist Doctors Panel */}
      {isSelected && hospital.doctors?.length > 0 && (
        <div className="border-t p-4 space-y-2.5 animate-fade-up" style={{ borderColor: '#E2E8F0', background: '#F8FAFC' }}>
          <p className="text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">
            Available Dermatology & Skin Care Specialists
          </p>
          {hospital.doctors.map(doc => (
            <div
              key={doc.id || doc.name}
              className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-xl bg-white border hover:border-teal-300 transition-colors shadow-xs"
              style={{ borderColor: '#E2E8F0' }}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg,#14B8A6,#0F766E)' }}
                >
                  {(doc.name?.split(' ').find(p => p.length > 1 && p !== 'Dr.') || 'D')[0]}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{doc.name}</p>
                  <p className="text-xs text-slate-500 truncate">
                    {doc.specialization || doc.specialty} · {doc.experience_years || doc.experience || '8+'} yrs exp
                  </p>
                  {doc.next_slot && (
                    <p className="text-[11px] text-teal-600 font-medium flex items-center gap-1 mt-0.5">
                      <Clock size={10} /> Next slot: {doc.next_slot}
                    </p>
                  )}
                </div>
              </div>

              <button
                className="btn btn-sm btn-primary text-xs w-full sm:w-auto flex-shrink-0"
                onClick={() => onBook(doc)}
              >
                Book with Doctor
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
