// ==========================================
// SKINOVA - In-Browser Offline AI Scanner
// High-Speed Local Client Inference via WebAssembly (ort-web)
// Zero Network Calls • 100% Patient Privacy • Airplane-Mode Ready
// ==========================================

import * as ort from 'onnxruntime-web';

// Disease metadata matching clinical classification
export const DISEASE_METADATA = {
  AKIEC: {
    full_name: 'Actinic Keratosis / Intraepithelial Carcinoma',
    category: 'Precancerous / Early Malignant',
    risk_level: 'High Risk',
    urgency: 'Consult a dermatologist within 1-2 weeks',
    description: 'Rough, scaly precancerous patches induced by UV exposure that can develop into squamous cell carcinoma.',
  },
  BCC: {
    full_name: 'Basal Cell Carcinoma',
    category: 'Malignant Skin Cancer',
    risk_level: 'High Risk',
    urgency: 'Consult a dermatologist within 1-2 weeks',
    description: 'The most common form of skin cancer, typically presenting as a pearly or translucent nodule with telangiectasia.',
  },
  BKL: {
    full_name: 'Benign Keratosis-like Lesions',
    category: 'Benign',
    risk_level: 'Low Risk',
    urgency: 'Routine monitoring or standard consultation',
    description: 'Non-cancerous growths including seborrheic keratoses, solar lentigines, and lichen-planus like keratoses.',
  },
  DF: {
    full_name: 'Dermatofibroma',
    category: 'Benign',
    risk_level: 'Low Risk',
    urgency: 'Routine check if changing or painful',
    description: 'Common benign fibrous skin nodules, often firm to the touch with positive dimple sign.',
  },
  MEL: {
    full_name: 'Melanoma',
    category: 'Malignant Skin Cancer',
    risk_level: 'Critical / Urgent',
    urgency: 'Immediate dermatological evaluation recommended',
    description: 'A serious and potentially aggressive form of skin cancer arising from melanocytes requiring immediate clinical biopsy.',
  },
  NV: {
    full_name: 'Melanocytic Nevus (Common Mole)',
    category: 'Benign',
    risk_level: 'Low Risk',
    urgency: 'Routine annual check or standard self-monitoring',
    description: 'Common benign proliferation of melanocytes with uniform pigmentation and symmetric borders.',
  },
  VASC: {
    full_name: 'Vascular Lesion (Angioma / Granuloma)',
    category: 'Benign Vascular Proliferation',
    risk_level: 'Low Risk',
    urgency: 'Standard consultation if bleeding or enlarging',
    description: 'Benign blood vessel growths such as cherry angiomas, hemangiomas, or pyogenic granulomas.',
  },
};

export const CLASS_NAMES = ['AKIEC', 'BCC', 'BKL', 'DF', 'MEL', 'NV', 'VASC'];

let cachedSession = null;
let sessionLoadingPromise = null;

/**
 * Lazy loads and caches the 4.39MB quantized ONNX model in WebAssembly memory.
 */
export async function getOfflineSession() {
  if (cachedSession) return cachedSession;
  if (sessionLoadingPromise) return sessionLoadingPromise;

  sessionLoadingPromise = (async () => {
    try {
      // Configure ONNX runtime web to load local self-hosted WASM files
      // 100% offline, zero reliance on external CDNs or network connectivity
      ort.env.wasm.wasmPaths = '/wasm/';
      ort.env.wasm.numThreads = 1;
      ort.env.wasm.simd = true;

      // Model served from frontend public folder (4.39 MB)
      const modelUrl = '/models/skinova_efficientnetb0_int8.onnx';
      const session = await ort.InferenceSession.create(modelUrl, {
        executionProviders: ['wasm'],
        graphOptimizationLevel: 'all',
      });
      cachedSession = session;
      return session;
    } catch (err) {
      console.error('[SKINOVA Offline Engine] Failed to load ONNX model:', err);
      sessionLoadingPromise = null;
      throw new Error(`Offline AI model could not be initialized: ${err.message}`);
    }
  })();

  return sessionLoadingPromise;
}

/**
 * Preprocesses an image File or HTMLImageElement into (1, 240, 240, 3) Float32Array
 */
export async function preprocessImageForONNX(imageSource) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    let tempBlobUrl = null;

    img.onload = () => {
      if (tempBlobUrl) {
        URL.revokeObjectURL(tempBlobUrl);
        tempBlobUrl = null;
      }
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 240;
        canvas.height = 240;
        const ctx = canvas.getContext('2d');

        // Draw and resize to 240x240
        ctx.drawImage(img, 0, 0, 240, 240);
        const imgData = ctx.getImageData(0, 0, 240, 240);
        const { data } = imgData;

        // EfficientNet-B0 input: [1, 240, 240, 3] float32 in range [0, 255]
        const floatData = new Float32Array(1 * 240 * 240 * 3);
        let ptr = 0;
        for (let i = 0; i < data.length; i += 4) {
          floatData[ptr++] = data[i];     // Red
          floatData[ptr++] = data[i + 1]; // Green
          floatData[ptr++] = data[i + 2]; // Blue
          // Ignore Alpha data[i + 3]
        }

        const tensor = new ort.Tensor('float32', floatData, [1, 240, 240, 3]);
        resolve(tensor);
      } catch (e) {
        reject(e);
      }
    };

    img.onerror = () => {
      if (tempBlobUrl) {
        URL.revokeObjectURL(tempBlobUrl);
        tempBlobUrl = null;
      }
      reject(new Error('Failed to load image for offline processing.'));
    };

    if (imageSource instanceof File || imageSource instanceof Blob) {
      tempBlobUrl = URL.createObjectURL(imageSource);
      img.src = tempBlobUrl;
    } else if (typeof imageSource === 'string') {
      img.src = imageSource;
    } else {
      reject(new Error('Invalid image source provided.'));
    }
  });
}

/**
 * Softmax activation helper
 */
function softmax(arr) {
  const max = Math.max(...arr);
  const exp = arr.map(x => Math.exp(x - max));
  const sum = exp.reduce((a, b) => a + b, 0);
  return exp.map(x => x / sum);
}

/**
 * Runs 100% offline in-browser prediction on the given image File or URL.
 */
export async function predictOffline(imageSource) {
  const session = await getOfflineSession();
  const inputTensor = await preprocessImageForONNX(imageSource);

  const inputName = session.inputNames[0] || 'input';
  const feeds = { [inputName]: inputTensor };

  const startTime = performance.now();
  const results = await session.run(feeds);
  const inferenceMs = Math.round(performance.now() - startTime);

  const outputName = session.outputNames[0] || 'output';
  const outputTensor = results[outputName];
  const rawScores = Array.from(outputTensor.data);

  // Check if output is already Softmax probabilities (sum ~ 1) or logits
  const scoreSum = rawScores.reduce((a, b) => a + b, 0);
  let probabilities;
  if (Math.abs(scoreSum - 1.0) < 0.05 && rawScores.every(s => s >= 0 && s <= 1)) {
    probabilities = rawScores;
  } else {
    probabilities = softmax(rawScores);
  }

  // Build sorted probabilities
  const all_probabilities = CLASS_NAMES.map((code, idx) => {
    const meta = DISEASE_METADATA[code] || {};
    const prob = probabilities[idx] || 0;
    return {
      class_code: code,
      name: meta.full_name || code,
      probability: prob,
      percentage: Math.round(prob * 1000) / 10,
      risk_level: meta.risk_level || 'Unknown',
      category: meta.category || 'General',
    };
  }).sort((a, b) => b.probability - a.probability);

  const top = all_probabilities[0];
  const topMeta = DISEASE_METADATA[top.class_code] || {};

  return {
    success: true,
    is_offline: true,
    predicted_class: top.class_code,
    class_name: topMeta.full_name || top.name,
    confidence: top.probability,
    confidence_percentage: top.percentage,
    category: topMeta.category || 'General',
    risk_level: topMeta.risk_level || 'Low Risk',
    urgency: topMeta.urgency || 'Standard consultation',
    description: topMeta.description || '',
    all_probabilities,
    model_version: `EfficientNet-B0 INT8 (On-Device WASM • ${inferenceMs}ms)`,
    medical_disclaimer: 'Offline on-device AI screening. Processed 100% locally on your device with no data transmitted over the internet.',
  };
}
