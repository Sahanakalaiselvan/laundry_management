const BASE_URL = 'http://127.0.0.1:8000';

// Handle registration
document.getElementById('registerForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value.trim();
  const confirmPassword = document.getElementById('confirmPassword')?.value.trim();
  const email = document.getElementById('email').value.trim();
  const phone = document.getElementById('phone')?.value.trim();
  const plan = document.getElementById('plan')?.value;

  const errorBox = document.getElementById('errorMsg');

  if (!username || !password || !confirmPassword || !email || !phone || !plan) {
    errorBox.textContent = 'Please fill all fields.';
    return;
  }

  if (password !== confirmPassword) {
    errorBox.textContent = 'Passwords do not match.';
    return;
  }

  const user = {
    username,
    password,
    email,
    phone,
    plan,
    role: 'user'
  };

  try {
    const res = await fetch(`${BASE_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user)
    });

    const data = await res.json();

    if (res.ok) {
      alert('Registration successful. Please login.');
      console.log('Redirecting to login.html'); // ✅ Add this

      window.location.href = 'login.html';
    } else {
      errorBox.textContent = data.detail || 'Registration failed.';
    }
  } catch (err) {
    console.error('Registration error:', err);
    errorBox.textContent = 'Server error. Try again.';
  }
});
