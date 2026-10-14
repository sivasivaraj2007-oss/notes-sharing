/**
 * Student Notes Sharing Portal - Login Client Controller
 * Handles student authentication, form validation, show/hide DOB, and redirection.
 */

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const registerInput = document.getElementById('registerNumber');
    const dobInput = document.getElementById('dob');
    const passwordInput = document.getElementById('password');
    const toggleDobBtn = document.getElementById('toggleDobVisibility');
    const toggleIcon = document.getElementById('toggleIcon');
    const toggleText = document.getElementById('toggleText');
    const loginBtn = document.getElementById('loginBtn');
    const loginSpinner = document.getElementById('loginSpinner');
    const loginBtnText = document.getElementById('loginBtnText');
    const alertBox = document.getElementById('alertBox');
    const demoButtons = document.querySelectorAll('.demo-btn');

    // 1. Show/Hide Date of Birth toggle
    if (toggleDobBtn && dobInput) {
        toggleDobBtn.addEventListener('click', () => {
            const isPassword = dobInput.getAttribute('type') === 'password';
            if (isPassword) {
                dobInput.setAttribute('type', 'text');
                toggleIcon.className = 'bi bi-eye-slash me-1';
                toggleText.textContent = 'Hide';
            } else {
                dobInput.setAttribute('type', 'password');
                toggleIcon.className = 'bi bi-eye me-1';
                toggleText.textContent = 'Show';
            }
        });
    }

    // 2. Demo accounts quick fill
    demoButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const reg = btn.getAttribute('data-reg');
            const dob = btn.getAttribute('data-dob');
            const pass = btn.getAttribute('data-pass');

            registerInput.value = reg;
            dobInput.value = dob;
            if (passwordInput) passwordInput.value = pass;

            hideAlert();
            registerInput.classList.remove('is-invalid');
            dobInput.classList.remove('is-invalid');
        });
    });

    // 3. Form submission via fetch()
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            hideAlert();

            const registerNumber = registerInput.value.trim().toUpperCase();
            const dob = dobInput.value.trim();
            const password = passwordInput ? passwordInput.value.trim() : '';

            let hasError = false;

            // Client-side validations
            if (!registerNumber) {
                registerInput.classList.add('is-invalid');
                hasError = true;
            } else {
                registerInput.classList.remove('is-invalid');
            }

            if (!dob && !password) {
                dobInput.classList.add('is-invalid');
                hasError = true;
            } else {
                dobInput.classList.remove('is-invalid');
            }

            if (hasError) {
                showAlert('Please fill in your Register Number and Date of Birth.', 'danger');
                return;
            }

            // Set loading state
            setLoading(true);

            try {
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    credentials: 'same-origin',
                    body: JSON.stringify({
                        register_number: registerNumber,
                        dob: dob,
                        password: password
                    })
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Authentication failed. Please verify your credentials.');
                }

                showAlert(`Login successful! Redirecting to student dashboard...`, 'success');
                
                // Redirect after brief delay
                setTimeout(() => {
                    window.location.href = '/dashboard';
                }, 600);

            } catch (err) {
                showAlert(err.message, 'danger');
                setLoading(false);
            }
        });
    }

    function showAlert(message, type = 'danger') {
        if (!alertBox) return;
        alertBox.className = `alert alert-${type} py-2 px-3 small rounded-3 mb-3 d-flex align-items-center`;
        alertBox.innerHTML = `
            <i class="bi ${type === 'success' ? 'bi-check-circle-fill' : 'bi-exclamation-triangle-fill'} me-2"></i>
            <div>${message}</div>
        `;
        alertBox.classList.remove('d-none');
    }

    function hideAlert() {
        if (!alertBox) return;
        alertBox.classList.add('d-none');
        alertBox.innerHTML = '';
    }

    function setLoading(isLoading) {
        if (!loginBtn) return;
        if (isLoading) {
            loginBtn.disabled = true;
            loginSpinner.classList.remove('d-none');
            loginBtnText.textContent = 'Verifying credentials...';
        } else {
            loginBtn.disabled = false;
            loginSpinner.classList.add('d-none');
            loginBtnText.innerHTML = '<i class="bi bi-box-arrow-in-right me-2"></i> Sign In to Portal';
        }
    }
});
