import { useEffect, useRef, useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Camera, Settings, BarChart3, RefreshCw, AlertCircle } from 'lucide-react';

interface HomeProps {
  onStartAttendance: () => void;
  onNavigateToAdmin: () => void;
}

export function Home({ onStartAttendance, onNavigateToAdmin }: HomeProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isWebcamActive, setIsWebcamActive] = useState(false);
  const [webcamError, setWebcamError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  const initializeWebcam = async () => {
    try {
      setWebcamError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsWebcamActive(true);
      }
    } catch (error: any) {
      console.error('Webcam error:', error);
      setIsWebcamActive(false);

      if (error.name === 'NotAllowedError') {
        setWebcamError('Camera permission denied. Please allow camera access to use facial recognition.');
      } else if (error.name === 'NotFoundError') {
        setWebcamError('No camera found. Please ensure a camera is connected to your device.');
      } else if (error.name === 'NotReadableError') {
        setWebcamError('Camera is already in use by another application. Please close other applications using the camera.');
      } else if (error.name === 'OverconstrainedError') {
        setWebcamError('Camera constraints not supported. Trying with different settings...');
        // Try with basic constraints
        try {
          const basicStream = await navigator.mediaDevices.getUserMedia({ video: true });
          if (videoRef.current) {
            videoRef.current.srcObject = basicStream;
            setIsWebcamActive(true);
            setWebcamError(null);
          }
        } catch {
          setWebcamError('Unable to access camera with any configuration.');
        }
      } else {
        setWebcamError('Unable to access camera. Please check your camera settings and try again.');
      }
    }
  };

  const handleRetry = async () => {
    setIsRetrying(true);
    await initializeWebcam();
    setIsRetrying(false);
  };

  useEffect(() => {
    initializeWebcam();

    return () => {
      if (videoRef.current?.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-primary font-semibold">Smart Attendance System</h1>
          </div>
          <Button
            variant="outline"
            onClick={onNavigateToAdmin}
            className="flex items-center gap-2"
          >
            <Settings className="h-4 w-4" />
            Admin Panel
          </Button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Webcam Preview */}
          <Card className="bg-white shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5" />
                Camera Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative bg-gray-900 rounded-lg overflow-hidden">
                {webcamError ? (
                  <div className="flex items-center justify-center h-80 text-white">
                    <div className="text-center max-w-xs">
                      <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-400" />
                      <p className="text-sm text-gray-300 mb-4">{webcamError}</p>
                      <Button
                        onClick={handleRetry}
                        disabled={isRetrying}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        {isRetrying ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            Retrying...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Retry Camera Access
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-80 object-cover"
                  />
                )}

                {isWebcamActive && (
                  <div className="absolute top-4 right-4">
                    <div className="flex items-center gap-2 bg-green-500 text-white px-3 py-1 rounded-full text-sm">
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                      Live
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Controls */}
          <Card className="bg-white shadow-lg">
            <CardHeader>
              <CardTitle>Attendance Control</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center">
                <p className="text-gray-600 mb-6">
                  {isWebcamActive
                    ? "Position students in front of the camera and click \"Start Attendance\" to begin facial recognition scanning."
                    : "Camera access is required for facial recognition. You can proceed with manual attendance or retry camera access."
                  }
                </p>

                {isWebcamActive ? (
                  <Button
                    onClick={onStartAttendance}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 text-lg"
                  >
                    <Camera className="h-5 w-5 mr-2" />
                    Start Attendance
                  </Button>
                ) : (
                  <div className="space-y-3">
                    <Button
                      onClick={handleRetry}
                      disabled={isRetrying}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 text-lg"
                    >
                      {isRetrying ? (
                        <>
                          <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                          Retrying Camera Access...
                        </>
                      ) : (
                        <>
                          <Camera className="h-5 w-5 mr-2" />
                          Retry Camera Access
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
              <div className="border-t pt-6">
                <h3 className="text-lg mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => window.location.reload()}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh Page
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={onNavigateToAdmin}
                  >
                    <BarChart3 className="h-4 w-4 mr-2" />
                    View Reports
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Features */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-white shadow-lg">
            <CardContent className="p-6 text-center">
              <Camera className="h-8 w-8 mx-auto mb-3 text-blue-600" />
              <h3 className="text-lg mb-2">Facial Recognition</h3>
              <p className="text-sm text-gray-600">
                Advanced AI-powered facial recognition for accurate attendance tracking
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-lg">
            <CardContent className="p-6 text-center">
              <BarChart3 className="h-8 w-8 mx-auto mb-3 text-green-600" />
              <h3 className="text-lg mb-2">Real-time Analytics</h3>
              <p className="text-sm text-gray-600">
                Live dashboard with attendance statistics and insights
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-lg">
            <CardContent className="p-6 text-center">
              <Settings className="h-8 w-8 mx-auto mb-3 text-purple-600" />
              <h3 className="text-lg mb-2">Easy Management</h3>
              <p className="text-sm text-gray-600">
                Simple admin interface for managing students and attendance records
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}