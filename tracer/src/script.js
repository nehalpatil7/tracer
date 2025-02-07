const vscode = acquireVsCodeApi();

document.addEventListener('DOMContentLoaded', () => {
    // header
    const historyIcon = document.getElementById("historyIcon");
    const historyView = document.getElementById("historyView");
    // main
    const mainContainer = document.querySelector('main');
    // input area
    const queryInput = document.getElementById('queryInput');
    const queryText = document.querySelector('.query-text');
    // tabs view/area
    const tabs = document.querySelectorAll('.tab');
    const tabContainer = document.querySelector('.tab-container');
    // attachments
    const attachButton = document.getElementById("attachButton");
    const attachmentSearch = document.getElementById("attachmentSearch");
    const attachmentDropdown = document.getElementById("attachmentDropdown");
    const attachmentContainer = document.getElementById("attachmentContainer");
    const attachedFiles = new Set();
    //submit button
    const submitButton = document.getElementById('submitButton');
    submitButton.disabled = true;


    document.getElementById("newChat").addEventListener("click", () => {
        if (mainContainer) mainContainer.style.display = 'flex';
        if (tabContainer) tabContainer.style.display = 'none';
        if (historyView) historyView.classList.add("hidden");
    });

    // Toggle history view
    historyIcon.addEventListener("click", () => {
        if (mainContainer) mainContainer.style.display = 'none';
        // document.getElementById("plan-specs-container").classList.add("hidden");
        if (historyView) {
            historyView.classList.remove("hidden");
            renderHistoryView();
        }
    });

    // handle input area
    queryInput.addEventListener('input', function () {
        if (queryInput.value.trim() === '') {
            submitButton.disabled = true;
        } else {
            submitButton.disabled = false;
        }
    });
    document.addEventListener("click", (e) => {
        if (!attachmentContainer.contains(e.target)) {
            closeDropdown();
        }
    });
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            closeDropdown();
        }
    });
    attachmentContainer.addEventListener("click", (e) => {
        e.stopPropagation();
    });

    // Filter dropdown item search
    attachmentSearch.addEventListener("input", () => {
        const searchTerm = attachmentSearch.value.toLowerCase();
        const items = attachmentDropdown.querySelectorAll(".dropdown-item");
        items.forEach(item => {
            item.classList.toggle("hidden", !item.textContent.toLowerCase().includes(searchTerm));
        });
    });

    // Handle attachment dropdown
    attachButton.addEventListener("click", (e) => {
        e.stopPropagation();
        const queryWidth = queryInput.offsetWidth;
        attachmentSearch.style.width = (queryWidth * 0.5) + "px";
        attachmentDropdown.style.width = (queryWidth * 0.9) + "px";
        attachButton.classList.add("hidden");
        attachmentSearch.classList.remove("hidden");
        attachmentDropdown.classList.remove("hidden");
        vscode.postMessage({ command: "getAllFiles" });
    });

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active class from all tabs & content
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

            // Add active class to clicked tab
            tab.classList.add('active');

            // Show corresponding content
            const contentId = tab.getAttribute('data-tab');
            document.getElementById(contentId).classList.add('active');
        });
    });

    // Update the query text when submit button is clicked
    submitButton.addEventListener('click', () => {
        const query = queryInput.value.trim();
        if (query) {
            if (mainContainer) mainContainer.style.display = 'none';
            if (tabContainer) {
                tabContainer.style.display = 'flex';
                if (queryText) queryText.textContent = query;
            }
            // Send message to extension
            vscode.postMessage({ command: "submitQuery", text: query });
            queryInput.value = '';
        }
    });

    // Handle messages from extension
    window.addEventListener('message', event => {
        const message = event.data;
        switch (message.command) {
            case 'updateOpenFiles':
                populateDropdown(message.files);
                break;

            case 'updateHistory':
                const historyView = document.getElementById("historyView");
                historyView.innerHTML = '';

                message.history.forEach(query => {
                    const item = document.createElement('div');
                    item.className = 'history-item';
                    item.textContent = query;
                    item.addEventListener('click', () => {
                        document.getElementById("queryInput").value = query;
                    });
                    historyView.appendChild(item);
                });
                break;

            case 'updateProgress':
                const progressFill = document.querySelector('.progress-fill');
                const progressLabel = document.querySelector('.progress-label');
                const progressPercentage = document.querySelector('.progress-percentage');

                if (message.progress > 0 && message.progress <= 100) {
                    progressLabel.textContent = 'Scanning files...';
                    progressFill.style.width = message.progress + '%';;
                    progressPercentage.textContent = message.progress + '%';
                    if (message.progress == 100) {
                        progressLabel.textContent = 'Scan complete.';
                        setTimeout(() => {
                            document.querySelector('.progress-container').style.opacity = '0';
                        }, 2000);
                    }
                } else {
                    console.log("An error occurred in indexing.")
                }

            case 'renderPlanSpecs':
                // Save
                savePlanSpecHistory(message.data);
                // Render
                renderPlanSpecsContent(message.data);
                break;

            case 'selectAttachment':
                if (!attachedFiles.has(fileName) && message.fileName && message.filePath) {
                    attachedFiles.add(message.fileName);
                    console.log(`File attached: ${message.fileName}`);
                }
                break;
        }
    });
});

function addAttachedFile(fileName, filePath) {
    // If the container doesn't exist, create it
    const container = document.getElementById("attachedFilesContainer");

    // Create the attachment chip
    const fileDiv = document.createElement("div");
    fileDiv.className = "attached-file";
    fileDiv.innerHTML = `
        <span>${fileName}</span>
        <button class="remove-file">&times;</button>
    `;

    // Remove the attachment on clicking the remove icon
    fileDiv.querySelector(".remove-file").addEventListener("click", () => {
        container.removeChild(fileDiv);
        updateTextareaPadding();
        // Optionally, send a message to update your backend process
    });
    container.appendChild(fileDiv);
}

function populateDropdown(files) {
    attachmentDropdown.innerHTML = "";
    files.forEach(file => {
        const item = document.createElement("div");
        item.className = "dropdown-item";
        const img = document.createElement("img");
        img.className = "language-icon";
        img.src = getLanguageIcon(file.name);
        img.alt = file.name;
        img.style.width = "20px";
        img.style.height = "20px";
        const textSpan = document.createElement("span");
        textSpan.textContent = file.name;

        item.appendChild(img);
        item.appendChild(textSpan);
        item.addEventListener("click", () => {
            vscode.postMessage({
                command: "selectAttachment",
                filePath: file.path,
                fileName: file.name
            });
            // update the UI immediately
            addAttachedFile(file.name, file.path);
            closeDropdown();
            updateAttachmentsWrapperPadding();
            updateTextareaPadding();
        });

        attachmentDropdown.appendChild(item);
    });
    console.log("Dropdown populated.");
}

function closeDropdown() {
    attachmentDropdown.classList.add("hidden");
    attachmentSearch.classList.add("hidden");
    attachButton.classList.remove("hidden");
}

function updateAttachmentsWrapperPadding() {
    const fab = document.getElementById("attachButton");
    const searchBox = document.getElementById("attachmentSearch");
    const wrapper = document.querySelector(".attachments-wrapper");
    let offset = fab.offsetWidth + 5;
    if (!searchBox.classList.contains("hidden")) {
        offset += searchBox.offsetWidth + 5;
    }
    wrapper.style.paddingLeft = offset + "px";
}

function updateTextareaPadding() {
    const attachmentContainer = document.getElementById("attachmentContainer");
    const textarea = document.getElementById("queryInput");
    textarea.style.paddingBottom = (attachmentContainer.offsetHeight + 5) + "px";
}

function renderPlanSpecsContent(planSpec) {
    // Only render if in planning/tabs view
    const tabContainer = document.querySelector('.tab-container');
    if (!tabContainer || window.getComputedStyle(tabContainer).display === 'none') {
        return;
    }
    let data;
    if (!planSpec) {
        const storedData = localStorage.getItem('planSpecsData');
        if (storedData) {
            data = JSON.parse(storedData);
        } else {
            return;
        }
    } else {
        data = planSpec;
    }

    // Locate plan specs container
    const container = document.getElementById('plan-specs');
    if (!container) return;
    container.innerHTML = "";

    // Summary
    const summaryTitle = document.createElement('h3');
    summaryTitle.textContent = 'Summary';
    container.appendChild(summaryTitle);
    // content
    const summaryTextarea = document.createElement('textarea');
    summaryTextarea.style.width = '100%';
    summaryTextarea.style.marginBottom = '1rem';
    summaryTextarea.value = data.summary || '';
    container.appendChild(summaryTextarea);

    // Files
    data.files.forEach((file, index) => {
        // container
        const fileSection = document.createElement('div');
        fileSection.classList.add('file-section');
        fileSection.style.marginBottom = '1rem';
        fileSection.style.border = '1px solid #444';
        fileSection.style.padding = '0.5rem';
        fileSection.style.borderRadius = '4px';
        // fileName row
        const titleRow = document.createElement('div');
        titleRow.style.display = 'flex';
        titleRow.style.alignItems = 'center';
        titleRow.style.justifyContent = 'space-between';
        titleRow.style.marginBottom = '0.3rem';
        // fileName
        const pathLabel = document.createElement('span');
        pathLabel.textContent = file.path;
        pathLabel.style.color = 'blue';
        pathLabel.style.flexGrow = '1';
        // file status
        const statusButton = document.createElement('button');
        statusButton.textContent = file.status;
        statusButton.style.marginLeft = '1rem';
        // delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.innerHTML = '&times;';
        deleteBtn.style.marginLeft = '1rem';
        deleteBtn.style.background = 'none';
        deleteBtn.style.border = 'none';
        deleteBtn.style.fontSize = '1rem';
        deleteBtn.style.cursor = 'pointer';
        // append components
        titleRow.appendChild(pathLabel);
        titleRow.appendChild(statusButton);
        titleRow.appendChild(deleteBtn);
        fileSection.appendChild(titleRow);
        // file content
        const fileContentTextarea = document.createElement('textarea');
        fileContentTextarea.style.width = '100%';
        fileContentTextarea.value = file.content || '';
        fileSection.appendChild(fileContentTextarea);
        // Append file container
        container.appendChild(fileSection);

        // delete this file & update localStorage
        deleteBtn.addEventListener('click', () => {
            data.files.splice(index, 1);
            savePlanSpecHistory(data);
            renderPlanSpecsContent();
        });
    });
}

// Helper: generate uuid
function generateUniqueId() {
    return (crypto && crypto.randomUUID) ? crypto.randomUUID() : Date.now().toString();
}

async function savePlanSpecHistory(planSpec) {
    planSpec.id = generateUniqueId();
    planSpec.timestamp = new Date().toISOString();
    planSpec.status = "code" in planSpec
        ? "Code Generated"
        : "files" in planSpec
            ? "Plan Generated"
            : "Failed";

    try {
        const url = new URL("http://localhost:5001/infer_title");
        url.searchParams.append("summary", planSpec.summary);
        const response = await fetch(url.toString());
        planSpec.title = response.title || "Untitled Plan";
    } catch (error) {
        console.error("Error inferring title", error);
        planSpec.title = "Untitled Plan";
    }
    let tasks = JSON.parse(localStorage.getItem("historyTasks") || "[]");
    tasks.push(planSpec);
    localStorage.setItem("historyTasks", JSON.stringify(tasks));
    console.log("Plan saved.");
}

function updatePlanSpecInHistory(updatedTask) {
    let tasks = JSON.parse(localStorage.getItem("historyTasks") || "[]");
    tasks = tasks.map(task => task.id === updatedTask.id ? updatedTask : task);
    localStorage.setItem("historyTasks", JSON.stringify(tasks));
    console.log("Plan updated.");
}

function renderHistoryView() {
    const historyContainer = document.getElementById("historyView");
    historyContainer.classList.remove("hidden");
    historyContainer.innerHTML = "";

    const tasks = JSON.parse(localStorage.getItem("historyTasks") || "[]");
    if (!tasks.length) {
        const noHistoryDiv = document.createElement("div");
        noHistoryDiv.textContent = "No history found.";
        noHistoryDiv.classList.add("no-history");
        historyContainer.appendChild(noHistoryDiv);
        document.querySelector('main').style.display = 'none';
        document.querySelector('.tab-container').style.display = 'none';
        return;
    }

    tasks.forEach(task => {
        const taskElement = document.createElement('div');
        taskElement.className = 'task';

        taskElement.innerHTML = `
            <div class="task-header">
                <div class="task-title">${task.title}</div>
                <div class="task-info">
                    <span class="task-date">${new Intl.DateTimeFormat('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true
                        }).format(new Date(task.timestamp))}
                    </span>
                    <button class="task-button ${task.status}">
                        ${task.status === "Failed"
                                        ? `<svg class="w-6 h-6 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none" viewBox="0 0 24 24">
                            <path stroke="currentColor" stroke-linejoin="round" stroke-width="2" d="M10 3v4a1 1 0 0 1-1 1H5m14-4v16a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7.914a1 1 0 0 1 .293-.707l3.914-3.914A1 1 0 0 1 9.914 3H18a1 1 0 0 1 1 1Z"/>
                            </svg>`
                                        : `<svg class="w-6 h-6 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none" viewBox="0 0 24 24">
                            <path stroke="currentColor" stroke-linejoin="round" stroke-width="2" d="M10 3v4a1 1 0 0 1-1 1H5m4 6 2 2 4-4m4-8v16a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7.914a1 1 0 0 1 .293-.707l3.914-3.914A1 1 0 0 1 9.914 3H18a1 1 0 0 1 1 1Z"/>
                            </svg>`
                        }${task.status}
                    </button>
                </div>
            </div>
            <div class="task-content">
                ${task.summary}
            </div>
        `
        historyContainer.appendChild(taskElement);
    });
}


function getLanguageIcon(fileName) {
    const ext = fileName.substring(fileName.lastIndexOf('.'));
    switch (ext) {
        case ".3d": return window.myIconBase + "3d.svg";
        case ".apk": return window.myIconBase + "/android.svg";
        case ".ng": return window.myIconBase + "/angular.svg";
        case ".apollo": return window.myIconBase + "/apollo.svg";
        case ".applescript": return window.myIconBase + "/applescript.svg";
        case ".arch": return window.myIconBase + "/architecture.svg";
        case ".ino": return window.myIconBase + "/arduino.svg";
        case ".mp3":
        case ".wav":
        case ".flac": return window.myIconBase + "/audio.svg";
        case ".azure": return window.myIconBase + "/azure.svg";
        case ".bitbucket": return window.myIconBase + "/bitbucket.svg";
        case ".c": return window.myIconBase + "/c.svg";
        case ".chrome": return window.myIconBase + "/chrome.svg";
        case ".cmake": return window.myIconBase + "/cmake.svg";
        case ".cbl":
        case ".cob": return window.myIconBase + "/cobol.svg";
        case ".coffee": return window.myIconBase + "/coffee.svg";
        case ".cmd": return window.myIconBase + "/command.svg";
        case ".console": return window.myIconBase + "/console.svg";
        case ".copilot": return window.myIconBase + "/copilot.svg";
        case ".cpp": return window.myIconBase + "/cpp.svg";
        case ".cs": return window.myIconBase + "/csharp.svg";
        case ".css": return window.myIconBase + "/css.svg";
        case ".cu": return window.myIconBase + "/cuda.svg";
        case ".cy": return window.myIconBase + "/cypress.svg";
        case ".dart": return window.myIconBase + "/dart.svg";
        case ".db":
        case ".sql": return window.myIconBase + "/database.svg";
        case ".django": return window.myIconBase + "/django.svg";
        case ".dll": return window.myIconBase + "/dll.svg";
        case ".dockerfile": return window.myIconBase + "/docker.svg";
        case ".doc":
        case ".docx": return window.myIconBase + "/document.svg";
        case ".drawio": return window.myIconBase + "/drawio.svg";
        case ".ejs": return window.myIconBase + "/ejs.svg";
        case ".ex":
        case ".exs": return window.myIconBase + "/elixir.svg";
        case ".email": return window.myIconBase + "/email.svg";
        case ".erl": return window.myIconBase + "/erlang.svg";
        case ".eslintrc": return window.myIconBase + "/eslint.svg";
        case ".figma": return window.myIconBase + "/figma.svg";
        case ".firebase": return window.myIconBase + "/firebase.svg";
        case ".ttf":
        case ".otf": return window.myIconBase + "/font.svg";
        case ".f":
        case ".for":
        case ".f90": return window.myIconBase + "/fortran.svg";
        case ".gcp": return window.myIconBase + "/gcp.svg";
        case ".gemini": return window.myIconBase + "/gemini-ai.svg";
        case ".gitignore": return window.myIconBase + "/git.svg";
        case ".gitlab": return window.myIconBase + "/gitlab.svg";
        case ".go": return window.myIconBase + "/go.svg";
        case ".html":
        case ".htm": return window.myIconBase + "/html.svg";
        case ".http": return window.myIconBase + "/http.svg";
        case ".jar": return window.myIconBase + "/jar.svg";
        case ".java": return window.myIconBase + "/java.svg";
        case ".class": return window.myIconBase + "/javaclass.svg";
        case ".js": return window.myIconBase + "/javascript.svg";
        case ".jest": return window.myIconBase + "/jest.svg";
        case ".jsconfig": return window.myIconBase + "/jsconfig.svg";
        case ".json": return window.myIconBase + "/json.svg";
        case ".kt": return window.myIconBase + "/kotlin.svg";
        case ".md": return window.myIconBase + "/markdown.svg";
        case ".m": return window.myIconBase + "/matlab.svg";
        case ".maven": return window.myIconBase + "/maven.svg";
        case ".next": return window.myIconBase + "/next.svg";
        case ".nginx": return window.myIconBase + "/nginx.svg";
        case ".node": return window.myIconBase + "/nodejs.svg";
        case ".nodemon": return window.myIconBase + "/nodemon.svg";
        case ".npm": return window.myIconBase + "/npm.svg";
        case ".nuxt": return window.myIconBase + "/nuxt.svg";
        case ".mm": return window.myIconBase + "/objective-cpp.svg";
        case ".openapi": return window.myIconBase + "/openapi.svg";
        case ".pas": return window.myIconBase + "/pascal.svg";
        case ".pdf": return window.myIconBase + "/pdf.svg";
        case ".pl": return window.myIconBase + "/perl.svg";
        case ".php": return window.myIconBase + "/php.svg";
        case ".sh": return window.myIconBase + "/bash.svg";
        case ".ps1": return window.myIconBase + "/powershell.svg";
        case ".prisma": return window.myIconBase + "/prisma.svg";
        case ".py": return window.myIconBase + "/python.svg";
        case ".jsx": return window.myIconBase + "/react.svg";
        case ".redux-action": return window.myIconBase + "/redux-action.svg";
        case ".redux-reducer": return window.myIconBase + "/redux-reducer.svg";
        case ".redux-selector": return window.myIconBase + "/redux-selector.svg";
        case ".redux-store": return window.myIconBase + "/redux-store.svg";
        case ".reg": return window.myIconBase + "/regedit.svg";
        case ".rb": return window.myIconBase + "/ruby.svg";
        case ".rs": return window.myIconBase + "/rust.svg";
        case ".salesforce": return window.myIconBase + "/salesforce.svg";
        case ".sass":
        case ".scss": return window.myIconBase + "/sass.svg";
        case ".scala": return window.myIconBase + "/scala.svg";
        case ".jsonc":
        case ".settings": return window.myIconBase + "/settings.svg";
        case ".sol": return window.myIconBase + "/solidity.svg";
        case ".sonarcloud": return window.myIconBase + "/sonarcloud.svg";
        case ".sublime-project": return window.myIconBase + "/sublime.svg";
        case ".supabase": return window.myIconBase + "/supabase.svg";
        case ".svelte": return window.myIconBase + "/svelte.svg";
        case ".swagger": return window.myIconBase + "/swagger.svg";
        case ".swift": return window.myIconBase + "/swift.svg";
        case ".tailwind": return window.myIconBase + "/tailwindcss.svg";
        case ".tf": return window.myIconBase + "/terraform.svg";
        case ".tsconfig": return window.myIconBase + "/tsconfig.svg";
        case ".ts": return window.myIconBase + "/typescript.svg";
        case ".uml": return window.myIconBase + "/uml.svg";
        case ".unity": return window.myIconBase + "/unity.svg";
        case ".vedic": return window.myIconBase + "/vedic.svg";
        case ".vercel": return window.myIconBase + "/vercel.svg";
        case ".mp4":
        case ".avi":
        case ".mov": return window.myIconBase + "/video.svg";
        case ".vim": return window.myIconBase + "/vim.svg";
        case ".vs":
        case ".vsix": return window.myIconBase + "/visualstudio.svg";
        case ".vite": return window.myIconBase + "/vite.svg";
        case ".vscode": return window.myIconBase + "/vscode.svg";
        case ".vue": return window.myIconBase + "/vue.svg";
        case ".vue-config": return window.myIconBase + "/vue-config.svg";
        case ".zip": return window.myIconBase + "/zip.svg";
        default: return window.myIconBase + "/document.svg";
    }
}
