// Base URL for the API
const API_URL =
  "https://assignbackend-gycvg7bebtfdekg9.canadacentral-01.azurewebsites.net/api";
//const API_URL = "localhost:3000/api/";
// Load all videos for home page
async function loadVideos() {
  try {
    const response = await fetch(`${API_URL}/videos`);

    if (!response.ok) {
      throw new Error("Failed to fetch videos");
    }

    const videos = await response.json();
    displayVideos(videos);
  } catch (error) {
    console.error("Error loading videos:", error);
    document.getElementById(
      "videoGrid"
    ).innerHTML = `<p class="error">Error loading videos: ${error.message}</p>`;
  }
}

// Display videos in grid
function displayVideos(videos) {
  const videoGrid = document.getElementById("videoGrid");

  if (videos.length === 0) {
    videoGrid.innerHTML = "<p>No videos found.</p>";
    return;
  }

  videoGrid.innerHTML = "";

  videos.forEach((video) => {
    const videoCard = document.createElement("div");
    videoCard.className = "video-card";

    videoCard.innerHTML = `
        <div class="video-thumbnail">
          <a href="video.html?id=${video.id}">
            <img src="/placeholder-thumbnail.jpg" alt="${video.title}" />
            <div class="video-duration">Video</div>
          </a>
        </div>
        <div class="video-info">
          <h3><a href="video.html?id=${video.id}">${video.title}</a></h3>
          <p class="video-meta">
            ${video.genre || "No genre"} · ${video.ageRating || "No rating"}
          </p>
          <p class="video-publisher">
            By ${video.uploaderName || "Unknown"}
          </p>
        </div>
      `;

    videoGrid.appendChild(videoCard);
  });
}

// Search videos
async function searchVideos(query) {
  try {
    const response = await fetch(
      `${API_URL}/search?q=${encodeURIComponent(query)}`
    );

    if (!response.ok) {
      throw new Error("Search failed");
    }

    const videos = await response.json();
    displayVideos(videos);

    // Update heading
    const heading = document.querySelector("main h1");
    if (heading) {
      heading.textContent = `Search Results for "${query}"`;
    }
  } catch (error) {
    console.error("Search error:", error);
    document.getElementById(
      "videoGrid"
    ).innerHTML = `<p class="error">Search error: ${error.message}</p>`;
  }
}

// Load video details for video page
async function loadVideoDetails(videoId) {
  try {
    const response = await fetch(`${API_URL}/videos/${videoId}`);

    if (!response.ok) {
      throw new Error("Failed to fetch video details");
    }

    const video = await response.json();
    displayVideoDetails(video);
  } catch (error) {
    console.error("Error loading video details:", error);
    document.querySelector(
      ".video-container"
    ).innerHTML = `<p class="error">Error loading video: ${error.message}</p>`;
  }
}

// Display video details on video page
function displayVideoDetails(video) {
  // Update page title
  document.title = `${video.title} - VidShare`;

  // Update video player
  const videoPlayer = document.getElementById("videoPlayer");
  videoPlayer.src = video.blobUrl;

  // Update video info
  document.getElementById("videoTitle").textContent = video.title;
  document.getElementById("videoPublisher").textContent =
    video.publisher || "Not specified";
  document.getElementById("videoProducer").textContent =
    video.producer || "Not specified";
  document.getElementById("videoGenre").textContent =
    video.genre || "Not specified";
  document.getElementById("videoAgeRating").textContent =
    video.ageRating || "Not specified";
  document.getElementById("videoUploader").textContent =
    video.uploaderName || "Unknown";
  document.getElementById("videoUploadDate").textContent = new Date(
    video.uploadDate
  ).toLocaleDateString();

  // Update ratings
  document.getElementById("averageRating").textContent =
    video.averageRating.toFixed(1);
  document.getElementById("ratingCount").textContent = video.ratingCount;

  // Setup rating stars functionality if user is logged in
  if (isLoggedIn()) {
    const stars = document.querySelectorAll(".star");
    stars.forEach((star) => {
      star.addEventListener("click", () => {
        const rating = parseInt(star.getAttribute("data-value"));
        submitRating(video.id, rating);
      });

      // Hover effect
      star.addEventListener("mouseover", () => {
        const rating = parseInt(star.getAttribute("data-value"));
        stars.forEach((s, index) => {
          if (index < rating) {
            s.classList.add("active");
          } else {
            s.classList.remove("active");
          }
        });
      });
    });

    document.getElementById("ratingStars").addEventListener("mouseout", () => {
      stars.forEach((s) => s.classList.remove("active"));
    });
  } else {
    document.getElementById("ratingStars").innerHTML =
      "<p>Login to rate this video</p>";
  }

  // Display comments
  displayComments(video.comments || []);

  // Setup comment form if user is logged in
  const commentForm = document.getElementById("commentForm");
  if (isLoggedIn()) {
    document.getElementById("submitComment").addEventListener("click", () => {
      const commentText = document.getElementById("commentText").value;
      if (commentText.trim()) {
        submitComment(video.id, commentText);
      }
    });
  } else {
    commentForm.innerHTML = "<p>Login to comment on this video</p>";
  }
}

// Display comments
function displayComments(comments) {
  const commentsList = document.getElementById("commentsList");

  if (comments.length === 0) {
    commentsList.innerHTML = "<p>No comments yet. Be the first to comment!</p>";
    return;
  }

  commentsList.innerHTML = "";

  comments.forEach((comment) => {
    const commentEl = document.createElement("div");
    commentEl.className = "comment";

    commentEl.innerHTML = `
        <div class="comment-header">
          <span class="comment-author">${comment.username}</span>
          <span class="comment-date">${new Date(
            comment.createdAt
          ).toLocaleString()}</span>
        </div>
        <div class="comment-body">${comment.comment}</div>
      `;

    commentsList.appendChild(commentEl);
  });
}

// Function to get the Authorization header
function getAuthHeader() {
  const token = localStorage.getItem("token");
  if (!token) {
    throw new Error("User is not authenticated");
  }
  return { Authorization: `Bearer ${token}` };
}

// Submit a rating
async function submitRating(videoId, rating) {
  try {
    const response = await fetch(`${API_URL}/videos/${videoId}/ratings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeader(),
      },
      body: JSON.stringify({ rating }),
    });

    if (!response.ok) {
      throw new Error("Failed to submit rating");
    }

    alert("Rating submitted successfully!");
    // Reload video details to update average rating
    loadVideoDetails(videoId);
  } catch (error) {
    console.error("Rating error:", error);
    alert(`Error submitting rating: ${error.message}`);
  }
}

// Submit a comment
async function submitComment(videoId, comment) {
  try {
    const response = await fetch(`${API_URL}/videos/${videoId}/comments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeader(),
      },
      body: JSON.stringify({ comment }),
    });

    if (!response.ok) {
      throw new Error("Failed to submit comment");
    }

    // Clear comment textarea
    document.getElementById("commentText").value = "";

    // Reload video details to show new comment
    loadVideoDetails(videoId);
  } catch (error) {
    console.error("Comment error:", error);
    alert(`Error submitting comment: ${error.message}`);
  }
}

// Upload a video
async function uploadVideo(formData) {
  try {
    const response = await fetch(
      `https://appbucket.blob.core.windows.net/videos/`,
      {
        method: "POST",
        headers: getAuthHeader(),
        body: formData,
      }
    );

    if (!response.ok) {
      throw new Error("Failed to upload video");
    }

    const result = await response.json();
    alert("Video uploaded successfully!");
    window.location.href = "index.html";
  } catch (error) {
    console.error("Upload error:", error);
    alert(`Error uploading video: ${error.message}`);
  }
}
