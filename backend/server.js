const dns = require("dns");
dns.setServers(["8.8.8.8", "1.1.1.1"]);
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const { scanText } = require("./scanner");
const bcrypt = require("bcryptjs");
const User = require("./models/User");
const jwt = require("jsonwebtoken");
const Scan = require("./models/Scan");
const { optionalAuth, requireAuth } = require("./middleware/auth");
const { scanRepo } = require("./githubScanner");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Server is working");
});

app.post("/scan", optionalAuth, async (req, res) => {
  try {
    const { text, fileName } = req.body;

    if (!text) {
      return res.status(400).json({ error: "No text provided" });
    }

    const findings = scanText(text, fileName);

    // Save the scan only if the user is logged in
    if (req.userId) {
      await Scan.create({
        user: req.userId,
        fileName: fileName || "pasted text",
        findings,
        totalFindings: findings.length,
      });
    }

    res.json({ findings });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/scan-repo", optionalAuth, async (req, res) => {
  try {
    const { repoUrl } = req.body;

    if (!repoUrl) {
      return res.status(400).json({ error: "No repo link provided" });
    }

    const result = await scanRepo(repoUrl);

    // Save to history only if logged in
    if (req.userId) {
      await Scan.create({
        user: req.userId,
        fileName: result.repoName,
        findings: result.findings,
        totalFindings: result.findings.length,
      });
    }

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});

app.get("/scans", requireAuth, async (req, res) => {
  try {
    const scans = await Scan.find({ user: req.userId }).sort({ createdAt: -1 });
    res.json({ scans });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/register", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ error: "Email already registered" });
    }

    const hashed = await bcrypt.hash(password, 10);
    await User.create({ email, password: hashed });

    res.status(201).json({ message: "User registered" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err.message));

app.listen(5000, () => {
  console.log("Server running on http://localhost:5000");
});