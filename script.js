const fileInput = document.getElementById("fileInput");
const scanBtn = document.getElementById("scanBtn");
const resultBody = document.getElementById("resultBody");
const resultTable = document.getElementById("resultTable");
const summary = document.getElementById("summary");
const downloadBtn = document.getElementById("downloadBtn");

const filesCount = document.getElementById("filesCount");
const secretCount = document.getElementById("secretCount");
const highCount = document.getElementById("highCount");
const mediumCount = document.getElementById("mediumCount");

let reportData = [];



const API_URL = "http://localhost:5000/scan";

scanBtn.addEventListener("click", async () => {

    const files = fileInput.files;

    if (files.length === 0) {
        alert("Please select at least one file.");
        return;
    }

    resultBody.innerHTML = "";
    reportData = [];

    let high = 0;
    let medium = 0;

    try {

        for (const file of files) {

            const text = await file.text();

            if (!text) continue; // skip empty files

                        const token = localStorage.getItem("token");
            const headers = { "Content-Type": "application/json" };
            if (token) {
                headers["Authorization"] = "Bearer " + token;
            }

            const response = await fetch(API_URL, {
                method: "POST",
                headers: headers,
                body: JSON.stringify({ text, fileName: file.name })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Server error");
            }

            data.findings.forEach(f => {

                if (f.severity === "High") high++;
                else medium++;

                reportData.push({
                    file: file.name,
                    line: f.line,
                    type: f.type,
                    severity: f.severity,
                    value: f.value
                });

                resultBody.innerHTML += `
                <tr>
                    <td>${file.name}</td>
                    <td>${f.line}</td>
                    <td>${f.type}</td>
                    <td class="${f.severity.toLowerCase()}">${f.severity}</td>
                    <td>${f.value}</td>
                </tr>
                `;

            });

        }

    } catch (err) {
        alert("Could not scan. Is your backend running on port 5000?");
        console.error(err);
        return;
    }

    const totalSecrets = reportData.length;

    filesCount.textContent = files.length;
    secretCount.textContent = totalSecrets;
    highCount.textContent = high;
    mediumCount.textContent = medium;

    resultTable.style.display = totalSecrets ? "table" : "none";
    downloadBtn.style.display = totalSecrets ? "block" : "none";

    if (totalSecrets === 0) {
        summary.innerHTML = `
<div class="no-secret">
<b>✅ Scan Completed Successfully</b><br><br>
Files Scanned : ${files.length}<br>
Secrets Detected : 0<br>
Status : No Sensitive Information Found
</div>`;
    } else {
        summary.innerHTML = `
<div class="secret-found">
<b>⚠ Scan Completed Successfully</b><br><br>
Files Scanned : ${files.length}<br>
Secrets Detected : ${totalSecrets}<br>
Status : Potential Secret Exposure Detected
</div>`;
    }
        loadHistory();

});

downloadBtn.addEventListener("click",()=>{

    const blob=new Blob(
        [JSON.stringify(reportData,null,4)],
        {type:"application/json"}
    );

    const link=document.createElement("a");

    link.href=URL.createObjectURL(blob);

    link.download="scan-report.json";

    link.click();

});

// ---------- Login / Sign up ----------

const BASE_URL = "http://localhost:5000";

const emailInput = document.getElementById("emailInput");
const passwordInput = document.getElementById("passwordInput");
const loginBtn = document.getElementById("loginBtn");
const signupBtn = document.getElementById("signupBtn");
const logoutBtn = document.getElementById("logoutBtn");
const loggedOut = document.getElementById("loggedOut");
const loggedIn = document.getElementById("loggedIn");
const userLabel = document.getElementById("userLabel");
const authMessage = document.getElementById("authMessage");

function showAuthState() {
    const token = localStorage.getItem("token");
    const email = localStorage.getItem("userEmail");

    if (token) {
        loggedOut.style.display = "none";
        loggedIn.style.display = "block";
        userLabel.textContent = "Logged in as " + email;
        loadHistory();
    } else {
        loggedOut.style.display = "block";
        loggedIn.style.display = "none";
        historyBox.style.display = "none";
    }
}

async function sendAuthRequest(path) {
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
        authMessage.textContent = "Please enter email and password.";
        return null;
    }

    try {
        const response = await fetch(BASE_URL + path, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            authMessage.textContent = data.error || "Something went wrong.";
            return null;
        }

        return { data, email };

    } catch (err) {
        authMessage.textContent = "Could not reach the server. Is it running?";
        return null;
    }
}

signupBtn.addEventListener("click", async () => {
    const result = await sendAuthRequest("/register");
    if (result) {
        authMessage.textContent = "Account created. Now click Login.";
    }
});

loginBtn.addEventListener("click", async () => {
    const result = await sendAuthRequest("/login");
    if (result) {
        localStorage.setItem("token", result.data.token);
        localStorage.setItem("userEmail", result.email);
        passwordInput.value = "";
        authMessage.textContent = "";
        showAuthState();
    }
});

logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userEmail");
    authMessage.textContent = "";
    showAuthState();
});

// ---------- Past scans ----------

const historyBox = document.getElementById("historyBox");
const historyBody = document.getElementById("historyBody");
const historyEmpty = document.getElementById("historyEmpty");
const refreshHistoryBtn = document.getElementById("refreshHistoryBtn");

async function loadHistory() {
    const token = localStorage.getItem("token");

    if (!token) {
        historyBox.style.display = "none";
        return;
    }

    try {
        const response = await fetch(BASE_URL + "/scans", {
            headers: { Authorization: "Bearer " + token }
        });

        // Token expired or invalid: log the user out
        if (response.status === 401) {
            localStorage.removeItem("token");
            localStorage.removeItem("userEmail");
            showAuthState();
            return;
        }

        const data = await response.json();

        historyBody.innerHTML = "";
        historyBox.style.display = "block";
        historyEmpty.textContent = data.scans.length ? "" : "No scans yet.";

        data.scans.forEach(scan => {
            const row = document.createElement("tr");

            [scan.fileName, scan.totalFindings, new Date(scan.createdAt).toLocaleString()]
                .forEach(value => {
                    const cell = document.createElement("td");
                    cell.textContent = value;
                    row.appendChild(cell);
                });

            historyBody.appendChild(row);
        });

    } catch (err) {
        console.error(err);
    }
}

refreshHistoryBtn.addEventListener("click", loadHistory);

showAuthState();