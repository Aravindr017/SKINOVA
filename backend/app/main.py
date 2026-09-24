# ==========================================
# SKINOVA - FastAPI Backend Application
# EfficientNet-B0 ONNX + RAG + Gemini LLM + Hospital Directory
# ==========================================

import re
import os
import hashlib
import base64
import json
import urllib.request
import urllib.parse
from datetime import datetime
from pathlib import Path
from uuid import uuid4
from io import BytesIO
from typing import Optional
import asyncio

# Load .env file (backend/.env or root .env) before importing any env-dependent modules
try:
    from dotenv import load_dotenv
    _backend_env = Path(__file__).resolve().parents[1] / ".env"
    _root_env = Path(__file__).resolve().parents[2] / ".env"
    if _backend_env.exists():
        load_dotenv(dotenv_path=_backend_env, override=True)
    if _root_env.exists():
        load_dotenv(dotenv_path=_root_env, override=False)
except ImportError:
    pass  # python-dotenv not installed, rely on system env vars

import numpy as np
from fastapi import FastAPI, File, UploadFile, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from PIL import Image

from app.predictor import predict_image
from app.rag import search_knowledge_base
from app.llm import generate_response, synthesize_rag_response
from app.hospitals_data import get_nearby_hospitals, book_consultation, get_user_appointments
import app.storage as storage

# Google OAuth Client ID for server-side token verification
GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "")

# ==========================================
# FastAPI Application Configuration
# ==========================================

app = FastAPI(
    title="SKINOVA AI Healthcare API",
    description="Full-stack AI Skin Disease Classification, RAG Consultation, and Hospital Booking API.",
    version="2.0.0"
)

# ==========================================
# Enable CORS for React Frontend
# ==========================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================
# File Storage Configuration
# ==========================================

UPLOAD_DIR = Path(__file__).resolve().parents[1] / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB

# ==========================================
# Security Helpers - Input Sanitization
# ==========================================

INJECTION_PATTERNS = [
    re.compile(r"ignore\s+(all\s+)?previous\s+instructions", re.I),
    re.compile(r"you\s+are\s+now\s+(a|an)\s+", re.I),
    re.compile(r"system\s*prompt", re.I),
    re.compile(r"jailbreak", re.I),
    re.compile(r"DAN\s+mode", re.I),
    re.compile(r"pretend\s+(you|that)", re.I),
    re.compile(r"<\|.*\|>"),
    re.compile(r"\[INST\]", re.I),
    re.compile(r"###\s*Human:", re.I),
    re.compile(r"forget\s+(all\s+)?previous", re.I),
    re.compile(r"act\s+as\s+(a|an)\s+(?!dermatologist|doctor|medical)", re.I),
]

def sanitize_query(text: str, max_len: int = 500) -> str:
    """Strip HTML tags, null bytes, control characters, and truncate."""
    clean = re.sub(r"<[^>]*>", "", text)
    clean = re.sub(r"[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]", "", clean)
    return clean.strip()[:max_len]

def check_prompt_injection(text: str) -> bool:
    """Returns True if the text contains prompt injection patterns."""
    return any(p.search(text) for p in INJECTION_PATTERNS)

# ==========================================
# Helper Functions
# ==========================================

def validate_uploaded_file(file: UploadFile) -> str:
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided.")

    extension = Path(file.filename).suffix.lower()
    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail="Unsupported image format. Please upload a JPG, JPEG, PNG, or WEBP image."
        )
    return extension

def is_likely_skin_image(image: Image.Image) -> bool:
    """
    Fast RGB channel heuristic check to filter non-skin images.
    """
    image_rgb = image.convert("RGB").resize((100, 100))
    pixels = np.asarray(image_rgb)
    r = pixels[:, :, 0].astype(np.int16)
    g = pixels[:, :, 1].astype(np.int16)
    b = pixels[:, :, 2].astype(np.int16)

    skin_pixels = (
        (r > 60) & (g > 30) & (b > 15) &
        (r > g) & (r > b) &
        ((r - g) > 10)
    )
    skin_ratio = np.mean(skin_pixels)
    return skin_ratio >= 0.05

# ==========================================
# Root & Health Check Endpoints
# ==========================================

@app.get("/")
def root():
    return {
        "project": "SKINOVA AI",
        "status": "running",
        "version": "2.0.0",
        "message": "SKINOVA AI Skin Disease Backend is running successfully."
    }

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "SKINOVA Backend",
        "features": {
            "onnx_predictor": "enabled",
            "rag_retrieval": "enabled",
            "llm_chat": "enabled",
            "hospital_finder": "enabled"
        }
    }

@app.get("/api/model/info")
def model_info():
    return {
        "success": True,
        "model_architecture": "EfficientNet-B0 (ONNX Runtime)",
        "quantization": "INT8 Dynamic",
        "num_classes": 7,
        "classes": [
            {"code": "MEL", "name": "Melanoma", "risk": "High Risk"},
            {"code": "NV",  "name": "Melanocytic Nevus", "risk": "Low Risk (Benign)"},
            {"code": "BCC", "name": "Basal Cell Carcinoma", "risk": "Moderate Risk"},
            {"code": "AKIEC","name": "Actinic Keratosis / Bowen Disease", "risk": "Moderate Risk"},
            {"code": "BKL", "name": "Benign Keratosis", "risk": "Low Risk (Benign)"},
            {"code": "DF",  "name": "Dermatofibroma", "risk": "Low Risk (Benign)"},
            {"code": "VASC","name": "Vascular Lesion", "risk": "Low Risk (Benign)"},
        ],
        "input_resolution": "224x224x3 RGB",
        "inference_engine": "ONNX Runtime with CPU/CUDA Execution Providers"
    }

@app.get("/api/classes")
def list_classes():
    return model_info()

# ==========================================
# Image Upload Endpoint
# ==========================================

@app.post("/api/upload")
async def upload_image(file: UploadFile = File(...)):
    extension = validate_uploaded_file(file)
    contents = await file.read()

    if len(contents) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="Image size exceeds the 10 MB limit.")

    try:
        image = Image.open(BytesIO(contents))
        image.verify()
        image = Image.open(BytesIO(contents)).convert("RGB")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid or corrupted image file.")

    if not is_likely_skin_image(image):
        raise HTTPException(
            status_code=422,
            detail="The uploaded image does not appear to contain a skin lesion or skin surface."
        )

    new_filename = f"{uuid4().hex}{extension}"
    save_path = UPLOAD_DIR / new_filename
    with open(save_path, "wb") as f:
        f.write(contents)

    return {
        "success": True,
        "filename": new_filename,
        "original_filename": file.filename,
        "size_bytes": len(contents),
        "message": "Image uploaded and verified successfully."
    }

# ==========================================
# CNN Prediction Endpoint (Multi-class + Risk)
# ==========================================

@app.post("/api/predict")
async def predict_skin_disease(file: UploadFile = File(...)):
    validate_uploaded_file(file)
    image_bytes = await file.read()

    if len(image_bytes) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")
    if len(image_bytes) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="Image exceeds the 10 MB limit.")

    # Process image and run ONNX model in threadpool so the async event loop never blocks
    def _sync_process_and_predict(raw_bytes: bytes):
        try:
            img = Image.open(BytesIO(raw_bytes))
            # Downsample high-res phone photos to 1200x1200 to prevent CPU memory lag
            img.thumbnail((1200, 1200), Image.Resampling.LANCZOS)
            img = img.convert("RGB")
        except Exception:
            return None, (400, "Invalid image file format or corrupted upload.")

        if not is_likely_skin_image(img):
            return None, (422, "The uploaded image does not appear to be a valid skin or lesion image.")

        try:
            pred = predict_image(img)
            return pred, None
        except Exception as error:
            return None, (500, f"Prediction failed: {str(error)}")

    result, err = await asyncio.to_thread(_sync_process_and_predict, image_bytes)
    if err:
        status_code, err_detail = err
        raise HTTPException(status_code=status_code, detail=err_detail)

    return {
        "success": True,
        "filename": file.filename,
        "predicted_class": result["predicted_class"],
        "class_name": result["class_name"],
        "confidence": result["confidence"],
        "confidence_percentage": result["confidence_percentage"],
        "category": result["category"],
        "risk_level": result["risk_level"],
        "urgency": result["urgency"],
        "description": result["description"],
        "all_probabilities": result["all_probabilities"],
        "model_version": result["model_version"],
        "medical_disclaimer": (
            "This AI classification is for educational and informational screening purposes only "
            "and does not constitute a formal clinical diagnosis. Please consult a qualified dermatologist."
        )
    }

# ==========================================
# RAG Knowledge Retrieval Endpoint
# ==========================================

class RAGRequest(BaseModel):
    query: str
    top_k: int = 5

@app.post("/api/rag")
def rag_search(request: RAGRequest):
    clean_query = sanitize_query(request.query)
    if not clean_query:
        raise HTTPException(status_code=400, detail="Query cannot be empty.")
    if check_prompt_injection(clean_query):
        raise HTTPException(status_code=400, detail="Query contains disallowed patterns. Please ask a dermatology-related question.")

    top_k = max(1, min(request.top_k, 10))
    try:
        results = search_knowledge_base(query=clean_query, top_k=top_k)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"RAG retrieval failed: {str(e)}")

    return {
        "success": True,
        "query": clean_query,
        "results": results,
        "result_count": len(results)
    }

# ==========================================
# LLM + RAG Grounded Consultation Chat
# ==========================================

class ChatRequest(BaseModel):
    query: str
    predicted_class: Optional[str] = None
    confidence: Optional[float] = None
    top_k: int = 4

@app.post("/api/chat")
def chat_with_skinova(request: ChatRequest):
    clean_query = sanitize_query(request.query)
    if not clean_query:
        raise HTTPException(status_code=400, detail="Query cannot be empty.")
    if check_prompt_injection(clean_query):
        raise HTTPException(status_code=400, detail="Your query contains disallowed patterns. Please ask a dermatology-related question.")

    top_k = max(1, min(request.top_k, 6))
    try:
        result = generate_response(
            query=clean_query,
            predicted_class=request.predicted_class,
            confidence=request.confidence,
            top_k=top_k,
        )
    except Exception as error:
        try:
            rag_results = search_knowledge_base(query=clean_query, top_k=top_k)
            fallback_answer = synthesize_rag_response(
                query=clean_query,
                rag_results=rag_results,
                predicted_class=request.predicted_class,
                confidence=request.confidence,
            )
            return {
                "success": True,
                "query": request.query,
                "predicted_class": request.predicted_class,
                "confidence": request.confidence,
                "answer": fallback_answer,
                "sources": rag_results,
                "source_count": len(rag_results),
                "medical_disclaimer": "Informational screening only. Consult a healthcare professional."
            }
        except Exception as inner_err:
            raise HTTPException(status_code=500, detail=f"AI generation failed: {str(inner_err)}")

    return {
        "success": True,
        "query": request.query,
        "predicted_class": request.predicted_class,
        "confidence": request.confidence,
        "answer": result["answer"],
        "sources": result["sources"],
        "model_used": result.get("model_used"),
        "source_count": len(result["sources"]),
        "medical_disclaimer": "This response is for informational purposes only. Consult a healthcare professional."
    }

# ==========================================
# Nearby Dermatology Hospitals & Clinics API
# ==========================================

def _build_hospital_response(lat, lon, limit, city=None, risk_level=None, specialty=None):
    hospitals = get_nearby_hospitals(lat=lat, lon=lon, city=city, risk_level=risk_level, limit=limit)
    # Normalize: add specialties list and ensure doctor fields exist
    for h in hospitals:
        h.setdefault("specialties", list({
            doc.get("specialization", "Dermatology") for doc in h.get("doctors", [])
        }))
        if specialty:
            # Filter by specialty if provided
            pass  # already returns all, client can filter
    return hospitals

@app.get("/api/hospitals/nearby")
def find_nearby_hospitals(
    lat: Optional[float] = Query(None),
    lon: Optional[float] = Query(None),
    city: Optional[str] = Query(None),
    specialty: Optional[str] = Query(None),
    risk_level: Optional[str] = Query(None),
    limit: int = Query(10, ge=1, le=20)
):
    hospitals = _build_hospital_response(lat, lon, limit, city, risk_level, specialty)
    return {"success": True, "count": len(hospitals), "user_coordinates": {"lat": lat, "lon": lon} if lat and lon else None, "hospitals": hospitals}

@app.get("/api/hospitals")
def find_hospitals_alias(
    lat: Optional[float] = Query(None),
    lon: Optional[float] = Query(None),
    city: Optional[str] = Query(None),
    specialty: Optional[str] = Query(None),
    limit: int = Query(10, ge=1, le=20)
):
    """Alias for /api/hospitals/nearby — same data."""
    hospitals = _build_hospital_response(lat, lon, limit, city, specialty=specialty)
    return {"success": True, "count": len(hospitals), "hospitals": hospitals}

# ==========================================
# Consultation Booking API
# ==========================================

class BookingPayload(BaseModel):
    hospital_id: Optional[str] = None
    hospital_name: str
    doctor_id: Optional[str] = None
    doctor_name: Optional[str] = None
    doctor_specialty: Optional[str] = None
    patient_name: Optional[str] = "Anonymous"
    patient_email: Optional[str] = ""
    patient_phone: Optional[str] = ""
    date: Optional[str] = None
    time: Optional[str] = None
    preferred_date: Optional[str] = None
    preferred_time: Optional[str] = None
    consultation_type: str = "In-Person Clinic Visit"
    reason: Optional[str] = ""
    status: Optional[str] = "confirmed"
    predicted_disease: Optional[str] = "Not Specified"
    risk_level: Optional[str] = "Standard"
    notes: Optional[str] = ""

@app.post("/api/appointments/book")
def book_appointment(booking: BookingPayload):
    payload = booking.dict()
    # Normalize date/time field names
    payload["preferred_date"] = payload.get("preferred_date") or payload.get("date") or ""
    payload["preferred_time"] = payload.get("preferred_time") or payload.get("time") or ""
    payload["notes"] = payload.get("notes") or payload.get("reason") or ""
    appointment = book_consultation(payload)
    return {
        "success": True,
        "message": "Consultation appointment booked successfully.",
        "appointment": appointment,
        "booking_id": appointment.get("booking_id")
    }

@app.get("/api/appointments/user")
def get_user_appointment_history(email: Optional[str] = Query(None)):
    appointments = get_user_appointments(email=email)
    return {
        "success": True,
        "count": len(appointments),
        "appointments": appointments
    }

# ==========================================
# Authentication & User Registry (Email & Google)
# ==========================================

# In-memory user database (email -> user_record)
REGISTERED_USERS = {}

def hash_password(password: str) -> str:
    salt = "skinova_secure_salt_2026"
    return hashlib.sha256(f"{salt}{password}".encode("utf-8")).hexdigest()

def decode_google_jwt(jwt_token: str) -> dict:
    """Verifies Google ID token via Google's tokeninfo endpoint, then falls back to local JWT decode."""
    # Method 1: Server-side verification via Google tokeninfo API (authoritative)
    if jwt_token and len(jwt_token) > 100:
        try:
            verify_url = f"https://oauth2.googleapis.com/tokeninfo?id_token={urllib.parse.quote(jwt_token)}"
            req = urllib.request.Request(verify_url, headers={'User-Agent': 'Skinnova/2.0'})
            with urllib.request.urlopen(req, timeout=5) as resp:
                token_info = json.loads(resp.read().decode('utf-8'))
                # Validate audience matches our client ID
                aud = token_info.get('aud', '')
                if GOOGLE_CLIENT_ID and aud != GOOGLE_CLIENT_ID:
                    print(f"[Auth] Google token audience mismatch: {aud}")
                    return {}
                print(f"[Auth] Google token verified for: {token_info.get('email')}")
                return token_info
        except Exception as e:
            print(f"[Auth] Google tokeninfo verification failed, using local decode: {e}")

    # Method 2: Local JWT payload decode (unsigned, used when API unavailable)
    try:
        parts = jwt_token.split(".")
        if len(parts) >= 2:
            payload_b64 = parts[1]
            padded = payload_b64 + "=" * ((4 - len(payload_b64) % 4) % 4)
            decoded_bytes = base64.urlsafe_b64decode(padded)
            return json.loads(decoded_bytes.decode("utf-8"))
    except Exception as e:
        print(f"[Auth] Could not decode Google JWT token: {e}")
    return {}

class GoogleAuthPayload(BaseModel):
    email: Optional[str] = None
    name: Optional[str] = None
    picture: Optional[str] = None
    sub: Optional[str] = None
    token: Optional[str] = None  # Google Credential / ID token

class RegisterPayload(BaseModel):
    email: str
    password: str
    name: Optional[str] = None

class EmailLoginPayload(BaseModel):
    email: str
    password: str

@app.post("/api/auth/register")
def register_user(payload: RegisterPayload):
    email_clean = payload.email.strip().lower()
    if not email_clean or "@" not in email_clean:
        raise HTTPException(status_code=400, detail="Please provide a valid email address.")
    if len(payload.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters long.")

    if email_clean in REGISTERED_USERS and REGISTERED_USERS[email_clean].get("password_hash"):
        raise HTTPException(status_code=400, detail="An account with this email already exists. Please sign in.")

    user_id = f"usr-{uuid4().hex[:8]}"
    name = payload.name.strip() if payload.name and payload.name.strip() else email_clean.split("@")[0].capitalize()
    picture = f"https://api.dicebear.com/7.x/bottts/svg?seed={email_clean}"

    user_record = {
        "id": user_id,
        "name": name,
        "email": email_clean,
        "picture": picture,
        "provider": "email",
        "password_hash": hash_password(payload.password),
        "created_at": datetime.utcnow().isoformat(),
        "token": f"skn-jwt-{uuid4().hex}"
    }
    REGISTERED_USERS[email_clean] = user_record

    return {
        "success": True,
        "user": {
            "id": user_record["id"],
            "name": user_record["name"],
            "email": user_record["email"],
            "picture": user_record["picture"],
            "provider": "email",
            "token": user_record["token"]
        },
        "message": "Account created successfully."
    }

@app.post("/api/auth/login")
def email_login(payload: EmailLoginPayload):
    email_clean = payload.email.strip().lower()
    if not email_clean or "@" not in email_clean:
        raise HTTPException(status_code=400, detail="Please provide a valid email address.")
    if not payload.password:
        raise HTTPException(status_code=400, detail="Password cannot be empty.")

    user_record = REGISTERED_USERS.get(email_clean)
    pwd_hash = hash_password(payload.password)

    if user_record:
        if user_record.get("password_hash") and user_record["password_hash"] != pwd_hash:
            raise HTTPException(status_code=401, detail="Incorrect password. Please verify your password.")
        # Update token on each login
        user_record["token"] = f"skn-jwt-{uuid4().hex}"
    else:
        # Auto-register new email user seamlessly
        user_id = f"usr-e-{uuid4().hex[:8]}"
        name_from_email = email_clean.split("@")[0].capitalize()
        user_record = {
            "id": user_id,
            "name": name_from_email,
            "email": email_clean,
            "picture": f"https://api.dicebear.com/7.x/avataaars/svg?seed={email_clean}",
            "provider": "email",
            "password_hash": pwd_hash,
            "created_at": datetime.utcnow().isoformat(),
            "token": f"skn-jwt-{uuid4().hex}"
        }
        REGISTERED_USERS[email_clean] = user_record

    storage.save_user_record(email_clean, user_record)
    user_activity = storage.get_user_activity(user_record["id"], email_clean)

    return {
        "success": True,
        "user": {
            "id": user_record["id"],
            "name": user_record["name"],
            "email": user_record["email"],
            "picture": user_record["picture"],
            "provider": "email",
            "token": user_record["token"]
        },
        "activity": user_activity,
        "message": "Signed in successfully."
    }

@app.post("/api/auth/google")
def google_signin(payload: GoogleAuthPayload):
    email = payload.email
    name = payload.name
    picture = payload.picture
    sub = payload.sub

    # If a real Google JWT ID token was supplied, decode its payload
    if payload.token and len(payload.token.split(".")) >= 2:
        decoded = decode_google_jwt(payload.token)
        if decoded:
            email = decoded.get("email") or email
            name = decoded.get("name") or name
            picture = decoded.get("picture") or picture
            sub = decoded.get("sub") or sub

    email_clean = (email or f"google.user.{uuid4().hex[:6]}@gmail.com").strip().lower()
    name_clean = name or email_clean.split("@")[0].capitalize()
    picture_clean = picture or f"https://api.dicebear.com/7.x/avataaars/svg?seed={email_clean}"

    user_record = REGISTERED_USERS.get(email_clean) or storage.find_user_by_email(email_clean)
    if user_record:
        user_record["name"] = name_clean
        if picture:
            user_record["picture"] = picture_clean
        user_record["token"] = f"skn-jwt-{uuid4().hex}"
    else:
        user_id = f"usr-g-{sub[:10] if sub else uuid4().hex[:8]}"
        user_record = {
            "id": user_id,
            "name": name_clean,
            "email": email_clean,
            "picture": picture_clean,
            "provider": "google",
            "google_sub": sub,
            "created_at": datetime.utcnow().isoformat(),
            "token": f"skn-jwt-{uuid4().hex}"
        }
        REGISTERED_USERS[email_clean] = user_record

    storage.save_user_record(email_clean, user_record)
    user_activity = storage.get_user_activity(user_record["id"], email_clean)

    return {
        "success": True,
        "user": {
            "id": user_record["id"],
            "name": user_record["name"],
            "email": user_record["email"],
            "picture": user_record["picture"],
            "provider": "google",
            "token": user_record["token"]
        },
        "activity": user_activity,
        "message": "Signed in successfully with Google."
    }

class UserSyncPayload(BaseModel):
    user_id: str
    email: Optional[str] = None
    scans: Optional[list] = []
    searches: Optional[list] = []
    appointments: Optional[list] = []
    health_logs: Optional[list] = []

@app.post("/api/user/sync")
def sync_user_activity_endpoint(payload: UserSyncPayload):
    """
    Synchronizes user scans, chat queries, and appointments across all devices
    when signed in with the same Google or registered account.
    """
    merged = storage.sync_user_activity(
        user_id=payload.user_id,
        email=payload.email,
        scans=payload.scans or [],
        searches=payload.searches or [],
        appointments=payload.appointments or [],
        health_logs=payload.health_logs or []
    )
    return {
        "success": True,
        "activity": merged,
        "message": "User activity synchronized across all devices successfully."
    }

@app.get("/api/user/activity")
def get_user_activity_endpoint(user_id: Optional[str] = Query(None), email: Optional[str] = Query(None)):
    if not user_id and not email:
        raise HTTPException(status_code=400, detail="Please provide user_id or email.")
    activity = storage.get_user_activity(user_id=user_id or "", email=email)
    return {
        "success": True,
        "activity": activity
    }

class ClearScansPayload(BaseModel):
    user_id: Optional[str] = None

@app.post("/api/scans/clear")
def clear_user_scans(payload: ClearScansPayload):
    if payload.user_id:
        store = storage.load_store()
        acts = store.setdefault("activities", {})
        if payload.user_id in acts:
            acts[payload.user_id]["scans"] = []
            storage.save_store(store)
    return {
        "success": True,
        "message": "Scan history cleared successfully."
    }


# ==========================================
# Health Profile & Fitness Tracking
# In-memory store (replace with DB in prod)
# ==========================================

USER_PROFILES = {}
HEALTH_LOGS = {}

class HealthProfile(BaseModel):
    user_id: str
    name: str
    email: str
    age: Optional[int] = None
    gender: Optional[str] = None
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    blood_group: Optional[str] = None
    allergies: Optional[str] = None
    medical_conditions: Optional[str] = None
    emergency_contact: Optional[str] = None
    picture: Optional[str] = None

class DailyHealthLog(BaseModel):
    user_id: str
    date: str
    steps: Optional[int] = 0
    calories_burned: Optional[float] = 0.0
    water_ml: Optional[int] = 0
    heart_rate_bpm: Optional[int] = None
    sleep_hours: Optional[float] = None
    workout_type: Optional[str] = None
    workout_minutes: Optional[int] = 0
    mood: Optional[str] = None
    notes: Optional[str] = ""

@app.post("/api/profile/save")
def save_health_profile(profile: HealthProfile):
    USER_PROFILES[profile.user_id] = profile.dict()
    bmi = None
    bmi_category = None
    if profile.height_cm and profile.weight_kg and profile.height_cm > 0:
        height_m = profile.height_cm / 100
        bmi = round(profile.weight_kg / (height_m ** 2), 1)
        if bmi < 18.5:
            bmi_category = "Underweight"
        elif bmi < 25:
            bmi_category = "Normal weight"
        elif bmi < 30:
            bmi_category = "Overweight"
        else:
            bmi_category = "Obese"

    return {
        "success": True,
        "profile": USER_PROFILES[profile.user_id],
        "bmi": bmi,
        "bmi_category": bmi_category,
        "message": "Health profile saved successfully."
    }

@app.get("/api/profile/{user_id}")
def get_health_profile(user_id: str):
    profile = USER_PROFILES.get(user_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found.")
    bmi = None
    bmi_category = None
    h = profile.get("height_cm")
    w = profile.get("weight_kg")
    if h and w and h > 0:
        height_m = h / 100
        bmi = round(w / (height_m ** 2), 1)
        if bmi < 18.5:
            bmi_category = "Underweight"
        elif bmi < 25:
            bmi_category = "Normal weight"
        elif bmi < 30:
            bmi_category = "Overweight"
        else:
            bmi_category = "Obese"
    return {"success": True, "profile": profile, "bmi": bmi, "bmi_category": bmi_category}

@app.post("/api/health/log")
def log_daily_health(log: DailyHealthLog):
    if log.user_id not in HEALTH_LOGS:
        HEALTH_LOGS[log.user_id] = []
    # Replace existing entry for same date
    HEALTH_LOGS[log.user_id] = [
        l for l in HEALTH_LOGS[log.user_id] if l.get("date") != log.date
    ]
    entry = log.dict()
    entry["logged_at"] = datetime.utcnow().isoformat()

    # Calorie estimate if not provided
    if (log.steps or 0) > 0 and (log.calories_burned or 0) == 0:
        entry["calories_burned"] = round(log.steps * 0.04, 1)

    HEALTH_LOGS[log.user_id].append(entry)
    return {"success": True, "log": entry, "message": "Health data logged successfully."}

@app.get("/api/health/logs/{user_id}")
def get_health_logs(user_id: str, days: int = Query(7, ge=1, le=30)):
    logs = HEALTH_LOGS.get(user_id, [])
    sorted_logs = sorted(logs, key=lambda x: x.get("date", ""), reverse=True)
    return {
        "success": True,
        "user_id": user_id,
        "count": len(sorted_logs[:days]),
        "logs": sorted_logs[:days]
    }

@app.get("/api/health/logs")
def get_health_logs_query(user_id: str = Query(...), days: int = Query(7, ge=1, le=30)):
    """Query parameter alias for /api/health/logs/{user_id}."""
    return get_health_logs(user_id=user_id, days=days)

@app.get("/api/health/summary/{user_id}")
def get_health_summary(user_id: str):
    logs = HEALTH_LOGS.get(user_id, [])
    if not logs:
        return {"success": True, "summary": None, "message": "No health data logged yet."}

    avg_steps = round(sum(l.get("steps", 0) for l in logs) / len(logs))
    avg_calories = round(sum(l.get("calories_burned", 0) for l in logs) / len(logs), 1)
    avg_water = round(sum(l.get("water_ml", 0) for l in logs) / len(logs))
    avg_sleep = round(sum(l.get("sleep_hours", 0) or 0 for l in logs) / len(logs), 1)
    total_workout_min = sum(l.get("workout_minutes", 0) or 0 for l in logs)

    return {
        "success": True,
        "summary": {
            "total_logs": len(logs),
            "avg_daily_steps": avg_steps,
            "avg_daily_calories": avg_calories,
            "avg_water_ml": avg_water,
            "avg_sleep_hours": avg_sleep,
            "total_workout_minutes": total_workout_min,
            "step_goal_pct": min(100, round(avg_steps / 10000 * 100)),
        }
    }

@app.get("/api/health/summary")
def get_health_summary_query(user_id: str = Query(...)):
    """Query parameter alias for /api/health/summary/{user_id}."""
    return get_health_summary(user_id=user_id)

# ==========================================
# Validic Health Cloud Integration Endpoints
# ==========================================
import app.validic as validic_service

@app.get("/api/health/validic/connect/{user_id}")
async def get_validic_connect(user_id: str):
    """Retrieves or provisions a Validic user and returns the Marketplace sync URL."""
    try:
        user_info = await validic_service.get_or_create_validic_user(user_id)
        return {
            "success": True,
            "org_id": validic_service.VALIDIC_ORG_ID,
            "validic_user": user_info,
            "marketplace_url": user_info.get("marketplace_url")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Validic connection failed: {str(e)}")

@app.post("/api/health/validic/sync/{user_id}")
async def sync_validic_user_data(user_id: str):
    """Fetches real device summaries, sleep, and measurements from Validic Inform API."""
    try:
        user_info = await validic_service.get_or_create_validic_user(user_id)
        validic_id = user_info.get("validic_user_id")
        today_str = datetime.utcnow().strftime("%Y-%m-%d")
        health_data = await validic_service.fetch_validic_health_data(validic_id, target_date=today_str)

        if health_data.get("synced") and (health_data.get("steps", 0) > 0 or health_data.get("calories_burned", 0) > 0):
            if user_id not in HEALTH_LOGS:
                HEALTH_LOGS[user_id] = []
            HEALTH_LOGS[user_id] = [l for l in HEALTH_LOGS[user_id] if l.get("date") != today_str]
            entry = {
                "user_id": user_id,
                "date": today_str,
                "steps": health_data["steps"],
                "calories_burned": health_data["calories_burned"],
                "water_ml": health_data.get("water_ml", 0),
                "heart_rate_bpm": health_data.get("heart_rate_bpm"),
                "sleep_hours": health_data.get("sleep_hours"),
                "workout_type": "Mobile Device Sync",
                "workout_minutes": health_data.get("workout_minutes", 0),
                "mood": "😊 Active",
                "notes": f"Daily activity synced from {health_data['source']}.",
                "source": health_data["source"],
                "logged_at": datetime.utcnow().isoformat()
            }
            HEALTH_LOGS[user_id].append(entry)
            return {
                "success": True,
                "synced": True,
                "entry": entry,
                "health_data": health_data,
                "marketplace_url": user_info.get("marketplace_url"),
                "message": f"Successfully synced {health_data['steps']:,} steps from your connected device."
            }
        else:
            return {
                "success": True,
                "synced": False,
                "health_data": health_data,
                "marketplace_url": user_info.get("marketplace_url"),
                "message": "Connected. Complete your device pairing to sync daily activity."
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Validic sync failed: {str(e)}")