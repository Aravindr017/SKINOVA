import tensorflow as tf
import tf2onnx
import numpy as np
import onnxruntime as ort
from pathlib import Path

model_dir = Path(__file__).resolve().parent / "Model"
model_path = model_dir / "skinova_efficientnetb0_best.keras"
output_path = model_dir / "skinova_efficientnetb0_fixed.onnx"

print("Loading Keras model...")

model = tf.keras.models.load_model(str(model_path))

print("Model loaded successfully.")
print("Input shape:", model.input_shape)
print("Output shape:", model.output_shape)

spec = (
    tf.TensorSpec(
        (None, 240, 240, 3),
        tf.float32,
        name="input"
    ),
)

print("Converting to ONNX...")

input_tensor = tf.keras.Input(
    shape=(240, 240, 3),
    dtype=tf.float32,
    name="input",
)
output_tensor = model(input_tensor, training=False)
output_tensor = tf.keras.layers.Activation(
    "linear",
    name="output",
)(output_tensor)
export_model = tf.keras.Model(
    inputs=input_tensor,
    outputs=output_tensor,
    name="skinova_efficientnetb0_export",
)

tf2onnx.convert.from_keras(
    export_model,
    input_signature=(spec,),
    opset=17,
    output_path=str(output_path),
)

session = ort.InferenceSession(str(output_path), providers=["CPUExecutionProvider"])
input_name = session.get_inputs()[0].name
rng = np.random.default_rng(42)
probes = [
    np.zeros((1, 240, 240, 3), dtype=np.float32),
    np.full((1, 240, 240, 3), 255.0, dtype=np.float32),
    rng.uniform(0, 255, (1, 240, 240, 3)).astype(np.float32),
]
outputs = [session.run(None, {input_name: probe})[0][0] for probe in probes]
max_difference = max(
    float(np.max(np.abs(left - right)))
    for left in outputs
    for right in outputs
)
if max_difference < 0.02:
    raise RuntimeError(
        "The exported ONNX model is input-insensitive. "
        f"Maximum probe difference was {max_difference:.6f}."
    )

print("\n✅ Conversion completed!")
print("New model:", output_path)
print(f"Validation maximum probe difference: {max_difference:.6f}")