import React, { useRef, useState, useCallback } from 'react';
import { Camera, Upload, X, ZoomIn, Loader2, Sparkles } from 'lucide-react';

export default function ImageUploader({ onFileSelect, selectedFile, previewUrl, isScanning, onScan }) {
  const fileInputRef = useRef();
  const [isDragging, setIsDragging] = useState(false);
  const [cameraMode, setCameraMode] = useState(false);
  const videoRef = useRef();
  const canvasRef = useRef();
  const streamRef = useRef();

  const handleFiles = useCallback((files) => {
    const file = files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    const url = URL.createObjectURL(file);
    onFileSelect(file, url);
  }, [onFileSelect]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleChange = useCallback((e) => handleFiles(e.target.files), [handleFiles]);

  const openCamera = async () => {
    setCameraMode(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch { setCameraMode(false); }
  };

  const capturePhoto = () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    canvas.toBlob(blob => {
      const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
      const url = URL.createObjectURL(blob);
      onFileSelect(file, url);
      closeCamera();
    }, 'image/jpeg', 0.92);
  };

  const closeCamera = () => {
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    setCameraMode(false);
  };

  const clearFile = () => { onFileSelect(null, null); if (fileInputRef.current) fileInputRef.current.value = ''; };

  if (cameraMode) return (
    <div className="card overflow-hidden">
      <div className="relative bg-black aspect-video">
        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
        <canvas ref={canvasRef} className="hidden" />
        <div className="scanner-line" />
      </div>
      <div className="p-4 flex gap-3">
        <button className="btn btn-secondary flex-1" onClick={closeCamera}><X size={16} /> Cancel</button>
        <button className="btn btn-primary flex-1" onClick={capturePhoto}><Camera size={16} /> Capture</button>
      </div>
    </div>
  );

  if (previewUrl) return (
    <div className="space-y-4">
      <div className="card overflow-hidden">
        <div className="relative">
          <img src={previewUrl} alt="Preview" className="w-full max-h-80 object-cover" />
          {isScanning && (
            <div className="absolute inset-0 bg-teal-900/40 flex flex-col items-center justify-center gap-3">
              <div className="scanner-line" />
              <div className="glass rounded-2xl px-6 py-4 text-center">
                <Loader2 size={28} className="animate-spin text-teal-400 mx-auto mb-2" />
                <p className="text-white font-semibold text-sm">Analyzing skin lesion…</p>
                <p className="text-teal-200 text-xs mt-1">AI model processing</p>
              </div>
            </div>
          )}
          <button
            className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center shadow-lg transition-colors"
            style={{ background: 'rgba(15,23,42,0.6)' }}
            onClick={clearFile}
          >
            <X size={15} className="text-white" />
          </button>
        </div>
        <div className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50">
          <div className="min-w-0">
            <p className="text-xs sm:text-sm font-semibold text-slate-800 truncate max-w-xs">{selectedFile?.name}</p>
            <p className="text-[11px] sm:text-xs text-slate-500">{selectedFile ? (selectedFile.size / 1024).toFixed(1) + ' KB' : ''}</p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button className="btn btn-sm btn-ghost flex-1 sm:flex-initial" onClick={clearFile}><X size={14} /> Clear</button>
            <button
              className="btn btn-sm btn-primary flex-1 sm:flex-initial"
              onClick={onScan}
              disabled={isScanning}
            >
              {isScanning ? <><Loader2 size={14} className="animate-spin" /> Analyzing…</> : <><Sparkles size={14} /> Run AI Scan</>}
            </button>
          </div>
        </div>
      </div>

      {/* Tips */}
      <div className="card-sm p-4">
        <p className="text-xs font-semibold text-slate-600 mb-2">📋 For best results:</p>
        <ul className="text-xs text-slate-500 space-y-1">
          <li>• Clear, well-lit close-up of the skin area</li>
          <li>• Dermoscopic images provide highest accuracy</li>
          <li>• Avoid motion blur or glare</li>
        </ul>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div
        className={`upload-zone p-6 sm:p-10 flex flex-col items-center gap-3 sm:gap-4 text-center ${isDragging ? 'drag-over' : ''}`}
        onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center animate-float"
          style={{ background: 'linear-gradient(135deg,#CCFBF1,#99F6E4)' }}>
          <Upload size={26} className="text-teal-600" />
        </div>
        <div>
          <p className="text-sm sm:text-base font-semibold text-slate-700">Drop your skin image here</p>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5 sm:mt-1">or click to browse files</p>
          <p className="text-[11px] sm:text-xs text-slate-400 mt-1.5 sm:mt-2">PNG, JPG, WEBP up to 10MB</p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleChange}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
        <button className="btn btn-secondary text-xs sm:text-sm py-2.5 sm:py-3.5" onClick={() => fileInputRef.current?.click()}>
          <Upload size={16} /> Upload Image
        </button>
        <button className="btn btn-secondary text-xs sm:text-sm py-2.5 sm:py-3.5" onClick={openCamera}>
          <Camera size={16} /> Use Camera
        </button>
      </div>

      {/* Supported conditions */}
      <div className="card-sm p-4">
        <p className="text-xs font-semibold text-slate-600 mb-2">🔬 Detectable conditions:</p>
        <div className="flex flex-wrap gap-1.5">
          {['Melanoma', 'Basal Cell Carcinoma', 'Squamous Cell Carcinoma', 'Benign Keratosis', 'Dermatofibroma', 'Nevus', 'Vascular Lesion'].map(c => (
            <span key={c} className="badge badge-neutral">{c}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
