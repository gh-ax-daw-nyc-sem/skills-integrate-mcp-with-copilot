document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  
  // Authentication elements
  const userIcon = document.getElementById("user-icon");
  const userStatus = document.getElementById("user-status");
  const loginModal = document.getElementById("login-modal");
  const loginForm = document.getElementById("login-form");
  const loginMessage = document.getElementById("login-message");
  const closeModal = document.querySelector(".close");
  
  // Session storage
  let authToken = localStorage.getItem("authToken");
  let currentUser = null;

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft =
          details.max_participants - details.participants.length;

        // Create participants HTML with delete icons instead of bullet points
        const deleteButtonStyle = authToken ? '' : 'style="display:none"';
        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (email) =>
                      `<li><span class="participant-email">${email}</span><button class="delete-btn" ${deleteButtonStyle} data-activity="${name}" data-email="${email}">❌</button></li>`
                  )
                  .join("")}
              </ul>
            </div>`
            : `<p><em>No participants yet</em></p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      // Add event listeners to delete buttons
      document.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", handleUnregister);
      });
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle unregister functionality
  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    if (!authToken) {
      alert("Please login to unregister students");
      return;
    }

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
          headers: {
            "Authorization": authToken
          }
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to unregister. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error unregistering:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!authToken) {
      alert("Please login to register students");
      return;
    }

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
          headers: {
            "Authorization": authToken
          }
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Authentication functions
  async function checkAuth() {
    if (!authToken) {
      updateUIForLoggedOut();
      return;
    }
    
    try {
      const response = await fetch("/auth/verify", {
        headers: {
          "Authorization": authToken
        }
      });
      
      const result = await response.json();
      
      if (result.authenticated) {
        currentUser = result.username;
        updateUIForLoggedIn(result.username);
      } else {
        authToken = null;
        localStorage.removeItem("authToken");
        updateUIForLoggedOut();
      }
    } catch (error) {
      console.error("Error verifying auth:", error);
      updateUIForLoggedOut();
    }
  }
  
  function updateUIForLoggedIn(username) {
    userIcon.textContent = "👤";
    userIcon.title = `Logged in as ${username}`;
    userStatus.textContent = `${username} (Teacher)`;
    userStatus.classList.remove("hidden");
    
    // Enable signup/unregister functionality
    const loginPrompt = document.getElementById("login-prompt");
    if (loginPrompt) loginPrompt.style.display = "none";
    signupForm.style.display = "block";
    document.querySelectorAll(".delete-btn").forEach(btn => {
      btn.style.display = "inline-block";
    });
  }
  
  function updateUIForLoggedOut() {
    userIcon.textContent = "👤";
    userIcon.title = "Login";
    userStatus.classList.add("hidden");
    currentUser = null;
    
    // Disable signup/unregister functionality
    const loginPrompt = document.getElementById("login-prompt");
    if (loginPrompt) loginPrompt.style.display = "block";
    signupForm.style.display = "none";
    document.querySelectorAll(".delete-btn").forEach(btn => {
      btn.style.display = "none";
    });
  }
  
  // Modal controls
  userIcon.addEventListener("click", () => {
    if (currentUser) {
      // Show logout option
      if (confirm(`Logged in as ${currentUser}. Do you want to logout?`)) {
        logout();
      }
    } else {
      // Show login modal
      loginModal.classList.remove("hidden");
    }
  });
  
  closeModal.addEventListener("click", () => {
    loginModal.classList.add("hidden");
    loginForm.reset();
    loginMessage.classList.add("hidden");
  });
  
  window.addEventListener("click", (event) => {
    if (event.target === loginModal) {
      loginModal.classList.add("hidden");
      loginForm.reset();
      loginMessage.classList.add("hidden");
    }
  });
  
  // Login form submission
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    
    try {
      const response = await fetch(
        `/auth/login?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`,
        { method: "POST" }
      );
      
      const result = await response.json();
      
      if (response.ok) {
        authToken = result.token;
        localStorage.setItem("authToken", authToken);
        currentUser = result.username;
        
        // Immediately close modal and update UI
        loginModal.classList.add("hidden");
        loginForm.reset();
        loginMessage.classList.add("hidden");
        updateUIForLoggedIn(currentUser);
        fetchActivities(); // Refresh to show delete buttons
        
        // Show success message in main area
        messageDiv.textContent = `Successfully logged in as ${currentUser}!`;
        messageDiv.className = "success";
        messageDiv.classList.remove("hidden");
        setTimeout(() => {
          messageDiv.classList.add("hidden");
        }, 3000);
      } else {
        loginMessage.textContent = result.detail || "Login failed";
        loginMessage.className = "error";
        loginMessage.classList.remove("hidden");
      }
    } catch (error) {
      loginMessage.textContent = "Login failed. Please try again.";
      loginMessage.className = "error";
      loginMessage.classList.remove("hidden");
      console.error("Error logging in:", error);
    }
  });
  
  async function logout() {
    try {
      await fetch("/auth/logout", {
        method: "POST",
        headers: {
          "Authorization": authToken
        }
      });
    } catch (error) {
      console.error("Error logging out:", error);
    }
    
    authToken = null;
    localStorage.removeItem("authToken");
    updateUIForLoggedOut();
    fetchActivities(); // Refresh to hide delete buttons
  }

  // Initialize app
  checkAuth();
  fetchActivities();
});
