const loginForm = document.querySelector('#login-form');
const errorBanner = document.querySelector('#error-banner');

loginForm.addEventListener('submit', function(event) {
    event.preventDefault();
    errorBanner.textContent = "";

    const email = document.querySelector('#login-email').value.trim();
    const password = document.querySelector('#login-password').value.trim();

    fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password })
    })
    .then(async response => {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Login failed.");
            return data;
        } else {
            throw new Error("Server returned an invalid response. Check route path.");
        }
    })
    .then(() => {
        window.location.href = 'home.html';
    })
    .catch(error => {
        errorBanner.textContent = error.message;
    });
});