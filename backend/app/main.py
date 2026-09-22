# ==========================================
# SKINOVA - FastAPI Backend
# Jira Tasks:
# S17 - Backend Project Setup
# S18 - Image Upload API
# S20 - CNN + Backend Integration
# S21 - Error Handling
# ==========================================

from pathlib import Path
from uuid import uuid4
from io import BytesIO

import numpy as np

from fastapi import FastAPI, File, UploadFile, HTTPException
from PIL import Image

from app.predictor import predict_image

from pydantic import BaseModel

from app.rag import search_knowledge_base

from app.llm import generate_response

# ==========================================
# Create FastAPI application
# ==========================================

app = FastAPI(
    title="SKINOVA AI API",
    description=(
        "Backend API for the SKINOVA "
        "AI Skin Disease Detection System."
    ),
    version="1.0.0"
)


# ==========================================
# Configuration
# ==========================================

UPLOAD_DIR = Path("uploads")

UPLOAD_DIR.mkdir(
    parents=True,
    exist_ok=True
)


# Supported image formats
ALLOWED_EXTENSIONS = {
    ".jpg",
    ".jpeg",
    ".png",
    ".webp"
}


# Maximum image size: 10 MB
MAX_FILE_SIZE = 10 * 1024 * 1024


# ==========================================
# Root Endpoint
# ==========================================

@app.get("/")
def root():
    """
    Basic endpoint to check whether
    the SKINOVA backend is running.
    """

    return {
        "project": "SKINOVA AI",
        "status": "running",
        "message": "SKINOVA backend is running successfully."
    }


# ==========================================
# Health Check Endpoint
# ==========================================

@app.get("/api/health")
def health_check():
    """
    Health-check endpoint used to verify
    that the backend service is active.
    """

    return {
        "status": "healthy",
        "service": "SKINOVA Backend"
    }


# ==========================================
# Helper Function
# Validate Uploaded File
# ==========================================

def validate_uploaded_file(file: UploadFile):
    """
    Validate filename and file extension.
    """

    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="No filename provided."
        )

    extension = Path(
        file.filename
    ).suffix.lower()

    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=(
                "Unsupported image format. "
                "Use JPG, JPEG, PNG or WEBP."
            )
        )

    return extension


# ==========================================
# Helper Function
# Basic Skin Image Validation
# ==========================================

def is_likely_skin_image(image: Image.Image) -> bool:
    """
    Performs a basic visual check to determine
    whether an image contains a reasonable amount
    of skin-like pixels.

    NOTE:
    This is a basic project-level validation and
    is NOT a medically validated skin detector.
    """

    # Convert image to RGB
    image = image.convert("RGB")

    # Resize for faster processing
    image = image.resize((100, 100))

    # Convert image to NumPy array
    pixels = np.asarray(image)

    # Separate RGB channels
    r = pixels[:, :, 0].astype(np.int16)
    g = pixels[:, :, 1].astype(np.int16)
    b = pixels[:, :, 2].astype(np.int16)

    # Basic skin-color conditions
    skin_pixels = (
        (r > 60) &
        (g > 30) &
        (b > 15) &
        (r > g) &
        (r > b) &
        ((r - g) > 10)
    )

    # Calculate percentage of skin-like pixels
    skin_ratio = np.mean(skin_pixels)

    # Minimum skin-like pixel ratio
    return skin_ratio >= 0.05


# ==========================================
# S18 - Image Upload API
# ==========================================

@app.post("/api/upload")
async def upload_image(
    file: UploadFile = File(...)
):
    """
    Upload and validate a skin image.

    Supported formats:
    JPG, JPEG, PNG and WEBP

    Maximum size:
    10 MB
    """

    # Validate filename and extension
    extension = validate_uploaded_file(file)

    # Read uploaded file
    contents = await file.read()

    # Check empty file
    if len(contents) == 0:
        raise HTTPException(
            status_code=400,
            detail="Uploaded file is empty."
        )

    # Check file size
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail="Image size exceeds the 10 MB limit."
        )

       # Validate actual image content
    try:
        image = Image.open(
            BytesIO(contents)
        )

        image.verify()

        # Re-open image after verify()
        image = Image.open(
            BytesIO(contents)
        ).convert("RGB")

    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Invalid or corrupted image file."
        )

    # ------------------------------------------
    # Basic skin-image validation
    # ------------------------------------------

    try:

        if not is_likely_skin_image(image):

            raise HTTPException(
                status_code=422,
                detail=(
                    "The uploaded image does not appear "
                    "to be a skin image. Please upload "
                    "a clear skin or skin-lesion image."
                )
            )

    except HTTPException:
        raise

    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail="Skin image validation failed."
        ) from error

    # Generate unique filename
    new_filename = (
        f"{uuid4().hex}{extension}"
    )

    save_path = (
        UPLOAD_DIR / new_filename
    )

    # Save image
    try:

        with open(
            save_path,
            "wb"
        ) as output_file:

            output_file.write(contents)

    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail="Failed to save uploaded image."
        ) from error

    return {
        "success": True,
        "filename": new_filename,
        "original_filename": file.filename,
        "size_bytes": len(contents),
        "message": "Image uploaded successfully."
    }


# ==========================================
# S20 + S21
# CNN Prediction Endpoint
# ==========================================

@app.post("/api/predict")
async def predict_skin_disease(
    file: UploadFile = File(...)
):
    """
    Upload a skin image and get the CNN prediction.

    Includes:
    - File validation
    - Image validation
    - Basic skin-image validation
    - CNN prediction
    - Error handling
    """

    # ------------------------------------------
    # 1. Validate filename and extension
    # ------------------------------------------

    extension = validate_uploaded_file(file)

    # ------------------------------------------
    # 2. Read uploaded file
    # ------------------------------------------

    try:

        image_bytes = await file.read()

    except Exception as error:

        raise HTTPException(
            status_code=400,
            detail="Unable to read uploaded file."
        ) from error

    # ------------------------------------------
    # 3. Check empty file
    # ------------------------------------------

    if len(image_bytes) == 0:

        raise HTTPException(
            status_code=400,
            detail="Uploaded file is empty."
        )

    # ------------------------------------------
    # 4. Check file size
    # ------------------------------------------

    if len(image_bytes) > MAX_FILE_SIZE:

        raise HTTPException(
            status_code=413,
            detail="Image size exceeds the 10 MB limit."
        )

    # ------------------------------------------
    # 5. Open and validate image
    # ------------------------------------------

    try:

        image = Image.open(
            BytesIO(image_bytes)
        )

        # Force loading of image data
        image.load()

        # Convert to RGB
        image = image.convert("RGB")

    except Exception as error:

        raise HTTPException(
            status_code=400,
            detail=(
                "Invalid or corrupted image. "
                "Please upload a valid image."
            )
        ) from error

    # ------------------------------------------
    # 6. Basic skin-image validation
    # ------------------------------------------

    try:

        if not is_likely_skin_image(image):

            raise HTTPException(
                status_code=422,
                detail=(
                    "The uploaded image does not appear "
                    "to be a skin image. Please upload "
                    "a clear skin or skin-lesion image."
                )
            )

    except HTTPException:
        raise

    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail="Skin image validation failed."
        ) from error

    # ------------------------------------------
    # 7. Run CNN prediction
    # ------------------------------------------

    try:

        result = predict_image(image)

    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=(
                "Prediction failed. "
                "Please try again with another image."
            )
        ) from error

    # ------------------------------------------
    # 8. Return prediction with medical disclaimer
    # ------------------------------------------

    return {
        "success": True,
        "filename": file.filename,
        "predicted_class": result["predicted_class"],
        "confidence": result["confidence"],
        "message": "Prediction completed successfully.",

        # ==========================================
        # Medical Safety Disclaimer
        # ==========================================

        "medical_disclaimer": (
            "This AI prediction is for informational "
            "and educational purposes only and is not "
            "a medical diagnosis. Please consult a "
            "qualified healthcare professional for "
            "medical advice, diagnosis, or treatment."
        )
    }

# ==========================================
# RAG Request Model
# Jira Task: S19 - LLM + RAG API
# ==========================================

class RAGRequest(BaseModel):
    query: str
    top_k: int = 5

# ==========================================
# RAG Retrieval Endpoint
# Jira Task: S19 - LLM + RAG API
# ==========================================

@app.post("/api/rag")
def rag_search(request: RAGRequest):
    """
    Search the SKINOVA medical knowledge base
    using semantic similarity and FAISS.
    """

    # Validate query
    if not request.query.strip():
        raise HTTPException(
            status_code=400,
            detail="Query cannot be empty."
        )

    # Keep top_k within a safe range
    top_k = max(
        1,
        min(request.top_k, 10)
    )

    try:
        results = search_knowledge_base(
            query=request.query,
            top_k=top_k
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"RAG retrieval failed: {str(e)}"
        )

    return {
        "success": True,
        "query": request.query,
        "results": results,
        "result_count": len(results),
        "message": "RAG retrieval completed successfully."
    }

# ==========================================
# Chat Request Model
# Jira Task: S19 - LLM + RAG API
# ==========================================

class ChatRequest(BaseModel):
    query: str
    predicted_class: str | None = None
    confidence: float | None = None
    top_k: int = 5

# ==========================================
# LLM + RAG Chat Endpoint
# Jira Task: S19 - LLM + RAG API
# ==========================================

@app.post("/api/chat")
def chat_with_skinova(request: ChatRequest):
    """
    SKINOVA topic-aware AI chat.

    Uses:
    - FAISS RAG knowledge base
    - Qwen2.5-7B-Instruct
    - Optional CNN prediction context

    The chatbot is restricted to skin-health
    and SKINOVA-related questions.
    """

    # --------------------------------------
    # Validate user query
    # --------------------------------------

    if not request.query.strip():
        raise HTTPException(
            status_code=400,
            detail="Query cannot be empty."
        )

    # --------------------------------------
    # Validate top_k
    # --------------------------------------

    top_k = max(
        1,
        min(request.top_k, 5)
    )

    # --------------------------------------
    # Validate confidence
    # --------------------------------------

    if request.confidence is not None:

        if not 0 <= request.confidence <= 1:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Confidence must be between "
                    "0 and 1."
                )
            )

    # --------------------------------------
    # Generate grounded response
    # --------------------------------------

    try:

        result = generate_response(
            query=request.query,
            predicted_class=request.predicted_class,
            confidence=request.confidence,
            top_k=top_k,
        )

    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=(
                "SKINOVA AI response generation failed. "
                "Please try again."
            )
        ) from error

    # --------------------------------------
    # Medical safety disclaimer
    # --------------------------------------

    medical_disclaimer = (
        "This response is for informational and "
        "educational purposes only and is not a "
        "medical diagnosis. Please consult a "
        "qualified healthcare professional for "
        "medical advice, diagnosis, or treatment."
    )

    # --------------------------------------
    # Return response
    # --------------------------------------

    return {
        "success": True,
        "query": request.query,
        "predicted_class": request.predicted_class,
        "confidence": request.confidence,
        "answer": result["answer"],
        "sources": result["sources"],
        "source_count": len(result["sources"]),
        "medical_disclaimer": medical_disclaimer,
        "message": (
            "SKINOVA AI response generated "
            "successfully."
        ),
    }