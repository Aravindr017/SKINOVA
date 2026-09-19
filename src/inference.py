"""Model loading and prediction, decoupled from any UI framework.

Keeping this separate from app.py is deliberate: when you move the
frontend to React/Next.js, you'll put a thin API (FastAPI/Flask) in
front of this same module instead of Streamlit. get_model() and
predict() won't need to change.
"""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import TypedDict

import numpy as np
import tensorflow as tf

from config import CLASS_NAMES, MODEL_PATH


class Prediction(TypedDict):
    predicted_class: str
    confidence: float
    probabilities: dict[str, float]


@lru_cache(maxsize=1)
def get_model(model_path: str = str(MODEL_PATH)) -> tf.keras.Model:
    """Load the trained model once and cache it for the process lifetime.

    Accepts a .keras file, a legacy .h5 file, or a SavedModel directory
    (tf.keras.models.load_model handles all three transparently).
    """
    path = Path(model_path)
    if not path.exists():
        raise FileNotFoundError(
            f"Model not found at {path}. Export a model from the notebook "
            "(Cell 75 for EfficientNetB0, Cell 91 for EfficientNetB1, or "
            "Cell 108 for the SavedModel format) and place it there, or "
            "update MODEL_PATH in config.py."
        )
    return tf.keras.models.load_model(str(path))


def predict(image_batch: np.ndarray, model: tf.keras.Model | None = None) -> Prediction:
    """Run a forward pass and return the top class plus the full probability map.

    Args:
        image_batch: Output of preprocessing.load_and_preprocess_image(),
            shape (1, IMG_SIZE, IMG_SIZE, 3).
        model: Optional pre-loaded model; defaults to the cached get_model().
    """
    if model is None:
        model = get_model()

    probabilities = model(image_batch, training=False).numpy()[0]
    predicted_index = int(np.argmax(probabilities))

    return {
        "predicted_class": CLASS_NAMES[predicted_index],
        "confidence": float(probabilities[predicted_index]),
        "probabilities": {
            name: float(p) for name, p in zip(CLASS_NAMES, probabilities)
        },
    }