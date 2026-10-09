const patterns = [
  { name: "AWS Access Key", regex: /AKIA[0-9A-Z]{16}/ },
  { name: "GitHub Token", regex: /ghp_[A-Za-z0-9]{36}/ },
  { name: "Hardcoded Password", regex: /password\s*=\s*["'][^"']+["']/i },
];

function scanText(text) {
  const findings = [];
  const lines = text.split("\n");

  lines.forEach((line, index) => {
    patterns.forEach((pattern) => {
      if (pattern.regex.test(line)) {
        findings.push({ type: pattern.name, line: index + 1 });
      }
    });
  });

  return findings;
}

module.exports = { scanText };