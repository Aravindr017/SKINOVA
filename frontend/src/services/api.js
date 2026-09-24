// ==========================================
// SKINOVA - Frontend API Client (Fixed)
// ==========================================

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// ── Axios instance (this is what components should import as default)
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Input sanitization helpers (security)
export function sanitizeText(input, maxLen = 500) {
  if (typeof input !== 'string') return '';
  // Strip HTML tags, null bytes, control chars
  let clean = input
    .replace(/<[^>]*>/g, '')           // strip HTML
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')  // control chars
    .trim()
    .slice(0, maxLen);
  return clean;
}

// Anti prompt-injection: blocks known injection patterns in user text
export function isPromptInjection(text) {
  const INJECTION_PATTERNS = [
    /ignore\s+(all\s+)?previous\s+instructions/i,
    /you\s+are\s+now\s+(a|an)\s+/i,
    /system\s+prompt/i,
    /jailbreak/i,
    /DAN\s+mode/i,
    /pretend\s+(you|that)/i,
    /act\s+as\s+(a|an)\s+(?!dermatologist|doctor|medical)/i,
    /<\|.*\|>/,           // token injection
    /\[INST\]/i,          // llama injection
    /###\s*Human:/i,      // anthropic injection
  ];
  return INJECTION_PATTERNS.some(p => p.test(text));
}

// ── Response interceptor for error normalization
apiClient.interceptors.response.use(
  res => res,
  err => {
    const message = err?.response?.data?.detail || err?.message || 'Request failed';
    return Promise.reject(new Error(message));
  }
);

apiClient.chat = ({ query, predictedClass, confidence, topK, top_k = 4 }) => {
  return apiClient.post('/api/chat', {
    query: sanitizeText(query, 500),
    predicted_class: predictedClass || null,
    top_k: topK || top_k || 4,
  }).then(r => r.data);
};

apiClient.syncUserActivity = ({ userId, email, scans, searches, appointments, healthLogs }) => {
  return apiClient.post('/api/user/sync', {
    user_id: userId,
    email: email,
    scans: scans || [],
    searches: searches || [],
    appointments: appointments || [],
    health_logs: healthLogs || []
  }).then(r => r.data);
};

apiClient.getUserActivity = (userId, email) => {
  return apiClient.get('/api/user/activity', { params: { user_id: userId, email } }).then(r => r.data);
};

export default apiClient;

// ── Named exports for legacy compatibility (if any component uses api.methodName)
export const api = {
  checkHealth: () => apiClient.get('/api/health').then(r => r.data),
  predictImage: (file) => {
    const fd = new FormData(); fd.append('file', file);
    return apiClient.post('/api/predict', fd, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data);
  },
  searchKnowledgeBase: (query, top_k = 5) => apiClient.post('/api/rag', { query: sanitizeText(query, 500), top_k }).then(r => r.data),
  getNearbyHospitals: ({ lat, lon, city, specialty, limit = 10 }) => {
    const params = {};
    if (lat) params.lat = lat;
    if (lon) params.lon = lon;
    if (city) params.city = city;
    if (specialty) params.specialty = specialty;
    params.limit = limit;
    return apiClient.get('/api/hospitals/nearby', { params }).then(r => r.data);
  },
  bookAppointment: (data) => apiClient.post('/api/appointments/book', data).then(r => r.data),
  googleSignIn: (profile) => apiClient.post('/api/auth/google', profile).then(r => r.data),
  emailLogin: ({ email, password }) => apiClient.post('/api/auth/login', { email, password }).then(r => r.data),
  chat: ({ query, predictedClass, confidence, topK, top_k = 4 }) => {
    return apiClient.post('/api/chat', {
      query: sanitizeText(query, 500),
      predicted_class: predictedClass || null,
      confidence: confidence || null,
      top_k: topK || top_k || 4,
    }).then(r => r.data);
  },
  syncUserActivity: ({ userId, email, scans, searches, appointments, healthLogs }) => {
    return apiClient.post('/api/user/sync', {
      user_id: userId,
      email: email,
      scans: scans || [],
      searches: searches || [],
      appointments: appointments || [],
      health_logs: healthLogs || []
    }).then(r => r.data);
  },
  getUserActivity: (userId, email) => {
    return apiClient.get('/api/user/activity', { params: { user_id: userId, email } }).then(r => r.data);
  },
};
