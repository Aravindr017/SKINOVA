
import streamlit as st
from PIL import Image

from config import CLASS_LABELS, IMG_SIZE, LOW_CONFIDENCE_THRESHOLD, MODEL_PATH
from src.inference import get_model, predict
from src.preprocessing import load_and_preprocess_image

st.set_page_config(page_title="Skinova - Model Checkpoint", page_icon="🩺")

st.title("🩺 Skinova — Skin Lesion Classifier (Checkpoint)")
st.caption(
    "Internal checkpoint UI for verifying the trained model. "
    "Not a diagnostic tool."
)
st.info(
    "This model only recognizes 7 lesion classes"
)

with st.sidebar:
    st.subheader("Model info")
    st.write(f"**Model path:** `{MODEL_PATH.name}`")
    st.write(f"**Input size:** {IMG_SIZE}×{IMG_SIZE}")
    try:
        get_model()
        st.success("Model loaded successfully")
    except Exception as exc:
        st.error(f"Model failed to load: {exc}")

uploaded_file = st.file_uploader(
    "Upload a skin lesion image", type=["jpg", "jpeg", "png"]
)

if uploaded_file is not None:
    image = Image.open(uploaded_file)
    st.image(image, caption="Uploaded image", use_container_width=True)

    if st.button("Run prediction", type="primary"):
        with st.spinner("Preprocessing and running inference..."):
            try:
                batch = load_and_preprocess_image(image)
                result = predict(batch)
            except Exception as exc:
                st.error(f"Prediction failed: {exc}")
            else:
                label = result["predicted_class"]
                confidence = result["confidence"]
                message = (
                    f"**Prediction: {CLASS_LABELS.get(label, label)} "
                    f"({label})** — confidence {confidence:.2%}"
                )
                if confidence < LOW_CONFIDENCE_THRESHOLD:
                    st.warning(
                        message + "\n\nLow confidence — the model isn't "
                        "sure. This often means the image doesn't "
                        "resemble a dermoscopic lesion crop at all "
                        "(e.g. a face, a non-skin photo, or an "
                        "unusual angle/lighting)."
                    )
                else:
                    st.success(message)
                st.write("Full probability breakdown:")
                st.bar_chart(result["probabilities"])