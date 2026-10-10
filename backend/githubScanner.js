const { scanText } = require("./scanner");

const SKIP_FOLDERS = ["node_modules/", ".git/", "dist/", "build/", "vendor/"];
const SKIP_EXTENSIONS = /\.(png|jpe?g|gif|svg|ico|pdf|zip|gz|mp3|mp4|woff2?|ttf|eot)$/i;
const SKIP_FILES = /(package-lock\.json|yarn\.lock|pnpm-lock\.yaml)$/i;
const MAX_FILES = 100;
const MAX_FILE_SIZE = 200 * 1024; // 200 KB

function parseRepoUrl(url) {
  const match = url.trim().match(/github\.com\/([^\/\s]+)\/([^\/\s#?]+)/i);
  if (!match) return null;
  return { owner: match[1], repo: match[2].replace(/\.git$/i, "") };
}

async function scanRepo(repoUrl) {
  const parsed = parseRepoUrl(repoUrl);
  if (!parsed) throw new Error("Please enter a valid GitHub repo link");

  const { owner, repo } = parsed;
  const headers = {
    "User-Agent": "secret-scanner-tool",
    Accept: "application/vnd.github+json",
  };

  // 1. Find the default branch
  const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
  if (repoRes.status === 404) throw new Error("Repo not found (is it public?)");
  if (repoRes.status === 403) throw new Error("GitHub limit reached, try again later");
  if (!repoRes.ok) throw new Error("GitHub error: " + repoRes.status);
  const branch = (await repoRes.json()).default_branch;

  // 2. Get the list of all files
  const treeRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
    { headers }
  );
  if (!treeRes.ok) throw new Error("Could not read the repo files");
  const tree = await treeRes.json();

  const allFiles = tree.tree.filter(
    (item) =>
      item.type === "blob" &&
      item.size <= MAX_FILE_SIZE &&
      !SKIP_FOLDERS.some((folder) => item.path.includes(folder)) &&
      !SKIP_EXTENSIONS.test(item.path) &&
      !SKIP_FILES.test(item.path)
  );
  const files = allFiles.slice(0, MAX_FILES);

  // 3. Download and scan the files, 10 at a time
  const findings = [];

  for (let i = 0; i < files.length; i += 10) {
    const batch = files.slice(i, i + 10);

    await Promise.all(
      batch.map(async (file) => {
        const safePath = file.path.split("/").map(encodeURIComponent).join("/");
        const res = await fetch(
          `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${safePath}`
        );
        if (!res.ok) return;

        const text = await res.text();
        scanText(text, file.path).forEach((f) => findings.push({ ...f, file: file.path }));
      })
    );
  }

  return {
    repoName: `${owner}/${repo}`,
    filesScanned: files.length,
    truncated: allFiles.length > MAX_FILES,
    findings,
  };
}

module.exports = { scanRepo };