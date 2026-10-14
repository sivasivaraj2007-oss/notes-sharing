import os
import uuid
from datetime import datetime, date
from flask import Flask, render_template, request, jsonify, redirect, url_for, send_from_directory, abort
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from config import Config

# Initialize Flask application
app = Flask(__name__)
app.config.from_object(Config)

# Ensure upload directory exists
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Initialize SQLAlchemy and LoginManager
db = SQLAlchemy(app)
login_manager = LoginManager(app)
login_manager.login_view = 'login_page'
login_manager.login_message = 'Please log in to access your notes dashboard.'
login_manager.login_message_category = 'warning'

# -------------------------------------------------------------
# Database Models
# -------------------------------------------------------------

class Student(UserMixin, db.Model):
    __tablename__ = 'students'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    register_number = db.Column(db.String(50), unique=True, nullable=False, index=True)
    student_name = db.Column(db.String(100), nullable=False)
    dob = db.Column(db.Date, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    department = db.Column(db.String(50), nullable=False)
    year = db.Column(db.Integer, nullable=False)
    semester = db.Column(db.Integer, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationship to notes
    notes = db.relationship('Note', backref='author', lazy='dynamic', cascade='all, delete-orphan')

    def get_id(self):
        return str(self.id)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        if not self.password_hash:
            return False
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            'id': self.id,
            'register_number': self.register_number,
            'student_name': self.student_name,
            'dob': self.dob.strftime('%Y-%m-%d') if self.dob else None,
            'department': self.department,
            'year': self.year,
            'semester': self.semester
        }


class Note(db.Model):
    __tablename__ = 'notes'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    title = db.Column(db.String(200), nullable=False, index=True)
    subject = db.Column(db.String(100), nullable=False, index=True)
    department = db.Column(db.String(50), nullable=False, index=True)
    year = db.Column(db.Integer, nullable=False)
    semester = db.Column(db.Integer, nullable=False)
    description = db.Column(db.Text, nullable=True)
    file_path = db.Column(db.String(255), nullable=False)
    original_filename = db.Column(db.String(255), nullable=False)
    file_size = db.Column(db.Integer, nullable=False)
    uploaded_by = db.Column(db.String(50), db.ForeignKey('students.register_number'), nullable=False, index=True)
    uploaded_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'subject': self.subject,
            'department': self.department,
            'year': self.year,
            'semester': self.semester,
            'description': self.description or '',
            'original_filename': self.original_filename,
            'file_size': self.file_size,
            'file_size_formatted': format_file_size(self.file_size),
            'uploaded_by': self.uploaded_by,
            'author_name': self.author.student_name if self.author else 'Unknown Student',
            'uploaded_at': self.uploaded_at.strftime('%b %d, %Y %I:%M %p') if self.uploaded_at else ''
        }


@login_manager.user_loader
def load_user(user_id):
    return db.session.get(Student, int(user_id))


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']


def format_file_size(bytes_size):
    if bytes_size < 1024:
        return f"{bytes_size} B"
    elif bytes_size < 1024 * 1024:
        return f"{bytes_size / 1024:.1f} KB"
    else:
        return f"{bytes_size / (1024 * 1024):.2f} MB"

# -------------------------------------------------------------
# Web Page HTML Routes
# -------------------------------------------------------------

@app.route('/')
def index():
    if current_user.is_authenticated:
        return redirect(url_for('dashboard_page'))
    return redirect(url_for('login_page'))


@app.route('/login')
def login_page():
    if current_user.is_authenticated:
        return redirect(url_for('dashboard_page'))
    return render_template('login.html')


@app.route('/dashboard')
@login_required
def dashboard_page():
    return render_template('dashboard.html', student=current_user)

# -------------------------------------------------------------
# RESTful API Endpoints
# -------------------------------------------------------------

@app.route('/api/login', methods=['POST'])
def api_login():
    """Validates student credentials (Register Number + DOB or Password) and creates session."""
    data = request.get_json(silent=True) or request.form
    register_number = (data.get('register_number') or '').strip().upper()
    dob_str = (data.get('dob') or '').strip()
    password = (data.get('password') or '').strip()

    if not register_number:
        return jsonify({'error': 'Student Register Number is required'}), 400

    if not dob_str and not password:
        return jsonify({'error': 'Please provide Date of Birth or Password to verify your identity'}), 400

    student = Student.query.filter_by(register_number=register_number).first()
    if not student:
        return jsonify({'error': 'Invalid Register Number or credentials'}), 401

    # Validate against DOB if provided, or against password hash
    auth_success = False
    
    if dob_str:
        try:
            # Parse standard HTML5 date format YYYY-MM-DD
            parsed_dob = datetime.strptime(dob_str, '%Y-%m-%d').date()
            if student.dob == parsed_dob:
                auth_success = True
        except ValueError:
            pass

    # If password is also provided or used as secondary secure authentication
    if password and not auth_success:
        if student.check_password(password):
            auth_success = True

    if not auth_success:
        return jsonify({'error': 'Invalid credentials. Please verify your Register Number and Date of Birth'}), 401

    # Establish authenticated session with Flask-Login
    login_user(student, remember=True)

    return jsonify({
        'message': 'Login successful',
        'student': student.to_dict()
    }), 200


@app.route('/api/me', methods=['GET'])
def api_me():
    """Checks the active session and returns authenticated student details."""
    if not current_user.is_authenticated:
        return jsonify({'authenticated': False}), 401

    return jsonify({
        'authenticated': True,
        'student': current_user.to_dict()
    }), 200


@app.route('/api/logout', methods=['POST'])
@login_required
def api_logout():
    """Logs out the student and terminates the session."""
    logout_user()
    return jsonify({'message': 'Logged out successfully'}), 200


@app.route('/api/notes', methods=['GET'])
@login_required
def api_get_notes():
    """Retrieves notes with search and filters for department, year, semester."""
    search_query = request.args.get('search', '').strip()
    department = request.args.get('department', '').strip()
    year = request.args.get('year', '').strip()
    semester = request.args.get('semester', '').strip()
    only_my_uploads = request.args.get('my_uploads', '').lower() == 'true'

    query = Note.query

    # Apply ownership filter if requested
    if only_my_uploads:
        query = query.filter_by(uploaded_by=current_user.register_number)

    # Search filter across title, subject, and description
    if search_query:
        term = f"%{search_query}%"
        query = query.filter(
            (Note.title.ilike(term)) | 
            (Note.subject.ilike(term)) | 
            (Note.description.ilike(term))
        )

    # Department filter
    if department and department != 'All':
        query = query.filter_by(department=department)

    # Year filter
    if year and year != 'All':
        try:
            query = query.filter_by(year=int(year))
        except ValueError:
            pass

    # Semester filter
    if semester and semester != 'All':
        try:
            query = query.filter_by(semester=int(semester))
        except ValueError:
            pass

    notes = query.order_by(Note.uploaded_at.desc()).all()
    return jsonify([note.to_dict() for note in notes]), 200


@app.route('/api/notes', methods=['POST'])
@login_required
def api_upload_note():
    """Uploads a PDF note and records metadata in MySQL."""
    if 'file' not in request.files:
        return jsonify({'error': 'No PDF file part in the request'}), 400

    file = request.files['file']
    if not file or file.filename == '':
        return jsonify({'error': 'No file selected for upload'}), 400

    # Ensure valid PDF extension
    if not allowed_file(file.filename):
        return jsonify({'error': 'Only PDF files (.pdf) are allowed'}), 400

    title = request.form.get('title', '').strip()
    subject = request.form.get('subject', '').strip()
    department = request.form.get('department', '').strip()
    year_str = request.form.get('year', '').strip()
    semester_str = request.form.get('semester', '').strip()
    description = request.form.get('description', '').strip()

    # Form field validations
    if not title or not subject or not department or not year_str or not semester_str:
        return jsonify({'error': 'Title, Subject, Department, Year, and Semester are all required'}), 400

    try:
        year = int(year_str)
        semester = int(semester_str)
        if year < 1 or year > 5 or semester < 1 or semester > 10:
            return jsonify({'error': 'Invalid Academic Year or Semester'}), 400
    except ValueError:
        return jsonify({'error': 'Year and Semester must be valid numbers'}), 400

    # Secure file name generation to prevent collision and path traversal
    original_filename = secure_filename(file.filename) or 'notes.pdf'
    unique_suffix = uuid.uuid4().hex[:12]
    stored_filename = f"{current_user.register_number}_{unique_suffix}_{original_filename}"
    file_path = os.path.join(app.config['UPLOAD_FOLDER'], stored_filename)

    # Save file to disk
    file.save(file_path)
    file_size = os.path.getsize(file_path)

    # Verify maximum file size limit (16 MB)
    if file_size > app.config['MAX_CONTENT_LENGTH']:
        if os.path.exists(file_path):
            os.remove(file_path)
        return jsonify({'error': 'File exceeds maximum permitted size of 16 MB'}), 400

    # Insert note record into MySQL database
    try:
        new_note = Note(
            title=title,
            subject=subject,
            department=department,
            year=year,
            semester=semester,
            description=description,
            file_path=stored_filename,
            original_filename=original_filename,
            file_size=file_size,
            uploaded_by=current_user.register_number
        )
        db.session.add(new_note)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        if os.path.exists(file_path):
            os.remove(file_path)
        return jsonify({'error': f'Failed to save note to database: {str(e)}'}), 500

    return jsonify({
        'message': 'Note uploaded successfully',
        'note': new_note.to_dict()
    }), 201


@app.route('/api/notes/<int:note_id>/download', methods=['GET'])
@login_required
def api_download_note(note_id):
    """Securely streams the PDF file to the authenticated student."""
    note = db.session.get(Note, note_id)
    if not note:
        abort(404, description="Note not found")

    file_path = os.path.join(app.config['UPLOAD_FOLDER'], note.file_path)
    if not os.path.exists(file_path):
        abort(404, description="Physical note file not found on server")

    return send_from_directory(
        directory=app.config['UPLOAD_FOLDER'],
        path=note.file_path,
        as_attachment=True,
        download_name=note.original_filename
    )


@app.route('/api/notes/<int:note_id>', methods=['DELETE'])
@login_required
def api_delete_note(note_id):
    """Deletes a note if and only if the current user is the original uploader."""
    note = db.session.get(Note, note_id)
    if not note:
        return jsonify({'error': 'Note not found'}), 404

    # Strict ownership check
    if note.uploaded_by != current_user.register_number:
        return jsonify({'error': 'Unauthorized: You can only delete notes that you uploaded'}), 403

    # Delete physical file
    file_path = os.path.join(app.config['UPLOAD_FOLDER'], note.file_path)
    if os.path.exists(file_path):
        try:
            os.remove(file_path)
        except OSError:
            pass

    # Remove database record
    try:
        db.session.delete(note)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to delete note: {str(e)}'}), 500

    return jsonify({'message': 'Note deleted successfully', 'id': note_id}), 200

# -------------------------------------------------------------
# Database Initialization & Seeding CLI
# -------------------------------------------------------------

@app.cli.command("init-db")
def init_db_command():
    """Initializes the database tables and seeds demo students."""
    with app.app_context():
        db.create_all()
        seed_sample_students()
        print("Database initialized and sample students seeded successfully.")


def seed_sample_students():
    """Populates sample student accounts for quick testing."""
    sample_students = [
        {
            'register_number': '921021104001',
            'name': 'Aravind Kumar',
            'dob': date(2003, 5, 14),
            'password': 'Student@123',
            'dept': 'Computer Science',
            'year': 3,
            'sem': 5
        },
        {
            'register_number': '921021104002',
            'name': 'Priya Raman',
            'dob': date(2004, 8, 22),
            'password': 'Student@123',
            'dept': 'Information Technology',
            'year': 2,
            'sem': 4
        },
        {
            'register_number': '921021104003',
            'name': 'Rohan Sharma',
            'dob': date(2002, 11, 9),
            'password': 'Student@123',
            'dept': 'Electronics and Comm',
            'year': 4,
            'sem': 7
        },
        {
            'register_number': '921021104004',
            'name': 'Sneha Patel',
            'dob': date(2003, 1, 30),
            'password': 'Student@123',
            'dept': 'Mechanical Engineering',
            'year': 3,
            'sem': 6
        }
    ]

    for item in sample_students:
        existing = Student.query.filter_by(register_number=item['register_number']).first()
        if not existing:
            student = Student(
                register_number=item['register_number'],
                student_name=item['name'],
                dob=item['dob'],
                department=item['dept'],
                year=item['year'],
                semester=item['sem']
            )
            student.set_password(item['password'])
            db.session.add(student)
            
    db.session.commit()


if __name__ == '__main__':
    # Auto-create tables on start if not present
    with app.app_context():
        db.create_all()
        seed_sample_students()
    app.run(host='0.0.0.0', port=5000, debug=True)
