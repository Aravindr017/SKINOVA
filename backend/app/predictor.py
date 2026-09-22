# ==========================================
# SKINOVA - CNN Prediction Module
# Jira Task: S20 - CNN + Backend Integration
# ==========================================

from pathlib import Path

import numpy as np
import onnxruntime as ort
from PIL import Image


# ==========================================
# Model Configuration
# ==========================================

MODEL_PATH = (
    Path(__file__).resolve().parents[2]
    / "Model"
    / "skinova_efficientnetb0.onnx"
)

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


# ==========================================
# Load ONNX Model
# ==========================================

session = ort.InferenceSession(
    str(MODEL_PATH),
    providers=["CPUExecutionProvider"],
)

INPUT_NAME = session.get_inputs()[0].name


# ==========================================
# Image Preprocessing
# ==========================================

def preprocess_image(image: Image.Image) -> np.ndarray:
    """
    Prepare an uploaded image for EfficientNetB0.

    Input:
        PIL Image

    Output:
        NumPy array with shape:
        (1, 240, 240, 3)
    """

    # Convert image to RGB
    image = image.convert("RGB")

    # Resize to model input size
    image = image.resize(IMAGE_SIZE)

    # Convert to NumPy array
    image_array = np.asarray(image, dtype=np.float32)

    # Add batch dimension
    image_array = np.expand_dims(image_array, axis=0)

    return image_array


# ==========================================
# Prediction Function
# ==========================================

def predict_image(image: Image.Image) -> dict:
    """
    Run skin disease prediction using EfficientNetB0.
    """

    # Preprocess image
    input_data = preprocess_image(image)

    # Run ONNX inference
    predictions = session.run(
        None,
        {
            INPUT_NAME: input_data
        }
    )[0]

    # Get probabilities
    probabilities = predictions[0]

    # Find highest probability
    predicted_index = int(np.argmax(probabilities))

    predicted_class = CLASS_NAMES[predicted_index]

    confidence = float(probabilities[predicted_index])

    return {
        "predicted_class": predicted_class,
        "confidence": confidence,
    }