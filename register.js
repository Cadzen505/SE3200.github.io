const registerForm = document.querySelector('#register-form');
const errorBanner = document.querySelector('#error-banner');

registerForm.addEventListener('submit', function(event) {
    event.preventDefault();
    errorBanner.textContent = "";

    const first_name = document.querySelector('#first_name').value.trim();
    const last_name = document.querySelector('#last_name').value.trim();
    const email = document.querySelector('#email').value.trim();
    const password = document.querySelector('#password').value.trim();

    fetch('/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ first_name, last_name, email, password })
    })
    .then(async response => {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || "Registration failed.");
            }
            return data;
        } else {
            throw new Error("Server returned an invalid response. Check route path.");
        }
    })
    .then(() => {
        alert("Registration successful! Redirecting to login.");
        window.location.href = 'index.html';
    })
    .catch(error => {
        errorBanner.textContent = error.message;
    });
});