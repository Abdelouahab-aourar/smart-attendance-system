import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { ArrowLeft, LogOut, BarChart3, Users, Calendar, Shield, Eye, EyeOff, TrendingUp } from 'lucide-react';
import { AttendanceRecord, StudentReport } from '../App';

interface AdminPanelProps {
  isLoggedIn: boolean;
  onLogin: (username: string, password: string) => boolean;
  onLogout: () => void;
  onNavigateHome: () => void;
  attendanceRecords: AttendanceRecord[];
  studentReports: StudentReport[];
}

export function AdminPanel({
  isLoggedIn,
  onLogin,
  onLogout,
  onNavigateHome,
  attendanceRecords,
  studentReports
}: AdminPanelProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');

  const handleLogin = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const success = onLogin(username, password);
    if (!success) {
      setLoginError('Invalid username or password');
    } else {
      setLoginError('');
      setUsername('');
      setPassword('');
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-100 to-slate-200 flex items-center justify-center p-8">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mb-4">
              <Shield className="h-8 w-8 text-blue-600" />
            </div>
            <CardTitle className="text-2xl">Admin Login</CardTitle>
            <p className="text-gray-600">Access system administrative features</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-2 h-6 w-6 p-0"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {loginError && (
                <div className="text-red-600 text-sm">{loginError}</div>
              )}

              <Button type="submit" className="w-full">
                Sign In
              </Button>
            </form>

            <div className="mt-6 text-center">
              <Button
                variant="outline"
                onClick={onNavigateHome}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getStatusBadge = (status: AttendanceRecord['status']) => {
    switch (status) {
      case 'present':
        return <Badge className="bg-green-100 text-green-800">Present</Badge>;
      case 'late':
        return <Badge className="bg-yellow-100 text-yellow-800">Late</Badge>;
      case 'absent':
        return <Badge className="bg-red-100 text-red-800">Absent</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  // Calculate analytics
  const totalStudents = attendanceRecords.length;
  const presentStudents = attendanceRecords.filter(r => r.status === 'present').length;
  const attendanceRate = Math.round((presentStudents / totalStudents) * 100);

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
          </div>
          <div>
            <h1 className="text-primary font-semibold">System Administration and Analytics</h1>
          </div>
          <div className="flex items-center">
            <Button
              variant="outline"
              onClick={onLogout}
              className="flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="students" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Students
            </TabsTrigger>
            <TabsTrigger value="attendance" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Attendance
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Total Students
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl">{totalStudents}</p>
                  <p className="text-sm text-gray-600">Registered in system</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Attendance Rate
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl text-green-600">{attendanceRate}%</p>
                  <p className="text-sm text-gray-600">Today's attendance</p>
                  <Progress value={attendanceRate} className="h-2 mt-2" />
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Student Performance Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>High Performers (&gt;80% engagement)</span>
                      <Badge className="bg-green-100 text-green-800">
                        5
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Average Performers (60-80%)</span>
                      <Badge className="bg-yellow-100 text-yellow-800">
                        3
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Low Performers (&lt;60%)</span>
                      <Badge className="bg-red-100 text-red-800">
                        2
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Engagement Trends</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>Improving Students</span>
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-green-500" />
                        <Badge className="bg-green-100 text-green-800">
                          2
                        </Badge>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Stable Performance</span>
                      <Badge variant="outline">
                        3
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Declining Performance</span>
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-red-500 rotate-180" />
                        <Badge className="bg-red-100 text-red-800">
                          1
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Students Tab */}
          <TabsContent value="students" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Student Management</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <Input placeholder="Search students..." className="max-w-sm" />
                    <Button>Add New Student</Button>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student ID</TableHead>
                        <TableHead>Student Name</TableHead>
                        <TableHead>created_at</TableHead>
                        <TableHead>modified_at</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {studentReports.map((report) => (
                        <TableRow key={report.studentId}>
                          <TableCell>{report.studentId}</TableCell>
                          <TableCell>{report.studentName}</TableCell>
                          <TableCell>{report.created_at}</TableCell>
                          <TableCell>{report.modified_at}</TableCell>
                          <TableCell>
                            <Button variant="outline" size="sm">
                              Edit
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Attendance Tab */}
          <TabsContent value="attendance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Attendance Records</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student Name</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendanceRecords.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>{record.studentName}</TableCell>
                        <TableCell>{record.timestamp.split(' ')[0]}</TableCell>
                        <TableCell>{record.timestamp.split(' ')[1]}</TableCell>
                        <TableCell>{getStatusBadge(record.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}