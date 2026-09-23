# ==========================================
# SKINOVA - ONNX INT8 Quantization Script
# Reduces model size from ~17.3MB to ~4.3MB
# Accelerates CPU inference by 2-3x
# ==========================================

from pathlib import Path
from onnxruntime.quantization import quantize_dynamic, QuantType

MODEL_DIR = Path(__file__).resolve().parent
INPUT_MODEL = MODEL_DIR / "skinova_efficientnetb0.onnx"
OUTPUT_MODEL = MODEL_DIR / "skinova_efficientnetb0_int8.onnx"

def quantize_model():
    if not INPUT_MODEL.exists():
        raise FileNotFoundError(f"Source model not found at {INPUT_MODEL}")

    print(f"Loading {INPUT_MODEL.name} ({INPUT_MODEL.stat().st_size / (1024*1024):.2f} MB)...")
    print("Applying dynamic INT8 quantization...")

    quantize_dynamic(
        model_input=str(INPUT_MODEL),
        model_output=str(OUTPUT_MODEL),
        weight_type=QuantType.QUInt8,
        per_channel=True,
        reduce_range=True,
    )

    orig_size = INPUT_MODEL.stat().st_size / (1024 * 1024)
    quant_size = OUTPUT_MODEL.stat().st_size / (1024 * 1024)
    reduction = (1 - quant_size / orig_size) * 100

    print(f"Quantization Successful!")
    print(f"Original Model:   {orig_size:.2f} MB")
    print(f"Quantized Model:  {quant_size:.2f} MB ({reduction:.1f}% reduction)")
    print(f"Saved to: {OUTPUT_MODEL}")

if __name__ == "__main__":
    quantize_model()
