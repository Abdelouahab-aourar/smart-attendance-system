import { useEffect, useRef, useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { Camera, ArrowLeft, Brain, PlayCircle, StopCircle, UserCheck, CheckCircle } from 'lucide-react';
import { AttendanceRecord } from '../App';

interface EngagementMonitorProps {
  onNavigateHome: () => void;
  onAddAttendance: (studentName: string, faceDetected: boolean) => void;
  attendanceRecords: AttendanceRecord[];
}

interface DetectedFace {
  id: string;
  name: string;
}

export function EngagementMonitor({
  onNavigateHome,
}: EngagementMonitorProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isActive, setIsActive] = useState(false);
  const [recognitionStats, setRecognitionStats] = useState({
    totalDetected: 0,
    recognized: 0,
  });

  // Mock students database
  const knownStudents = [
    'John Doe', 'Jane Smith', 'Mike Johnson', 'Sarah Wilson',
    'Alex Chen', 'Emily Brown', 'David Wilson', 'Lisa Garcia'
  ];

  const initializeCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        return true;
      }
    } catch (error) {
      console.error('Camera initialization failed:', error);
      return false;
    }
    return false;
  };

  const simulateFaceDetection = () => {
    // Simulate detecting 2-4 faces
    const numFaces = Math.floor(Math.random() * 3) + 2;
    const faces: DetectedFace[] = [];

    for (let i = 0; i < numFaces; i++) {
      const studentName = knownStudents[Math.floor(Math.random() * knownStudents.length)];
      const face: DetectedFace = {
        id: `face-${i}`,
        name: studentName,
      };
      faces.push(face);
    }

    return faces;
  };

  const processDetections = (faces: DetectedFace[]) => {

    setRecognitionStats({
      totalDetected: faces.length,
      recognized: faces.length,
    });
  };
  const startDetection = async () => {
    const cameraReady = await initializeCamera();
    if (!cameraReady) return;

    setIsActive(true);

    // Start face detection simulation
    const detectionInterval = setInterval(() => {
      if (!isActive) {
        clearInterval(detectionInterval);
        return;
      }

      const faces = simulateFaceDetection();
      processDetections(faces);
    }, 2000);

    // Mark attendance for initially detected faces
    setTimeout(() => {
      simulateFaceDetection();
    }, 3000);
  };

  const stopDetection = () => {
    setIsActive(false);

    // Clear canvas
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }

    // Stop camera
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
    }
  };
  useEffect(() => {
    return () => {
      stopDetection();
    };
  }, []);

  useEffect(() => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      video.onloadedmetadata = () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      };
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={onNavigateHome}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Button>
            <div>
              <h1 className="text-3xl text-gray-800">Smart attendance system</h1>
            </div>
          </div>
          <div className="flex gap-2">
            {!isActive ? (
              <Button
                onClick={startDetection}
                className="bg-green-600 hover:bg-green-700 flex items-center gap-2"
              >
                <PlayCircle className="h-4 w-4" />
                Start Detection
              </Button>
            ) : (
              <Button
                onClick={stopDetection}
                variant="destructive"
                className="flex items-center gap-2"
              >
                <StopCircle className="h-4 w-4" />
                Stop Detection
              </Button>
            )}
          </div>
        </div>

        {/* Status Alert */}
        {isActive && (
          <Alert className="mb-6 border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <strong>Facial Recognition Active:</strong> Detecting faces in real-time.
              Students will be automatically marked present when recognized.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Camera Feed */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="h-5 w-5" />
                  Live Camera Feed with Face Detection
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative bg-gray-900 rounded-lg overflow-hidden">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-96 object-cover"
                  />
                  <canvas
                    ref={canvasRef}
                    className="absolute top-0 left-0 w-full h-full"
                    style={{ pointerEvents: 'none' }}
                  />

                  {isActive && (
                    <div className="absolute top-4 right-4">
                      <Badge className="bg-red-500 text-white px-3 py-1">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                          RECORDING
                        </div>
                      </Badge>
                    </div>
                  )}
                </div>

                {!isActive && (
                  <div className="mt-4 text-center text-gray-600">
                    <Camera className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                    <p>Click "Start Detection" to begin facial recognition and engagement monitoring</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Detection Statistics */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  Real-time Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Faces Detected</span>
                  <Badge variant="outline">{recognitionStats.totalDetected}</Badge>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Recognized Students</span>
                  <Badge className="bg-green-100 text-green-800">
                    {recognitionStats.recognized}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Currently Detected Students */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCheck className="h-5 w-5" />
                  Currently Detected
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No faces currently detected
                  </p>
                  )
                </div>
              </CardContent>
            </Card>

            {/* Instructions */}
            <Card>
              <CardHeader>
                <CardTitle>Instructions</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-sm space-y-2 text-gray-600">
                  <li>• Position students within camera view</li>
                  <li>• Attendance is marked automatically</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}