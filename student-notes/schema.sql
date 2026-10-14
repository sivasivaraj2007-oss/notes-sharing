-- Student Notes Sharing Web Application Database Schema
-- Target Database: MySQL 8.0+

CREATE DATABASE IF NOT EXISTS student_notes_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE student_notes_db;

-- Table: students
CREATE TABLE IF NOT EXISTS students (
    id INT AUTO_INCREMENT PRIMARY KEY,
    register_number VARCHAR(50) NOT NULL UNIQUE,
    student_name VARCHAR(100) NOT NULL,
    dob DATE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    department VARCHAR(50) NOT NULL,
    year INT NOT NULL,
    semester INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_register_number (register_number),
    INDEX idx_dept_year_sem (department, year, semester)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Table: notes
CREATE TABLE IF NOT EXISTS notes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    subject VARCHAR(100) NOT NULL,
    department VARCHAR(50) NOT NULL,
    year INT NOT NULL,
    semester INT NOT NULL,
    description TEXT,
    file_path VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_size INT NOT NULL,
    uploaded_by VARCHAR(50) NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (uploaded_by) REFERENCES students(register_number) ON DELETE CASCADE,
    INDEX idx_search (title, subject),
    INDEX idx_filter (department, year, semester),
    INDEX idx_uploader (uploaded_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Sample Students Data (DOB format: YYYY-MM-DD)
-- Password for all sample accounts is: 'Student@123'
-- Werkzeug pbkdf2:sha256 hash for 'Student@123'
INSERT INTO students (register_number, student_name, dob, password_hash, department, year, semester)
VALUES 
('921021104001', 'Aravind Kumar', '2003-05-14', 'scrypt:32768:8:1$uH3y5k9L0v$3d9b048cb1546cb5b1876a4ba2de38e8ec2a66eec4e477e7ec97e937d377b07fe4df402377366d7ad4758d44743c39aa03fa379ca2838423405f6e80b26f5827', 'Computer Science', 3, 5),
('921021104002', 'Priya Raman', '2004-08-22', 'scrypt:32768:8:1$uH3y5k9L0v$3d9b048cb1546cb5b1876a4ba2de38e8ec2a66eec4e477e7ec97e937d377b07fe4df402377366d7ad4758d44743c39aa03fa379ca2838423405f6e80b26f5827', 'Information Technology', 2, 4),
('921021104003', 'Rohan Sharma', '2002-11-09', 'scrypt:32768:8:1$uH3y5k9L0v$3d9b048cb1546cb5b1876a4ba2de38e8ec2a66eec4e477e7ec97e937d377b07fe4df402377366d7ad4758d44743c39aa03fa379ca2838423405f6e80b26f5827', 'Electronics and Comm', 4, 7),
('921021104004', 'Sneha Patel', '2003-01-30', 'scrypt:32768:8:1$uH3y5k9L0v$3d9b048cb1546cb5b1876a4ba2de38e8ec2a66eec4e477e7ec97e937d377b07fe4df402377366d7ad4758d44743c39aa03fa379ca2838423405f6e80b26f5827', 'Mechanical Engineering', 3, 6)
ON DUPLICATE KEY UPDATE student_name=VALUES(student_name);
