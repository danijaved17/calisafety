const signInButton = document.getElementById('login-button');

signInButton.addEventListener('click', async () => {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (res.status === 401) {
        document.getElementById('error-message').innerText = 'Invalid email or password';
        return;
    }

    if (!res.ok) {
        document.getElementById('error-message').innerText = 'Something went wrong. Please try again.';
        return;
    }

    localStorage.setItem('refresh_token', data.user.stsTokenManager.refreshToken);
    localStorage.setItem('user_id', data.user.uid);
    localStorage.setItem('county', data.county);

    window.location.href = '/';
});
