import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { ArrowLeft, Camera, AlertCircle } from 'lucide-react';
import { scanBarcode } from '../lib/api';

const MobileScanner: React.FC = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [cameras, setCameras] = useState<any[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    Html5Qrcode.getCameras().then(devices => {
      if (devices && devices.length) {
        setCameras(devices);
        // Default to back camera if available
        const backCamera = devices.find(d => d.label.toLowerCase().includes('back'));
        setSelectedCamera(backCamera ? backCamera.id : devices[0].id);
      } else {
        setError("No cameras found on this device.");
      }
    }).catch(err => {
      setError(`Camera access error: ${err.message || err}. Please ensure you are on HTTPS or Localhost.`);
    });

    return () => {
      try {
        if (scannerRef.current) {
          if (scannerRef.current.isScanning) {
            scannerRef.current.stop().catch(() => {});
          }
          try { scannerRef.current.clear(); } catch(e) {}
        }
        const container = document.getElementById("reader");
        if (container) {
          const videos = container.getElementsByTagName("video");
          for (let i = 0; i < videos.length; i++) {
            const video = videos[i];
            if (video && video.srcObject) {
              const stream = video.srcObject as MediaStream;
              if (stream && stream.getTracks) {
                stream.getTracks().forEach(track => {
                  try { track.stop(); } catch(e) {}
                });
              }
              video.srcObject = null;
            }
          }
          container.innerHTML = '';
        }
      } catch (e) {
        console.error("MobileScanner unmount cleanup handled safely:", e);
      }
    };
  }, []);

  const startScanner = async () => {
    if (!selectedCamera) return;
    
    setError(null);
    setScanning(true);
    
    try {
      const html5QrCode = new Html5Qrcode("reader");
      scannerRef.current = html5QrCode;
      
      await html5QrCode.start(
        selectedCamera,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0
        },
        async (decodedText) => {
          // On Success
          try {
            await html5QrCode.stop();
            setScanning(false);
            
            // Log scan to backend
            await scanBarcode({
              barcode: decodedText,
              device: navigator.userAgent,
              browser: 'Web Scanner'
            });
            
            // Redirect to Fabric Details
            navigate(`/stock/${decodedText}`);
          } catch (err: any) {
            setError(err.response?.data?.message || 'Error processing barcode');
            setScanning(false);
          }
        },
        (errorMessage) => {
          // On error / ignore
        }
      );
    } catch (err: any) {
      setError(err.message || 'Failed to start scanner');
      setScanning(false);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
        setScanning(false);
      } catch (err) {
        console.error("Failed to stop scanner", err);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col text-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-gray-900 border-b border-gray-800">
        <button 
          onClick={() => { stopScanner(); navigate(-1); }}
          className="p-2 rounded-full hover:bg-gray-800"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-semibold">Scan Fabric Barcode</h1>
        <div className="w-10"></div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        {error && (
          <div className="bg-red-500/20 text-red-400 p-4 rounded-lg flex items-start gap-3 w-full max-w-md mb-6">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        <div 
          id="reader" 
          className="w-full max-w-md bg-gray-900 rounded-xl overflow-hidden shadow-2xl relative"
          style={{ minHeight: scanning ? '300px' : '0' }}
          dangerouslySetInnerHTML={{ __html: '' }}
        />

        {!scanning ? (
          <div className="w-full max-w-md mt-6 space-y-4">
            {cameras.length > 1 && (
              <select 
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg p-3 outline-none focus:border-indigo-500"
                value={selectedCamera}
                onChange={(e) => setSelectedCamera(e.target.value)}
              >
                {cameras.map(c => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            )}
            
            <button 
              onClick={startScanner}
              disabled={!selectedCamera}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white py-4 rounded-xl font-medium flex items-center justify-center gap-2 shadow-lg transition-all"
            >
              <Camera className="w-5 h-5" />
              Start Scanner
            </button>
          </div>
        ) : (
          <div className="w-full max-w-md mt-6">
            <button 
              onClick={stopScanner}
              className="w-full bg-gray-800 hover:bg-gray-700 text-white py-4 rounded-xl font-medium shadow-lg transition-all"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
      
      <div className="p-4 text-center text-gray-500 text-sm pb-8">
        Align the QR code or Barcode within the frame to scan.
      </div>
    </div>
  );
};

export default MobileScanner;
