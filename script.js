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

const patterns = [

    {
        type: "Password",
        severity: "High",
        regex: /(password|passwd|db_password|dbpasswd)\s*[:=]\s*["']?[^"'\s]+["']?/gi
    },

    {
        type: "API Key",
        severity: "High",
        regex: /(api[_-]?key)\s*[:=]\s*["']?[^"'\s]+["']?/gi
    },

    {
        type: "GitHub Token",
        severity: "High",
        regex: /ghp_[A-Za-z0-9]{20,}/g
    },

    {
        type: "AWS Access Key",
        severity: "High",
        regex: /AKIA[0-9A-Z]{16}/g
    },

    {
        type: "Google API Key",
        severity: "High",
        regex: /AIza[A-Za-z0-9_-]{20,}/g
    },

    {
        type: "JWT Token",
        severity: "Medium",
        regex: /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9._-]+\.[A-Za-z0-9._-]+/g
    },

    {
        type: "Bearer Token",
        severity: "Medium",
        regex: /Bearer\s+[A-Za-z0-9\-._~+/=]+/gi
    },

    {
        type: "OpenAI API Key",
        severity: "High",
        regex: /sk-[A-Za-zA-Z0-9]{20,}/g
    },

    {
        type: "Stripe Secret Key",
        severity: "High",
        regex: /sk_live_[A-Za-z0-9]{16,}/g
    },

    {
        type: "Secret Key",
        severity: "Medium",
        regex: /(secret|secret_key)\s*[:=]\s*["']?[^"'\s]+["']?/gi
    }

];

scanBtn.addEventListener("click", () => {

    const files = fileInput.files;

    if (files.length === 0) {
        alert("Please select at least one file.");
        return;
    }

    resultBody.innerHTML = "";
    reportData = [];

    let totalSecrets = 0;
    let high = 0;
    let medium = 0;

    let processedFiles = 0;

    Array.from(files).forEach(file => {

        const reader = new FileReader();

        reader.onload = function(e){

            const text = e.target.result;

            const lines = text.split("\n");

            lines.forEach((line,index)=>{

                patterns.forEach(pattern=>{

                   const matches = line.match(pattern.regex);

if(matches){

    // Skip generic API Key detection if it is actually a Google API Key
    if(pattern.type==="API Key" && /AIza/.test(line)){
        return;
    }

                        matches.forEach(match=>{

                            totalSecrets++;

                            if(pattern.severity==="High")
                                high++;
                            else
                                medium++;

                            const masked =
                                match.length > 10
                                ? match.substring(0,5) + "********"
                                : "********";

                            reportData.push({
                                file:file.name,
                                line:index+1,
                                type:pattern.type,
                                severity:pattern.severity,
                                value:masked
                            });

                            const row=`
                            <tr>
                                <td>${file.name}</td>
                                <td>${index+1}</td>
                                <td>${pattern.type}</td>
                                <td class="${pattern.severity.toLowerCase()}">
                                    ${pattern.severity}
                                </td>
                                <td>${masked}</td>
                            </tr>
                            `;

                            resultBody.innerHTML += row;

                        });

                    }

                });

            });

            processedFiles++;

            if(processedFiles===files.length){

                filesCount.textContent = files.length;
                secretCount.textContent = totalSecrets;
                highCount.textContent = high;
                mediumCount.textContent = medium;

                resultTable.style.display =
                    reportData.length ? "table" : "none";

                downloadBtn.style.display =
                    reportData.length ? "block" : "none";

                if(reportData.length===0){

                   summary.innerHTML=`
<div class="no-secret">
<b>✅ Scan Completed Successfully</b><br><br>

Files Scanned : ${files.length}<br>
Secrets Detected : 0<br>
Status : No Sensitive Information Found
</div>`;

                }else{

                    summary.innerHTML=`
<div class="secret-found">
<b>⚠ Scan Completed Successfully</b><br><br>

Files Scanned : ${files.length}<br>
Secrets Detected : ${totalSecrets}<br>
Status : Potential Secret Exposure Detected
</div>`;

                }

            }

        };

        reader.readAsText(file);

    });

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