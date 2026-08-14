import { useEffect, useState, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera, AlertCircle } from 'lucide-react';

interface ScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
}

export default function Scanner({ onScan, onClose }: ScannerProps) {
  const [error, setError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [scanning, setScanning] = useState(false);
  const [cameras, setCameras] = useState<any[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    Html5Qrcode.getCameras().then(devices => {
      if (devices && devices.length) {
        setCameras(devices);
        const backCamera = devices.find(d => d.label.toLowerCase().includes('back'));
        setSelectedCamera(backCamera ? backCamera.id : devices[0].id);
      } else {
        setError("No cameras found on this device.");
      }
    }).catch(err => {
      setError(`Camera access error: ${err.message || err}. Please ensure you granted permissions.`);
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
        console.error("Scanner cleanup handled safely:", e);
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
          try {
            await html5QrCode.stop();
            onScan(decodedText);
          } catch (err) {
            console.error(err);
          }
        },
        () => {
          // Ignore frequent scanning errors
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

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(console.error);
      }
      onScan(manualCode.trim());
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-card w-full max-w-md rounded-xl shadow-xl border overflow-hidden relative my-auto">
        <div className="flex items-center justify-between p-4 border-b bg-muted/20">
          <h3 className="font-bold">Scan Barcode / QR</h3>
          <button onClick={() => { stopScanner(); onClose(); }} className="p-1 hover:bg-muted rounded-md transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          {error && (
            <div className="bg-red-500/20 text-red-500 p-3 rounded-lg flex items-start gap-3 w-full text-sm">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}
          
          <div className="bg-muted/30 p-3 rounded-lg border border-amber-500/20 text-xs text-amber-600 mb-2">
            <strong>Note for Mobile testing:</strong> If your browser blocks the camera due to self-signed HTTPS certificates, use the manual entry below.
          </div>

          <div 
            id="reader" 
            className="w-full bg-black rounded-lg overflow-hidden border-2 border-primary/20"
            style={{ minHeight: scanning ? '250px' : '0' }}
            dangerouslySetInnerHTML={{ __html: '' }}
          />

          {!scanning ? (
            <div className="space-y-4">
              {cameras.length > 0 && (
                <div className="space-y-2">
                  <select 
                    className="w-full bg-background border border-input rounded-md p-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                    value={selectedCamera}
                    onChange={(e) => setSelectedCamera(e.target.value)}
                  >
                    {cameras.map(c => (
                      <option key={c.id} value={c.id}>{c.label || `Camera ${c.id.substring(0, 5)}...`}</option>
                    ))}
                  </select>
                  <button 
                    onClick={startScanner}
                    disabled={!selectedCamera}
                    className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground py-2.5 rounded-md font-medium flex items-center justify-center gap-2 transition-all text-sm"
                  >
                    <Camera className="w-4 h-4" />
                    Start Camera
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button 
              onClick={stopScanner}
              className="w-full bg-secondary hover:bg-secondary/80 text-secondary-foreground py-2.5 rounded-md font-medium transition-all text-sm"
            >
              Stop Camera
            </button>
          )}

          <div className="relative pt-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or enter manually</span>
            </div>
          </div>

          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <input 
              type="text" 
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="Enter Barcode / SKU manually..."
              className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button 
              type="submit"
              className="px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-md hover:bg-primary/90"
            >
              Submit
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
