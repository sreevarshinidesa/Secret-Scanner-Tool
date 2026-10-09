const express = require("express");
const cors = require("cors");
const { scanText } = require("./scanner");
const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Server is working");
});

app.post("/scan", (req, res) => {
  const { text } = req.body;

  if (!text) {
    return res.status(400).json({ error: "No text provided" });
  }

  const findings = scanText(text);
  res.json({ findings });
});

app.listen(5000, () => {
  console.log("Server running on http://localhost:5000");
});