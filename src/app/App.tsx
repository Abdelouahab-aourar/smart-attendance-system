import { useState } from 'react';
import { Home } from './components/Home';
import { AdminPanel } from './components/AdminPanel';
import { EngagementMonitor } from './components/EngagementMonitor';
import { useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { extractFaceDescriptorsFromImages, loadFaceRecognitionModels } from './lib/faceRecognition';
import { readFile } from '@tauri-apps/plugin-fs';


export type Screen = 'home' | 'admin' | 'engagement';

export interface AttendanceRecord {
  id: string;
  studentName: string;
  confidence: number;
  timestamp: string;
  status: 'present' | 'absent' | 'late';
}

export interface StudentReport {
  studentId: string;
  studentName: string;
  created_at: string;
  modified_at: string;
  images: string[];
  descriptors: number[][];
}
interface StudentRecordDto {
  student_id: string;
  student_name: string;
  created_at: string;
  modified_at: string;
  images: string[];
}
export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([
    {
      id: '1',
      studentName: 'John Doe',
      timestamp: '2025-01-17 09:00:00',
      confidence: 50,
      status: 'present',
    },
    {
      id: '2',
      studentName: 'Jane Smith',
      timestamp: '2025-01-17 09:05:00',
      confidence: 30,
      status: 'late',
    }
  ]);

  const toDataUrl = async (path: string): Promise<string | null> => {
    try {
      const bytes = await readFile(path); // Uint8Array
      const base64 = btoa(Array.from(bytes, (b) => String.fromCharCode(b)).join(''));
      const ext = path.split('.').pop()?.toLowerCase();
      const mime = ext === 'png' ? 'image/png' : 'image/jpeg';
      return `data:${mime};base64,${base64}`;
    } catch (error) {
      console.error(`Failed to read image at ${path}:`, error);
      return null;
    }
  };

  const [studentReports, setStudentReports] = useState<StudentReport[]>([]);
  useEffect(() => {
    let cancelled = false;

    const loadStudents = async () => {
      try {
        const records = await invoke<StudentRecordDto[]>('read_students');
        await loadFaceRecognitionModels();

        const mapped: StudentReport[] = await Promise.all(
          records.map(async (record) => {
            const imageUrls = (
              await Promise.all(record.images.map((path) => toDataUrl(path)))
            ).filter((url): url is string => url !== null);

            const descriptors =
              imageUrls.length > 0
                ? await extractFaceDescriptorsFromImages(imageUrls)
                : [];

            return {
              studentId: record.student_id,
              studentName: record.student_name,
              images: imageUrls,
              created_at: record.created_at,
              modified_at: record.modified_at,
              descriptors,
            };
          })
        );

        if (!cancelled) setStudentReports(mapped);
      } catch (error) {
        console.error('Failed to load students:', error);
      }
    };

    loadStudents();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleStartAttendance = () => {
    setCurrentScreen('engagement');
  };

  const handleLogin = (username: string, password: string) => {
    if (username === 'admin' && password === 'password') {
      setIsLoggedIn(true);
      return true;
    }
    return false;
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentScreen('home');
  };

  const addAttendanceRecord = (studentName: string, confidence: number, faceDetected: boolean) => {
    if (!faceDetected) {
      return;
    }

    const newRecord: AttendanceRecord = {
      id: Date.now().toString(),
      studentName,
      confidence,
      timestamp: new Date().toLocaleString(),
      status: 'present',
    };
    setAttendanceRecords(prev => [...prev, newRecord]);
  };

  const addStudentRecord = (student: Omit<StudentReport, 'created_at' | 'modified_at'>) => {
    const timestamp = new Date().toLocaleString();
    const newStudent: StudentReport = {
      ...student,
      created_at: timestamp,
      modified_at: timestamp,
    };

    setStudentReports((previousStudents) => [...previousStudents, newStudent]);
  };

  const updateStudentRecord = (
    originalStudentId: string,
    student: Omit<StudentReport, 'created_at' | 'modified_at'>
  ) => {
    const timestamp = new Date().toLocaleString();

    setStudentReports((previousStudents) =>
      previousStudents.map((existingStudent) => {
        if (existingStudent.studentId !== originalStudentId) {
          return existingStudent;
        }

        return {
          ...student,
          created_at: existingStudent.created_at,
          modified_at: timestamp,
        };
      })
    );
  };
  const handleDeleteStudent = (studentId: string) => {
  setStudentReports((previousStudents) =>
    previousStudents.filter(
      (student) => student.studentId !== studentId
    )
  );
};


  return (
    <div className="min-h-screen bg-background">
      {currentScreen === 'home' && (
        <Home
          onStartAttendance={handleStartAttendance}
          onNavigateToAdmin={() => setCurrentScreen('admin')}
        />
      )}

      {currentScreen === 'engagement' && (
        <EngagementMonitor
          onNavigateHome={() => setCurrentScreen('home')}
          onAddAttendance={addAttendanceRecord}
          attendanceRecords={attendanceRecords}
          students={studentReports}
        />
      )}

      {currentScreen === 'admin' && (
        <AdminPanel
          isLoggedIn={isLoggedIn}
          onLogin={handleLogin}
          onLogout={handleLogout}
          onNavigateHome={() => setCurrentScreen('home')}
          attendanceRecords={attendanceRecords}
          students={studentReports}
          onAddStudent={addStudentRecord}
          onUpdateStudent={updateStudentRecord}
          onDeleteStudent={handleDeleteStudent}
        />
      )}
    </div>
  );
}