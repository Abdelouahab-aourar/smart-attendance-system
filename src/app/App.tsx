import { useState } from 'react';
import { Home } from './components/Home';
import { AdminPanel } from './components/AdminPanel';
import { EngagementMonitor } from './components/EngagementMonitor';
import { mockStudentProfiles } from './lib/faceRecognition';

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

  const [studentReports, setStudentReports] = useState<StudentReport[]>(
    mockStudentProfiles.map((student) => ({
      studentId: student.id,
      studentName: student.name,
      created_at: '2025-01-17 09:05:00',
      modified_at: '2025-01-17 09:05:00',
      images: [],
      descriptors: [Array.from(student.descriptor)],
    }))
  );

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
        />
      )}
    </div>
  );
}