"""Single source of truth for model + preprocessing settings.

Every value here must match the training notebook
(Skinova_AI_skin_disease_detection.ipynb), specifically Cell 52 (config),
Cell 54 (generators / class order) and Cell 93 (prediction function).
If you retrain with different settings, update this file only —
app.py and src/ read from here, nothing is hardcoded elsewhere.
"""

from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
MODELS_DIR = BASE_DIR / "models"

# Point this at whichever exported model you want to serve.
# Works with a .keras file, a legacy .h5 file, or a TensorFlow
# SavedModel directory (e.g. the ones written by notebook Cell 108).
#
# NOTE: the notebook's own test-set evaluation (Cells 89, 97, 102) showed
# EfficientNetB0 (82.8% test accuracy) beating EfficientNetB1 (75.8%), so
# B0 is the default here even though B1 was trained/discussed later.
MODEL_PATH = MODELS_DIR / "skinova_efficientnetb0_final.keras"

# Must match IMG_SIZE in notebook Cell 52.
IMG_SIZE = 240
NUM_CLASSES = 7

# IMPORTANT: order must exactly match the `classes=` list passed to
# flow_from_dataframe in notebook Cell 54. The model's softmax output
# index i corresponds to CLASS_NAMES[i]. Get this order wrong and every
# prediction will silently point at the wrong disease.
CLASS_NAMES = ["AKIEC", "BCC", "BKL", "DF", "MEL", "NV", "VASC"]

# Below this confidence, the UI flags the prediction as unreliable.
# This is a coarse heuristic, not real out-of-distribution detection —
# see the model's known limitation below.
LOW_CONFIDENCE_THRESHOLD = 0.60

# Human-readable labels for display only — does not affect the model.
CLASS_LABELS = {
    "AKIEC": "Actinic keratoses / intraepithelial carcinoma",
    "BCC": "Basal cell carcinoma",
    "BKL": "Benign keratosis-like lesions",
    "DF": "Dermatofibroma",
    "MEL": "Melanoma",
    "NV": "Melanocytic nevi",
    "VASC": "Vascular lesions",
}