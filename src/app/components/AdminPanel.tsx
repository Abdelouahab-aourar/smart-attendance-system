import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { ArrowLeft, LogOut, BarChart3, Users, Calendar, Shield, Eye, EyeOff, TrendingUp, Upload, X } from 'lucide-react';
import { AttendanceRecord, StudentReport } from '../App';
import { extractFaceDescriptorsFromImages, loadFaceRecognitionModels } from '../lib/faceRecognition';
import { invoke } from "@tauri-apps/api/core"
interface AdminPanelProps {
  isLoggedIn: boolean;
  onLogin: (username: string, password: string) => boolean;
  onLogout: () => void;
  onNavigateHome: () => void;
  attendanceRecords: AttendanceRecord[];
  students: StudentReport[];
  onAddStudent: (student: Omit<StudentReport, 'created_at' | 'modified_at'>) => void;
  onUpdateStudent: (
    originalStudentId: string,
    student: Omit<StudentReport, 'created_at' | 'modified_at'>
  ) => void;
}

export function AdminPanel({
  isLoggedIn,
  onLogin,
  onLogout,
  onNavigateHome,
  attendanceRecords,
  students,
  onAddStudent,
  onUpdateStudent,
}: AdminPanelProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [showAddStudentForm, setShowAddStudentForm] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [studentName, setStudentName] = useState('');
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [selectedImageNames, setSelectedImageNames] = useState<string[]>([]);
  const [isSavingStudent, setIsSavingStudent] = useState(false);
  const [studentError, setStudentError] = useState('');

  const handleLogin = (e: FormEvent<HTMLFormElement>) => {
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

  const readFileAsDataUrl = (file: File) => {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
      reader.onerror = () => reject(new Error(`Unable to read ${file.name}`));
      reader.readAsDataURL(file);
    });
  };

  const resetStudentForm = () => {
    setEditingStudentId(null);
    setStudentName('');
    setSelectedImages([]);
    setSelectedImageNames([]);
    setStudentError('');
  };

  const beginEditStudent = (student: StudentReport) => {
    setEditingStudentId(student.studentId);
    setStudentName(student.studentName);
    setSelectedImages(student.images);
    setSelectedImageNames(student.images.map((_, index) => `Existing image ${index + 1}`));
    setStudentError('');
    setShowAddStudentForm(true);
  };

  const handleStudentImagesChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);

    if (files.length === 0) {
      setSelectedImages([]);
      setSelectedImageNames([]);
      return;
    }

    try {
      const imageSources = await Promise.all(files.map((file) => readFileAsDataUrl(file)));
      setSelectedImages(imageSources);
      setSelectedImageNames(files.map((file) => file.name));
      setStudentError('');
    } catch (error) {
      console.error('Failed to read student images:', error);
      setStudentError('Unable to read one or more images. Please try again.');
    }
  };

  const handleAddStudent = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStudentError('');

    const trimmedStudentName = studentName.trim();

    if (!trimmedStudentName) {
      setStudentError('Student name is required.');
      return;
    }

    if (selectedImages.length === 0) {
      setStudentError('Please upload at least one clear image of the student.');
      return;
    }

    try {
      setIsSavingStudent(true);
      await loadFaceRecognitionModels();
      const descriptors = await extractFaceDescriptorsFromImages(selectedImages);

      if (descriptors.length === 0) {
        setStudentError('No face could be detected in the uploaded images. Please try clearer photos.');
        return;
      }

      const savedStudentId = await invoke<string>('add_student', {
        studentName: trimmedStudentName,
        images: selectedImages,
      });

      const payload = {
        studentId: savedStudentId,
        studentName: trimmedStudentName,
        images: selectedImages,
        descriptors,
      };

      if (editingStudentId) {
        onUpdateStudent(editingStudentId, payload);
      } else {
        onAddStudent(payload);
      }

      resetStudentForm();
      setShowAddStudentForm(false);
    } catch (error) {
      console.error('Failed to add student:', error);
      setStudentError('Unable to add the student right now. Please try again.');
    } finally {
      setIsSavingStudent(false);
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
  const totalStudents = students.length;
  const presentStudents = attendanceRecords.filter(r => r.status === 'present').length;
  const attendanceRate = totalStudents > 0 ? Math.round((presentStudents / totalStudents) * 100) : 0;

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
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <div>
                  <CardTitle>Student Management</CardTitle>
                  <p className="text-sm text-gray-600 mt-1">Add students with their images so face recognition can learn them later.</p>
                </div>
                <Button onClick={() => setShowAddStudentForm((current) => !current)}>
                  {showAddStudentForm ? 'Close Form' : 'Add New Student'}
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {showAddStudentForm && (
                    <Card className="border-dashed bg-gray-50/80">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Upload className="h-5 w-5" />
                          {editingStudentId ? 'Edit Student' : 'Add Student'}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <form onSubmit={handleAddStudent} className="space-y-5">
                          <div className="space-y-2">
                            <Label htmlFor="studentName">Student Name</Label>
                            <Input
                              id="studentName"
                              value={studentName}
                              onChange={(event) => setStudentName(event.target.value)}
                              placeholder="Enter student name"
                              required
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="studentImages">Student Images</Label>
                              <Input id="studentImages" type="file" accept="image/*" multiple onChange={handleStudentImagesChange} />
                            <p className="text-xs text-gray-500">
                              Upload 1 or more clear photos of the student. These images are used to extract face descriptors.
                            </p>
                          </div>

                          {selectedImages.length > 0 && (
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-medium text-gray-700">
                                  Selected Images ({selectedImages.length})
                                </p>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    resetStudentForm();
                                  }}
                                >
                                  <X className="h-4 w-4 mr-2" />
                                  Clear
                                </Button>
                              </div>

                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {selectedImages.map((imageSource, index) => (
                                  <div key={`${selectedImageNames[index] ?? 'student-image'}-${index}`} className="rounded-lg border bg-white overflow-hidden">
                                    <img
                                      src={imageSource}
                                      alt={selectedImageNames[index] ?? `Student image ${index + 1}`}
                                      className="h-28 w-full object-cover"
                                    />
                                    <div className="p-2">
                                      <p className="text-xs text-gray-600 truncate">
                                        {selectedImageNames[index] ?? `Image ${index + 1}`}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {studentError && (
                            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                              {studentError}
                            </div>
                          )}

                          <div className="flex flex-wrap gap-3">
                            <Button type="submit" disabled={isSavingStudent}>
                              {isSavingStudent ? 'Saving Student...' : editingStudentId ? 'Update Student' : 'Save Student'}
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => {
                                resetStudentForm();
                                setShowAddStudentForm(false);
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </form>
                      </CardContent>
                    </Card>
                  )}

                  <div className="flex justify-between items-center gap-4">
                    <Input placeholder="Search students..." className="max-w-sm" />
                    <Badge variant="outline">{students.length} enrolled</Badge>
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student ID</TableHead>
                        <TableHead>Student Name</TableHead>
                        <TableHead>Images</TableHead>
                        <TableHead>created_at</TableHead>
                        <TableHead>modified_at</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {students.map((student) => (
                        <TableRow key={student.studentId}>
                          <TableCell>{student.studentId}</TableCell>
                          <TableCell>{student.studentName}</TableCell>
                          <TableCell>
                            {student.images.length > 0 ? (
                              <div className="flex items-center gap-2">
                                <div className="flex -space-x-2">
                                  {student.images.slice(0, 3).map((imageSource, index) => (
                                    <img
                                      key={`${student.studentId}-image-${index}`}
                                      src={imageSource}
                                      alt={`${student.studentName} ${index + 1}`}
                                      className="h-10 w-10 rounded-full border-2 border-white object-cover"
                                    />
                                  ))}
                                </div>
                                <Badge variant="secondary">{student.images.length} photo{student.images.length === 1 ? '' : 's'}</Badge>
                              </div>
                            ) : (
                              <Badge variant="outline">No images</Badge>
                            )}
                          </TableCell>
                          <TableCell>{student.created_at}</TableCell>
                          <TableCell>{student.modified_at}</TableCell>
                          <TableCell>
                            <Button variant="outline" size="sm" onClick={() => beginEditStudent(student)}>
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
                      <TableHead>Confidence</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendanceRecords.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>{record.studentName}</TableCell>
                        <TableCell>{record.timestamp.split(' ')[0]}</TableCell>
                        <TableCell>{record.timestamp.split(' ')[1]}</TableCell>
                        <TableCell>{record.confidence}</TableCell>
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