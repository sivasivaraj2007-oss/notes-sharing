import React, { useState, useEffect, useId } from 'react';
import {
  BookOpen,
  Download,
  Trash2,
  Upload,
  Search,
  Filter,
  LogOut,
  User,
  Calendar,
  Eye,
  EyeOff,
  FileText,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  FolderCheck,
  GraduationCap,
  FileCode,
  X,
  Copy,
  Check,
  ChevronDown,
  ShieldCheck,
  Clock
} from 'lucide-react';

interface Student {
  id: number;
  register_number: string;
  student_name: string;
  dob?: string;
  department: string;
  year: number;
  semester: number;
}

interface Note {
  id: number;
  title: string;
  subject: string;
  department: string;
  year: number;
  semester: number;
  description: string;
  file_path: string;
  original_filename: string;
  file_size: number;
  file_size_formatted?: string;
  uploaded_by: string;
  author_name: string;
  uploaded_at: string;
}

interface SourceFile {
  path: string;
  name: string;
  content: string;
}

const SAMPLE_STUDENTS = [
  { reg: '921021104001', name: 'Aravind Kumar', dob: '2003-05-14', dept: 'Computer Science', yr: 3, sem: 5 },
  { reg: '921021104002', name: 'Priya Raman', dob: '2004-08-22', dept: 'Information Technology', yr: 2, sem: 4 },
  { reg: '921021104003', name: 'Rohan Sharma', dob: '2002-11-09', dept: 'Electronics and Comm', yr: 4, sem: 7 },
  { reg: '921021104004', name: 'Sneha Patel', dob: '2003-01-30', dept: 'Mechanical Engineering', yr: 3, sem: 6 },
];

export default function App() {
  // Session & Auth state
  const [currentUser, setCurrentUser] = useState<Student | null>(null);
  const [authToken, setAuthToken] = useState<string>(() => localStorage.getItem('sn_token') || '');
  const [authLoading, setAuthLoading] = useState<boolean>(true);

  // Login form state
  const [loginRegNo, setLoginRegNo] = useState<string>('');
  const [loginDob, setLoginDob] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');
  const [showDob, setShowDob] = useState<boolean>(false);
  const [showAdvancedAuth, setShowAdvancedAuth] = useState<boolean>(false);
  const [loginSubmitting, setLoginSubmitting] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string>('');
  const [authSuccess, setAuthSuccess] = useState<string>('');

  // Dashboard notes state
  const [notes, setNotes] = useState<Note[]>([]);
  const [notesLoading, setNotesLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [deptFilter, setDeptFilter] = useState<string>('All');
  const [yearFilter, setYearFilter] = useState<string>('All');
  const [semesterFilter, setSemesterFilter] = useState<string>('All');
  const [onlyMyUploads, setOnlyMyUploads] = useState<boolean>(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Upload modal state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  const [uploadTitle, setUploadTitle] = useState<string>('');
  const [uploadSubject, setUploadSubject] = useState<string>('');
  const [uploadDept, setUploadDept] = useState<string>('');
  const [uploadYear, setUploadYear] = useState<string>('1');
  const [uploadSemester, setUploadSemester] = useState<string>('1');
  const [uploadDescription, setUploadDescription] = useState<string>('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadSubmitting, setUploadSubmitting] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string>('');

  // Delete modal state
  const [deleteTargetNote, setDeleteTargetNote] = useState<Note | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState<boolean>(false);

  // Source files viewer modal
  const [isCodeModalOpen, setIsCodeModalOpen] = useState<boolean>(false);
  const [sourceFiles, setSourceFiles] = useState<SourceFile[]>([]);
  const [selectedFileIndex, setSelectedFileIndex] = useState<number>(0);
  const [codeCopied, setCodeCopied] = useState<boolean>(false);

  // Check active session on load
  useEffect(() => {
    checkSession();
  }, [authToken]);

  // Load notes whenever authenticated user or filters change
  useEffect(() => {
    if (currentUser) {
      loadNotes();
    }
  }, [currentUser, searchQuery, deptFilter, yearFilter, semesterFilter, onlyMyUploads]);

  // Load Python Flask source files for code drawer
  useEffect(() => {
    fetch('/api/source-files')
      .then(res => res.json())
      .then(data => {
        if (data.files && data.files.length > 0) {
          setSourceFiles(data.files);
        }
      })
      .catch(() => {});
  }, []);

  const getAuthHeaders = (): Record<string, string> => {
    const headers: Record<string, string> = {};
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }
    return headers;
  };

  const checkSession = async () => {
    try {
      const res = await fetch('/api/me', {
        headers: getAuthHeaders(),
        credentials: 'same-origin',
      });
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated && data.student) {
          setCurrentUser(data.student);
          // Set initial default upload department to match student's dept
          if (!uploadDept) setUploadDept(data.student.department);
          if (uploadYear === '1') setUploadYear(String(data.student.year));
          if (uploadSemester === '1') setSemesterFilter(String(data.student.semester));
        } else {
          setCurrentUser(null);
        }
      } else {
        setCurrentUser(null);
      }
    } catch {
      setCurrentUser(null);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');

    const cleanReg = loginRegNo.trim().toUpperCase();
    const cleanDob = loginDob.trim();
    const cleanPass = loginPassword.trim();

    if (!cleanReg) {
      setAuthError('Please enter your institutional Register Number.');
      return;
    }

    if (!cleanDob && !cleanPass) {
      setAuthError('Please enter your Date of Birth (DOB) or password to authenticate.');
      return;
    }

    setLoginSubmitting(true);

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          register_number: cleanReg,
          dob: cleanDob,
          password: cleanPass
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed. Please check your credentials.');
      }

      setAuthSuccess(`Welcome, ${data.student.student_name}! Redirecting to dashboard...`);
      if (data.token) {
        localStorage.setItem('sn_token', data.token);
        setAuthToken(data.token);
      }
      setCurrentUser(data.student);
      setUploadDept(data.student.department);
      setUploadYear(String(data.student.year));
      setUploadSemester(String(data.student.semester));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid credentials. Please verify your details.';
      setAuthError(msg);
    } finally {
      setLoginSubmitting(false);
    }
  };

  const handleQuickDemoSelect = (sample: typeof SAMPLE_STUDENTS[0]) => {
    setLoginRegNo(sample.reg);
    setLoginDob(sample.dob);
    setLoginPassword('Student@123');
    setAuthError('');
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/logout', {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'same-origin'
      });
    } catch {
      // Ignore network errors on logout
    }
    localStorage.removeItem('sn_token');
    setAuthToken('');
    setCurrentUser(null);
    setNotes([]);
    setFeedbackMessage({ text: 'You have been safely signed out.', type: 'info' });
  };

  const loadNotes = async () => {
    setNotesLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.append('search', searchQuery.trim());
      if (deptFilter !== 'All') params.append('department', deptFilter);
      if (yearFilter !== 'All') params.append('year', yearFilter);
      if (semesterFilter !== 'All') params.append('semester', semesterFilter);
      if (onlyMyUploads) params.append('my_uploads', 'true');

      const res = await fetch(`/api/notes?${params.toString()}`, {
        headers: getAuthHeaders(),
        credentials: 'same-origin',
      });

      if (res.status === 401) {
        setCurrentUser(null);
        return;
      }

      if (!res.ok) {
        throw new Error('Failed to load notes');
      }

      const data = await res.json();
      setNotes(data);
    } catch (err) {
      console.error(err);
    } finally {
      setNotesLoading(false);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError('');

    if (!uploadTitle.trim() || !uploadSubject.trim() || !uploadDept || !uploadYear || !uploadSemester) {
      setUploadError('Please fill in all mandatory fields.');
      return;
    }

    if (!uploadFile) {
      setUploadError('Please select a valid PDF file.');
      return;
    }

    if (!uploadFile.name.toLowerCase().endsWith('.pdf') && uploadFile.type !== 'application/pdf') {
      setUploadError('Invalid format. Only PDF files are permitted.');
      return;
    }

    if (uploadFile.size > 16 * 1024 * 1024) {
      setUploadError('File size exceeds the 16 MB limit.');
      return;
    }

    setUploadSubmitting(true);
    const formData = new FormData();
    formData.append('title', uploadTitle.trim());
    formData.append('subject', uploadSubject.trim());
    formData.append('department', uploadDept);
    formData.append('year', uploadYear);
    formData.append('semester', uploadSemester);
    formData.append('description', uploadDescription.trim());
    formData.append('file', uploadFile);

    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'same-origin',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to upload note.');
      }

      // Reset form & close modal
      setUploadTitle('');
      setUploadSubject('');
      setUploadDescription('');
      setUploadFile(null);
      setIsUploadModalOpen(false);

      setFeedbackMessage({
        text: `Note "${data.note.title}" uploaded and saved to MySQL database successfully!`,
        type: 'success'
      });

      await loadNotes();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed.';
      setUploadError(msg);
    } finally {
      setUploadSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTargetNote) return;
    setDeleteSubmitting(true);

    try {
      const res = await fetch(`/api/notes/${deleteTargetNote.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
        credentials: 'same-origin'
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete note');
      }

      setFeedbackMessage({
        text: `Note "${deleteTargetNote.title}" removed permanently from MySQL and file storage.`,
        type: 'success'
      });
      setDeleteTargetNote(null);
      await loadNotes();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error deleting note';
      alert(msg);
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const copyCurrentCode = () => {
    if (sourceFiles[selectedFileIndex]) {
      navigator.clipboard.writeText(sourceFiles[selectedFileIndex].content);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    }
  };

  const myUploadsCount = currentUser
    ? notes.filter(n => n.uploaded_by === currentUser.register_number).length
    : 0;

  // Render initial loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-600 text-sm font-medium">Verifying student session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 flex flex-col font-sans selection:bg-blue-100">
      
      {/* Top Header Navbar */}
      <header className="bg-blue-800 text-white shadow-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-700/80 flex items-center justify-center border border-blue-600/60 shadow-inner">
              <GraduationCap className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight tracking-tight flex items-center gap-2">
                Campus Notes Sharing Portal
              </h1>
              <p className="text-xs text-blue-200">MySQL &bull; Flask-Login &bull; RESTful Connected Architecture</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            
            {/* View Python/MySQL Code Drawer Trigger */}
            <button
              onClick={() => setIsCodeModalOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-600 text-xs font-semibold text-blue-100 flex items-center gap-1.5 transition border border-blue-600 shadow-sm"
              title="Inspect Python Flask and MySQL codebase"
            >
              <FileCode className="w-4 h-4 text-amber-300" />
              <span className="hidden sm:inline">Flask &amp; MySQL Source</span>
            </button>

            {currentUser && (
              <>
                {/* Upload Button */}
                <button
                  onClick={() => setIsUploadModalOpen(true)}
                  className="px-3.5 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-900 text-xs font-bold flex items-center gap-1.5 transition shadow"
                >
                  <Upload className="w-4 h-4" />
                  <span>Upload PDF</span>
                </button>

                {/* Profile Pill */}
                <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-blue-900/60 rounded-full border border-blue-700 text-xs">
                  <User className="w-3.5 h-3.5 text-blue-300" />
                  <span className="font-semibold text-white">{currentUser.student_name}</span>
                  <span className="text-blue-300">({currentUser.register_number})</span>
                </div>

                {/* Sign Out Button */}
                <button
                  onClick={handleLogout}
                  className="p-1.5 rounded-lg hover:bg-red-600/80 text-blue-200 hover:text-white transition flex items-center gap-1 text-xs"
                  title="Sign out of portal"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Sign Out</span>
                </button>
              </>
            )}

          </div>

        </div>
      </header>

      {/* Main App Body */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">

        {/* Global Feedback Banner */}
        {feedbackMessage && (
          <div className={`mb-6 p-4 rounded-xl flex items-center justify-between shadow-sm border ${
            feedbackMessage.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
            feedbackMessage.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-800' :
            'bg-blue-50 border-blue-200 text-blue-800'
          }`}>
            <div className="flex items-center gap-3">
              {feedbackMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" /> : <AlertCircle className="w-5 h-5 text-blue-600 shrink-0" />}
              <span className="text-sm font-medium">{feedbackMessage.text}</span>
            </div>
            <button
              onClick={() => setFeedbackMessage(null)}
              className="text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* PAGE 1: STUDENT LOGIN (Rendered when currentUser is null)           */}
        {/* ------------------------------------------------------------------ */}
        {!currentUser ? (
          <div className="max-w-md mx-auto my-8">
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200/80 overflow-hidden">
              
              {/* Card Header Banner */}
              <div className="bg-gradient-to-r from-blue-800 to-indigo-900 p-6 text-white text-center relative">
                <div className="w-14 h-14 bg-white/10 backdrop-blur rounded-2xl flex items-center justify-center mx-auto mb-3 border border-white/20">
                  <GraduationCap className="w-8 h-8 text-amber-300" />
                </div>
                <h2 className="text-xl font-bold">Student Sign In</h2>
                <p className="text-xs text-blue-200 mt-1">Page 1: Student Login (`login.html`)</p>
              </div>

              {/* Login Form Body */}
              <div className="p-6 sm:p-8">

                {authError && (
                  <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{authError}</span>
                  </div>
                )}

                {authSuccess && (
                  <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{authSuccess}</span>
                  </div>
                )}

                <form onSubmit={handleLogin} className="space-y-4">
                  
                  {/* Register Number Field */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Student Register Number <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <User className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        value={loginRegNo}
                        onChange={(e) => setLoginRegNo(e.target.value)}
                        placeholder="e.g. 921021104001"
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-600 focus:bg-white focus:outline-none transition font-mono uppercase"
                        required
                      />
                    </div>
                  </div>

                  {/* Date of Birth (DOB) Field with Show/Hide Option */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-semibold text-slate-700">
                        Date of Birth (DOB) <span className="text-rose-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowDob(!showDob)}
                        className="text-xs text-blue-700 hover:text-blue-900 font-medium flex items-center gap-1 focus:outline-none"
                      >
                        {showDob ? (
                          <>
                            <EyeOff className="w-3.5 h-3.5" />
                            <span>Hide</span>
                          </>
                        ) : (
                          <>
                            <Eye className="w-3.5 h-3.5" />
                            <span>Show</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <input
                        type={showDob ? 'text' : 'password'}
                        value={loginDob}
                        onChange={(e) => setLoginDob(e.target.value)}
                        placeholder="YYYY-MM-DD (e.g. 2003-05-14)"
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-600 focus:bg-white focus:outline-none transition font-mono"
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Format: <code className="text-slate-700 font-semibold">YYYY-MM-DD</code>
                    </p>
                  </div>

                  {/* Advanced Password toggle */}
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => setShowAdvancedAuth(!showAdvancedAuth)}
                      className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1 focus:outline-none"
                    >
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAdvancedAuth ? 'rotate-180' : ''}`} />
                      <span>Optional: Sign in with password (Student@123)</span>
                    </button>

                    {showAdvancedAuth && (
                      <div className="mt-2">
                        <input
                          type="password"
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          placeholder="Password (Default: Student@123)"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none"
                        />
                      </div>
                    )}
                  </div>

                  {/* Login Button */}
                  <button
                    type="submit"
                    disabled={loginSubmitting}
                    className="w-full py-2.5 px-4 bg-blue-700 hover:bg-blue-800 disabled:bg-blue-400 text-white font-semibold rounded-xl text-sm shadow-md transition flex items-center justify-center gap-2 mt-4"
                  >
                    {loginSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Authenticating with MySQL...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4 text-blue-200" />
                        <span>Sign In to Dashboard</span>
                      </>
                    )}
                  </button>

                </form>

                {/* Quick 1-Click Demo Accounts Selector */}
                <div className="mt-6 pt-5 border-t border-slate-200">
                  <div className="text-center mb-3">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Demo Student Accounts
                    </span>
                    <p className="text-[11px] text-slate-400">Click any student to auto-populate credentials:</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {SAMPLE_STUDENTS.map((sample) => (
                      <button
                        key={sample.reg}
                        type="button"
                        onClick={() => handleQuickDemoSelect(sample)}
                        className={`p-2.5 rounded-xl border text-left transition ${
                          loginRegNo === sample.reg
                            ? 'border-blue-600 bg-blue-50/80 ring-2 ring-blue-600/20'
                            : 'border-slate-200 hover:border-blue-300 bg-slate-50/70 hover:bg-white'
                        }`}
                      >
                        <div className="font-semibold text-xs text-slate-800 truncate">{sample.name}</div>
                        <div className="text-[11px] text-blue-700 font-mono">{sample.reg}</div>
                        <div className="text-[10px] text-slate-500 truncate mt-0.5">{sample.dept} (Yr {sample.yr})</div>
                      </button>
                    ))}
                  </div>
                </div>

              </div>

              {/* Card Footer */}
              <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 text-center">
                <p className="text-[11px] text-slate-500">
                  Protected with Flask session authentication and hashed password verification
                </p>
              </div>

            </div>
          </div>
        ) : (
          /* ------------------------------------------------------------------ */
          /* PAGE 2: STUDENT NOTES DASHBOARD (`dashboard.html`)                 */
          /* ------------------------------------------------------------------ */
          <div className="space-y-6">

            {/* Welcome Banner Card */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold mb-2">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Active Authenticated Session</span>
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                    Welcome back, <span className="text-blue-700">{currentUser.student_name}</span>!
                  </h2>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mt-1">
                    <span>Reg No: <strong className="text-slate-800 font-mono">{currentUser.register_number}</strong></span>
                    <span>&bull;</span>
                    <span>Department: <strong className="text-slate-800">{currentUser.department}</strong></span>
                    <span>&bull;</span>
                    <span>Year: <strong className="text-slate-800">{currentUser.year}</strong> (Sem {currentUser.semester})</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={loadNotes}
                    className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition"
                    title="Reload notes from MySQL"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${notesLoading ? 'animate-spin' : ''}`} />
                    <span>Refresh</span>
                  </button>
                  <button
                    onClick={() => setIsUploadModalOpen(true)}
                    className="px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold flex items-center gap-1.5 transition shadow"
                  >
                    <Upload className="w-4 h-4 text-amber-300" />
                    <span>Upload Notes</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Filter & Search Toolbar */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-200 space-y-4">
              
              {/* Top View Toggle: All Notes vs My Uploads */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex gap-2">
                  <button
                    onClick={() => setOnlyMyUploads(false)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                      !onlyMyUploads
                        ? 'bg-blue-700 text-white shadow-sm'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>All Repository Notes</span>
                  </button>
                  <button
                    onClick={() => setOnlyMyUploads(true)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                      onlyMyUploads
                        ? 'bg-blue-700 text-white shadow-sm'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <FolderCheck className="w-3.5 h-3.5" />
                    <span>My Uploads ({myUploadsCount})</span>
                  </button>
                </div>

                <span className="text-xs text-slate-400 hidden sm:inline">
                  Showing {notes.length} note{notes.length === 1 ? '' : 's'}
                </span>
              </div>

              {/* Filters grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
                
                {/* Search Bar */}
                <div className="lg:col-span-4 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Search className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by title or subject (e.g. Java, DBMS)..."
                    className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-600 focus:bg-white focus:outline-none transition"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Department Filter */}
                <div className="lg:col-span-3">
                  <select
                    value={deptFilter}
                    onChange={(e) => setDeptFilter(e.target.value)}
                    className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none transition"
                  >
                    <option value="All">All Departments</option>
                    <option value="Computer Science">Computer Science</option>
                    <option value="Information Technology">Information Technology</option>
                    <option value="Electronics and Comm">Electronics and Comm</option>
                    <option value="Electrical & Electronics">Electrical &amp; Electronics</option>
                    <option value="Mechanical Engineering">Mechanical Engineering</option>
                    <option value="Civil Engineering">Civil Engineering</option>
                  </select>
                </div>

                {/* Year Filter */}
                <div className="lg:col-span-2">
                  <select
                    value={yearFilter}
                    onChange={(e) => setYearFilter(e.target.value)}
                    className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none transition"
                  >
                    <option value="All">All Years</option>
                    <option value="1">Year 1</option>
                    <option value="2">Year 2</option>
                    <option value="3">Year 3</option>
                    <option value="4">Year 4</option>
                  </select>
                </div>

                {/* Semester Filter */}
                <div className="lg:col-span-2">
                  <select
                    value={semesterFilter}
                    onChange={(e) => setSemesterFilter(e.target.value)}
                    className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none transition"
                  >
                    <option value="All">All Semesters</option>
                    <option value="1">Semester 1</option>
                    <option value="2">Semester 2</option>
                    <option value="3">Semester 3</option>
                    <option value="4">Semester 4</option>
                    <option value="5">Semester 5</option>
                    <option value="6">Semester 6</option>
                    <option value="7">Semester 7</option>
                    <option value="8">Semester 8</option>
                  </select>
                </div>

                {/* Reset Filters button */}
                <div className="lg:col-span-1">
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setDeptFilter('All');
                      setYearFilter('All');
                      setSemesterFilter('All');
                      setOnlyMyUploads(false);
                    }}
                    className="w-full py-2 px-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-semibold flex items-center justify-center transition"
                    title="Reset all filters"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>

              </div>

            </div>

            {/* Notes Grid */}
            {notesLoading ? (
              <div className="py-16 text-center">
                <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                <p className="text-xs text-slate-500">Querying MySQL database for notes...</p>
              </div>
            ) : notes.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm">
                <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-400">
                  <FileText className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-slate-800">No notes found</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                  No academic documents matched your selected search criteria. Try modifying the filters or upload a new PDF.
                </p>
                <button
                  onClick={() => setIsUploadModalOpen(true)}
                  className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-xl shadow transition inline-flex items-center gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload the First Note</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {notes.map((note) => {
                  const isOwner = currentUser && note.uploaded_by === currentUser.register_number;

                  return (
                    <div
                      key={note.id}
                      className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
                    >
                      <div>
                        {/* Top Department & Badges */}
                        <div className="flex items-center justify-between gap-2 mb-2.5">
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-100 truncate">
                            {note.department}
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                              Y{note.year} &bull; S{note.semester}
                            </span>
                            {isOwner && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                My Upload
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Note Title */}
                        <h3 className="font-bold text-sm text-slate-900 group-hover:text-blue-700 transition line-clamp-2 leading-snug">
                          {note.title}
                        </h3>

                        {/* Subject */}
                        <p className="text-xs font-semibold text-blue-600 mt-1 flex items-center gap-1">
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>{note.subject}</span>
                        </p>

                        {/* Description */}
                        <p className="text-xs text-slate-600 mt-2 line-clamp-2 leading-relaxed">
                          {note.description || 'No additional syllabus description provided.'}
                        </p>

                        {/* PDF File Info box */}
                        <div className="mt-3.5 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-500 space-y-1">
                          <div className="flex items-center justify-between font-mono text-[11px]">
                            <span className="truncate flex items-center gap-1.5 text-slate-700 font-medium">
                              <FileText className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                              <span className="truncate" title={note.original_filename}>{note.original_filename}</span>
                            </span>
                            <span className="shrink-0 text-slate-400 font-semibold">{note.file_size_formatted || 'PDF'}</span>
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-200/60">
                            <span>By: <strong className="text-slate-600">{note.author_name}</strong></span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>{note.uploaded_at}</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Card Actions Footer */}
                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
                        <a
                          href={`/api/notes/${note.id}/download`}
                          className="flex-1 py-1.5 px-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition border border-blue-200"
                          download
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download PDF</span>
                        </a>

                        {isOwner && (
                          <button
                            onClick={() => setDeleteTargetNote(note)}
                            className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 transition border border-rose-200"
                            title="Delete your uploaded note from MySQL"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                    </div>
                  );
                })}
              </div>
            )}

          </div>
        )}

      </div>

      {/* ------------------------------------------------------------------ */}
      {/* MODAL: UPLOAD PDF NOTE                                             */}
      {/* ------------------------------------------------------------------ */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in duration-200">
            
            {/* Modal Header */}
            <div className="bg-blue-800 text-white p-4 sm:p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-700 flex items-center justify-center text-amber-300">
                  <Upload className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Upload Academic PDF Note</h3>
                  <p className="text-[11px] text-blue-200">Saved to MySQL database &amp; file storage</p>
                </div>
              </div>
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="text-blue-200 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleUploadSubmit} className="p-5 sm:p-6 space-y-4">
              
              {uploadError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              {/* Title & Subject */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Note Title <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    placeholder="e.g. Unit 1 to 5 Complete"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Subject Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={uploadSubject}
                    onChange={(e) => setUploadSubject(e.target.value)}
                    placeholder="e.g. Operating Systems"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    required
                  />
                </div>
              </div>

              {/* Department, Year, Semester */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Department</label>
                  <select
                    value={uploadDept}
                    onChange={(e) => setUploadDept(e.target.value)}
                    className="w-full px-2 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    required
                  >
                    <option value="Computer Science">Computer Science</option>
                    <option value="Information Technology">Information Tech</option>
                    <option value="Electronics and Comm">ECE</option>
                    <option value="Electrical & Electronics">EEE</option>
                    <option value="Mechanical Engineering">Mechanical</option>
                    <option value="Civil Engineering">Civil</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Year</label>
                  <select
                    value={uploadYear}
                    onChange={(e) => setUploadYear(e.target.value)}
                    className="w-full px-2 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    required
                  >
                    <option value="1">Year 1</option>
                    <option value="2">Year 2</option>
                    <option value="3">Year 3</option>
                    <option value="4">Year 4</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Semester</label>
                  <select
                    value={uploadSemester}
                    onChange={(e) => setUploadSemester(e.target.value)}
                    className="w-full px-2 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    required
                  >
                    <option value="1">Sem 1</option>
                    <option value="2">Sem 2</option>
                    <option value="3">Sem 3</option>
                    <option value="4">Sem 4</option>
                    <option value="5">Sem 5</option>
                    <option value="6">Sem 6</option>
                    <option value="7">Sem 7</option>
                    <option value="8">Sem 8</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description / Syllabus Topics Covered
                </label>
                <textarea
                  value={uploadDescription}
                  onChange={(e) => setUploadDescription(e.target.value)}
                  rows={2}
                  placeholder="Key topics, exam questions, formulas, or author credits..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              {/* PDF File Picker */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select PDF Document <span className="text-rose-500">*</span>
                </label>
                <div className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-4 text-center bg-slate-50 transition cursor-pointer relative">
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setUploadFile(e.target.files[0]);
                      }
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    required
                  />
                  <FileText className="w-8 h-8 text-rose-500 mx-auto mb-1" />
                  {uploadFile ? (
                    <div>
                      <p className="text-xs font-bold text-slate-800 truncate">{uploadFile.name}</p>
                      <p className="text-[10px] text-slate-500">{(uploadFile.size / 1024).toFixed(1)} KB &bull; Click to change</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs font-semibold text-slate-700">Click or drag &amp; drop PDF here</p>
                      <p className="text-[10px] text-slate-400">PDF documents only &bull; Max 16 MB</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploadSubmitting}
                  className="px-5 py-2 bg-blue-700 hover:bg-blue-800 disabled:bg-blue-400 text-white rounded-xl text-xs font-bold shadow transition flex items-center gap-1.5"
                >
                  {uploadSubmitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Saving to MySQL...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5 text-amber-300" />
                      <span>Upload &amp; Save Note</span>
                    </>
                  )}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* MODAL: DELETE CONFIRMATION                                         */}
      {/* ------------------------------------------------------------------ */}
      {deleteTargetNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-sm p-6 text-center animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 text-base mb-1">Delete Note</h3>
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              Are you sure you want to permanently delete <strong className="text-slate-800">"{deleteTargetNote.title}"</strong>? 
              This will remove the record from MySQL and delete the PDF file.
            </p>

            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setDeleteTargetNote(null)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleteSubmitting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow transition"
              >
                {deleteSubmitting ? 'Deleting...' : 'Yes, Delete Note'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* MODAL: PYTHON FLASK & MYSQL SOURCE CODE EXPLORER                   */}
      {/* ------------------------------------------------------------------ */}
      {isCodeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
          <div className="bg-slate-900 rounded-2xl shadow-2xl border border-slate-800 w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden text-slate-200">
            
            {/* Header */}
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <FileCode className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="font-bold text-sm text-white">Deliverable: Flask + MySQL Backend &amp; Bootstrap Code</h3>
                  <p className="text-[11px] text-slate-400">All requested project structure files: app.py, config.py, schema.sql, templates, static JS/CSS</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={copyCurrentCode}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition border border-slate-700"
                >
                  {codeCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{codeCopied ? 'Copied!' : 'Copy Code'}</span>
                </button>
                <button
                  onClick={() => setIsCodeModalOpen(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Code Explorer Body */}
            <div className="flex-1 flex overflow-hidden">
              
              {/* Sidebar file tree */}
              <div className="w-64 bg-slate-950/70 border-r border-slate-800 p-3 overflow-y-auto space-y-1">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
                  student-notes/ Project
                </div>
                {sourceFiles.map((file, idx) => (
                  <button
                    key={file.path}
                    onClick={() => setSelectedFileIndex(idx)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-mono truncate transition flex items-center gap-2 ${
                      selectedFileIndex === idx
                        ? 'bg-blue-600/30 text-blue-300 font-semibold border border-blue-500/40'
                        : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5 shrink-0 text-slate-500" />
                    <span className="truncate">{file.path}</span>
                  </button>
                ))}
              </div>

              {/* Code viewer pane */}
              <div className="flex-1 bg-slate-900 p-4 overflow-auto font-mono text-xs text-slate-300 leading-relaxed">
                {sourceFiles[selectedFileIndex] ? (
                  <pre className="whitespace-pre overflow-x-auto selection:bg-blue-500/30">
                    <code>{sourceFiles[selectedFileIndex].content}</code>
                  </pre>
                ) : (
                  <div className="text-slate-500 italic p-4">Select a file from the left navigation tree.</div>
                )}
              </div>

            </div>

            {/* Footer with run command hint */}
            <div className="p-3 bg-slate-950 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
              <span>Run in terminal: <code className="text-emerald-400">cd student-notes && pip install -r requirements.txt && python app.py</code></span>
              <span className="text-slate-500 font-mono">student_notes_db (MySQL)</span>
            </div>

          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-auto py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Student Notes Sharing Portal &bull; Full-Stack Connected Implementation</span>
          <span className="font-mono text-[11px] text-slate-400">Auth: Flask-Login / Scrypt &bull; Database: MySQL</span>
        </div>
      </footer>

    </div>
  );
}
