import { useState } from 'react';
import { Home } from './components/Home';
import { AdminPanel } from './components/AdminPanel';
import { EngagementMonitor } from './components/EngagementMonitor';

export type Screen = 'home' | 'admin' | 'engagement';

export interface AttendanceRecord {
  id: string;
  studentName: string;
  timestamp: string;
  status: 'present' | 'absent' | 'late';
}

export interface StudentReport {
  studentId: string;
  studentName: string;
  created_at: string;
  modified_at: string;
}

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([
    {
      id: '1',
      studentName: 'John Doe',
      timestamp: '2025-01-17 09:00:00',
      status: 'present',
    },
    {
      id: '2',
      studentName: 'Jane Smith',
      timestamp: '2025-01-17 09:05:00',
      status: 'late',
    }
  ]);

  const [studentReports] = useState<StudentReport[]>([
    {
      studentId: '1',
      studentName: 'John Doe',
      created_at: '2025-01-17 09:05:00',
      modified_at: '2025-01-17 09:05:00',
    },
    {
      studentId: '2',
      studentName: 'Jane Smith',
      created_at: '2025-01-17 09:05:00',
      modified_at: '2025-01-17 09:05:00',
    }
  ]);

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

  const addAttendanceRecord = (studentName: string, faceDetected: boolean) => {
    if (!faceDetected) {
      return;
    }

    const newRecord: AttendanceRecord = {
      id: Date.now().toString(),
      studentName,
      timestamp: new Date().toLocaleString(),
      status: 'present',
    };
    setAttendanceRecords(prev => [...prev, newRecord]);
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
        />
      )}

      {currentScreen === 'admin' && (
        <AdminPanel
          isLoggedIn={isLoggedIn}
          onLogin={handleLogin}
          onLogout={handleLogout}
          onNavigateHome={() => setCurrentScreen('home')}
          attendanceRecords={attendanceRecords}
          studentReports={studentReports}
        />
      )}
    </div>
  );
}