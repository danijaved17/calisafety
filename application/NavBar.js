const header = document.getElementById('header');

const outerNav = document.createElement('nav');

const navTitle = document.createElement('h1');
navTitle.innerHTML = 'Cali<span>Safety</span>';
outerNav.appendChild(navTitle);

const navLinks = document.createElement('nav');

const home = document.createElement('a');
home.textContent = 'Home';
home.href = 'index.html';
navLinks.appendChild(home);

const token = localStorage.getItem('refresh_token');
const userId = localStorage.getItem('user_id');

if (token && userId) {
    const profile = document.createElement('a');
    profile.textContent = 'My County';
    profile.href = 'UserProfile.html';
    navLinks.appendChild(profile);

    const logout = document.createElement('a');
    logout.textContent = 'Logout';
    logout.href = 'index.html';
    logout.addEventListener('click', () => {
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user_id');
        localStorage.removeItem('county');
    });
    navLinks.appendChild(logout);
} else {
    const login = document.createElement('a');
    login.textContent = 'Login';
    login.href = 'UserLogin.html';

    const register = document.createElement('a');
    register.textContent = 'Register';
    register.href = 'register.html';

    navLinks.appendChild(login);
    navLinks.appendChild(register);
}

outerNav.appendChild(navLinks);
header.appendChild(outerNav);
