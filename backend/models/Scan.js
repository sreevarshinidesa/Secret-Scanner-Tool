const mongoose = require("mongoose");

const scanSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    fileName: { type: String, default: "pasted text" },
        findings: [
      {
        file: String,
        line: Number,
        type: { type: String },
        severity: String,
        value: String,
      },
    ],
    totalFindings: Number,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Scan", scanSchema);