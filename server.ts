import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const DATA_DIR = path.resolve(__dirname, '.data');
const UPLOAD_DIR = path.resolve(__dirname, 'uploads');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// Ensure storage directories exist
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// Types
interface Student {
  id: number;
  register_number: string;
  student_name: string;
  dob: string; // YYYY-MM-DD
  password_hash: string;
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

interface DB {
  students: Student[];
  notes: Note[];
  sessions: Record<string, { register_number: string; expiresAt: number }>;
}

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function createDummyPdf(filePath: string, title: string, subject: string, author: string) {
  const content = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj
4 0 obj << /Length 200 >> stream
BT
/F1 20 Tf
50 720 Td
(${title}) Tj
/F1 14 Tf
0 -30 Td
(Subject: ${subject}) Tj
0 -24 Td
(Uploaded By: ${author}) Tj
0 -30 Td
(Institutional Student Notes Portal - Academic Reference Material) Tj
ET
endstream endobj
5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000244 00000 n 
0000000495 00000 n 
trailer << /Size 6 /Root 1 0 R >>
startxref
570
%%EOF`;
  fs.writeFileSync(filePath, content, 'utf8');
}

function loadDatabase(): DB {
  if (fs.existsSync(DB_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    } catch {
      // Fallback if corrupted
    }
  }

  // Initial seed data
  const defaultPassHash = hashPassword('Student@123');
  const initialStudents: Student[] = [
    {
      id: 1,
      register_number: '921021104001',
      student_name: 'Aravind Kumar',
      dob: '2003-05-14',
      password_hash: defaultPassHash,
      department: 'Computer Science',
      year: 3,
      semester: 5
    },
    {
      id: 2,
      register_number: '921021104002',
      student_name: 'Priya Raman',
      dob: '2004-08-22',
      password_hash: defaultPassHash,
      department: 'Information Technology',
      year: 2,
      semester: 4
    },
    {
      id: 3,
      register_number: '921021104003',
      student_name: 'Rohan Sharma',
      dob: '2002-11-09',
      password_hash: defaultPassHash,
      department: 'Electronics and Comm',
      year: 4,
      semester: 7
    },
    {
      id: 4,
      register_number: '921021104004',
      student_name: 'Sneha Patel',
      dob: '2003-01-30',
      password_hash: defaultPassHash,
      department: 'Mechanical Engineering',
      year: 3,
      semester: 6
    }
  ];

  const seedNotes: Note[] = [
    {
      id: 1,
      title: 'Database Management Systems (DBMS) - Complete Units 1-5',
      subject: 'Database Management Systems',
      department: 'Computer Science',
      year: 3,
      semester: 5,
      description: 'Comprehensive handwritten & typed lecture notes covering Relational Algebra, SQL queries, Normalization (1NF to BCNF), and Transaction Concurrency.',
      file_path: 'dbms_full_notes.pdf',
      original_filename: 'DBMS_Units_1_to_5_Complete.pdf',
      file_size: 2450000,
      uploaded_by: '921021104001',
      author_name: 'Aravind Kumar',
      uploaded_at: 'Oct 10, 2026 10:30 AM'
    },
    {
      id: 2,
      title: 'Computer Networks - OSI & TCP/IP Layer Protocol Architecture',
      subject: 'Computer Networks',
      department: 'Computer Science',
      year: 3,
      semester: 5,
      description: 'Detailed diagrams for subnetting, routing algorithms (Dijkstra & Distance Vector), TCP handshakes, congestion control, and DNS protocols.',
      file_path: 'cn_osi_tcp_notes.pdf',
      original_filename: 'Computer_Networks_Reference.pdf',
      file_size: 1820000,
      uploaded_by: '921021104001',
      author_name: 'Aravind Kumar',
      uploaded_at: 'Oct 11, 2026 02:15 PM'
    },
    {
      id: 3,
      title: 'Data Structures & Algorithms - Trees, Graphs & Dynamic Programming',
      subject: 'Data Structures',
      department: 'Information Technology',
      year: 2,
      semester: 4,
      description: 'Binary Search Trees, AVL rotations, Graph traversals (BFS & DFS), Dijkstra shortest path, and classic DP problems with solutions.',
      file_path: 'dsa_trees_graphs.pdf',
      original_filename: 'DSA_Comprehensive_Guide.pdf',
      file_size: 3120000,
      uploaded_by: '921021104002',
      author_name: 'Priya Raman',
      uploaded_at: 'Oct 08, 2026 11:45 AM'
    },
    {
      id: 4,
      title: 'VLSI System Design - CMOS Inverter & Layout Rules',
      subject: 'VLSI Design',
      department: 'Electronics and Comm',
      year: 4,
      semester: 7,
      description: 'MOSFET equations, stick diagrams, lambda design rules, delay estimation using Elmore delay model, and dynamic CMOS logic circuits.',
      file_path: 'vlsi_cmos_design.pdf',
      original_filename: 'VLSI_Design_Lecture_Notes.pdf',
      file_size: 4200000,
      uploaded_by: '921021104003',
      author_name: 'Rohan Sharma',
      uploaded_at: 'Oct 09, 2026 04:00 PM'
    },
    {
      id: 5,
      title: 'Fluid Mechanics & Heat Transfer - Solved Exam Problems',
      subject: 'Fluid Mechanics',
      department: 'Mechanical Engineering',
      year: 3,
      semester: 6,
      description: 'Bernoulli principle derivations, Navier-Stokes simplified equations, boundary layer theory, and heat exchangers LMTD problems.',
      file_path: 'mech_fluid_mechanics.pdf',
      original_filename: 'Fluid_Mechanics_Solved_Problems.pdf',
      file_size: 2950000,
      uploaded_by: '921021104004',
      author_name: 'Sneha Patel',
      uploaded_at: 'Oct 07, 2026 09:20 AM'
    }
  ];

  // Create real files in UPLOAD_DIR
  seedNotes.forEach(n => {
    const p = path.join(UPLOAD_DIR, n.file_path);
    if (!fs.existsSync(p)) {
      createDummyPdf(p, n.title, n.subject, n.author_name);
    }
  });

  const db: DB = {
    students: initialStudents,
    notes: seedNotes,
    sessions: {}
  };

  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
  return db;
}

let db = loadDatabase();

function saveDatabase() {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
}

// Multer storage for uploaded PDFs
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const unique = `${Date.now()}_${crypto.randomBytes(6).toString('hex')}${ext}`;
    cb(null, unique);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 16 * 1024 * 1024 }, // 16 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  }
});

async function startServer() {
  const app = express();

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Helper to extract session student
  const getSessionStudent = (req: express.Request): Student | null => {
    let token = '';

    // Check Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }

    // Check Cookie header
    if (!token && req.headers.cookie) {
      const match = req.headers.cookie.match(/student_session=([^;]+)/);
      if (match) token = match[1];
    }

    if (!token) return null;

    const session = db.sessions[token];
    if (!session) return null;

    if (session.expiresAt < Date.now()) {
      delete db.sessions[token];
      saveDatabase();
      return null;
    }

    return db.students.find(s => s.register_number === session.register_number) || null;
  };

  // -----------------------------------------------------------
  // API Routes
  // -----------------------------------------------------------

  // Login
  app.post('/api/login', (req, res) => {
    const { register_number, dob, password } = req.body;
    const cleanReg = (register_number || '').trim().toUpperCase();
    const cleanDob = (dob || '').trim();
    const cleanPassword = (password || '').trim();

    if (!cleanReg) {
      return res.status(400).json({ error: 'Student Register Number is required' });
    }

    if (!cleanDob && !cleanPassword) {
      return res.status(400).json({ error: 'Please provide Date of Birth or Password' });
    }

    const student = db.students.find(s => s.register_number === cleanReg);
    if (!student) {
      return res.status(401).json({ error: 'Invalid Register Number or credentials' });
    }

    let authenticated = false;

    // Validate DOB
    if (cleanDob && student.dob === cleanDob) {
      authenticated = true;
    }

    // Validate Password
    if (!authenticated && cleanPassword) {
      if (student.password_hash === hashPassword(cleanPassword)) {
        authenticated = true;
      }
    }

    if (!authenticated) {
      return res.status(401).json({ error: 'Invalid credentials. Please verify your Register Number and Date of Birth' });
    }

    // Create session token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
    db.sessions[token] = { register_number: student.register_number, expiresAt };
    saveDatabase();

    // Set cookie
    res.setHeader('Set-Cookie', `student_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`);

    const { password_hash: _, ...safeStudent } = student;
    return res.json({
      message: 'Login successful',
      token,
      student: safeStudent
    });
  });

  // Me
  app.get('/api/me', (req, res) => {
    const student = getSessionStudent(req);
    if (!student) {
      return res.status(401).json({ authenticated: false });
    }

    const { password_hash: _, ...safeStudent } = student;
    return res.json({
      authenticated: true,
      student: safeStudent
    });
  });

  // Logout
  app.post('/api/logout', (req, res) => {
    let token = '';
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
    if (!token && req.headers.cookie) {
      const match = req.headers.cookie.match(/student_session=([^;]+)/);
      if (match) token = match[1];
    }
    if (token && db.sessions[token]) {
      delete db.sessions[token];
      saveDatabase();
    }

    res.setHeader('Set-Cookie', `student_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
    return res.json({ message: 'Logged out successfully' });
  });

  // Get Notes
  app.get('/api/notes', (req, res) => {
    const student = getSessionStudent(req);
    if (!student) {
      return res.status(401).json({ error: 'Unauthorized: Please log in' });
    }

    const { search, department, year, semester, my_uploads } = req.query;
    let list = [...db.notes];

    if (my_uploads === 'true') {
      list = list.filter(n => n.uploaded_by === student.register_number);
    }

    if (search && typeof search === 'string') {
      const term = search.toLowerCase();
      list = list.filter(n =>
        n.title.toLowerCase().includes(term) ||
        n.subject.toLowerCase().includes(term) ||
        (n.description && n.description.toLowerCase().includes(term))
      );
    }

    if (department && department !== 'All') {
      list = list.filter(n => n.department === department);
    }

    if (year && year !== 'All') {
      list = list.filter(n => n.year === Number(year));
    }

    if (semester && semester !== 'All') {
      list = list.filter(n => n.semester === Number(semester));
    }

    // Attach formatted file sizes
    const formattedList = list.map(n => ({
      ...n,
      file_size_formatted: n.file_size_formatted || formatFileSize(n.file_size)
    }));

    return res.json(formattedList);
  });

  // Upload Note
  app.post('/api/notes', upload.single('file'), (req, res) => {
    const student = getSessionStudent(req);
    if (!student) {
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Please select a valid PDF file' });
    }

    const { title, subject, department, year, semester, description } = req.body;

    if (!title || !subject || !department || !year || !semester) {
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({ error: 'All fields are required' });
    }

    const newId = db.notes.length > 0 ? Math.max(...db.notes.map(n => n.id)) + 1 : 1;
    const now = new Date();
    const formattedDate = now.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }) + ' ' + now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });

    const newNote: Note = {
      id: newId,
      title: title.trim(),
      subject: subject.trim(),
      department: department.trim(),
      year: Number(year),
      semester: Number(semester),
      description: (description || '').trim(),
      file_path: req.file.filename,
      original_filename: req.file.originalname,
      file_size: req.file.size,
      file_size_formatted: formatFileSize(req.file.size),
      uploaded_by: student.register_number,
      author_name: student.student_name,
      uploaded_at: formattedDate
    };

    db.notes.unshift(newNote);
    saveDatabase();

    return res.status(201).json({
      message: 'Note uploaded successfully',
      note: newNote
    });
  });

  // Download Note
  app.get('/api/notes/:id/download', (req, res) => {
    const student = getSessionStudent(req);
    if (!student) {
      return res.status(401).send('Unauthorized. Please log in first.');
    }

    const noteId = Number(req.params.id);
    const note = db.notes.find(n => n.id === noteId);

    if (!note) {
      return res.status(404).send('Note not found');
    }

    const filePath = path.join(UPLOAD_DIR, note.file_path);
    if (!fs.existsSync(filePath)) {
      // Recreate demo PDF if missing
      createDummyPdf(filePath, note.title, note.subject, note.author_name);
    }

    return res.download(filePath, note.original_filename);
  });

  // Delete Note
  app.delete('/api/notes/:id', (req, res) => {
    const student = getSessionStudent(req);
    if (!student) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const noteId = Number(req.params.id);
    const noteIndex = db.notes.findIndex(n => n.id === noteId);

    if (noteIndex === -1) {
      return res.status(404).json({ error: 'Note not found' });
    }

    const note = db.notes[noteIndex];

    // Ownership check
    if (note.uploaded_by !== student.register_number) {
      return res.status(403).json({ error: 'Unauthorized: You can only delete notes that you uploaded' });
    }

    // Delete physical file
    const filePath = path.join(UPLOAD_DIR, note.file_path);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (err) {
        console.error('File unlink error:', err);
      }
    }

    // Remove from database
    db.notes.splice(noteIndex, 1);
    saveDatabase();

    return res.json({ message: 'Note deleted successfully', id: noteId });
  });

  // Export/View Python Project Source Files
  app.get('/api/source-files', (_req, res) => {
    const baseDir = path.resolve(__dirname, 'student-notes');
    const fileList: { path: string; name: string; content: string }[] = [];

    const readRecursive = (dir: string, prefix = '') => {
      if (!fs.existsSync(dir)) return;
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
        if (entry.isDirectory()) {
          readRecursive(full, rel);
        } else if (entry.isFile() && !entry.name.endsWith('.pyc')) {
          fileList.push({
            path: rel,
            name: entry.name,
            content: fs.readFileSync(full, 'utf8')
          });
        }
      }
    };

    readRecursive(baseDir);
    return res.json({ files: fileList });
  });

  // -----------------------------------------------------------
  // Vite Integration (Dev) / Static Hosting (Prod)
  // -----------------------------------------------------------
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Student Notes Sharing Portal] Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
