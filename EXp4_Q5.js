const express = require("express");
const jwt = require("jsonwebtoken");
const bodyParser = require("body-parser");

const app = express();
app.use(bodyParser.json());

const SECRET_KEY = "myjwtsecret";

// Hardcoded user (for demo)
const USER = { username: "user1", password: "password123" };

// In-memory account balance
let balance = 1000;

// Middleware to verify JWT
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Token missing" });
  }

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.status(403).json({ error: "Invalid token" });
    req.user = user;
    next();
  });
}

// Login route - generate token
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (username === USER.username && password === USER.password) {
    const token = jwt.sign({ username }, SECRET_KEY, { expiresIn: "1h" });
    res.json({ message: "Login successful", token });
  } else {
    res.status(401).json({ error: "Invalid username or password" });
  }
});

// Protected routes
app.get("/balance", authenticateToken, (req, res) => {
  res.json({ balance });
});

app.post("/deposit", authenticateToken, (req, res) => {
  const { amount } = req.body;
  if (!amount || amount <= 0) {
    return res.status(400).json({ error: "Invalid deposit amount" });
  }
  balance += amount;
  res.json({ message: `Deposited ${amount}`, balance });
});

app.post("/withdraw", authenticateToken, (req, res) => {
  const { amount } = req.body;
  if (!amount || amount <= 0) {
    return res.status(400).json({ error: "Invalid withdrawal amount" });
  }
  if (amount > balance) {
    return res.status(400).json({ error: "Insufficient balance" });
  }
  balance -= amount;
  res.json({ message: `Withdrew ${amount}`, balance });
});

app.listen(3000, () => {
  console.log("Banking API running on http://localhost:3000");
});
