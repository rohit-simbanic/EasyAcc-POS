import React, { useState, useEffect, useRef } from 'react';
import { Camera, RefreshCw, Zap, ZapOff } from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Product } from '../../../types';

interface CameraScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  addToCart: (product: Product) => void;
  addToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  setQuickAddSku: (sku: string) => void;
}

export const CameraScannerModal: React.FC<CameraScannerModalProps> = ({
  isOpen,
  onClose,
  products,
  addToCart,
  addToast,
  setQuickAddSku
}) => {
  const [cameras, setCameras] = useState<any[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [scanMode, setScanMode] = useState<'1d' | 'qr' | 'full'>('1d');
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [zoomSupported, setZoomSupported] = useState(false);
  const [zoomMin, setZoomMin] = useState(1);
  const [zoomMax, setZoomMax] = useState(1);
  const [zoomStep, setZoomStep] = useState(0.1);
  const [zoomValue, setZoomValue] = useState(1);
  const [isMirrored, setIsMirrored] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);

  const toggleTorch = async () => {
    if (html5QrCodeRef.current) {
      try {
        const capabilities = html5QrCodeRef.current.getRunningTrackCameraCapabilities();
        if (capabilities.torchFeature && capabilities.torchFeature().isSupported()) {
          const torch = capabilities.torchFeature();
          const nextState = !torchOn;
          await torch.apply(nextState);
          setTorchOn(nextState);
          addToast(nextState ? "Flashlight Turned ON" : "Flashlight Turned OFF", "info");
        }
      } catch (err) {
        console.error("Error toggling torch:", err);
        addToast("Flashlight controls are not supported on this device/camera.", "error");
      }
    }
  };

  const handleZoomChange = async (val: number) => {
    if (html5QrCodeRef.current) {
      try {
        const capabilities = html5QrCodeRef.current.getRunningTrackCameraCapabilities();
        if (capabilities.zoomFeature && capabilities.zoomFeature().isSupported()) {
          const zoom = capabilities.zoomFeature();
          await zoom.apply(val);
          setZoomValue(val);
        }
      } catch (err) {
        console.error("Error setting camera zoom:", err);
      }
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    let activeScanner: Html5Qrcode | null = null;
    setCameraLoading(true);

    const scanner = new Html5Qrcode("camera-reader", {
      verbose: false,
      formatsToSupport: [
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.CODE_39,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
        Html5QrcodeSupportedFormats.QR_CODE
      ]
    });
    activeScanner = scanner;
    html5QrCodeRef.current = scanner;

    const cameraTarget = selectedCameraId ? selectedCameraId : { facingMode: "environment" };

    scanner.start(
      cameraTarget,
      {
        fps: 20,
        qrbox: (viewWidth, viewHeight) => {
          if (scanMode === '1d') {
            const width = Math.min(viewWidth * 0.9, 450);
            const height = Math.min(viewHeight * 0.45, 150);
            return { width, height };
          } else if (scanMode === 'qr') {
            const size = Math.min(viewWidth * 0.75, 260);
            return { width: size, height: size };
          } else {
            return { width: viewWidth, height: viewHeight };
          }
        },
        // @ts-ignore
        useBarCodeDetectorIfSupported: true,
        videoConstraints: selectedCameraId ? undefined : {
          width: { min: 640, ideal: 1280, max: 1920 },
          height: { min: 480, ideal: 720, max: 1080 },
          facingMode: "environment"
        }
      },
      (decodedText) => {
        const match = products.find(p => p.sku.toLowerCase() === decodedText.toLowerCase());
        if (match) {
          addToCart(match);
          addToast(`Camera Scanned: ${match.name}`, 'success');
          onClose();
        } else {
          setQuickAddSku(decodedText);
          onClose();
        }
      },
      () => {
        // silent error
      }
    ).then(() => {
      setCameraLoading(false);
      
      try {
        const capabilities = scanner.getRunningTrackCameraCapabilities();
        
        if (capabilities.torchFeature && capabilities.torchFeature().isSupported()) {
          setTorchSupported(true);
          setTorchOn(!!capabilities.torchFeature().value());
        } else {
          setTorchSupported(false);
          setTorchOn(false);
        }

        if (capabilities.zoomFeature && capabilities.zoomFeature().isSupported()) {
          const zoom = capabilities.zoomFeature();
          setZoomSupported(true);
          setZoomMin(zoom.min() || 1);
          setZoomMax(zoom.max() || 10);
          setZoomStep(zoom.step() || 0.1);
          setZoomValue(zoom.value() || 1);
        } else {
          setZoomSupported(false);
        }
      } catch (e) {
        console.warn("Camera features query rejected:", e);
        setTorchSupported(false);
        setZoomSupported(false);
      }

      Html5Qrcode.getCameras().then(devices => {
        if (devices && devices.length > 0) {
          setCameras(devices);
        }
      }).catch(err => console.error("Error retrieving camera list:", err));

    }).catch(err => {
      console.error("Camera start error:", err);
      setCameraLoading(false);
      addToast("Unable to initialize camera stream. Please check permissions.", "error");
      onClose();
    });

    return () => {
      if (activeScanner) {
        try {
          if (activeScanner.isScanning) {
            activeScanner.stop().catch(err => console.log('Deferred camera stop error:', err.message));
          }
        } catch (e) {
          console.log('Synchronous camera stop error caught:', e);
        }
        html5QrCodeRef.current = null;
      }
    };
  }, [isOpen, selectedCameraId, scanMode, products]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{ zIndex: 1000 }}>
      <div className="success-modal-card" style={{ maxWidth: '460px', padding: '20px' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
          <Camera size={22} className="text-primary" /> Camera Barcode Scanner
        </h2>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '14px', width: '100%' }}>
          Select target type, align the barcode in the scanner box. Use zoom and torch if needed for low light or tiny codes.
        </p>

        {/* Scan Mode Selector Tabs */}
        <div className="scanner-mode-tabs mb-3" style={{ width: '100%', display: 'flex', gap: '4px' }}>
          <button 
            type="button"
            className={`scanner-mode-tab ${scanMode === '1d' ? 'active' : ''}`}
            onClick={() => setScanMode('1d')}
            style={{ flex: 1, padding: '6px 0', fontSize: '0.8rem', border: '1px solid #1e293b', borderRadius: '4px', background: scanMode === '1d' ? '#4f46e5' : '#0f172a', color: '#fff' }}
          >
            1D Barcode
          </button>
          <button 
            type="button"
            className={`scanner-mode-tab ${scanMode === 'qr' ? 'active' : ''}`}
            onClick={() => setScanMode('qr')}
            style={{ flex: 1, padding: '6px 0', fontSize: '0.8rem', border: '1px solid #1e293b', borderRadius: '4px', background: scanMode === 'qr' ? '#4f46e5' : '#0f172a', color: '#fff' }}
          >
            QR Code
          </button>
          <button 
            type="button"
            className={`scanner-mode-tab ${scanMode === 'full' ? 'active' : ''}`}
            onClick={() => setScanMode('full')}
            style={{ flex: 1, padding: '6px 0', fontSize: '0.8rem', border: '1px solid #1e293b', borderRadius: '4px', background: scanMode === 'full' ? '#4f46e5' : '#0f172a', color: '#fff' }}
          >
            Full Frame
          </button>
        </div>
        
        {/* Viewport wrapper for html5-qrcode */}
        <div className={`scanner-viewport-wrapper ${isMirrored ? 'mirror-feed' : ''}`} style={{ position: 'relative', overflow: 'hidden', borderRadius: '8px', border: '1px solid #1e293b' }}>
          <div 
            id="camera-reader" 
            style={{ 
              width: '100%',
              backgroundColor: '#0b0f19'
            }}
          ></div>

          {/* Aiming guide overlay */}
          <div className="scanner-aiming-overlay" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5 }}>
            <div className={`scanner-target-box mode-${scanMode}`} style={{
              border: scanMode !== 'full' ? '2px dashed #4f46e5' : 'none',
              width: scanMode === '1d' ? '90%' : scanMode === 'qr' ? '70%' : '100%',
              height: scanMode === '1d' ? '40%' : scanMode === 'qr' ? '70%' : '100%',
              position: 'relative'
            }}>
              {scanMode !== 'full' && (
                <>
                  <div className="scanner-corner t-l" style={{ position: 'absolute', top: -2, left: -2, width: 12, height: 12, borderTop: '4px solid #4f46e5', borderLeft: '4px solid #4f46e5' }} />
                  <div className="scanner-corner t-r" style={{ position: 'absolute', top: -2, right: -2, width: 12, height: 12, borderTop: '4px solid #4f46e5', borderRight: '4px solid #4f46e5' }} />
                  <div className="scanner-corner b-l" style={{ position: 'absolute', bottom: -2, left: -2, width: 12, height: 12, borderBottom: '4px solid #4f46e5', borderLeft: '4px solid #4f46e5' }} />
                  <div className="scanner-corner b-r" style={{ position: 'absolute', bottom: -2, right: -2, width: 12, height: 12, borderBottom: '4px solid #4f46e5', borderRight: '4px solid #4f46e5' }} />
                </>
              )}
              <div className="scanner-laser-line" style={{ height: '2px', background: '#f43f5e', width: '100%', position: 'absolute', top: '50%', transform: 'translateY(-50%)', boxShadow: '0 0 8px #f43f5e' }} />
            </div>
          </div>

          {/* Loader Overlay */}
          {cameraLoading && (
            <div style={{
              position: 'absolute',
              top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: 'rgba(11, 15, 25, 0.85)',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: '12px', zIndex: 8
            }}>
              <RefreshCw className="animate-spin text-indigo-500" size={32} />
              <span style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>Initializing Camera stream...</span>
            </div>
          )}
        </div>

        {/* Glassmorphism Control Panel */}
        <div className="scanner-controls-panel mt-3" style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* Camera Selection */}
          <div className="scanner-controls-row" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8', minWidth: '60px' }}>Camera:</span>
            <select 
              value={selectedCameraId}
              onChange={(e) => setSelectedCameraId(e.target.value)}
              style={{ flex: 1, background: '#0f172a', border: '1px solid #1e293b', borderRadius: '4px', padding: '6px', fontSize: '0.8rem', color: '#fff' }}
            >
              <option value="">Default (Rear Camera Preferred)</option>
              {cameras.map((cam, idx) => (
                <option key={cam.deviceId || idx} value={cam.deviceId}>
                  {cam.label || `Camera ${idx + 1}`}
                </option>
              ))}
            </select>
          </div>

          {/* Quick Actions (Torch & Mirror) */}
          <div className="scanner-controls-row" style={{ display: 'flex', gap: '8px' }}>
            {torchSupported ? (
              <button 
                type="button"
                className={`scanner-control-btn ${torchOn ? 'active' : ''}`}
                onClick={toggleTorch}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '8px', border: '1px solid #1e293b', borderRadius: '4px', background: torchOn ? '#4f46e5' : '#0f172a', color: '#fff', fontSize: '0.8rem' }}
              >
                {torchOn ? <Zap size={14} /> : <ZapOff size={14} />}
                {torchOn ? "Torch ON" : "Torch OFF"}
              </button>
            ) : (
              <button 
                type="button"
                className="scanner-control-btn" 
                disabled 
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '8px', border: '1px solid #1e293b', borderRadius: '4px', background: '#0f172a', color: '#cbd5e1', opacity: 0.5, cursor: 'not-allowed', fontSize: '0.8rem' }}
                title="Flashlight not supported on this device/camera"
              >
                <ZapOff size={14} /> Torch N/A
              </button>
            )}

            <button 
              type="button"
              className={`scanner-control-btn ${isMirrored ? 'active' : ''}`}
              onClick={() => setIsMirrored(!isMirrored)}
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '8px', border: '1px solid #1e293b', borderRadius: '4px', background: isMirrored ? '#4f46e5' : '#0f172a', color: '#fff', fontSize: '0.8rem' }}
            >
              <RefreshCw size={14} />
              {isMirrored ? "Unmirror" : "Mirror Preview"}
            </button>
          </div>

          {/* Digital Zoom Slider */}
          {zoomSupported && (
            <div className="scanner-slider-container" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
              <span style={{ minWidth: '45px', fontSize: '0.8rem', color: '#94a3b8' }}>Zoom:</span>
              <input 
                type="range"
                min={zoomMin}
                max={zoomMax}
                step={zoomStep}
                value={zoomValue}
                onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
                style={{ flex: 1 }}
              />
              <span style={{ minWidth: '35px', textAlign: 'right', fontSize: '0.8rem', color: '#cbd5e1' }}>{Number(zoomValue).toFixed(1)}x</span>
            </div>
          )}
        </div>
        
        <button 
          type="button"
          className="btn btn-secondary mt-4 w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-2 px-4 rounded transition" 
          onClick={onClose}
        >
          Close Scanner
        </button>
      </div>
    </div>
  );
};
