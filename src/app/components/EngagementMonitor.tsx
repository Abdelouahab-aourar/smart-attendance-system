import { useEffect, useRef, useState } from 'react';
import * as faceapi from 'face-api.js';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { Camera, ArrowLeft, Brain, PlayCircle, StopCircle, UserCheck, CheckCircle } from 'lucide-react';
import { AttendanceRecord, StudentReport } from '../App';
import { buildFaceMatcher, loadFaceRecognitionModels } from '../lib/faceRecognition';
import { invoke } from '@tauri-apps/api/core';
interface EngagementMonitorProps {
  onNavigateHome: () => void;
  onAddAttendance: (studentName: string, confidence: number) => void;
  attendanceRecords: AttendanceRecord[];
  students: StudentReport[];
}

interface RecognizedFace {
  id: string;
  name: string;
  confidence: number;
}
export function EngagementMonitor({
  onNavigateHome,
  onAddAttendance,
  attendanceRecords,
  students,
}: EngagementMonitorProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scanTimeoutRef = useRef<number | null>(null);
  const activeRef = useRef(false);
  const faceMatcherRef = useRef<faceapi.FaceMatcher | null>(null);
  const recognizedThisSessionRef = useRef(new Set<string>());
  const [isActive, setIsActive] = useState(false);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('Ready to start face recognition.');
  const [detectedFaces, setDetectedFaces] = useState<RecognizedFace[]>([]);
  const [recognitionStats, setRecognitionStats] = useState({
    totalDetected: 0,
    recognized: 0,
    unknown: 0,
  });
  const handleAddAttendance = async (studentName: string, confidence: number) => {
    try {
      await invoke<string>("add_attendance", {
        studentName: studentName,
        confidence: confidence
      });
      onAddAttendance(studentName, confidence)
      console.log("record added successfully");
    } catch (error) {
      console.error("Failed to add the record:", error);
    }
  }
  const clearScanTimer = () => {
    if (scanTimeoutRef.current !== null) {
      window.clearTimeout(scanTimeoutRef.current);
      scanTimeoutRef.current = null;
    }
  };

  const initializeCamera = async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        return true;
      }
    } catch (error) {
      console.error('Camera initialization failed:', error);
      setCameraError('Unable to access the camera. Check permissions and try again.');
      return false;
    }
    return false;
  };

  const stopDetection = () => {
    activeRef.current = false;
    setIsActive(false);
    setStatusMessage('Face recognition stopped.');
    clearScanTimer();
    recognizedThisSessionRef.current.clear();
    setDetectedFaces([]);
    setRecognitionStats({
      totalDetected: 0,
      recognized: 0,
      unknown: 0,
    });

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }

    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  const processDetections = async () => {
    if (!activeRef.current || !videoRef.current || !canvasRef.current) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const displaySize = {
      width: video.videoWidth || 1280,
      height: video.videoHeight || 720,
    };

    faceapi.matchDimensions(canvas, displaySize);

    try {
      const detections = await faceapi
        .detectAllFaces(
          video,
          new faceapi.TinyFaceDetectorOptions({
            inputSize: 416,
            scoreThreshold: 0.5,
          })
        )
        .withFaceLandmarks()
        .withFaceDescriptors();

      const resizedDetections = faceapi.resizeResults(detections, displaySize);
      const faceMatcher = faceMatcherRef.current;
      const today = new Date().toISOString().slice(0, 10);

      const dailyAttendanceRecords = attendanceRecords.filter(
        record => record.timestamp.slice(0, 10) === today
      );

      const currentAttendanceNames = new Set(
        dailyAttendanceRecords.map(record => record.studentName)
      );
      const nextFaces: RecognizedFace[] = resizedDetections.map((detection, index) => {
        const bestMatch = faceMatcher
          ? faceMatcher.findBestMatch(detection.descriptor)
          : { label: 'unknown', distance: 1 };

        const isRecognized = bestMatch.label !== 'unknown';
        const confidence = Math.max(0, Math.min(100, Math.round((1 - bestMatch.distance) * 100)));
        const displayLabel = isRecognized ? bestMatch.label : 'Unknown';

        if (isRecognized && !currentAttendanceNames.has(bestMatch.label) && !recognizedThisSessionRef.current.has(bestMatch.label)) {
          recognizedThisSessionRef.current.add(bestMatch.label);
          handleAddAttendance(bestMatch.label, confidence);
        }

        const box = detection.detection.box;
        const drawBox = new faceapi.draw.DrawBox(box, {
          label: `${displayLabel} ${isRecognized ? `(${confidence}%)` : ''}`.trim(),
        });

        drawBox.draw(canvas);

        return {
          id: `face-${index}-${Date.now()}`,
          name: displayLabel,
          confidence,
        };
      });

      setDetectedFaces(nextFaces);
      setRecognitionStats({
        totalDetected: nextFaces.length,
        recognized: nextFaces.filter((face) => face.name !== 'Unknown').length,
        unknown: nextFaces.filter((face) => face.name === 'Unknown').length,
      });

      setStatusMessage(
        nextFaces.length > 0
          ? `${nextFaces.length} face${nextFaces.length === 1 ? '' : 's'} detected.`
          : 'Scanning for faces...'
      );
    } catch (error) {
      console.error('Face detection failed:', error);
      setStatusMessage('Face detection is running, but the current frame could not be processed.');
    }

    if (activeRef.current) {
      clearScanTimer();
      scanTimeoutRef.current = window.setTimeout(() => {
        void processDetections();
      }, 1000);
    }
  };

  const startDetection = async () => {
    if (isActive || isLoadingModels) {
      return;
    }

    setIsLoadingModels(true);
    setStatusMessage('Loading face-api.js models...');

    try {
      if (!faceMatcherRef.current) {
        const modelSource = await loadFaceRecognitionModels();
        faceMatcherRef.current = buildFaceMatcher(students);
        setStatusMessage(`Face-api.js models loaded from ${modelSource}.`);
      }

      const cameraReady = await initializeCamera();
      if (!cameraReady) {
        return;
      }

      activeRef.current = true;
      setIsActive(true);
      setStatusMessage('Face recognition is active. Matching live faces against the demo roster.');
      await processDetections();
    } catch (error) {
      console.error('Failed to start face recognition:', error);
      setCameraError('Face recognition could not start. The app could not load face-api.js models from the local folder or the hosted fallback.');
      setStatusMessage('Unable to start face recognition.');
    } finally {
      setIsLoadingModels(false);
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
              <p className="text-sm text-gray-500 mt-1">Face-api.js powered recognition with dummy roster data.</p>
            </div>
          </div>
          <div className="flex gap-2">
            {!isActive ? (
              <Button
                onClick={startDetection}
                disabled={isLoadingModels}
                className="bg-green-600 hover:bg-green-700 flex items-center gap-2"
              >
                {isLoadingModels ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Loading Models...
                  </>
                ) : (
                  <>
                    <PlayCircle className="h-4 w-4" />
                    Start Detection
                  </>
                )}
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

        {cameraError && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertDescription className="text-red-800">{cameraError}</AlertDescription>
          </Alert>
        )}

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

        <Alert className="mb-6 border-slate-200 bg-slate-50">
          <AlertDescription className="text-slate-700">{statusMessage}</AlertDescription>
        </Alert>

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

                  {(isActive || isLoadingModels) && (
                    <div className="absolute top-4 right-4">
                      <Badge className="bg-red-500 text-white px-3 py-1">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                          {isLoadingModels ? 'LOADING' : 'ACTIVE'}
                        </div>
                      </Badge>
                    </div>
                  )}
                </div>

                {!isActive && (
                  <div className="mt-4 text-center text-gray-600">
                    <Camera className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                    <p>Click "Start Detection" to begin facial recognition and engagement monitoring.</p>
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

                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Unknown Faces</span>
                  <Badge variant="secondary">{recognitionStats.unknown}</Badge>
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
                  {detectedFaces.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">
                      No faces currently detected
                    </p>
                  ) : (
                    detectedFaces.map((face) => (
                      <div
                        key={face.id}
                        className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2"
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-800">{face.name}</p>
                          <p className="text-xs text-gray-500">Confidence {face.confidence}%</p>
                        </div>
                        <Badge variant={face.name === 'Unknown' ? 'secondary' : 'outline'}>
                          {face.name === 'Unknown' ? 'Unmatched' : 'Matched'}
                        </Badge>
                      </div>
                    ))
                  )}
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
                  <li>• Attendance is marked automatically for recognized faces</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}