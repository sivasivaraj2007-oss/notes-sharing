/**
 * Student Notes Sharing Portal - Dashboard Client Controller
 * Connects all dashboard operations (fetch notes, search, filter, upload, download, delete, logout)
 * to the Flask backend API.
 */

let currentStudent = null;
let currentFilters = {
    search: '',
    department: 'All',
    year: 'All',
    semester: 'All',
    myUploads: false
};
let pendingDeleteId = null;

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Verify authentication state first
    await checkSession();

    // 2. Setup event listeners
    setupEventListeners();

    // 3. Load initial notes from MySQL database
    await loadNotes();
});

/**
 * Validates the active user session with GET /api/me
 */
async function checkSession() {
    try {
        const response = await fetch('/api/me', {
            credentials: 'same-origin',
            headers: { 'Accept': 'application/json' }
        });

        if (response.status === 401) {
            window.location.href = '/login';
            return;
        }

        const data = await response.json();
        if (data.authenticated && data.student) {
            currentStudent = data.student;
            updateStudentUI(data.student);
        } else {
            window.location.href = '/login';
        }
    } catch (err) {
        console.error('Session verification error:', err);
        window.location.href = '/login';
    }
}

/**
 * Updates UI elements with student profile information
 */
function updateStudentUI(student) {
    document.querySelectorAll('#navStudentName, #welcomeStudentName').forEach(el => {
        el.textContent = student.student_name || 'Student';
    });
    
    const regEl = document.getElementById('welcomeRegNumber');
    if (regEl) regEl.textContent = student.register_number;

    const navRegEl = document.getElementById('navRegNumber');
    if (navRegEl) navRegEl.textContent = student.register_number;

    const deptEl = document.getElementById('welcomeDept');
    if (deptEl) deptEl.textContent = student.department;

    const navDeptEl = document.getElementById('navDept');
    if (navDeptEl) navDeptEl.textContent = student.department;

    const yearEl = document.getElementById('welcomeYear');
    if (yearEl) yearEl.textContent = student.year;

    const semEl = document.getElementById('welcomeSem');
    if (semEl) semEl.textContent = student.semester;

    const navYearSemEl = document.getElementById('navYearSem');
    if (navYearSemEl) navYearSemEl.textContent = `Year ${student.year}, Sem ${student.semester}`;
}

/**
 * Configures all interactive event handlers
 */
function setupEventListeners() {
    // Search input with debouncing
    const searchInput = document.getElementById('searchInput');
    let debounceTimer;
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                currentFilters.search = e.target.value.trim();
                updateFilterTags();
                loadNotes();
            }, 300);
        });
    }

    // Clear search button
    const clearSearchBtn = document.getElementById('clearSearchBtn');
    if (clearSearchBtn && searchInput) {
        clearSearchBtn.addEventListener('click', () => {
            searchInput.value = '';
            currentFilters.search = '';
            updateFilterTags();
            loadNotes();
        });
    }

    // Department filter
    const deptFilter = document.getElementById('deptFilter');
    if (deptFilter) {
        deptFilter.addEventListener('change', (e) => {
            currentFilters.department = e.target.value;
            updateFilterTags();
            loadNotes();
        });
    }

    // Year filter
    const yearFilter = document.getElementById('yearFilter');
    if (yearFilter) {
        yearFilter.addEventListener('change', (e) => {
            currentFilters.year = e.target.value;
            updateFilterTags();
            loadNotes();
        });
    }

    // Semester filter
    const semesterFilter = document.getElementById('semesterFilter');
    if (semesterFilter) {
        semesterFilter.addEventListener('change', (e) => {
            currentFilters.semester = e.target.value;
            updateFilterTags();
            loadNotes();
        });
    }

    // Reset filters
    const resetFiltersBtn = document.getElementById('resetFiltersBtn');
    if (resetFiltersBtn) {
        resetFiltersBtn.addEventListener('click', () => {
            resetFilters();
        });
    }

    // Quick refresh button
    const quickRefreshBtn = document.getElementById('quickRefreshBtn');
    if (quickRefreshBtn) {
        quickRefreshBtn.addEventListener('click', () => {
            loadNotes();
        });
    }

    // View All Notes Tab
    const viewAllNotesBtn = document.getElementById('viewAllNotesBtn');
    const viewMyNotesBtn = document.getElementById('viewMyNotesBtn');

    if (viewAllNotesBtn && viewMyNotesBtn) {
        viewAllNotesBtn.addEventListener('click', () => {
            currentFilters.myUploads = false;
            viewAllNotesBtn.classList.add('active', 'text-white');
            viewAllNotesBtn.classList.remove('text-white-50');
            viewMyNotesBtn.classList.remove('active', 'text-white');
            viewMyNotesBtn.classList.add('text-white-50');
            updateFilterTags();
            loadNotes();
        });

        viewMyNotesBtn.addEventListener('click', () => {
            currentFilters.myUploads = true;
            viewMyNotesBtn.classList.add('active', 'text-white');
            viewMyNotesBtn.classList.remove('text-white-50');
            viewAllNotesBtn.classList.remove('active', 'text-white');
            viewAllNotesBtn.classList.add('text-white-50');
            updateFilterTags();
            loadNotes();
        });
    }

    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

    // Upload Form Submission
    const uploadForm = document.getElementById('uploadNoteForm');
    if (uploadForm) {
        uploadForm.addEventListener('submit', handleUpload);
    }

    // Confirm Delete button
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', executeDelete);
    }
}

/**
 * Resets all search and select filters to default
 */
function resetFilters() {
    currentFilters = {
        search: '',
        department: 'All',
        year: 'All',
        semester: 'All',
        myUploads: false
    };

    const s = document.getElementById('searchInput');
    const d = document.getElementById('deptFilter');
    const y = document.getElementById('yearFilter');
    const sem = document.getElementById('semesterFilter');

    if (s) s.value = '';
    if (d) d.value = 'All';
    if (y) y.value = 'All';
    if (sem) sem.value = 'All';

    const viewAllNotesBtn = document.getElementById('viewAllNotesBtn');
    const viewMyNotesBtn = document.getElementById('viewMyNotesBtn');
    if (viewAllNotesBtn && viewMyNotesBtn) {
        viewAllNotesBtn.classList.add('active', 'text-white');
        viewAllNotesBtn.classList.remove('text-white-50');
        viewMyNotesBtn.classList.remove('active', 'text-white');
        viewMyNotesBtn.classList.add('text-white-50');
    }

    updateFilterTags();
    loadNotes();
}

/**
 * Updates visual filter tags
 */
function updateFilterTags() {
    const tagScope = document.getElementById('tagScope');
    const tagDept = document.getElementById('tagDept');
    const tagYear = document.getElementById('tagYear');
    const tagSem = document.getElementById('tagSem');
    const tagSearch = document.getElementById('tagSearch');

    if (tagScope) tagScope.textContent = currentFilters.myUploads ? 'My Uploads Only' : 'All Notes';
    
    if (tagDept) {
        if (currentFilters.department !== 'All') {
            tagDept.textContent = `Dept: ${currentFilters.department}`;
            tagDept.classList.remove('d-none');
        } else {
            tagDept.classList.add('d-none');
        }
    }

    if (tagYear) {
        if (currentFilters.year !== 'All') {
            tagYear.textContent = `Year: ${currentFilters.year}`;
            tagYear.classList.remove('d-none');
        } else {
            tagYear.classList.add('d-none');
        }
    }

    if (tagSem) {
        if (currentFilters.semester !== 'All') {
            tagSem.textContent = `Sem: ${currentFilters.semester}`;
            tagSem.classList.remove('d-none');
        } else {
            tagSem.classList.add('d-none');
        }
    }

    if (tagSearch) {
        if (currentFilters.search) {
            tagSearch.textContent = `Search: "${currentFilters.search}"`;
            tagSearch.classList.remove('d-none');
        } else {
            tagSearch.classList.add('d-none');
        }
    }
}

/**
 * Loads notes matching current criteria from GET /api/notes
 */
async function loadNotes() {
    const loadingState = document.getElementById('loadingState');
    const emptyState = document.getElementById('emptyState');
    const notesGrid = document.getElementById('notesGrid');

    if (loadingState) loadingState.classList.remove('d-none');
    if (emptyState) emptyState.classList.add('d-none');
    if (notesGrid) notesGrid.innerHTML = '';

    const params = new URLSearchParams();
    if (currentFilters.search) params.append('search', currentFilters.search);
    if (currentFilters.department && currentFilters.department !== 'All') params.append('department', currentFilters.department);
    if (currentFilters.year && currentFilters.year !== 'All') params.append('year', currentFilters.year);
    if (currentFilters.semester && currentFilters.semester !== 'All') params.append('semester', currentFilters.semester);
    if (currentFilters.myUploads) params.append('my_uploads', 'true');

    try {
        const response = await fetch(`/api/notes?${params.toString()}`, {
            credentials: 'same-origin',
            headers: { 'Accept': 'application/json' }
        });

        if (response.status === 401) {
            window.location.href = '/login';
            return;
        }

        if (!response.ok) {
            throw new Error('Unable to retrieve notes from server');
        }

        const notes = await response.json();

        // Count my uploads badge
        if (currentStudent) {
            const myCount = notes.filter(n => n.uploaded_by === currentStudent.register_number).length;
            const badge = document.getElementById('myUploadsBadge');
            if (badge) badge.textContent = myCount;
        }

        if (loadingState) loadingState.classList.add('d-none');

        if (!notes || notes.length === 0) {
            if (emptyState) emptyState.classList.remove('d-none');
        } else {
            displayNotes(notes);
        }

    } catch (err) {
        console.error('Error loading notes:', err);
        if (loadingState) loadingState.classList.add('d-none');
        showStatusAlert(`Failed to load notes: ${err.message}`, 'danger');
    }
}

/**
 * Renders notes as Bootstrap 5 interactive cards
 */
function displayNotes(notes) {
    const notesGrid = document.getElementById('notesGrid');
    if (!notesGrid) return;
    notesGrid.innerHTML = '';

    notes.forEach(note => {
        const isOwner = currentStudent && (note.uploaded_by === currentStudent.register_number);
        
        const col = document.createElement('div');
        col.className = 'col-12 col-md-6 col-xl-4';
        
        col.innerHTML = `
            <div class="card h-100 border-0 shadow-sm rounded-4 note-card bg-white position-relative overflow-hidden">
                <div class="card-body p-4 d-flex flex-column">
                    
                    <!-- Top badges -->
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <span class="badge note-badge-dept rounded-pill px-3 py-1 small fw-semibold">
                            ${escapeHtml(note.department)}
                        </span>
                        <div class="d-flex gap-1 align-items-center">
                            <span class="badge note-badge-sem rounded-pill px-2 py-1 small">
                                Y${note.year} &bull; S${note.semester}
                            </span>
                            ${isOwner ? '<span class="badge note-badge-mine rounded-pill px-2 py-1 small fw-bold">Mine</span>' : ''}
                        </div>
                    </div>

                    <!-- Note Title -->
                    <h5 class="fw-bold text-dark mb-1 text-truncate" title="${escapeHtml(note.title)}">
                        ${escapeHtml(note.title)}
                    </h5>

                    <!-- Subject -->
                    <p class="text-primary fw-medium small mb-2">
                        <i class="bi bi-book-half me-1"></i> ${escapeHtml(note.subject)}
                    </p>

                    <!-- Description -->
                    <p class="text-muted small flex-grow-1 mb-3 line-clamp-3">
                        ${note.description ? escapeHtml(note.description) : 'No description provided.'}
                    </p>

                    <!-- File & Author Info -->
                    <div class="p-2 bg-light rounded-3 mb-3 small">
                        <div class="d-flex align-items-center justify-content-between text-muted mb-1">
                            <span class="text-truncate me-2">
                                <i class="bi bi-file-earmark-pdf-fill text-danger me-1"></i>
                                <strong>${escapeHtml(note.original_filename)}</strong>
                            </span>
                            <span class="badge bg-white text-secondary border font-monospace">${note.file_size_formatted || ''}</span>
                        </div>
                        <div class="d-flex align-items-center justify-content-between text-muted extra-small">
                            <span><i class="bi bi-person me-1"></i> Uploaded by: <strong>${escapeHtml(note.author_name || note.uploaded_by)}</strong></span>
                            <span>${note.uploaded_at}</span>
                        </div>
                    </div>

                    <!-- Actions Footer -->
                    <div class="d-flex gap-2 pt-2 border-top">
                        <a href="/api/notes/${note.id}/download" 
                           class="btn btn-outline-primary btn-sm rounded-pill flex-grow-1 fw-semibold d-flex align-items-center justify-content-center gap-1"
                           target="_blank">
                            <i class="bi bi-download"></i> Download PDF
                        </a>
                        ${isOwner ? `
                            <button type="button" 
                                    class="btn btn-outline-danger btn-sm rounded-pill px-3 delete-note-btn" 
                                    data-id="${note.id}" 
                                    data-title="${escapeHtml(note.title)}"
                                    title="Delete your uploaded note">
                                <i class="bi bi-trash3-fill"></i>
                            </button>
                        ` : ''}
                    </div>

                </div>
            </div>
        `;

        notesGrid.appendChild(col);
    });

    // Attach delete confirmation listeners to newly rendered buttons
    document.querySelectorAll('.delete-note-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const button = e.currentTarget;
            pendingDeleteId = button.getAttribute('data-id');
            const noteTitle = button.getAttribute('data-title');
            
            const titleDisplay = document.getElementById('deleteNoteTitleText');
            if (titleDisplay) titleDisplay.textContent = `"${noteTitle}"`;

            const modalElement = document.getElementById('deleteConfirmModal');
            if (modalElement) {
                const modal = bootstrap.Modal.getOrCreateInstance(modalElement);
                modal.show();
            }
        });
    });
}

/**
 * Handles PDF Note Upload via POST /api/notes with FormData
 */
async function handleUpload(e) {
    e.preventDefault();
    const form = e.target;
    const submitBtn = document.getElementById('submitUploadBtn');
    const uploadSpinner = document.getElementById('uploadSpinner');
    const uploadBtnText = document.getElementById('uploadBtnText');
    const uploadAlert = document.getElementById('uploadAlert');

    hideUploadAlert();

    const title = form.title.value.trim();
    const subject = form.subject.value.trim();
    const department = form.department.value;
    const year = form.year.value;
    const semester = form.semester.value;
    const fileInput = form.file;

    if (!title || !subject || !department || !year || !semester || !fileInput.files.length) {
        showUploadAlert('Please fill in all mandatory fields and select a PDF file.', 'danger');
        return;
    }

    const file = fileInput.files[0];
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        showUploadAlert('Invalid file format. Only PDF files are accepted.', 'danger');
        return;
    }

    if (file.size > 16 * 1024 * 1024) {
        showUploadAlert('The selected PDF exceeds the 16 MB maximum size limit.', 'danger');
        return;
    }

    // Set loading state
    if (submitBtn) submitBtn.disabled = true;
    if (uploadSpinner) uploadSpinner.classList.remove('d-none');
    if (uploadBtnText) uploadBtnText.textContent = 'Uploading to MySQL...';

    const formData = new FormData(form);

    try {
        const response = await fetch('/api/notes', {
            method: 'POST',
            credentials: 'same-origin',
            body: formData
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to upload note.');
        }

        // Close modal and reset form
        const modalElement = document.getElementById('uploadModal');
        const modal = bootstrap.Modal.getInstance(modalElement);
        if (modal) modal.hide();
        form.reset();

        showStatusAlert(`Note "${data.note.title}" was uploaded and recorded successfully!`, 'success');
        
        // Reload notes list
        await loadNotes();

    } catch (err) {
        showUploadAlert(err.message, 'danger');
    } finally {
        if (submitBtn) submitBtn.disabled = false;
        if (uploadSpinner) uploadSpinner.classList.add('d-none');
        if (uploadBtnText) uploadBtnText.innerHTML = '<i class="bi bi-cloud-arrow-up-fill"></i> Upload and Save Note';
    }
}

/**
 * Executes Note deletion via DELETE /api/notes/<id>
 */
async function executeDelete() {
    if (!pendingDeleteId) return;

    const confirmBtn = document.getElementById('confirmDeleteBtn');
    const deleteSpinner = document.getElementById('deleteSpinner');
    const deleteBtnText = document.getElementById('deleteBtnText');

    if (confirmBtn) confirmBtn.disabled = true;
    if (deleteSpinner) deleteSpinner.classList.remove('d-none');
    if (deleteBtnText) deleteBtnText.textContent = 'Deleting...';

    try {
        const response = await fetch(`/api/notes/${pendingDeleteId}`, {
            method: 'DELETE',
            credentials: 'same-origin',
            headers: { 'Accept': 'application/json' }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to delete note');
        }

        // Close modal
        const modalElement = document.getElementById('deleteConfirmModal');
        const modal = bootstrap.Modal.getInstance(modalElement);
        if (modal) modal.hide();

        showStatusAlert('Note deleted successfully from MySQL database and storage.', 'success');
        pendingDeleteId = null;

        // Refresh notes
        await loadNotes();

    } catch (err) {
        alert(err.message);
    } finally {
        if (confirmBtn) confirmBtn.disabled = false;
        if (deleteSpinner) deleteSpinner.classList.add('d-none');
        if (deleteBtnText) deleteBtnText.textContent = 'Yes, Delete';
    }
}

/**
 * Handles student logout via POST /api/logout
 */
async function handleLogout() {
    try {
        const response = await fetch('/api/logout', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Accept': 'application/json' }
        });

        if (response.ok) {
            window.location.href = '/login';
        } else {
            window.location.href = '/login';
        }
    } catch (err) {
        console.error('Logout error:', err);
        window.location.href = '/login';
    }
}

function showUploadAlert(msg, type = 'danger') {
    const alert = document.getElementById('uploadAlert');
    if (!alert) return;
    alert.className = `alert alert-${type} py-2 px-3 small rounded-3 mb-3 d-flex align-items-center`;
    alert.innerHTML = `<i class="bi bi-exclamation-triangle-fill me-2"></i><div>${msg}</div>`;
    alert.classList.remove('d-none');
}

function hideUploadAlert() {
    const alert = document.getElementById('uploadAlert');
    if (!alert) return;
    alert.classList.add('d-none');
    alert.innerHTML = '';
}

function showStatusAlert(msg, type = 'info') {
    const alert = document.getElementById('statusAlert');
    if (!alert) return;
    alert.className = `alert alert-${type} alert-dismissible fade show py-2 px-3 small rounded-3 mb-4 shadow-sm`;
    alert.innerHTML = `
        <div class="d-flex align-items-center">
            <i class="bi ${type === 'success' ? 'bi-check-circle-fill text-success' : 'bi-info-circle-fill text-info'} me-2 fs-5"></i>
            <div class="flex-grow-1">${msg}</div>
            <button type="button" class="btn-close small shadow-none" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    `;
    alert.classList.remove('d-none');
}

function escapeHtml(string) {
    if (!string) return '';
    return String(string)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
