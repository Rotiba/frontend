require("dotenv").config();
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const { Connection, Request, TYPES } = require("tedious");
const { BlobServiceClient } = require("@azure/storage-blob");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const path = require("path");

// Initialize Express app
const app = express();
app.use(cors());
app.use(express.json());

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// SQL Server connection configuration
const sqlConfig = {
  server: process.env.SQL_SERVER,
  authentication: {
    type: "default",
    options: {
      userName: process.env.SQL_USER,
      password: process.env.SQL_PASSWORD,
    },
  },
  options: {
    database: process.env.SQL_DATABASE,
    encrypt: true,
    trustServerCertificate: false,
  },
};

// Helper function to execute SQL queries
async function executeSql(query, params = []) {
  return new Promise((resolve, reject) => {
    const connection = new Connection(sqlConfig);
    const results = [];

    connection.on("connect", (err) => {
      if (err) {
        reject(err);
        return;
      }

      const request = new Request(query, (err, rowCount) => {
        if (err) {
          reject(err);
        } else {
          resolve(results);
        }
        connection.close();
      });

      params.forEach((param) => {
        request.addParameter(param.name, param.type, param.value);
      });

      request.on("row", (columns) => {
        const row = {};
        columns.forEach((column) => {
          row[column.metadata.colName] = column.value;
        });
        results.push(row);
      });

      connection.execSql(request);
    });

    connection.connect();
  });
}

// Auth middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) return res.sendStatus(401);

  jwt.verify(
    token,
    process.env.JWT_SECRET || "your_jwt_secret",
    (err, user) => {
      if (err) return res.sendStatus(403);
      req.user = user;
      next();
    }
  );
}

// Auth routes
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const users = await executeSql(
      `
      SELECT id, username, password, role FROM Users 
      WHERE username = @username
    `,
      [{ name: "username", type: TYPES.VarChar, value: username }]
    );

    if (users.length === 0) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const user = users[0];

    // For simplicity we're comparing passwords directly
    // In production, you should use bcrypt to hash passwords
    if (password !== user.password) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role,
      },
      process.env.JWT_SECRET || "your_jwt_secret",
      { expiresIn: "24h" }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/api/register", async (req, res) => {
  const { username, password, role = "consumer" } = req.body;

  try {
    // Check if username already exists
    const existingUsers = await executeSql(
      `
      SELECT id FROM Users WHERE username = @username
    `,
      [{ name: "username", type: TYPES.VarChar, value: username }]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ message: "Username already exists" });
    }

    // For a production app, you should hash passwords before storing
    // const hashedPassword = await bcrypt.hash(password, 10);

    // Insert new user
    await executeSql(
      `
      INSERT INTO Users (username, password, role) 
      VALUES (@username, @password, @role)
    `,
      [
        { name: "username", type: TYPES.VarChar, value: username },
        { name: "password", type: TYPES.VarChar, value: password },
        { name: "role", type: TYPES.VarChar, value: role },
      ]
    );

    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Admin endpoint to create a creator account
app.post("/api/admin/create-creator", async (req, res) => {
  const { username, password } = req.body;

  try {
    // Check if username already exists
    const existingUsers = await executeSql(
      `
      SELECT id FROM Users WHERE username = @username
    `,
      [{ name: "username", type: TYPES.VarChar, value: username }]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ message: "Username already exists" });
    }

    // Insert new creator user
    await executeSql(
      `
      INSERT INTO Users (username, password, role) 
      VALUES (@username, @password, @role)
    `,
      [
        { name: "username", type: TYPES.VarChar, value: username },
        { name: "password", type: TYPES.VarChar, value: password },
        { name: "role", type: TYPES.VarChar, value: "creator" },
      ]
    );

    res.status(201).json({ message: "Creator account created successfully" });
  } catch (error) {
    console.error("Creator creation error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Video routes
app.get("/api/videos", async (req, res) => {
  try {
    const videos = await executeSql(`
      SELECT v.*, u.username as uploaderName
      FROM Videos v
      JOIN Users u ON v.uploaderId = u.id
      ORDER BY v.uploadDate DESC
    `);

    res.json(videos);
  } catch (error) {
    console.error("Error fetching videos:", error);
    res.status(500).json({ message: "Server error" });
  }
});

app.get("/api/videos/:id", async (req, res) => {
  const videoId = req.params.id;

  try {
    const videos = await executeSql(
      `
      SELECT v.*, u.username as uploaderName
      FROM Videos v
      JOIN Users u ON v.uploaderId = u.id
      WHERE v.id = @id
    `,
      [{ name: "id", type: TYPES.Int, value: parseInt(videoId) }]
    );

    if (videos.length === 0) {
      return res.status(404).json({ message: "Video not found" });
    }

    const video = videos[0];

    // Get comments for this video
    const comments = await executeSql(
      `
      SELECT c.*, u.username
      FROM Comments c
      JOIN Users u ON c.userId = u.id
      WHERE c.videoId = @videoId
      ORDER BY c.createdAt DESC
    `,
      [{ name: "videoId", type: TYPES.Int, value: parseInt(videoId) }]
    );

    // Get average rating
    const ratings = await executeSql(
      `
      SELECT AVG(CAST(rating AS FLOAT)) as averageRating, COUNT(*) as ratingCount
      FROM Ratings
      WHERE videoId = @videoId
    `,
      [{ name: "videoId", type: TYPES.Int, value: parseInt(videoId) }]
    );

    video.comments = comments;
    video.averageRating = ratings[0].averageRating || 0;
    video.ratingCount = ratings[0].ratingCount || 0;

    res.json(video);
  } catch (error) {
    console.error("Error fetching video:", error);
    res.status(500).json({ message: "Server error" });
  }
});

app.post(
  "/api/videos",
  authenticateToken,
  upload.single("videoFile"),
  async (req, res) => {
    // Check if user is a creator
    if (req.user.role !== "creator") {
      return res
        .status(403)
        .json({ message: "Only creators can upload videos" });
    }

    try {
      const { title, publisher, producer, genre, ageRating } = req.body;

      // Upload video to blob storage
      const blobServiceClient = BlobServiceClient.fromConnectionString(
        process.env.STORAGE_CONNECTION_STRING
      );
      const containerClient = blobServiceClient.getContainerClient(
        process.env.STORAGE_CONTAINER
      );

      // Generate unique filename
      const filename = `${Date.now()}-${req.file.originalname}`;
      const blockBlobClient = containerClient.getBlockBlobClient(filename);

      // Upload the video
      await blockBlobClient.upload(req.file.buffer, req.file.buffer.length);

      // Get the URL of the uploaded blob
      const blobUrl = blockBlobClient.url;

      // Save video info to database
      await executeSql(
        `
      INSERT INTO Videos (title, publisher, producer, genre, ageRating, blobUrl, uploaderId)
      VALUES (@title, @publisher, @producer, @genre, @ageRating, @blobUrl, @uploaderId)
    `,
        [
          { name: "title", type: TYPES.VarChar, value: title },
          { name: "publisher", type: TYPES.VarChar, value: publisher || "" },
          { name: "producer", type: TYPES.VarChar, value: producer || "" },
          { name: "genre", type: TYPES.VarChar, value: genre || "" },
          { name: "ageRating", type: TYPES.VarChar, value: ageRating || "" },
          { name: "blobUrl", type: TYPES.VarChar, value: blobUrl },
          { name: "uploaderId", type: TYPES.Int, value: req.user.id },
        ]
      );

      res.status(201).json({ message: "Video uploaded successfully", blobUrl });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Comment routes
app.post("/api/videos/:id/comments", authenticateToken, async (req, res) => {
  const videoId = req.params.id;
  const { comment } = req.body;

  try {
    await executeSql(
      `
      INSERT INTO Comments (videoId, userId, comment)
      VALUES (@videoId, @userId, @comment)
    `,
      [
        { name: "videoId", type: TYPES.Int, value: parseInt(videoId) },
        { name: "userId", type: TYPES.Int, value: req.user.id },
        { name: "comment", type: TYPES.VarChar, value: comment },
      ]
    );

    res.status(201).json({ message: "Comment added successfully" });
  } catch (error) {
    console.error("Comment error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Rating routes
app.post("/api/videos/:id/ratings", authenticateToken, async (req, res) => {
  const videoId = req.params.id;
  const { rating } = req.body;

  if (rating < 1 || rating > 5) {
    return res.status(400).json({ message: "Rating must be between 1 and 5" });
  }

  try {
    // Check if user already rated this video
    const existingRatings = await executeSql(
      `
      SELECT id FROM Ratings
      WHERE videoId = @videoId AND userId = @userId
    `,
      [
        { name: "videoId", type: TYPES.Int, value: parseInt(videoId) },
        { name: "userId", type: TYPES.Int, value: req.user.id },
      ]
    );

    if (existingRatings.length > 0) {
      // Update existing rating
      await executeSql(
        `
        UPDATE Ratings
        SET rating = @rating
        WHERE videoId = @videoId AND userId = @userId
      `,
        [
          { name: "rating", type: TYPES.Int, value: parseInt(rating) },
          { name: "videoId", type: TYPES.Int, value: parseInt(videoId) },
          { name: "userId", type: TYPES.Int, value: req.user.id },
        ]
      );
    } else {
      // Create new rating
      await executeSql(
        `
        INSERT INTO Ratings (videoId, userId, rating)
        VALUES (@videoId, @userId, @rating)
      `,
        [
          { name: "videoId", type: TYPES.Int, value: parseInt(videoId) },
          { name: "userId", type: TYPES.Int, value: req.user.id },
          { name: "rating", type: TYPES.Int, value: parseInt(rating) },
        ]
      );
    }

    res.status(201).json({ message: "Rating submitted successfully" });
  } catch (error) {
    console.error("Rating error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Search endpoint
app.get("/api/search", async (req, res) => {
  const query = req.query.q || "";

  try {
    const videos = await executeSql(
      `
      SELECT v.*, u.username as uploaderName
      FROM Videos v
      JOIN Users u ON v.uploaderId = u.id
      WHERE v.title LIKE @query
      OR v.publisher LIKE @query
      OR v.producer LIKE @query
      OR v.genre LIKE @query
      ORDER BY v.uploadDate DESC
    `,
      [{ name: "query", type: TYPES.VarChar, value: `%${query}%` }]
    );

    res.json(videos);
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
