const registerButton = document.getElementById('register-button');

registerButton.addEventListener('click', async () => {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const county = document.getElementById('county').value;

    const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, county }),
    });

    const data = await res.json();
    const errorEl = document.getElementById('error-message');

    if (res.status === 401) {
        if (data.code === 'auth/email-already-in-use') {
            errorEl.innerText = 'Email already in use';
        } else if (data.code === 'auth/weak-password') {
            errorEl.innerText = 'Password must be at least 6 characters';
        } else {
            errorEl.innerText = 'Registration failed. Please try again.';
        }
        return;
    }

    if (res.ok) {
        window.location.href = '/UserLogin.html';
    }
});
