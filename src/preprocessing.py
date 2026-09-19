"""Image preprocessing that mirrors the training pipeline.

The notebook resizes every image to (IMG_SIZE, IMG_SIZE) via
tensorflow.keras.utils.load_img (Cell 93), which uses PIL under the hood
with "nearest" interpolation by default, and feeds raw 0-255 float pixels
straight into the model (Cells 54 and 93 never divide by 255).

EfficientNet's Keras implementation has its own Rescaling + Normalization
layers built into the first layers of the network, so this file must NOT
normalize pixel values — doing so would double-normalize and quietly wreck
every prediction. If you ever swap the backbone for a model that expects
pre-normalized input, update this function and leave config.py alone.
"""

from __future__ import annotations

import numpy as np
from PIL import Image

from config import IMG_SIZE


def load_and_preprocess_image(image: Image.Image) -> np.ndarray:
    """Convert a PIL image into a model-ready batch.

    Args:
        image: Any PIL image (e.g. from st.file_uploader), any mode/size.

    Returns:
        float32 array of shape (1, IMG_SIZE, IMG_SIZE, 3), values in [0, 255],
        matching exactly what predict_skin_disease() fed the model in the
        notebook.
    """
    rgb_image = image.convert("RGB")
    resized = rgb_image.resize((IMG_SIZE, IMG_SIZE), resample=Image.NEAREST)

    array = np.asarray(resized, dtype=np.float32)  # (H, W, 3), 0-255
    batch = np.expand_dims(array, axis=0)  # (1, H, W, 3)
    return batch