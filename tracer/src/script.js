const vscode = acquireVsCodeApi();

document.addEventListener('DOMContentLoaded', () => {
    // header
    const newChat = document.getElementById('newChat');
    const historyIcon = document.getElementById('historyIcon');
    const historyView = document.getElementById('historyView');
    // main
    const mainContainer = document.querySelector('main');
    // input area
    const queryInput = document.getElementById('queryInput');
    const queryText = document.querySelector('.query-text');
    // tabs view/area
    const tabContainer = document.querySelector('.tab-container');
    // attachments
    const attachButton = document.getElementById('attachButton');
    const attachmentSearch = document.getElementById('attachmentSearch');
    const attachmentDropdown = document.getElementById('attachmentDropdown');
    const attachmentContainer = document.getElementById('attachmentContainer');
    const attachedFiles = new Set();
    // submit button
    const submitButton = document.getElementById('submitButton');
    submitButton.disabled = true;
    vscode.postMessage({ command: 'getAllFiles' });


    newChat.addEventListener('click', () => {
        if (mainContainer) mainContainer.style.display = 'flex';
        if (tabContainer) tabContainer.style.display = 'none';
        if (historyView) historyView.classList.add('hidden');
        updateViewName('new', "New Chat");
    });

    // Toggle history view
    historyIcon.addEventListener('click', () => {
        if (mainContainer) mainContainer.style.display = 'none';
        if (tabContainer) tabContainer.style.display = 'none';
        if (historyView) {
            historyView.classList.remove("hidden");
            updateViewName('history', null);
            renderHistoryView();
        }
    });

    // handle input area
    queryInput.addEventListener('input', () => {
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
    queryInput.addEventListener('keydown', function (event) {
        const userOS = getUserOS();
        const isMac = userOS === 'MacOS';

        if (event.key === 'Enter' && ((isMac && event.metaKey) || (!isMac && event.ctrlKey))) {
            event.preventDefault();
            submitButton.click();
        }
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

    // Update the query text when submit button is clicked
    submitButton.addEventListener('click', () => {
        const query = queryInput.value.trim();
        if (query) {
            if (mainContainer) mainContainer.style.display = 'none';
            if (tabContainer) {
                tabContainer.style.display = 'flex';
                if (queryText) queryText.textContent = query;
            }
            renderLoadingView();
            // Send message to extension
            vscode.postMessage({ command: "submitQuery", text: query });
            queryInput.value = '';
        }
    });

    // expand/collapse tabs
    tabContainer.addEventListener('click', (e) => {
        const expandIcon = e.target.closest('.expand-icon');
        if (expandIcon) {
            const tabContent = document.querySelector(`.tab-content#${expandIcon?.parentElement?.dataset?.tab}`)
            tabContent?.classList?.toggle('active');
            expandIcon?.classList?.toggle('active');
            if (tabContent?.classList?.contains('active')) {
                setTimeout(() => {
                    tabContent?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }, 1000);
            }
        }
    });

    // Handle messages from extension
    window.addEventListener('message', event => {
        const message = event.data;
        switch (message.command) {
            case 'updateOpenFiles':
                populateDropdown(message.files);
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
                        }, 3000);
                    }
                } else {
                    console.log("An error occurred in indexing.")
                }

            case 'renderPlanSpecs':
                // Save and render
                savePlanSpecHistory(message.data);
                // change view name
                updateViewName('plan', message.data.title);
                break;

            case 'selectAttachment':
                if (!attachedFiles.has(fileName) && message.fileName && message.filePath) {
                    attachedFiles.add(message.fileName);
                    console.log(`File added: ${message.fileName}`);
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

function updateViewName(view, title) {
    const headerLabel = document.querySelector('.history-label');
    if (view === 'history') {
        headerLabel.textContent = "History";
    } else {
        headerLabel.textContent = title;
    }
}

function renderLoadingView() {
    const container = document.getElementById('plan-specs');
    if (!container) return;

    container.innerHTML = `
        <div id="loadingView">
            <svg class="loading-icon" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none" viewBox="0 0 24 24">
                <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18.5A2.493 2.493 0 0 1 7.51 20H7.5a2.468 2.468 0 0 1-2.4-3.154 2.98 2.98 0 0 1-.85-5.274 2.468 2.468 0 0 1 .92-3.182 2.477 2.477 0 0 1 1.876-3.344 2.5 2.5 0 0 1 3.41-1.856A2.5 2.5 0 0 1 12 5.5m0 13v-13m0 13a2.493 2.493 0 0 0 4.49 1.5h.01a2.468 2.468 0 0 0 2.403-3.154 2.98 2.98 0 0 0 .847-5.274 2.468 2.468 0 0 0-.921-3.182 2.477 2.477 0 0 0-1.875-3.344A2.5 2.5 0 0 0 14.5 3 2.5 2.5 0 0 0 12 5.5m-8 5a2.5 2.5 0 0 1 3.48-2.3m-.28 8.551a3 3 0 0 1-2.953-5.185M20 10.5a2.5 2.5 0 0 0-3.481-2.3m.28 8.551a3 3 0 0 0 2.954-5.185" />
            </svg>
            <span class="thinking-text">Thinking <span class="blinking-dots"></span>
            </span>
        </div>
    `;
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

    // ID
    const id = document.createElement('label')
    id.textContent = data.id;
    id.classList.add("hidden");
    // Summary
    const summaryTitle = document.createElement('h3');
    summaryTitle.textContent = 'Summary';
    summaryTitle.style.padding = '0 10px';
    container.appendChild(summaryTitle);
    // content
    const summaryarea = document.createElement('p');
    summaryarea.style.width = '100%';
    summaryarea.style.marginBottom = '1rem';
    summaryarea.style.padding = '0 10px';
    summaryarea.textContent = data.summary || '';
    container.appendChild(summaryarea);

    // Files
    data.files.forEach((file, index) => {
        // container
        const fileSection = document.createElement('div');
        fileSection.classList.add('file-section');
        fileSection.style.padding = '0.5rem';
        // fileName row
        const titleRow = document.createElement('div');
        titleRow.classList.add('title-row');
        const titleRowLeft = document.createElement('div');
        titleRowLeft.classList.add('title-row-left');
        titleRowLeft.style.display = 'flex';
        titleRowLeft.style.alignItems = 'center';
        const titleRowRight = document.createElement('div');
        titleRowRight.classList.add('title-row-right');
        titleRowRight.style.display = 'flex';
        titleRowRight.style.alignItems = 'center';
        titleRow.appendChild(titleRowLeft);
        titleRow.appendChild(titleRowRight);
        titleRow.style.display = 'flex';
        titleRow.style.alignItems = 'center';
        titleRow.style.justifyContent = 'space-between';
        titleRow.style.marginBottom = '0.3rem';
        // file type icon
        const img = document.createElement("img");
        img.classList.add('title-row-img');
        img.className = "language-icon";
        try {
            img.src = getLanguageIcon(file.path);
        } catch (e) { }
        img.alt = '</>';
        img.style.width = "15px";
        img.style.height = "15px";
        img.style.marginRight = '0.5rem';
        // fileName
        const pathLabel = document.createElement('span');
        pathLabel.classList.add('title-row-pathlabel');
        pathLabel.textContent = file.path;
        pathLabel.style.fontSize = '1.10em';
        pathLabel.style.fontWeight = 'bold';
        pathLabel.style.color = '#ffffff';
        pathLabel.style.flexGrow = '1';
        pathLabel.style.display = 'flex';
        pathLabel.style.alignItems = 'center';
        // file status
        const statusButton = document.createElement('div');
        statusButton.classList.add('title-row-statusbtn');
        statusButton.textContent = file.status;
        const commonStyles = {
            display: 'inline-block',
            textAlign: 'center',
            borderRadius: '6px',
            padding: '0.05rem 0.05rem',
            fontSize: '0.7rem',
            marginLeft: '1rem'
        };
        Object.assign(statusButton.style, commonStyles);
        const specificStyle = statusStyles()[file.status] || statusStyles()['DEFAULT'];
        Object.assign(statusButton.style, specificStyle);
        // delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.classList.add('title-row-deletebtn');
        deleteBtn.innerHTML = `
            <svg class="w-6 h-6 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24">
                <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 7h14m-9 3v8m4-8v8M10 3h4a1 1 0 0 1 1 1v3H9V4a1 1 0 0 1 1-1ZM6 7h12v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V7Z"/>
            </svg>
        `;
        deleteBtn.style.marginLeft = '1rem';
        deleteBtn.style.background = 'none';
        deleteBtn.style.color = '#ff0000';
        deleteBtn.style.border = 'none';
        deleteBtn.style.padding = '0';
        deleteBtn.style.display = 'flex';
        deleteBtn.style.alignItems = 'center';
        deleteBtn.style.justifyContent = 'center';
        deleteBtn.style.cursor = 'pointer';
        // append components
        titleRowLeft.appendChild(img);
        titleRowLeft.appendChild(pathLabel);
        titleRowLeft.appendChild(statusButton);
        titleRowRight.appendChild(deleteBtn);
        fileSection.appendChild(titleRow);
        // references section
        if (file.references && file.references.length > 0) {
            const references = document.createElement('div');
            references.classList.add('ref-container');
            references.innerHTML = `
                <div class="ref-container">
                    <button class="ref-button" onclick="toggleReference(this)">
                    <svg
                        width="14"
                        height="14"
                        viewBox="0 0 14 14"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        class="ref-icon"
                    >
                        <path
                        d="M3.625 5.3125L7 8.6875L10.375 5.3125"
                        stroke="currentColor"
                        stroke-width="1.66667"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        ></path>
                    </svg>
                    References
                    </button>
                    <div class="ref-content">
                        <div class="ref-reference-box">
                            ${generateReferenceHTML(file.references)}
                        </div>
                    </div>
                </div>
            `;
            fileSection.appendChild(references);
        }
        // file content
        const fileContent = document.createElement('div');
        fileContent.classList.add('file-content');
        fileContent.setAttribute('contenteditable', 'true');
        fileContent.style.width = '100%';
        fileContent.textContent = file.content || '';
        fileContent.style.transition = 'background-color 0.3s ease';
        fileContent.style.padding = '8px';
        fileContent.style.border = 'none';
        fileContent.style.borderRadius = '4px';
        fileContent.addEventListener('blur', (e) => {
            savePlanSpecHistory(e.target.textContent);
        });
        fileSection.appendChild(fileContent);

        // Append file container
        container.appendChild(fileSection);

        // delete this file & update localStorage
        deleteBtn.addEventListener('click', () => {
            data.files.splice(index, 1);
            savePlanSpecHistory(data);
        });
    });

    // Comment & Generate buttons
    const planSpecBtnHolder = document.createElement('div');
    planSpecBtnHolder.classList.add('plan-spec-btn-holder');
    planSpecBtnHolder.style.width = '100%';
    planSpecBtnHolder.style.padding = '0 10px';
    planSpecBtnHolder.style.display = 'flex';
    planSpecBtnHolder.style.flexDirection = 'row';
    planSpecBtnHolder.style.alignItems = 'center';
    planSpecBtnHolder.style.justifyContent = 'space-between';
    planSpecBtnHolder.innerHTML = `
        <button class="com-message-button" onclick="toggleChat()">
            <svg class="w-6 h-6 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17h6l3 3v-3h2V9h-2M4 4h11v8H9l-3 3v-3H4V4Z" />
            </svg>
        </button>
        <div class="com-chat-container" id="chatContainer">
            <input type="text" placeholder="Add comments to the plan.." id="commentInput">
            <button class="com-saveCmt-button" onclick="handleSaveComment('${data.id}')">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="16" height="16">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
            </button>
        </div>
        <button class="com-submit-button" onclick="handleGenerateCode('${data.id}')">
            Generate
        </button>
    `;
    container.appendChild(planSpecBtnHolder);
}

// populate the file_references for the plan page
function generateReferenceHTML(ref_files) {
    return ref_files.map(ref_file => `
    <div class="ref-file-info">
        <div class="ref-file-icon">
        </div>
        <img class="language-icon" src=${getLanguageIcon(ref_file)} alt="</>" style="width: 15px; height: 15px;">
        <div class="ref-file-name">
            <p title="${ref_file}">${ref_file}</p>
        </div>
    </div>
  `).join('');
}

// save comments func
function handleSaveComment(id) {
    const commentInput = document.querySelector('#commentInput');
    if (commentInput.value.trim() !== '') {
        let tasks = JSON.parse(localStorage.getItem("historyTasks") || "[]");
        const planSpec = tasks.find(task => task.id === id);
        if (planSpec) {
            if (!planSpec.comments) planSpec.comments = commentInput.value;
            else planSpec.comments += commentInput.value;
            Object.assign(planSpec, planSpec);
            localStorage.setItem("historyTasks", JSON.stringify(tasks));
        } else {
            console.log("planSpec not found.");
        }
    }
}

// generate code from plan
async function handleGenerateCode(id) {
    let tasks = JSON.parse(localStorage.getItem("historyTasks") || "[]");
    const planSpec = tasks.find(task => task.id === id);
    try {
        let url = new URL("http://localhost:5001/generate_code");
        const reqBody = {
            plan: planSpec
        };
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(reqBody)
        });
        console.log(`Response status: ${response.status}`);
        const data = await response.json();
        localStorage.setItem(planSpec.id, JSON.stringify(data));

        let code = JSON.parse(localStorage.getItem(id) || "");

        document.getElementById("user-query").classList.toggle("active");
        document.getElementById("querydown").classList.toggle("active");
        document.getElementById("plan-specs").classList.toggle("active");
        document.getElementById("plandown").classList.toggle("active");
        document.getElementById("code").classList.add("active");
        document.getElementById("codedown").classList.toggle("active");

        renderGeneratedCode(code);
        // vscode.postMessage({ command: 'codeDiff' });
    } catch (error) {
        console.error("Error generating code, ", error);
    }
}

// render code options
async function renderGeneratedCode(codeFiles) {
    function openCodeDiff(filename, generatedCode) {
        console.log('message sent');
        vscode.postMessage({
            command: "codeDiff",
            filename,
            generatedCode
        });
    }
    const codeContainer = document.getElementById("code");
    if (!codeContainer) return;
    codeContainer.innerHTML = "";

    Object.entries(codeFiles).forEach(([filename, fileData], index) => {
        const { code, status, purpose } = fileData;
        let existingContent = "";
        const { additions, deletions } = computeLineDiff(existingContent, code);


        // wrapper div for each file
        const fileSection = document.createElement("div");
        fileSection.classList.add("component-container-unique");
        fileSection.innerHTML = `
            <div class="details">
                <div class="details-unique">
                    <div class="header-unique">
                        <div class="title-row-statusbtn ${status.toLowerCase()}">${status}</div>
                        <span class="file-name-unique">${filename}</span>
                        <div class="modify-badge-unique">
                            <img class="language-icon" src=${getLanguageIcon(filename)} alt="</>" style="width: 22px; height: 22px;">
                        </div>
                    </div>
                    <div class="description-unique">${purpose}</div>
                </div>
                <div class="details-unique2">
                    <div class="line-changes-unique">
                        Lines changed: <span class="added-unique">+${additions}</span> <span class="removed-unique">-${deletions}</span>
                    </div>
                    <div class="change-indicators-unique">
                        <div class="change-indicator-unique"></div>
                        <div class="change-indicator-unique"></div>
                        <div class="change-indicator-unique"></div>
                        <div class="change-indicator-unique"></div>
                    </div>
                </div>
            </div>
        `;
        fileSection.addEventListener("click", () => openCodeDiff(filename, code));
        codeContainer.appendChild(fileSection);
        updateChangeIndicators(additions, deletions);
    });
}

// count diffs
function computeLineDiff(existingContent, newContent) {
    const existingLines = existingContent.split("\n");
    const newLines = newContent.split("\n");
    let additions = 0, deletions = 0, modifications = 0;

    const maxLines = Math.max(existingLines.length, newLines.length);
    for (let i = 0; i < maxLines; i++) {
        if (existingLines[i] !== newLines[i]) {
            if (!existingLines[i]) {
                additions++;
            } else if (!newLines[i]) {
                deletions++;
            } else {
                modifications++;
            }
        }
    }
    return { additions, deletions };
}

function updateChangeIndicators(additions, deletions) {
    const totalChanges = additions + deletions;
    const changeIndicators = document.querySelectorAll('.change-indicator-unique');
    const totalDivs = changeIndicators.length;
    const greenDivs = Math.round((additions / totalChanges) * totalDivs);
    const redDivs = Math.round((deletions / totalChanges) * totalDivs);

    changeIndicators.forEach((div, index) => {
        if (index < greenDivs) {
            div.classList.add('green-unique');
            div.classList.remove('red-unique');
        } else if (index < greenDivs + redDivs) {
            div.classList.add('red-unique');
            div.classList.remove('green-unique');
        } else {
            div.classList.remove('green-unique', 'red-unique');
        }
    });
}

// expand/collapse the comments div
function toggleChat() {
    const chatContainer = document.getElementById('chatContainer');
    chatContainer.classList.toggle('show');
    const submitBtn = document.querySelector('.com-submit-button');
    const isToggled = chatContainer.classList.contains('show');
    if (isToggled) {
        submitBtn.style.width = '0px';
        submitBtn.style.marginRight = '0px';
        submitBtn.style.zIndex = '-1';
    } else {
        submitBtn.style.width = '80px';
        submitBtn.style.marginRight = '0 8px';
        submitBtn.style.zIndex = '2';
    }
}
// expand/collapse the file references div
function toggleReference(button) {
    const content = button.nextElementSibling;
    const icon = button.querySelector('.ref-icon');

    if (content.style.maxHeight) {
        content.style.maxHeight = null;
        icon.style.transform = 'rotate(0deg)';
    } else {
        content.style.maxHeight = content.scrollHeight + "px";
        icon.style.transform = 'rotate(180deg)';
    }
}

// Helper: generate uuid
function generateUniqueId() {
    return (crypto && crypto.randomUUID) ? crypto.randomUUID() : Date.now().toString();
}

async function savePlanSpecHistory(planSpec) {
    if (!planSpec.id) planSpec.id = generateUniqueId();
    if (!planSpec.timestamp) planSpec.timestamp = new Date().toISOString();
    if (!planSpec.status) planSpec.status = "code" in planSpec
        ? "Code Generated"
        : "files" in planSpec
            ? "Plan Generated"
            : "Failed";

    if (!planSpec.title) {
        try {
            let url = new URL("http://localhost:5001/infer_title");
            url.searchParams.append("summary", planSpec.summary);
            const response = await fetch(url.toString());
            const data = await response.json()
            planSpec.title = data.title || "Untitled Plan";
        } catch (error) {
            console.error("Error inferring title", error);
            planSpec.title = "Untitled Plan";
        }
    }
    let tasks = JSON.parse(localStorage.getItem("historyTasks") || "[]");
    const existingTask = tasks.find(task => task.id === planSpec.id);
    if (existingTask) {
        Object.assign(existingTask, planSpec);
    } else {
        tasks.push(planSpec);
    }
    localStorage.setItem("historyTasks", JSON.stringify(tasks));
    renderPlanSpecsContent(planSpec);
}

function updatePlanSpecInHistory(updatedTask) {
    let tasks = JSON.parse(localStorage.getItem("historyTasks") || "[]");
    tasks = tasks.map(task => task.id === updatedTask.id ? updatedTask : task);
    localStorage.setItem("historyTasks", JSON.stringify(tasks));
    console.log("Plan updated.");
}

function deleteHistoryRecord(taskId) {
    const taskElement = document.querySelector(`.task[data-task-id="${taskId}"]`);
    if (taskElement) {
        taskElement.style.transition = 'opacity 0.3s, transform 0.3s';
        taskElement.style.opacity = '0';
        taskElement.style.transform = 'translateY(-20px)';

        setTimeout(() => {
            let tasks = JSON.parse(localStorage.getItem("historyTasks") || "[]");
            tasks = tasks.filter(task => task.id !== taskId);
            localStorage.setItem("historyTasks", JSON.stringify(tasks));

            taskElement.remove();
            if (tasks.length === 0) {
                renderHistoryView();
            }
        }, 300);
    }
    console.log("Plan deleted, ID: ", taskId);
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
        taskElement.dataset.taskId = task.id;

        taskElement.innerHTML = `
            <div class="delete-zone">
                <button class="delete-btn">
                <svg class="trash-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                    <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 19L18 5m0 14L6 5"/>
                </svg>
                </button>
            </div>
            <div class="task-main">
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
            </div>
        `;
        const taskMain = taskElement.querySelector('.task-main');
        taskMain.addEventListener('click', () => handleTaskClick(task.id));

        const deleteZone = taskElement.querySelector('.delete-zone');
        const deleteBtn = taskElement.querySelector('.delete-btn');
        [deleteZone, deleteBtn].forEach(element => {
            element.addEventListener("click", (e) => {
                e.stopPropagation();
                const taskId = taskElement.dataset.taskId;
                deleteHistoryRecord(taskId);
            });
        });
        historyContainer.appendChild(taskElement);
    });
}

function handleTaskClick(taskId) {
    const tasks = JSON.parse(localStorage.getItem("historyTasks") || "[]");
    const clickedTask = tasks.find(task => task.id === taskId);

    if (clickedTask) {
        // Hide history view
        document.getElementById("historyView").classList.add("hidden");

        // Show tab container
        const tabContainer = document.querySelector('.tab-container');
        if (tabContainer) {
            tabContainer.style.display = 'flex';
        }

        // Render plan specs
        renderPlanSpecsContent(clickedTask);
        updateViewName('plan', clickedTask.title);

        // Update query text
        const queryText = document.querySelector('.query-text');
        if (queryText) {
            queryText.textContent = clickedTask.query || 'No Query available';
        }
    }
}

function getUserOS() {
    const platform = navigator.platform.toLowerCase();
    if (platform.includes('mac')) {
        return 'MacOS';
    } else if (platform.includes('win')) {
        return 'Windows';
    } else if (platform.includes('linux')) {
        return 'Linux';
    }
    return 'MacOS';
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

function statusStyles() {
    return {
        'NEW': {
            width: '35px',
            backgroundColor: '#14532D4D',
            color: 'rgb(74, 222, 128)',
            border: '1px solid rgb(74, 222, 128)'
        },
        'DELETED': {
            width: '58px',
            backgroundColor: '#ff00001f',
            color: '#f14c4c',
            border: '1px solid #f14c4ca1'
        },
        'DEFAULT': {
            width: '62px',
            backgroundColor: '#1e3A8A4D',
            color: '#17daff',
            border: '1px solid #179fff'
        }
    };
}