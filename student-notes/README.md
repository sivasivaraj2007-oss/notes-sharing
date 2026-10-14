# Student Notes Sharing Web Application

A full-stack, secure academic notes sharing portal built with **Python (Flask, Flask-Login, Flask-SQLAlchemy)**, **MySQL**, and **Bootstrap 5**.

---

## 📁 Project Structure

```text
student-notes/
├── app.py                  # Main Flask application, routes, models & auth logic
├── config.py               # Environment configuration & MySQL connection string
├── requirements.txt        # Python pip dependencies
├── schema.sql              # MySQL DDL schema and initial seed data
├── templates/
│   ├── login.html          # Page 1: Student Login with DOB show/hide & validation
│   └── dashboard.html      # Page 2: Student Notes Dashboard with search, upload & filter
└── static/
    ├── css/
    │   └── style.css       # Custom styles, badges, and animations
    └── js/
        ├── login.js        # AJAX authentication controller
        └── dashboard.js    # Notes fetching, search, upload, download, and delete
```

---

## 🛠️ Step-by-Step Setup Guide

### Step 1: Clone or Open in VS Code
Open VS Code, press `Ctrl + \`` (or `Cmd + \``) to open the integrated terminal, and navigate to the project directory:
```bash
cd student-notes
```

### Step 2: Set Up Python Virtual Environment
```bash
# On Linux / macOS:
python3 -m venv venv
source venv/bin/activate

# On Windows (Command Prompt / PowerShell):
python -m venv venv
venv\Scripts\activate
```

### Step 3: Install Required Dependencies
```bash
pip install -r requirements.txt
```

### Step 4: Configure and Run MySQL Database

1. Ensure your MySQL Server is running (e.g. via MySQL Workbench, XAMPP, or command-line).
2. Connect to MySQL and execute the `schema.sql` script:
```bash
mysql -u root -p < schema.sql
```
*(Or open MySQL Workbench, load `schema.sql`, and execute it).*

3. Configure your database credentials by creating a `.env` file in `student-notes/`:
```env
SECRET_KEY="my-super-secret-key-change-in-production"
DB_USER="root"
DB_PASSWORD="your_mysql_password"
DB_HOST="localhost"
DB_PORT="3306"
DB_NAME="student_notes_db"
```
*(Note: If testing without a live MySQL instance, you can set `USE_SQLITE=1` in your `.env` to run with an automatic local SQLite database).*

### Step 5: Initialize and Seed Sample Data
Initialize tables and sample students:
```bash
flask --app app.py init-db
```
Or simply run `python app.py` which automatically runs `db.create_all()` and seeds initial student records.

### Step 6: Start the Flask Application
```bash
python app.py
```
Or using the Flask CLI:
```bash
flask run --port=5000 --debug
```
Open your browser at: **`http://127.0.0.1:5000`**

---

## 🎓 Pre-Configured Demo Student Accounts

| Register Number | Student Name | Date of Birth (DOB) | Password | Department | Year / Sem |
|---|---|---|---|---|---|
| `921021104001` | Aravind Kumar | `2003-05-14` | `Student@123` | Computer Science | Year 3, Sem 5 |
| `921021104002` | Priya Raman | `2004-08-22` | `Student@123` | Information Technology | Year 2, Sem 4 |
| `921021104003` | Rohan Sharma | `2002-11-09` | `Student@123` | Electronics & Comm | Year 4, Sem 7 |
| `921021104004` | Sneha Patel | `2003-01-30` | `Student@123` | Mechanical Engg | Year 3, Sem 6 |

---

## 🔒 Security Features Implemented

1. **Password & Credential Hashing:** Passwords and DOB hashes are stored using Scrypt/PBKDF2 via Werkzeug security. Never in plaintext.
2. **Access Control & Authorization:** Only authenticated students can access `/dashboard` or query the `/api/notes` endpoints.
3. **Ownership Protection:** When deleting a note (`DELETE /api/notes/<id>`), Flask strictly checks if `note.uploaded_by == current_user.register_number`. Unauthorized attempts return HTTP 403 Forbidden.
4. **File Validation & Storage:** Uploads only allow verified `.pdf` extensions with safe UUID-prefixed filenames (`secure_filename`) preventing path traversal and file collisions. 16 MB maximum size limit enforced.
5. **Secure Sessions:** Handled by Flask-Login with `HttpOnly` and `SameSite=Lax` cookies.
