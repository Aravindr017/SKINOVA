# 🩺 SKINOVA AI — Clinical Dermatological Screening & Telehealth Platform

[![Live App on Vercel](https://img.shields.io/badge/Vercel-Live%20App-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://skinova-nu.vercel.app/)
[![Backend on Render](https://img.shields.io/badge/Render-Backend%20API-46E3B7?style=for-the-badge&logo=render&logoColor=white)](https://skinova-backend-zgm6.onrender.com)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-6.1-646CFF?logo=vite&logoColor=white)](https://vitejs.dev)
[![WebAssembly](https://img.shields.io/badge/WASM-ONNX%20Web-654FF0?logo=webassembly&logoColor=white)](https://onnxruntime.ai)
[![PWA](https://img.shields.io/badge/PWA-Offline%20Ready-5A0FC8?logo=pwa&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**SKINOVA AI** is an enterprise-grade dermatological intelligence platform combining deep transfer-learning computer vision (**EfficientNet-B0**), **Google Gemini Multimodal Vision AI**, a **Retrieval-Augmented Generation (RAG)** clinical knowledge engine, and a **Geo-Spatial Specialist Triage Network**.

Built as a Progressive Web Application (PWA), SKINOVA delivers **Dual-Engine Consensus** when connected to the internet, and **100% In-Browser Zero-Latency WebAssembly Inference** when operating offline in airplane mode or remote triage environments.

---

## 🌐 Live Production Deployments

- **Frontend Application (Vercel)**: [https://skinova-nu.vercel.app/](https://skinova-nu.vercel.app/)
- **Backend API & Swagger Docs (Render)**: [https://skinova-backend-zgm6.onrender.com/docs](https://skinova-backend-zgm6.onrender.com/docs)
- **API Health Check**: [https://skinova-backend-zgm6.onrender.com/api/health](https://skinova-backend-zgm6.onrender.com/api/health)

---

## ⚡ Dual-Engine AI Architecture

SKINOVA features a hybrid clinical architecture engineered to provide maximum diagnostic accuracy when connected, while remaining completely resilient when internet access is unavailable:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           SKINOVA AI WORKFLOW                           │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ Upload Image
                                     ▼
                  ┌──────────────────────────────────────┐
                  │      Multi-Stage Lesion Gatekeeper   │
                  │ (Blocks walls, documents, portraits) │
                  └──────────────────┬───────────────────┘
                                     │ Valid Skin Lesion
                                     ├────────────────────────────┐
                                     │                            │
                            [ Online Mode ]              [ Offline Mode ]
                                     │                            │
                                     ▼                            ▼
                 ┌───────────────────────┐            ┌───────────────────────┐
                 │ Cloud Dual-Engine     │            │ Client WebAssembly    │
                 │ 1. Gemini Vision AI   │            │ 1. ONNX Runtime Web   │
                 │ 2. EfficientNet-B0    │            │ 2. Local Knowledge    │
                 └───────────┬───────────┘            └───────────┬───────────┘
                             │                                    │
                             └─────────────────┬──────────────────┘
                                               │
                                               ▼
                              ┌─────────────────────────────────┐
                              │  Clinical Triage & Differential │
                              │  • 7-Class HAM10000 Breakdown   │
                              │  • Risk Level & Urgency Rating  │
                              │  • Specialists & Hospital Match │
                              │  • Printable Clinical PDF       │
                              └─────────────────────────────────┘
```

### 1. 🟢 Online Mode: Cloud AI Consensus
- **Cloud Multimodal Vision (Google Gemini)**: Analyzes macroscopic ABCD criteria (Asymmetry, Border irregularity, Color variegation, Diameter) with advanced medical reasoning.
- **Local Feature Embeddings (EfficientNet-B0)**: Generates 7-class feature embeddings.
- **Consensus Fusion**: Merges multimodal vision with neural network embeddings to catch subtle malignant melanoma patterns that standard CNNs might under-diagnose.

### 2. ⚡ Offline Mode: 100% On-Device WebAssembly Engine
- **Zero Network Reliance**: Powered by `onnxruntime-web/wasm` executing directly inside the client's browser thread via single-threaded WebAssembly SIMD.
- **Complete Privacy**: Zero patient data or medical photographs ever leave the user's device.
- **Instant Latency**: Average inference speed of **~160 ms** on consumer laptop and smartphone hardware.
- **PWA Service Worker (v5)**: Precaches the application shell, clinical knowledge base, and model weights so the app loads and functions even in full airplane mode.

---

## 🛡️ Clinical Lesion Gatekeeper (Anti-Hallucination)

Standard neural networks with Softmax activations are closed-set: if fed an arbitrary image (e.g. a wall or paper), they are mathematically forced to output a disease prediction. SKINOVA eliminates this hazard through a multi-stage **Clinical Lesion Gatekeeper** running on both the frontend and backend:

1. **Achromatic Document Detection**: Scans for high-density bright white backgrounds ($>35\%$ pixel area with $|R-G| < 16$ and $|G-B| < 16$). Immediately rejects paper forms, notebooks, and signed documents.
2. **Surface Texture & Flatness Verification**: Evaluates pixel luminance standard deviation ($\sigma < 8.0$). Rejects flat plaster, painted walls, and uniform non-skin backdrops.
3. **Biological Skin Chromaticity Check**: Enforces standard human skin tone ranges across Fitzpatrick skin types I through VI ($R > G > B$ with chromatic separation). Rejects cold grey surfaces, blue screens, and outdoor scenery.
4. **Portrait / Passport Photo Boundary Check**: Analyzes horizontal image slices. Rejects face portraits and selfies where clothing occupies the bottom strip and hair occupies the upper boundary.

---

## 🔬 7-Class Disease Classification (WHO / HAM10000)

SKINOVA classifies dermatological conditions across the international standard HAM10000 dataset:

| Code | Disease Name | Category | Clinical Risk | Urgency Level |
| :--- | :--- | :--- | :--- | :--- |
| **MEL** | **Melanoma** | Malignant Skin Cancer | <span style="color:#ef4444; font-weight:bold;">Critical / Urgent Risk</span> | Immediate dermatological biopsy |
| **BCC** | **Basal Cell Carcinoma** | Malignant Keratinocyte Cancer | <span style="color:#f97316; font-weight:bold;">High Risk</span> | Consult specialist within 1–2 weeks |
| **AKIEC** | **Actinic Keratosis / Bowen's Disease** | Precancerous Intraepithelial Lesion | <span style="color:#f97316; font-weight:bold;">High Risk</span> | Consult specialist within 1–2 weeks |
| **BKL** | **Benign Keratosis** (Seborrheic Keratosis / Solar Lentigo) | Benign / Non-Cancerous Growth | <span style="color:#10b981; font-weight:bold;">Low Risk</span> | Routine monitoring / standard consultation |
| **NV** | **Melanocytic Nevus** (Common Mole) | Benign Proliferation of Melanocytes | <span style="color:#10b981; font-weight:bold;">Low Risk</span> | Annual checkup / ABCDE self-monitoring |
| **DF** | **Dermatofibroma** | Benign Fibrous Histiocytoma | <span style="color:#10b981; font-weight:bold;">Low Risk</span> | Standard check if changing or painful |
| **VASC** | **Vascular Lesion** (Angioma / Granuloma) | Benign Vascular Proliferation | <span style="color:#10b981; font-weight:bold;">Low Risk</span> | Routine check if bleeding or irritated |

---

## 🌟 Key Platform Features

### 1. 💬 RAG Clinical AI Consultant
- **Medical Grounding**: Indexed with **WHO ICD-11** guidelines and the **DermNet New Zealand Clinical Knowledge Base**.
- **Vector Search**: Semantic vector search powered by `sentence-transformers` (`all-MiniLM-L6-v2`) and FAISS-CPU.
- **Multi-LLM Fallback**: Google Gemini 3.5/2.5 Flash -> OpenAI GPT-4o -> Local Ollama (`qwen2.5`) -> Zero-dependency Offline Clinical Synthesis Engine.

### 2. 📍 Geo-Intelligent Specialist & Hospital Finder
- **Authentic Facility Directory**: Features verified specialty centers, dermatology clinics, and cutaneous oncology centers across major hubs (Thiruvananthapuram RCC/MCH/KIMS, Kochi, Chennai, Bengaluru, Mumbai, Delhi).
- **Proximity-First Risk Triage**: Critical-risk scans (Melanoma) prioritize oncology and Mohs surgery centers within immediate radius.
- **OpenStreetMap Integration**: Dynamic live Overpass API query for real-time nearby clinics.

### 3. 📄 Clinical PDF Report Generator
- **One-Click Export**: Generates printable medical reports with macro photos, differential probability charts, ABCDE clinical findings, and physician referral notes using `jsPDF` and `html2canvas`.

### 4. 🏃 Health & Activity Tracking
- **Apple Health & Google Fit Sync**: Quick-input modal and JSON/XML importer for steps, active calories, water intake, and heart rate.
- **Sun & UV Protection**: Dynamic UV index protection advisor and daily hydration requirement calculator.

---

## 🏗️ Repository Architecture & File Directory

```
SKINOVA/
├── Model/                               # Machine Learning checkouts & models
│   ├── skinova_efficientnetb0_best.keras# Trained Keras checkpoint (32.9 MB)
│   ├── skinova_efficientnetb0_fixed.onnx# Re-exported FP32 ONNX model (17.4 MB)
│   ├── skinova_efficientnetb0.onnx      # Primary ONNX baseline
│   ├── quantize_onnx.py                 # INT8 dynamic quantization script
│   └── Skinova_AI_skin_disease_detection.ipynb # Research & training notebook
├── backend/                             # High-performance FastAPI backend
│   ├── app/
│   │   ├── main.py                      # FastAPI app, endpoints, gatekeepers, CORS
│   │   ├── predictor.py                 # Dual-Engine ONNX inference & Gemini screener
│   │   ├── llm.py                       # Clinical AI Consultant & LLM orchestrator
│   │   ├── rag.py                       # Semantic search & FAISS vector retriever
│   │   ├── hospitals_data.py            # Verified hospital database & OSM Overpass queries
│   │   ├── storage.py                   # User activity & appointment persistence
│   │   └── validic.py                   # Health IoT & fitness data integration
│   ├── data/                            # Knowledge base chunks & prebuilt embeddings
│   ├── uploads/                         # Temporary upload directory
│   ├── requirements.txt                 # Backend Python dependencies
│   └── .env.example                     # Backend environment template
├── frontend/                            # React + Vite Progressive Web App
│   ├── public/
│   │   ├── models/
│   │   │   └── skinova_efficientnetb0.onnx # On-device WebAssembly model (17.4 MB)
│   │   ├── wasm/
│   │   │   ├── ort-wasm-simd-threaded.wasm # ONNX WebAssembly engine binary (14.2 MB)
│   │   │   └── ort-wasm-simd-threaded.mjs  # WebAssembly JS loader (24 KB)
│   │   ├── data/
│   │   │   └── clinicalKnowledge.json   # Offline clinical knowledge base
│   │   ├── sw.js                        # Service worker (skinova-pwa-v5 offline precache)
│   │   ├── manifest.json                # PWA manifest
│   │   ├── icon-192.png                 # PWA App icon 192x192
│   │   └── icon-512.png                 # PWA App icon 512x512
│   ├── src/
│   │   ├── components/                  # UI components
│   │   │   ├── ImageUploader.jsx        # Drag-and-drop lesion scanner & camera capture
│   │   │   ├── DiagnosisCard.jsx        # Probability breakdown, risk badges, urgency
│   │   │   ├── RAGChatbot.jsx           # AI Clinical Consultant dialogue interface
│   │   │   ├── HospitalFinder.jsx       # Interactive hospital & specialist locator
│   │   │   ├── HealthDashboard.jsx      # Activity rings, health logs, UV advisor
│   │   │   ├── BookingModal.jsx         # In-app appointment booking dialog
│   │   │   ├── ReportModal.jsx          # PDF clinical summary generator
│   │   │   ├── AuthModal.jsx            # User authentication & Google Sign-In
│   │   │   ├── UserProfile.jsx          # Profile settings, scan history, bookings
│   │   │   ├── Navbar.jsx               # Navigation bar with online/offline status pill
│   │   │   └── InteractiveBackground.jsx# Ambient clinical gradient canvas
│   │   ├── services/
│   │   │   ├── api.js                   # Axios HTTP client with sanitization
│   │   │   └── offlineScanner.js        # WebAssembly ONNX inference & on-device gatekeeper
│   │   ├── utils/
│   │   │   └── location.js              # HTML5 & IP geolocation resolution
│   │   ├── App.jsx                      # Main app state, routing, and scan handler
│   │   ├── main.jsx                     # React DOM entry point & SW registration
│   │   └── index.css                    # Custom medical design system & Tailwind tokens
│   ├── package.json                     # Frontend dependencies
│   └── vite.config.js                   # Vite bundler configuration
├── start.sh                             # Automated startup script (macOS / Linux)
├── start.bat                            # Automated startup script (Windows)
├── render.yaml                          # Render cloud deployment specification
└── README.md                            # Comprehensive project documentation
```

---

## 🚀 Local Development Setup

### Option 1: Automated Script (Recommended)

#### On macOS / Linux:
```bash
chmod +x start.sh
./start.sh
```

#### On Windows:
```cmd
start.bat
```

*The automated script checks Python & Node.js environments, installs missing packages, initializes the virtual environment, and launches both frontend and backend concurrently.*

---

### Option 2: Manual Installation

#### 1. Backend Setup:
```bash
cd backend

# Create virtual environment
python3 -m venv .venv
source .venv/bin/activate       # On Windows: .venv\Scripts\activate

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Start backend server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

#### 2. Frontend Setup:
```bash
cd frontend

# Install dependencies
npm install

# Start Vite dev server
npm run dev
```

Open **http://localhost:5173** in your browser.

---

## 🔑 Environment Configuration

Create a `.env` file in `backend/`:
```env
# Google Gemini API Key (Enables Cloud AI Consensus & Consultant)
GEMINI_API_KEY=your_gemini_api_key

# Google OAuth Credentials (Optional: enables Google login verification)
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret

# Optional: OpenAI API Fallback
OPENAI_API_KEY=your_openai_api_key

# Optional: Local Ollama URL
OLLAMA_URL=http://localhost:11434/api/chat
OLLAMA_MODEL=qwen2.5:0.5b
```

Create a `.env` file in `frontend/`:
```env
# Backend API Base URL
VITE_API_URL=http://localhost:8000

# Google OAuth Client ID
VITE_GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
```

---

## 📡 REST API Specification

Interactive Swagger UI documentation is available at `http://localhost:8000/docs` or `https://skinova-backend-zgm6.onrender.com/docs`.

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/predict` | Upload an image file (`multipart/form-data`) for 7-class prediction and risk classification |
| `POST` | `/api/chat` | Query the RAG Clinical Consultant with user questions and lesion context |
| `GET` | `/api/hospitals/nearby` | Query nearby hospitals and dermatologists with coordinates and risk level |
| `POST` | `/api/appointments/book` | Book an appointment with a specialist |
| `GET` | `/api/appointments/user` | Fetch booked appointments by email |
| `GET` | `/api/knowledge/search` | Search indexed WHO / DermNet clinical knowledge chunks |
| `POST` | `/api/health/log` | Record daily fitness metrics (steps, water, sleep, calories) |
| `GET` | `/api/health/summary` | Fetch 7-day fitness averages and skin health scores |
| `GET` | `/api/health` | Health check endpoint |

---

## ⚠️ Medical Disclaimer

> **IMPORTANT CLINICAL NOTICE**: SKINOVA AI is an experimental computer vision and clinical decision-support tool created for educational, triage awareness, and preliminary screening purposes. **It does NOT provide a definitive medical diagnosis and is NOT a substitute for professional clinical judgment, dermoscopy, or biopsy.** If you have a changing mole, persistent rash, bleeding growth, or suspicious skin abnormality, consult a board-certified dermatologist or qualified healthcare physician immediately.

---

## 📄 License

This platform is open-source under the [MIT License](LICENSE).
