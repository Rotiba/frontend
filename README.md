
# VidShare - Cloud Native Video Sharing Platform - FrontEnd

VidShare is a cloud-native video sharing platform that allows users to upload, view, rate, and comment on videos. The platform supports user authentication, role-based access control, and integrates with Azure Blob Storage for video hosting.

---

## Features

- **User Authentication**: Login and registration functionality with JWT-based authentication.
- **Role-Based Access Control**: Separate roles for `creator` and `consumer`.
- **Video Management**:
  - Upload videos (creators only).
  - View video details, including publisher, producer, genre, and ratings.
- **Ratings and Comments**:
  - Rate videos (1-5 stars).
  - Add and view comments on videos.
- **Search Functionality**: Search for videos by title, publisher, producer, or genre.
- **Responsive Design**: Netflix-inspired UI with a dark theme.

---

## Technologies Used

- **Frontend**:
  - HTML, CSS, JavaScript
  - Responsive design with a Netflix-like theme
- **Backend**:
  - Node.js with Express.js
  - SQL Server for database management
  - Azure Blob Storage for video hosting
- **Authentication**:
  - JWT (JSON Web Tokens)
- **Other Libraries**:
  - `multer` for file uploads
  - `tedious` for SQL Server integration
  - `@azure/storage-blob` for Azure Blob Storage

---

## Installation


### Steps
1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/vidshare.git
   cd vidshare
   ```


4. Open the frontend:
   - Place the frontend files in a web server (e.g., XAMPP or any static file server).
   - Access the app in your browser at `http://localhost`.

---

---

## How to Use

### 1. Authentication
- **Register**: Create a new account on the registration page.
- **Login**: Log in with your credentials to access additional features like uploading videos, commenting, and rating.

### 2. Upload Videos (Creators Only)
- Navigate to the "Upload" page.
- Fill in the video details and upload a video file.

### 3. View Videos
- Browse the home page to view the latest videos.
- Click on a video to view its details, play it, and interact with it (rate or comment).

### 4. Search Videos
- Use the search bar on the home page to find videos by title, publisher, producer, or genre.

---

---

## Future Enhancements

- Implement video categories and playlists.
- Add support for video analytics (views, likes, etc.).
- Improve search functionality with filters and sorting.


