const patterns = [
  {
    type: "Password",
    severity: "High",
    regex: /(password|passwd|db_password|dbpasswd)\s*[:=]\s*["']?[^"'\s]+["']?/gi,
  },
  {
    type: "API Key",
    severity: "High",
    regex: /(api[_-]?key)\s*[:=]\s*["']?[^"'\s]+["']?/gi,
  },
  {
    type: "GitHub Token",
    severity: "High",
    regex: /ghp_[A-Za-z0-9]{20,}/g,
  },
  {
    type: "AWS Access Key",
    severity: "High",
    regex: /AKIA[0-9A-Z]{16}/g,
  },
  {
    type: "Google API Key",
    severity: "High",
    regex: /AIza[A-Za-z0-9_-]{20,}/g,
  },
  {
    type: "JWT Token",
    severity: "Medium",
    regex: /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9._-]+\.[A-Za-z0-9._-]+/g,
  },
  {
    type: "Bearer Token",
    severity: "Medium",
    regex: /Bearer\s+[A-Za-z0-9\-._~+/=]+/gi,
  },
  {
    type: "OpenAI API Key",
    severity: "High",
    regex: /sk-[A-Za-z0-9]{20,}/g,
  },
  {
    type: "Stripe Secret Key",
    severity: "High",
    regex: /sk_live_[A-Za-z0-9]{16,}/g,
  },
  {
    type: "Secret Key",
    severity: "Medium",
    regex: /(secret|secret_key)\s*[:=]\s*["']?[^"'\s]+["']?/gi,
  },
];

function maskValue(match) {
  return match.length > 10 ? match.substring(0, 5) + "********" : "********";
}

function scanText(text) {
  const findings = [];
  const lines = text.split("\n");

  lines.forEach((line, index) => {
    patterns.forEach((pattern) => {
      const matches = line.match(pattern.regex);
      if (!matches) return;

      // Skip the generic "API Key" check if it is really a Google API key
      if (pattern.type === "API Key" && /AIza/.test(line)) return;

      matches.forEach((match) => {
        findings.push({
          line: index + 1,
          type: pattern.type,
          severity: pattern.severity,
          value: maskValue(match),
        });
      });
    });
  });

  return findings;
}

module.exports = { scanText };