# ==========================================
# SKINOVA - CNN Prediction Module
# EfficientNet-B0 ONNX (FP32 / INT8)
# ==========================================

import logging
from pathlib import Path

import numpy as np
import onnxruntime as ort
from PIL import Image


logger = logging.getLogger("skinova.predictor")


# ==========================================
# Model Path Resolution
# ==========================================

MODEL_DIR = Path(__file__).resolve().parents[2] / "Model"

KERAS_MODEL_PATH = MODEL_DIR / "skinova_efficientnetb0_best.keras"
FIXED_MODEL_PATH = MODEL_DIR / "skinova_efficientnetb0_fixed.onnx"
INT8_MODEL_PATH = MODEL_DIR / "skinova_efficientnetb0_int8.onnx"
FP32_MODEL_PATH = MODEL_DIR / "skinova_efficientnetb0.onnx"


# ==========================================
# IMPORTANT:
# Use FP32 model while debugging.
#
# We are intentionally NOT using INT8 first.
# Once the FP32 model is confirmed working,
# we can test the INT8 model separately.
# ==========================================

if FIXED_MODEL_PATH.exists():
    ACTIVE_MODEL_PATH = FIXED_MODEL_PATH
    MODEL_TYPE = "FP32 Re-exported"
elif KERAS_MODEL_PATH.exists():
    raise FileNotFoundError(
        f"A trained Keras checkpoint is present at {KERAS_MODEL_PATH}, "
        "but its validated ONNX export is missing. Run convert_model.py "
        "before starting the backend. The legacy ONNX model is disabled "
        "because it produces a collapsed NV prediction."
    )
elif FP32_MODEL_PATH.exists():
    ACTIVE_MODEL_PATH = FP32_MODEL_PATH
    MODEL_TYPE = "FP32 Standard"
elif INT8_MODEL_PATH.exists():
    ACTIVE_MODEL_PATH = INT8_MODEL_PATH
    MODEL_TYPE = "INT8 Quantized"
else:
    raise FileNotFoundError(
        f"No SKINOVA ONNX model found in: {MODEL_DIR}\n"
        f"Expected either:\n"
        f"  - {FP32_MODEL_PATH.name}\n"
        f"  - {INT8_MODEL_PATH.name}"
    )


# ==========================================
# Image Configuration
# ==========================================

# IMPORTANT:
# The SKINOVA model was trained with 240x240 images.
# Do NOT change this to 224x224.

IMAGE_SIZE = (240, 240)


# ==========================================
# Class Order
# ==========================================

# IMPORTANT:
# This order MUST exactly match the class order
# used while training the model.

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
# Disease Metadata
# ==========================================

DISEASE_METADATA = {

    "AKIEC": {
        "full_name": "Actinic Keratosis / Intraepithelial Carcinoma",
        "category": "Precancerous / Early Malignant",
        "risk_level": "High Risk",
        "urgency": "Consult a dermatologist within 1-2 weeks",
        "description": (
            "Rough, scaly patches caused by long-term UV damage "
            "that can develop into squamous cell carcinoma."
        ),
    },

    "BCC": {
        "full_name": "Basal Cell Carcinoma",
        "category": "Malignant Skin Cancer",
        "risk_level": "High Risk",
        "urgency": "Consult a dermatologist within 1-2 weeks",
        "description": (
            "The most common form of skin cancer, appearing as "
            "pearly bumps or non-healing sores."
        ),
    },

    "BKL": {
        "full_name": "Benign Keratosis-like Lesions",
        "category": "Benign",
        "risk_level": "Low Risk",
        "urgency": "Routine monitoring or standard consultation",
        "description": (
            "Non-cancerous skin growths including seborrheic "
            "keratoses and solar lentigines."
        ),
    },

    "DF": {
        "full_name": "Dermatofibroma",
        "category": "Benign",
        "risk_level": "Low Risk",
        "urgency": "Routine check if changing or painful",
        "description": (
            "Common harmless firm skin nodules typically "
            "occurring on lower legs."
        ),
    },

    "MEL": {
        "full_name": "Melanoma",
        "category": "Malignant Skin Cancer",
        "risk_level": "Critical / Urgent",
        "urgency": "Immediate medical evaluation recommended",
        "description": (
            "A serious form of skin cancer originating from "
            "melanocytes with potential for metastasis."
        ),
    },

    "NV": {
        "full_name": "Melanocytic Nevus (Common Mole)",
        "category": "Benign",
        "risk_level": "Low Risk",
        "urgency": "Monitor for ABCDE changes",
        "description": (
            "Common benign pigment producing skin lesions "
            "(standard moles)."
        ),
    },

    "VASC": {
        "full_name": "Vascular Lesion (Angioma / Granuloma)",
        "category": "Benign Vascular Proliferation",
        "risk_level": "Low Risk",
        "urgency": "Standard consultation if bleeding or enlarging",
        "description": (
            "Benign blood vessel growths such as cherry angiomas "
            "or pyogenic granulomas."
        ),
    },
}


# ==========================================
# Custom Exception
# ==========================================

class ModelDegradedError(RuntimeError):
    """
    Raised when the model fails the startup self-test.

    This prevents SKINOVA from displaying a meaningless
    repeated prediction when the model is collapsed or
    otherwise not responding to different inputs.
    """

    pass


# ==========================================
# Load ONNX Model
# ==========================================

print("\n" + "=" * 70)
print("SKINOVA MODEL INITIALIZATION")
print("=" * 70)

print(f"Model directory : {MODEL_DIR}")
print(f"Active model    : {ACTIVE_MODEL_PATH}")
print(f"Model type      : {MODEL_TYPE}")
print("=" * 70)


session = ort.InferenceSession(
    str(ACTIVE_MODEL_PATH),
    providers=["CPUExecutionProvider"],
)


# ==========================================
# ONNX Input Information
# ==========================================

INPUT_NAME = session.get_inputs()[0].name

INPUT_SHAPE = session.get_inputs()[0].shape

OUTPUT_NAME = session.get_outputs()[0].name

OUTPUT_SHAPE = session.get_outputs()[0].shape


print(f"ONNX input name : {INPUT_NAME}")
print(f"ONNX input shape: {INPUT_SHAPE}")
print(f"ONNX output name: {OUTPUT_NAME}")
print(f"ONNX output shape: {OUTPUT_SHAPE}")

print("=" * 70)
print("SKINOVA ONNX session ready")
print("=" * 70 + "\n")


# ==========================================
# Image Preprocessing
# ==========================================

def preprocess_image(image: Image.Image) -> np.ndarray:
    """
    Prepare an uploaded image for EfficientNet-B0.

    Expected output:
        shape  = (1, 240, 240, 3)
        dtype  = float32

    IMPORTANT:
    The SKINOVA EfficientNet-B0 training pipeline used
    raw 0-255 RGB pixel values.

    Therefore we DO NOT divide by 255 here.

    Keras EfficientNet includes its own input rescaling
    inside the model graph.
    """

    # Convert to RGB
    image = image.convert("RGB")

    # Resize to training resolution
    image = image.resize(
        IMAGE_SIZE,
        Image.Resampling.BILINEAR
    )

    # Convert to float32
    image_array = np.asarray(
        image,
        dtype=np.float32
    )

    # Add batch dimension
    image_array = np.expand_dims(
        image_array,
        axis=0
    )

    return image_array


# ==========================================
# Raw ONNX Inference
# ==========================================

def _raw_infer(image_array: np.ndarray) -> np.ndarray:
    """
    Run the ONNX model and return its seven class outputs.
    """

    outputs = session.run(
        None,
        {
            INPUT_NAME: image_array
        }
    )

    if not outputs:
        raise RuntimeError(
            "ONNX model returned no output."
        )

    probabilities = np.asarray(
        outputs[0][0],
        dtype=np.float64
    )

    return probabilities


# ==========================================
# Validate Model Output
# ==========================================

def _validate_probabilities(
    probabilities: np.ndarray
) -> np.ndarray:
    """
    Validate the model output.

    The exported SKINOVA model is expected to contain
    the Softmax activation, so its output should already
    be probabilities.

    We DO NOT apply another Softmax.

    Expected:
        7 values
        values between 0 and 1
        sum approximately 1
    """

    probabilities = np.asarray(
        probabilities,
        dtype=np.float64
    ).flatten()

    if len(probabilities) != len(CLASS_NAMES):
        raise RuntimeError(
            f"Model returned {len(probabilities)} outputs, "
            f"but SKINOVA expects {len(CLASS_NAMES)} classes."
        )

    if not np.all(np.isfinite(probabilities)):
        raise RuntimeError(
            "Model returned NaN or infinite probabilities."
        )

    # The ONNX model should already have Softmax.
    probability_sum = float(
        np.sum(probabilities)
    )

    if (
        np.any(probabilities < 0)
        or np.any(probabilities > 1)
        or not np.isclose(
            probability_sum,
            1.0,
            atol=0.01
        )
    ):
        raise RuntimeError(
            "ONNX output does not look like a valid "
            f"probability distribution.\n"
            f"Output: {probabilities}\n"
            f"Sum: {probability_sum}\n\n"
            "This usually means the ONNX model output is "
            "not the expected Softmax output."
        )

    return probabilities


# ==========================================
# Startup Model Self-Test
# ==========================================

MODEL_HEALTHY = True
_SELF_TEST_DETAIL = ""


def _run_self_test(
    min_spread: float = 0.02,
    min_max_diff: float = 0.02
) -> None:
    """
    Check whether the model responds differently to
    clearly different input images.

    We test:

        1. Completely black image
        2. Completely white image
        3. Random image A
        4. Random image B

    A completely collapsed model will often produce
    almost exactly the same probability distribution
    for every input.

    This is the behavior we are investigating in SKINOVA.
    """

    global MODEL_HEALTHY
    global _SELF_TEST_DETAIL

    print("\n" + "=" * 70)
    print("SKINOVA MODEL SELF-TEST")
    print("=" * 70)

    rng = np.random.default_rng(42)

    probes = {

        "black": np.zeros(
            (1, *IMAGE_SIZE, 3),
            dtype=np.float32
        ),

        "white": np.full(
            (1, *IMAGE_SIZE, 3),
            255.0,
            dtype=np.float32
        ),

        "noise_a": rng.uniform(
            0,
            255,
            (1, *IMAGE_SIZE, 3)
        ).astype(np.float32),

        "noise_b": rng.uniform(
            0,
            255,
            (1, *IMAGE_SIZE, 3)
        ).astype(np.float32),
    }

    outputs = {}

    for name, image_array in probes.items():

        try:

            raw_output = _raw_infer(
                image_array
            )

            outputs[name] = _validate_probabilities(
                raw_output
            )

        except Exception as exc:

            MODEL_HEALTHY = False

            _SELF_TEST_DETAIL = (
                f"Model self-test failed while testing "
                f"'{name}': {exc}"
            )

            logger.critical(
                _SELF_TEST_DETAIL
            )

            print(
                "\n" +
                "!" * 70
            )

            print(
                _SELF_TEST_DETAIL
            )

            print(
                "!" * 70 +
                "\n"
            )

            return

    # ======================================
    # Print all self-test predictions
    # ======================================

    for name, probabilities in outputs.items():

        print(f"\n{name.upper()} IMAGE")

        for class_name, probability in zip(
            CLASS_NAMES,
            probabilities
        ):

            print(
                f"  {class_name:6s}: "
                f"{probability * 100:7.3f}%"
            )

    # ======================================
    # Measure prediction variation
    # ======================================

    spreads = [
        float(
            output.max() -
            output.min()
        )
        for output in outputs.values()
    ]

    max_spread = max(spreads)

    stacked = np.stack(
        list(outputs.values())
    )

    max_pairwise_diff = float(
        np.abs(
            stacked[:, None, :] -
            stacked[None, :, :]
        ).max()
    )

    print("\n" + "-" * 70)

    print(
        f"Maximum class spread : "
        f"{max_spread:.6f}"
    )

    print(
        f"Maximum input difference: "
        f"{max_pairwise_diff:.6f}"
    )

    # ======================================
    # Determine whether model is collapsed
    # ======================================

    if (
        max_spread < min_spread
        or max_pairwise_diff < min_max_diff
    ):

        MODEL_HEALTHY = False

        _SELF_TEST_DETAIL = (
            f"Model self-test FAILED for "
            f"'{ACTIVE_MODEL_PATH.name}'. "
            f"The model produced almost identical "
            f"probability distributions for very "
            f"different inputs. "
            f"max class spread={max_spread:.5f}, "
            f"max input-output difference="
            f"{max_pairwise_diff:.5f}. "
            f"This strongly suggests that the trained "
            f"model is collapsed/untrained or otherwise "
            f"not responding meaningfully to the input."
        )

        logger.critical(
            _SELF_TEST_DETAIL
        )

        print(
            "\n" +
            "!" * 70
        )

        print(
            "MODEL HEALTH CHECK FAILED"
        )

        print(
            _SELF_TEST_DETAIL
        )

        print(
            "!" * 70 +
            "\n"
        )

    else:

        MODEL_HEALTHY = True

        print(
            "\nMODEL HEALTH CHECK PASSED"
        )

        print(
            "The model responds differently "
            "to different inputs."
        )

        print("=" * 70 + "\n")

        logger.info(
            "Model self-test passed. "
            "spread=%.5f, max_diff=%.5f",
            max_spread,
            max_pairwise_diff
        )


# ==========================================
# Run Startup Self-Test
# ==========================================

_run_self_test()


# ==========================================
# Prediction Function
# ==========================================

def predict_image(
    image: Image.Image
) -> dict:
    """
    Run SKINOVA skin-condition prediction.

    Returns:

        predicted_class
        class_name
        confidence
        confidence_percentage
        category
        risk_level
        urgency
        description
        all_probabilities
        model_version

    If the model failed the startup self-test,
    ModelDegradedError is raised instead of returning
    a potentially meaningless diagnosis.
    """

    # ======================================
    # Don't serve predictions from a
    # collapsed/broken model.
    # ======================================

    if not MODEL_HEALTHY:

        raise ModelDegradedError(
            _SELF_TEST_DETAIL
        )

    # ======================================
    # Preprocess uploaded image
    # ======================================

    input_data = preprocess_image(
        image
    )

    # ======================================
    # Run model
    # ======================================

    probabilities = _raw_infer(
        input_data
    )

    # ======================================
    # Validate output
    # ======================================

    probabilities = _validate_probabilities(
        probabilities
    )

    # ======================================
    # DEBUG OUTPUT
    # ======================================

    print("\n" + "=" * 70)
    print("SKINOVA PREDICTION DEBUG")
    print("=" * 70)

    print(
        f"Model       : {MODEL_TYPE}"
    )

    print(
        f"Input shape : {input_data.shape}"
    )

    print(
        f"Input dtype : {input_data.dtype}"
    )

    print(
        f"Input min   : {float(input_data.min()):.3f}"
    )

    print(
        f"Input max   : {float(input_data.max()):.3f}"
    )

    print(
        f"Input mean  : {float(input_data.mean()):.3f}"
    )

    print("\nMODEL PROBABILITIES")

    for class_name, probability in zip(
        CLASS_NAMES,
        probabilities
    ):

        print(
            f"{class_name:6s}: "
            f"{probability * 100:7.3f}%"
        )

    print(
        "\nProbability sum:",
        float(np.sum(probabilities))
    )

    # ======================================
    # Build probability list
    # ======================================

    all_probabilities = []

    for idx, class_name in enumerate(
        CLASS_NAMES
    ):

        probability = float(
            probabilities[idx]
        )

        metadata = DISEASE_METADATA.get(
            class_name,
            {}
        )

        all_probabilities.append({

            "class_code": class_name,

            "name": metadata.get(
                "full_name",
                class_name
            ),

            "probability": probability,

            "percentage": round(
                probability * 100,
                2
            ),

            "risk_level": metadata.get(
                "risk_level",
                "Unknown"
            ),

            "category": metadata.get(
                "category",
                "General"
            ),
        })

    # ======================================
    # Sort highest → lowest
    # ======================================

    all_probabilities.sort(
        key=lambda item: item["probability"],
        reverse=True
    )

    # ======================================
    # Get top prediction
    # ======================================

    top_result = all_probabilities[0]

    top_code = top_result[
        "class_code"
    ]

    top_meta = DISEASE_METADATA.get(
        top_code,
        {}
    )

    print("\nTOP PREDICTION")

    print(
        f"Class      : {top_code}"
    )

    print(
        f"Name       : "
        f"{top_meta.get('full_name', top_code)}"
    )

    print(
        f"Confidence : "
        f"{top_result['percentage']}%"
    )

    print("=" * 70 + "\n")

    # ======================================
    # Return API response
    # ======================================

    return {

        "predicted_class": top_code,

        "class_name": top_meta.get(
            "full_name",
            top_code
        ),

        "confidence": top_result[
            "probability"
        ],

        "confidence_percentage": top_result[
            "percentage"
        ],

        "category": top_meta.get(
            "category",
            "General"
        ),

        "risk_level": top_meta.get(
            "risk_level",
            "Low Risk"
        ),

        "urgency": top_meta.get(
            "urgency",
            "Standard check"
        ),

        "description": top_meta.get(
            "description",
            ""
        ),

        "all_probabilities": (
            all_probabilities
        ),

        "model_version": MODEL_TYPE,
    }