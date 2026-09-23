# ==========================================
# SKINOVA - CNN Prediction Module
# EfficientNet-B0 ONNX (INT8 / FP32)
# ==========================================

from pathlib import Path
import numpy as np
import onnxruntime as ort
from PIL import Image

# ==========================================
# Model Path Resolution (Prefer INT8 if available)
# ==========================================

MODEL_DIR = Path(__file__).resolve().parents[2] / "Model"
INT8_MODEL_PATH = MODEL_DIR / "skinova_efficientnetb0_int8.onnx"
FP32_MODEL_PATH = MODEL_DIR / "skinova_efficientnetb0.onnx"

if INT8_MODEL_PATH.exists():
    ACTIVE_MODEL_PATH = INT8_MODEL_PATH
    MODEL_TYPE = "INT8 Quantized (4.39 MB)"
else:
    ACTIVE_MODEL_PATH = FP32_MODEL_PATH
    MODEL_TYPE = "FP32 Standard (16.51 MB)"

IMAGE_SIZE = (240, 240)

CLASS_NAMES = [
    "AKIEC",
    "BCC",
    "BKL",
    "DF",
    "MEL",
    "NV",
    "VASC",
]

DISEASE_METADATA = {
    "AKIEC": {
        "full_name": "Actinic Keratosis / Intraepithelial Carcinoma",
        "category": "Precancerous / Early Malignant",
        "risk_level": "High Risk",
        "urgency": "Consult a dermatologist within 1-2 weeks",
        "description": "Rough, scaly patches caused by long-term UV damage that can develop into squamous cell carcinoma.",
    },
    "BCC": {
        "full_name": "Basal Cell Carcinoma",
        "category": "Malignant Skin Cancer",
        "risk_level": "High Risk",
        "urgency": "Consult a dermatologist within 1-2 weeks",
        "description": "The most common form of skin cancer, appearing as pearly bumps or non-healing sores.",
    },
    "BKL": {
        "full_name": "Benign Keratosis-like Lesions",
        "category": "Benign",
        "risk_level": "Low Risk",
        "urgency": "Routine monitoring or standard consultation",
        "description": "Non-cancerous skin growths including seborrheic keratoses and solar lentigines.",
    },
    "DF": {
        "full_name": "Dermatofibroma",
        "category": "Benign",
        "risk_level": "Low Risk",
        "urgency": "Routine check if changing or painful",
        "description": "Common harmless firm skin nodules typically occurring on lower legs.",
    },
    "MEL": {
        "full_name": "Melanoma",
        "category": "Malignant Skin Cancer",
        "risk_level": "Critical / Urgent",
        "urgency": "Immediate medical evaluation recommended",
        "description": "A serious form of skin cancer originating from melanocytes with potential for metastasis.",
    },
    "NV": {
        "full_name": "Melanocytic Nevus (Common Mole)",
        "category": "Benign",
        "risk_level": "Low Risk",
        "urgency": "Monitor for ABCDE changes",
        "description": "Common benign pigment producing skin lesions (standard moles).",
    },
    "VASC": {
        "full_name": "Vascular Lesion (Angioma / Granuloma)",
        "category": "Benign Vascular Proliferation",
        "risk_level": "Low Risk",
        "urgency": "Standard consultation if bleeding or enlarging",
        "description": "Benign blood vessel growths such as cherry angiomas or pyogenic granulomas.",
    },
}

# ==========================================
# Load ONNX Inference Session
# ==========================================

print(f"Initializing SKINOVA ONNX Predictor with {MODEL_TYPE}...")

session = ort.InferenceSession(
    str(ACTIVE_MODEL_PATH),
    providers=["CPUExecutionProvider"],
)

INPUT_NAME = session.get_inputs()[0].name
print(f"SKINOVA ONNX session ready on input: {INPUT_NAME}")

# ==========================================
# Image Preprocessing
# ==========================================

def preprocess_image(image: Image.Image) -> np.ndarray:
    """
    Prepare uploaded image for EfficientNetB0 inference.
    Output: shape (1, 240, 240, 3) float32
    """
    image = image.convert("RGB")
    image = image.resize(IMAGE_SIZE)
    image_array = np.asarray(image, dtype=np.float32)
    image_array = np.expand_dims(image_array, axis=0)
    return image_array

# ==========================================
# Prediction Function
# ==========================================

def predict_image(image: Image.Image) -> dict:
    """
    Run skin disease prediction using EfficientNetB0 ONNX.
    Returns top class, confidence, sorted multi-class probabilities, and risk metrics.
    """
    input_data = preprocess_image(image)

    predictions = session.run(
        None,
        {INPUT_NAME: input_data}
    )[0]

    probabilities = predictions[0]

    # Sorted probabilities across all 7 classes
    all_probabilities = []
    for idx, class_name in enumerate(CLASS_NAMES):
        prob = float(probabilities[idx])
        meta = DISEASE_METADATA.get(class_name, {})
        all_probabilities.append({
            "class_code": class_name,
            "name": meta.get("full_name", class_name),
            "probability": prob,
            "percentage": round(prob * 100, 2),
            "risk_level": meta.get("risk_level", "Unknown"),
            "category": meta.get("category", "General"),
        })

    # Sort descending by probability
    all_probabilities.sort(key=lambda x: x["probability"], reverse=True)

    top_result = all_probabilities[0]
    top_code = top_result["class_code"]
    top_meta = DISEASE_METADATA.get(top_code, {})

    return {
        "predicted_class": top_code,
        "class_name": top_meta.get("full_name", top_code),
        "confidence": top_result["probability"],
        "confidence_percentage": top_result["percentage"],
        "category": top_meta.get("category", "General"),
        "risk_level": top_meta.get("risk_level", "Low Risk"),
        "urgency": top_meta.get("urgency", "Standard check"),
        "description": top_meta.get("description", ""),
        "all_probabilities": all_probabilities,
        "model_version": MODEL_TYPE,
    }