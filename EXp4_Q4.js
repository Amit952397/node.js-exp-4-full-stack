const express = require("express");
const app = express();
const PORT = 3000;

// Logging middleware (applied globally)
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.url}`);
  next();
});

// Bearer token authentication middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  
  if (!authHeader) {
    return res.status(401).json({ error: "Authorization header missing" });
  }

  const token = authHeader.split(" ")[1]; // Extract token after 'Bearer'
  
  if (token !== "mysecrettoken") {
    return res.status(403).json({ error: "Invalid or missing Bearer token" });
  }

  next();
}

// Public route (no authentication required)
app.get("/public", (req, res) => {
  res.json({ message: "This is a public route, no authentication needed." });
});

// Protected route (requires correct Bearer token)
app.get("/protected", authenticateToken, (req, res) => {
  res.json({ message: "Access granted! This is a protected route." });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
