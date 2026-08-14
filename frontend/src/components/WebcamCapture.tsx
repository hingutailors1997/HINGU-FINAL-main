import React, { useEffect, useRef, useState } from 'react';
import { Camera, X, RefreshCw, Check } from 'lucide-react';

interface WebcamCaptureProps {
  onCapture: (dataUrl: string) => void;
  onClose: () => void;
}

export default function WebcamCapture({ onCapture, onClose }: WebcamCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const startCamera = async (isActive = true) => {
    setError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false,
      });
      
      if (!isActive) {
        mediaStream.getTracks().forEach(track => track.stop());
        return;
      }
      
      streamRef.current = mediaStream;
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      console.error('Error accessing camera:', err);
      if (isActive) {
        setError('Could not access camera. Please ensure permissions are granted in your browser settings.');
      }
    }
  };

  useEffect(() => {
    let isActive = true;
    startCamera(isActive);
    
    return () => {
      isActive = false;
      stopCamera();
    };
  }, []);

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setCapturedImage(dataUrl);
        stopCamera();
      }
    }
  };

  const retake = () => {
    setCapturedImage(null);
    startCamera();
  };

  const confirm = () => {
    if (capturedImage) {
      onCapture(capturedImage);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-card w-full max-w-md rounded-xl shadow-xl overflow-hidden relative">
        <div className="flex items-center justify-between p-4 border-b bg-muted/20">
          <h3 className="font-bold">Live Camera Capture</h3>
          <button onClick={() => { stopCamera(); onClose(); }} className="p-1 hover:bg-muted rounded-md transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-4 flex flex-col items-center">
          {error && (
            <div className="bg-rose-50 text-rose-600 p-3 rounded-lg text-sm w-full mb-4">
              {error}
            </div>
          )}

          <div className="relative w-full aspect-square bg-black rounded-lg overflow-hidden flex items-center justify-center mb-6">
            {!capturedImage ? (
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                className="w-full h-full object-cover scale-x-[-1]" // Mirror effect for front camera
              />
            ) : (
              <img 
                src={capturedImage} 
                alt="Captured preview" 
                className="w-full h-full object-cover scale-x-[-1]" 
              />
            )}
            
            <canvas ref={canvasRef} className="hidden" />
          </div>

          <div className="flex gap-4 w-full">
            {!capturedImage ? (
              <button 
                onClick={takePhoto}
                disabled={!!error}
                className="flex-1 flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                <Camera className="w-5 h-5" />
                Capture Photo
              </button>
            ) : (
              <>
                <button 
                  onClick={retake}
                  className="flex-1 flex items-center justify-center gap-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground py-3 rounded-lg font-medium transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Retake
                </button>
                <button 
                  onClick={confirm}
                  className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-lg font-medium transition-colors"
                >
                  <Check className="w-5 h-5" />
                  Confirm
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
