const vscode = acquireVsCodeApi();

// Toggle history view
document.getElementById("historyIcon").addEventListener("click", () => {
    const historyView = document.getElementById("historyView");
    historyView.classList.toggle("hidden");
});


// Handle attachment dropdown
const attachButton = document.getElementById("attachButton");
const attachmentSearch = document.getElementById("attachmentSearch");
const attachmentDropdown = document.getElementById("attachmentDropdown");
const attachmentContainer = document.getElementById("attachmentContainer");
const queryInput = document.getElementById("queryInput");

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

function getLanguageIcon(fileName) {
    const ext = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();
    switch (ext) {
        case ".3d": return "../resources/icons/3d.svg";
        case ".apk": return "../resources/icons/android.svg";
        case ".ng": return "../resources/icons/angular.svg";
        case ".apollo": return "../resources/icons/apollo.svg";
        case ".applescript": return "../resources/icons/applescript.svg";
        case ".arch": return "../resources/icons/architecture.svg";
        case ".ino": return "../resources/icons/arduino.svg";
        case ".mp3":
        case ".wav":
        case ".flac": return "../resources/icons/audio.svg";
        case ".azure": return "../resources/icons/azure.svg";
        case ".bitbucket": return "../resources/icons/bitbucket.svg";
        case ".c": return "../resources/icons/c.svg";
        case ".chrome": return "../resources/icons/chrome.svg";
        case ".cmake": return "../resources/icons/cmake.svg";
        case ".cbl":
        case ".cob": return "../resources/icons/cobol.svg";
        case ".coffee": return "../resources/icons/coffee.svg";
        case ".cmd": return "../resources/icons/command.svg";
        case ".console": return "../resources/icons/console.svg";
        case ".copilot": return "../resources/icons/copilot.svg";
        case ".cpp": return "../resources/icons/cpp.svg";
        case ".cs": return "../resources/icons/csharp.svg";
        case ".css": return "../resources/icons/css.svg";
        case ".cu": return "../resources/icons/cuda.svg";
        case ".cy": return "../resources/icons/cypress.svg";
        case ".dart": return "../resources/icons/dart.svg";
        case ".db":
        case ".sql": return "../resources/icons/database.svg";
        case ".django": return "../resources/icons/django.svg";
        case ".dll": return "../resources/icons/dll.svg";
        case ".dockerfile": return "../resources/icons/docker.svg";
        case ".doc":
        case ".docx": return "../resources/icons/document.svg";
        case ".js": return "../resources/icons/dotjs.svg";
        case ".drawio": return "../resources/icons/drawio.svg";
        case ".ejs": return "../resources/icons/ejs.svg";
        case ".ex":
        case ".exs": return "../resources/icons/elixir.svg";
        case ".email": return "../resources/icons/email.svg";
        case ".erl": return "../resources/icons/erlang.svg";
        case ".eslintrc": return "../resources/icons/eslint.svg";
        case ".figma": return "../resources/icons/figma.svg";
        case ".firebase": return "../resources/icons/firebase.svg";
        case ".ttf":
        case ".otf": return "../resources/icons/font.svg";
        case ".f":
        case ".for":
        case ".f90": return "../resources/icons/fortran.svg";
        case ".gcp": return "../resources/icons/gcp.svg";
        case ".gemini": return "../resources/icons/gemini-ai.svg";
        case ".gitignore": return "../resources/icons/git.svg";
        case ".gitlab": return "../resources/icons/gitlab.svg";
        case ".go": return "../resources/icons/go.svg";
        case ".html":
        case ".htm": return "../resources/icons/html.svg";
        case ".http": return "../resources/icons/http.svg";
        case ".jar": return "../resources/icons/jar.svg";
        case ".java": return "../resources/icons/java.svg";
        case ".class": return "../resources/icons/javaclass.svg";
        case ".js": return "../resources/icons/javascript.svg";
        case ".jest": return "../resources/icons/jest.svg";
        case ".jsconfig": return "../resources/icons/jsconfig.svg";
        case ".json": return "../resources/icons/json.svg";
        case ".kt": return "../resources/icons/kotlin.svg";
        case ".md": return "../resources/icons/markdown.svg";
        case ".m": return "../resources/icons/matlab.svg";
        case ".maven": return "../resources/icons/maven.svg";
        case ".next": return "../resources/icons/next.svg";
        case ".nginx": return "../resources/icons/nginx.svg";
        case ".node": return "../resources/icons/nodejs.svg";
        case ".nodemon": return "../resources/icons/nodemon.svg";
        case ".npm": return "../resources/icons/npm.svg";
        case ".nuxt": return "../resources/icons/nuxt.svg";
        case ".mm": return "../resources/icons/objective-cpp.svg";
        case ".openapi": return "../resources/icons/openapi.svg";
        case ".pas": return "../resources/icons/pascal.svg";
        case ".pdf": return "../resources/icons/pdf.svg";
        case ".pl": return "../resources/icons/perl.svg";
        case ".php": return "../resources/icons/php.svg";
        case ".ps1": return "../resources/icons/powershell.svg";
        case ".prisma": return "../resources/icons/prisma.svg";
        case ".py": return "../resources/icons/python.svg";
        case ".jsx": return "../resources/icons/react.svg";
        case ".redux-action": return "../resources/icons/redux-action.svg";
        case ".redux-reducer": return "../resources/icons/redux-reducer.svg";
        case ".redux-selector": return "../resources/icons/redux-selector.svg";
        case ".redux-store": return "../resources/icons/redux-store.svg";
        case ".reg": return "../resources/icons/regedit.svg";
        case ".rb": return "../resources/icons/ruby.svg";
        case ".rs": return "../resources/icons/rust.svg";
        case ".salesforce": return "../resources/icons/salesforce.svg";
        case ".sass":
        case ".scss": return "../resources/icons/sass.svg";
        case ".scala": return "../resources/icons/scala.svg";
        case ".jsonc":
        case ".settings": return "../resources/icons/settings.svg";
        case ".sol": return "../resources/icons/solidity.svg";
        case ".sonarcloud": return "../resources/icons/sonarcloud.svg";
        case ".sublime-project": return "../resources/icons/sublime.svg";
        case ".supabase": return "../resources/icons/supabase.svg";
        case ".svelte": return "../resources/icons/svelte.svg";
        case ".swagger": return "../resources/icons/swagger.svg";
        case ".swift": return "../resources/icons/swift.svg";
        case ".tailwind": return "../resources/icons/tailwindcss.svg";
        case ".tf": return "../resources/icons/terraform.svg";
        case ".tsconfig": return "../resources/icons/tsconfig.svg";
        case ".ts": return "../resources/icons/typescript.svg";
        case ".uml": return "../resources/icons/uml.svg";
        case ".unity": return "../resources/icons/unity.svg";
        case ".vedic": return "../resources/icons/vedic.svg";
        case ".vercel": return "../resources/icons/vercel.svg";
        case ".mp4":
        case ".avi":
        case ".mov": return "../resources/icons/video.svg";
        case ".vim": return "../resources/icons/vim.svg";
        case ".vs":
        case ".vsix": return "../resources/icons/visualstudio.svg";
        case ".vite": return "../resources/icons/vite.svg";
        case ".vscode": return "../resources/icons/vscode.svg";
        case ".vue": return "../resources/icons/vue.svg";
        case ".vue-config": return "../resources/icons/vue-config.svg";
        case ".zip": return "../resources/icons/zip.svg";
        default: return "../resources/icons/file.svg";
    }
}

function populateDropdown(files) {
    attachmentDropdown.innerHTML = "";
    files.forEach(file => {
        const item = document.createElement("div");
        item.className = "dropdown-item";
        const img = document.createElement("img");
        img.className = "language-icon";
        img.src = getLanguageIcon(file.name);
        img.alt = "";
        img.style.width = "20px";
        img.style.height = "20px";
        const textSpan = document.createElement("span");
        textSpan.textContent = file.name;
        item.appendChild(img);
        item.appendChild(textSpan);
        item.addEventListener("click", () => {
            vscode.postMessage({ command: "selectAttachment", fileName: file.name });
            attachmentSearch.value = file.name;
            closeDropdown();
        });
        attachmentDropdown.appendChild(item);
    });
}

// Filter dropdown item search
attachmentSearch.addEventListener("input", () => {
    const searchTerm = attachmentSearch.value.toLowerCase();
    const items = attachmentDropdown.querySelectorAll(".dropdown-item");
    items.forEach(item => {
        item.classList.toggle("hidden", !item.textContent.toLowerCase().includes(searchTerm));
    });
});

// Close the dropdown and restore the attach button
function closeDropdown() {
    attachmentDropdown.classList.add("hidden");
    attachmentSearch.classList.add("hidden");
    attachButton.classList.remove("hidden");
}
// Clicking anywhere outside the attachment container closes the dropdown
document.addEventListener("click", (e) => {
    if (!attachmentContainer.contains(e.target)) {
        closeDropdown();
    }
});
// pressing escape closes the dropdown
document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
        closeDropdown();
    }
});
// Prevent clicks inside the container from propagating to the document
attachmentContainer.addEventListener("click", (e) => {
    e.stopPropagation();
});


// Submit query
document.getElementById("submitButton").addEventListener("click", () => {
    const queryInput = document.getElementById("queryInput");
    const query = queryInput.value.trim();

    if (query) {
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
            // const dropdown = document.getElementById("attachmentDropdown");
            // dropdown.innerHTML = '';

            // message.files.forEach(file => {
            //     const item = document.createElement('div');
            //     item.className = 'dropdown-item';
            //     item.textContent = file.name;
            //     item.addEventListener('click', () => {
            //         vscode.postMessage({
            //             command: "selectAttachment",
            //             filePath: file.path
            //         });
            //         dropdown.classList.add('hidden');
            //     });
            //     dropdown.appendChild(item);
            // });
            // break;

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
    }
});
