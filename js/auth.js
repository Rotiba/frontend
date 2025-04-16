// Base URL for the API
const API_BASE_URL =
  "https://assignbackend-gycvg7bebtfdekg9.canadacentral-01.azurewebsites.net/api";

//const API_BASE_URL = "localhost:3000/api/";

// Function to log in a user
async function login(username, password) {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      alert(errorData.message || "Login failed");
      return;
    }

    const data = await response.json();
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    alert("Login successful!");
    window.location.href = "index.html"; // Redirect to the homepage
  } catch (error) {
    console.error("Login error:", error);
    alert("An error occurred during login. Please try again.");
  }
}

// Function to register a new user
async function register(username, password) {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      alert(errorData.message || "Registration failed");
      return;
    }

    alert("Registration successful! Please log in.");
    window.location.href = "login.html"; // Redirect to the login page
  } catch (error) {
    console.error("Registration error:", error);
    alert("An error occurred during registration. Please try again.");
  }
}

// Function to log out the user
function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  alert("You have been logged out.");
  window.location.href = "login.html"; // Redirect to the login page
}

// Function to check if the user is authenticated
function isAuthenticated() {
  const token = localStorage.getItem("token");
  return !!token;
}

// Function to get the current logged-in user
function getCurrentUser() {
  const user = localStorage.getItem("user");
  return user ? JSON.parse(user) : null;
}

// Function to update the navigation menu based on authentication status
function updateNavMenu() {
  const navMenu = document.getElementById("navMenu");
  const user = getCurrentUser();

  if (isAuthenticated() && user) {
    navMenu.innerHTML = `
      <a href="index.html">Home</a>
      <a href="upload.html">Upload</a>
      <a href="#" id="logoutLink">Logout (${user.username})</a>
    `;

    document.getElementById("logoutLink").addEventListener("click", (e) => {
      e.preventDefault();
      logout();
    });
  } else {
    navMenu.innerHTML = `
      <a href="index.html">Home</a>
      <a href="login.html">Login</a>
      <a href="register.html">Register</a>
    `;
  }
}
