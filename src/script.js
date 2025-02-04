const vscode = acquireVsCodeApi();

// Toggle history view
document.getElementById("historyIcon").addEventListener("click", () => {
    const historyView = document.getElementById("historyView");
    historyView.classList.toggle("hidden");
});

// Handle attachment dropdown
document.getElementById("attachButton").addEventListener("click", () => {
    const dropdown = document.getElementById("attachmentDropdown");
    dropdown.classList.toggle("hidden");
    vscode.postMessage({ command: "getOpenFiles" });
});

// Submit query
document.getElementById("submitButton").addEventListener("click", () => {
    const queryInput = document.getElementById("queryInput");
    const query = queryInput.value.trim();

    if (query) {
        vscode.postMessage({ command: "submitQuery", text: query });
        queryInput.value = ''; // Clear input after submission
    }
});

// Handle messages from extension
window.addEventListener('message', event => {
    const message = event.data;

    switch (message.command) {
        case 'updateOpenFiles':
            const dropdown = document.getElementById("attachmentDropdown");
            dropdown.innerHTML = ''; // Clear existing items

            message.files.forEach(file => {
                const item = document.createElement('div');
                item.className = 'dropdown-item';
                item.textContent = file.name;
                item.addEventListener('click', () => {
                    vscode.postMessage({
                        command: "selectAttachment",
                        filePath: file.path
                    });
                    dropdown.classList.add('hidden');
                });
                dropdown.appendChild(item);
            });
            break;

        case 'updateHistory':
            const historyView = document.getElementById("historyView");
            historyView.innerHTML = ''; // Clear existing history

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
    }
});
