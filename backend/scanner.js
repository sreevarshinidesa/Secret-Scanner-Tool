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
    {
    type: "Private Key",
    severity: "High",
    regex: /-----BEGIN (RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/g,
  },
  {
    type: "Slack Token",
    severity: "High",
    regex: /xox[baprs]-[A-Za-z0-9-]{10,}/g,
  },
  {
    type: "SendGrid API Key",
    severity: "High",
    regex: /SG\.[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,}/g,
  },
  {
    type: "Database URL with Password",
    severity: "High",
    regex: /(mongodb(\+srv)?|postgres(ql)?|mysql):\/\/[^:\s]+:[^@\s]+@[^\s]+/gi,
  },
];

function maskValue(match) {
  return match.length > 10 ? match.substring(0, 5) + "********" : "********";
}

function shannonEntropy(str) {
  const counts = {};
  for (const ch of str) {
    counts[ch] = (counts[ch] || 0) + 1;
  }

  let entropy = 0;
  for (const ch in counts) {
    const p = counts[ch] / str.length;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

const ENTROPY_THRESHOLD = 4.3;

const SAFE_VALUE = /(process\.env|os\.environ|getenv|\$\{|<[A-Za-z_ ]+>|your[_-]|changeme|placeholder)/i;
const VALUE_PATTERNS = ["Password", "API Key", "Secret Key"];


function scanText(text) {
  const findings = [];
  const lines = text.split("\n");

  lines.forEach((line, index) => {
    let foundOnLine = false;

    patterns.forEach((pattern) => {
      const matches = line.match(pattern.regex);
      if (!matches) return;

      // Skip the generic "API Key" check if it is really a Google API key
      if (pattern.type === "API Key" && /AIza/.test(line)) return;

            matches.forEach((match) => {
        // Skip safe code like process.env.X or placeholder values
        if (VALUE_PATTERNS.includes(pattern.type) && SAFE_VALUE.test(match)) return;

        foundOnLine = true;
        findings.push({
          line: index + 1,
          type: pattern.type,
          severity: pattern.severity,
          value: maskValue(match),
        });
      });
    });

    // If no known pattern matched, look for random-looking long strings
    if (!foundOnLine) {
      const candidates = line.match(/[A-Za-z0-9+/=_-]{20,}/g) || [];

      candidates.forEach((candidate) => {
        if (shannonEntropy(candidate) >= ENTROPY_THRESHOLD) {
          findings.push({
            line: index + 1,
            type: "High Entropy String",
            severity: "Medium",
            value: maskValue(candidate),
          });
        }
      });
    }
  });

  return findings;
}

module.exports = { scanText };