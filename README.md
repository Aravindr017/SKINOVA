# 🩺 SKINOVA AI — Dermatological Intelligence & Clinical Care Platform

[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-6.1-646CFF?logo=vite&logoColor=white)](https://vitejs.dev)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![ONNX Runtime](https://img.shields.io/badge/ONNX_Runtime-1.18+-005CED?logo=onnx&logoColor=white)](https://onnxruntime.ai)
[![Python](https://img.shields.io/badge/Python-3.10%20|%203.11%20|%203.12%20|%203.14-3776AB?logo=python&logoColor=white)](https://www.python.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**SKINOVA AI** is an end-to-end, medical-grade dermatological screening, clinical AI consultation, and care-coordination platform. Combining transfer-learning Convolutional Neural Networks (**EfficientNet-B0 INT8/FP32**) with a Retrieval-Augmented Generation (**RAG**) Clinical Knowledge Engine and a Geo-Intelligent Specialist Finder, SKINOVA bridges the gap between early lesion triage and verified clinical care.

---

## 🌟 Key Features

### 1. 🔬 AI Skin Lesion Classifier (Computer Vision)
- **Model Architecture**: Deep transfer-learning using **EfficientNet-B0** with INT8 dynamic quantization (reducing footprint to **4.39 MB** with sub-30ms inference latency).
- **7-Class HAM10000 Triage**:
  - `MEL`: Melanoma (*Malignant Melanocytic Skin Cancer*) — Critical / Urgent Triage
  - `NV`: Melanocytic Nevus (*Common or Atypical Mole*) — Benign
  - `BCC`: Basal Cell Carcinoma (*Non-Melanoma Keratinocyte Cancer*) — High Risk
  - `AKIEC`: Actinic Keratosis / Intraepithelial Carcinoma (*Precancerous*) — High Risk
  - `BKL`: Benign Keratosis (*Seborrheic Keratosis / Solar Lentigo*) — Benign
  - `DF`: Dermatofibroma (*Benign Fibrous Histiocytoma*) — Benign
  - `VASC`: Vascular Lesion (*Hemangioma / Pyogenic Granuloma*) — Benign
- **Multi-Class Output**: Yields exact confidence scores, risk categories, clinical descriptions, and recommended consultation urgency.

### 2. 💬 Multi-Tier Clinical AI Consultant (RAG Engine)
- **Medical Grounding**: Indexed with **WHO ICD-11** guidelines and the **DermNet New Zealand Clinical Knowledge Base**.
- **Vector Search**: Local vector embeddings powered by `sentence-transformers` (`all-MiniLM-L6-v2`) and **FAISS-CPU** indexing.
- **Multi-LLM Resilience**:
  - **Tier 1 (Google Gemini)**: Cloud-based reasoning via Gemini 1.5 Flash API (`GEMINI_API_KEY`).
  - **Tier 2 (OpenAI)**: GPT-4o / GPT-3.5 fallback via `OPENAI_API_KEY`.
  - **Tier 3 (Local Ollama)**: Self-hosted local inference with models like `qwen2.5:0.5b` or `llama3`.
  - **Tier 4 (Offline Clinical Synthesis Engine)**: Zero-dependency structured medical consultations with biological context, ABCDE criteria, differential guidance, and emergency red-flags.
- **Security**: Built-in prompt injection sanitization and clinical disclaimer guards.

### 3. 📍 Geo-Intelligent Hospital & Dermatologist Finder
- **Authentic Facility Directory**: Features verified specialty centers and cutaneous oncology departments in **Thiruvananthapuram (RCC, MCH, KIMS, Cosmo, Ananthapuri, SUT, Kaya)**, Kochi, Coimbatore, Chennai, Bengaluru, Mumbai, and Delhi.
- **Real-Time Geolocation**: High-accuracy HTML5 Geolocation with automatic fallback to HTTPS IP Geolocation (`ipwho.is`).
- **Live OpenStreetMap Overpass**: Dynamically retrieves live nearby hospitals, clinics, and dermatologists within a 15–25 km radius.
- **Proximity-First Risk Triage**: High-risk lesions (e.g. Melanoma) prioritize local cutaneous oncology and Mohs surgery centers (e.g., Regional Cancer Centre Trivandrum at 0.88 km) without routing patients hundreds of kilometers away.

### 4. 🏃 Health & Fit Activity Tracker
- **Mobile Integration**:
  - **Phone Screen Sync**: Quick-input modal to enter steps, active calories, water intake, heart rate, and sleep directly from Apple Health (iOS) or Google Fit (Android).
  - **File Importer**: Direct XML/JSON export ingestion from Apple Health and Google Takeout.
- **Skin Health Calculators**: Built-in UV index sun-protection advisor, daily water hydration calculator based on weight/activity, and calorie expenditure tracking.

### 5. 📄 Patient Clinical Report Generator & Vault
- **One-Click Clinical PDF**: Generates professional, printable clinical summary reports (incorporating lesion macro photos, top-3 class breakdown, ABCDE risk assessment, and recommended next steps) using `jsPDF` and `html2canvas`.
- **History & Scans Management**: Local & server-backed scan history with instant "Clear Scans" control.

### 6. 📅 In-App Consultation Booking
- Real-time appointment scheduling with selected specialists and hospitals.
- Generates persistent confirmation booking IDs (`SKN-YYYYMMDD-XXXXXX`) tracked under the patient's profile.

### 7. 👤 User Profile, Security & Google Authentication
- Complete profile customization: edit display names, emergency contact numbers, blood group, skin type, and avatar photos.
- Configurable **Google OAuth 2.0** login with clear in-app setup instructions for Google Cloud Console client credentials.

---

## 🏗️ Architecture & Technology Stack

```
SKINOVA/
├── Model/                      # Trained models & quantization scripts
│   ├── skinova_efficientnetb0.onnx        # Standard FP32 model (16.5 MB)
│   ├── skinova_efficientnetb0_int8.onnx   # Quantized INT8 model (4.39 MB)
│   └── quantize_onnx.py                   # Dynamic INT8 ONNX quantizer
├── backend/                    # FastAPI High-Performance Backend
│   ├── app/
│   │   ├── main.py             # API routers, endpoints, CORS, file upload
│   │   ├── predictor.py        # ONNX inference pipeline & metadata
│   │   ├── llm.py              # Clinical AI Consultant & LLM orchestrator
│   │   ├── rag.py              # Semantic vector search & FAISS index
│   │   ├── hospitals_data.py   # Verified hospitals database & OSM queries
│   │   └── data/               # Knowledge base chunks & prebuilt embeddings
│   ├── uploads/                # Temporary image uploads
│   └── requirements.txt        # Backend Python dependencies
├── frontend/                   # Modern React + Vite Web Application
│   ├── src/
│   │   ├── components/         # Modular UI components
│   │   │   ├── DiagnosisCard.jsx   # Lesion risk display & probability bars
│   │   │   ├── ImageUploader.jsx   # Drag-and-drop lesion uploader
│   │   │   ├── RAGChatbot.jsx      # AI Clinical Consultant dialogue
│   │   │   ├── HospitalFinder.jsx  # Geo-spatial hospital & doctor search
│   │   │   ├── HealthDashboard.jsx # Apple Health / Google Fit tracker
│   │   │   ├── UserProfile.jsx     # Profile & privacy settings
│   │   │   ├── BookingModal.jsx    # Doctor appointment scheduling
│   │   │   ├── ReportModal.jsx     # Clinical PDF report generator
│   │   │   └── AuthModal.jsx       # Email & Google Sign-In modal
│   │   ├── utils/              # Location, disease metadata, and helpers
│   │   ├── services/api.js     # Axios API client wrapper
│   │   ├── App.jsx             # Main application state and layout
│   │   └── index.css           # Custom medical-theme design system
│   ├── package.json            # Node.js dependencies
│   └── vite.config.js          # Vite build configuration
├── start.sh                    # Unified startup script (macOS / Linux)
├── start.bat                   # Unified startup script (Windows)
├── requirements.txt            # Root Python dependencies
└── README.md                   # Complete documentation
```

### Frameworks & Tools

| Component | Framework / Tool | Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Backend Framework** | **FastAPI** | `>= 0.115.0` | Asynchronous REST API routing & validation |
| **ASGI Server** | **Uvicorn** | `>= 0.30.0` | Production ASGI web server |
| **Validation** | **Pydantic** | `>= 2.8.0` | Data schemas & request/response validation |
| **Deep Learning** | **ONNX Runtime** | `>= 1.18.0` | Fast CPU-optimized deep learning inference |
| **Image Processing** | **Pillow / OpenCV** | `>= 10.4.0` | Image conversion, resizing, and normalization |
| **Vector Search** | **FAISS-CPU** | `>= 1.8.0` | Dense vector similarity search for RAG |
| **Embeddings** | **Sentence-Transformers**| `>= 3.0.0` | Sentence embeddings (`all-MiniLM-L6-v2`) |
| **Frontend Framework**| **React** | `18.3.1` | Reactive declarative UI components |
| **Build Tool** | **Vite** | `6.1.0` | Instant HMR development & optimized bundle |
| **Styling** | **TailwindCSS** | `3.4.17` | Utility-first CSS with medical design tokens |
| **Icons** | **Lucide React** | `0.475.0` | Modern, consistent SVG iconography |
| **Charts** | **Recharts** | `3.10.1` | Activity rings, bar charts, and trends |
| **PDF Generation** | **jsPDF & html2canvas** | `2.5.2` / `1.4.1` | In-browser clinical summary export |
| **Maps & Geo** | **Overpass API / Leaflet** | Live REST | OpenStreetMap healthcare node querying |

---

## ⚙️ System Requirements

- **Python**: `3.10`, `3.11`, `3.12`, or `3.14`
- **Node.js**: `>= 18.0.0` (npm `>= 9.0.0`)
- **Memory**: 4 GB RAM minimum (8 GB recommended)
- **OS**: macOS, Ubuntu/Debian Linux, or Windows 10/11

---

## 🚀 Quick Start Guide

### Method 1: One-Click Startup Script (Recommended)

#### On macOS / Linux:
```bash
# 1. Clone the repository
git clone https://github.com/Aravindr017/SKINOVA.git
cd SKINOVA

# 2. Make the script executable and run
chmod +x start.sh
./start.sh
```

#### On Windows:
```cmd
# Double click start.bat or execute from Command Prompt:
start.bat
```

*The startup script will automatically check Python & Node.js, create the Python virtual environment in `backend/.venv`, install requirements, install npm packages in `frontend/`, and launch both servers simultaneously!*


---

### Method 2: Manual Setup

#### Step 1: Backend Setup
```bash
cd backend

# Create virtual environment
python3 -m venv .venv
source .venv/bin/activate       # On Windows: .venv\Scripts\activate

# Upgrade pip and install dependencies
pip install --upgrade pip
pip install -r requirements.txt

# (Optional) Set API keys for cloud LLM reasoning
export GEMINI_API_KEY="your-gemini-key"      # Optional: Google Gemini
export OPENAI_API_KEY="your-openai-key"      # Optional: OpenAI

# Start FastAPI server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

#### Step 2: Frontend Setup (Open a new terminal)
```bash
cd frontend

# Install Node dependencies
npm install

# Start Vite development server
npm run dev
```

Visit **http://localhost:5173** in your web browser.

---

## 🔑 Environment Variables & Optional Configurations

Create a `.env` file in the root or `backend/` directory if you wish to configure external AI services:

```env
# Optional: Google Gemini API (Enables cloud-based consultant reasoning)
GEMINI_API_KEY=your_google_gemini_api_key

# Optional: OpenAI API Key
OPENAI_API_KEY=your_openai_api_key

# Optional: Local Ollama URL (defaults to http://localhost:11434/api/chat)
OLLAMA_URL=http://localhost:11434/api/chat
OLLAMA_MODEL=qwen2.5:0.5b
```

Create a `.env` file in `frontend/` for Google Sign-In (optional):
```env
# Google OAuth Client ID (from Google Cloud Console)
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```
*Note: If no API keys are provided, SKINOVA seamlessly operates using its built-in offline Clinical Synthesis Engine and local ONNX model without any external network dependency.*

---

## 📡 REST API Reference

The interactive OpenAPI documentation is accessible at `http://localhost:8000/docs`.

### Core Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/predict` | Uploads an image file (`multipart/form-data`) and returns 7-class prediction & risk |
| `POST` | `/api/chat` | Queries the RAG Clinical Consultant with query and optional predicted class |
| `GET` | `/api/hospitals/nearby` | Geospatial hospital search with `lat`, `lon`, `city`, `risk_level`, and `specialty` |
| `POST` | `/api/appointments/book` | Creates and persists a patient appointment booking |
| `GET` | `/api/appointments/user` | Retrieves confirmed appointments filtered by email |
| `GET` | `/api/knowledge/categories` | Lists all indexed medical knowledge categories and topics |
| `GET` | `/api/knowledge/search` | Performs direct semantic similarity search over indexed chunks |
| `POST` | `/api/health/log` | Stores daily health & fitness metrics |
| `GET` | `/api/health/logs` | Fetches historical health records for a user |
| `GET` | `/api/health/summary` | Calculates 7-day averages for steps, hydration, and calories |

---

## 🧪 Model Performance & Evaluation

The EfficientNet-B0 model was trained on the HAM10000 dataset using stratified splits (80% Train, 10% Validation, 10% Test) with Albumentations offline augmentation for class balancing:

- **Overall Test Accuracy**: **81.04%**
- **Test Loss**: **0.5134**
- **Weighted F1-Score**: **80.78%**
- **Class-Level F1-Scores**:
  - `DF` (Dermatofibroma): **0.9000**
  - `NV` (Melanocytic Nevi): **0.9057**
  - `VASC` (Vascular Lesions): **0.7407**
  - `BCC` (Basal Cell Carcinoma): **0.7170**
  - `AKIEC` (Actinic Keratosis): **0.6027**
  - `MEL` (Melanoma): **0.5520**
  - `BKL` (Benign Keratosis): **0.5729**

---

## ⚠️ Medical Disclaimer

> **IMPORTANT**: SKINOVA AI is an experimental computer vision and educational screening tool designed for clinical decision-support and triage awareness. **It is NOT a medical device, nor does it replace professional dermatological diagnosis, dermoscopy, or histological biopsy.** Always consult a certified dermatologist or licensed medical physician for any concerning skin lesion, changing mole, or persistent skin abnormality.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
