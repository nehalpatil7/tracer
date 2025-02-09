"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllFiles = getAllFiles;
exports.activate = activate;
exports.deactivate = deactivate;
// The module 'vscode' referenced with the alias vscode contains the VS Code extensibility API
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const axios_1 = __importDefault(require("axios"));
const form_data_1 = __importDefault(require("form-data"));
async function getAllFiles() {
    // allowed file types
    const allowedExtensions = new Set([
        '.js',
        '.ts',
        '.jsx',
        '.tsx',
        '.py',
        '.java',
        '.cpp',
        '.c',
        '.cs',
        '.go',
        '.rb',
        '.php',
        '.html',
        '.css',
        '.scss',
        '.json',
        '.md',
        '.txt',
        '.yml',
        '.yaml',
        '.xml'
    ]);
    // glob '**/*' matches all files in workspace | exclude pattern '**/xxxx/**'
    const files = await vscode.workspace.findFiles('**/*', '**/node_modules/**');
    return files
        .filter(file => allowedExtensions.has(path.extname(file.fsPath).toLowerCase()))
        .map(file => ({
        path: file.fsPath,
        name: path.basename(file.fsPath)
    }));
}
function activate(context) {
    const provider = new TracerSidebarView(context.extensionUri, context);
    // Register the Webview Provider
    context.subscriptions.push(vscode.window.registerWebviewViewProvider("tracerView", provider));
    // command to open sidebar
    context.subscriptions.push(vscode.commands.registerCommand('tracer.showTracer', () => {
        vscode.commands.executeCommand("workbench.view.tracerSidebar");
    }));
    // Command to trigger getAllFiles and show a message with the count of found files.
    context.subscriptions.push(vscode.commands.registerCommand('tracer.listAllFiles', async function () {
        const files = await getAllFiles();
        vscode.window.setStatusBarMessage(`Found ${files.length} files`, 4000);
    }.bind(provider)));
    vscode.window.setStatusBarMessage('Tracer 2.0 is now active!', 4000);
}
class TracerSidebarView {
    extensionUri;
    context;
    _view;
    attachments = [];
    constructor(extensionUri, context) {
        this.extensionUri = extensionUri;
        this.context = context;
    }
    resolveWebviewView(webviewView) {
        this._view = webviewView;
        // Allow scripts
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this.extensionUri]
        };
        const iconBaseUri = webviewView.webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'resources', 'icons'));
        // Load HTML content
        webviewView.webview.html = this.getHtmlContent(iconBaseUri.toString());
        // Handle messages from Webview
        webviewView.webview.onDidReceiveMessage(async (message) => {
            switch (message.command) {
                case "submitQuery":
                    // Process the query
                    this.processQuery(message.text);
                    break;
                case "attachFile":
                    vscode.window.showOpenDialog({ canSelectMany: false, filters: { 'All Files': ['*'] } }).then(fileUri => {
                        if (fileUri) {
                            vscode.window.setStatusBarMessage(`Attached file: ${fileUri[0].fsPath}`, 4000);
                        }
                    });
                    break;
                case "getAllFiles":
                    if (this._view) {
                        this._view.webview.postMessage({
                            command: 'updateProgress',
                            progress: 50
                        });
                    }
                    const allFiles = await getAllFiles();
                    if (this._view) {
                        this._view.webview.postMessage({
                            command: 'updateOpenFiles',
                            files: allFiles
                        });
                        this._view.webview.postMessage({
                            command: 'updateProgress',
                            progress: 100
                        });
                    }
                    break;
                case "selectAttachment":
                    if (message.fileName) {
                        vscode.window.setStatusBarMessage(`File attached: ${message.fileName}`, 4000);
                    }
                    this.attachments.push(message.filePath);
                    break;
                case "codeDiff":
                    // vscode.commands.executeCommand('vscode.diff', vscode.Uri.file('/Users/npatil14/Downloads/Tracer/tracer/backend/app.js'), vscode.Uri.file('/Users/npatil14/Downloads/Tracer/app2.js'));
                    const { filename, generatedCode } = message;
                    // Search if the file exists in the workspace
                    const files = await vscode.workspace.findFiles(filename, '**/node_modules/**');
                    let originalFileUri;
                    if (files.length > 0) {
                        // File exists: Use its path
                        originalFileUri = files[0];
                    }
                    else {
                        // File does not exist: Create a blank untitled file for comparison
                        originalFileUri = vscode.Uri.file(`${vscode.workspace.workspaceFolders?.[0].uri.fsPath}/${filename}`);
                        await vscode.workspace.fs.writeFile(originalFileUri, Buffer.from("", 'utf8'));
                    }
                    // Create a temporary file for the new code
                    const newFileUri = vscode.Uri.file(`${originalFileUri.fsPath}.new`);
                    await vscode.workspace.fs.writeFile(newFileUri, Buffer.from(generatedCode, 'utf8'));
                    // Open diff editor
                    vscode.commands.executeCommand('vscode.diff', originalFileUri, newFileUri, `Changes in ${filename}`);
            }
        });
    }
    async processQuery(query) {
        console.log("processQuery called with query with", this.attachments.length, "attachments.");
        try {
            const formData = new form_data_1.default();
            formData.append('userPrompt', query);
            // read contents of the stored attachments
            for (const filePath of this.attachments) {
                const uri = vscode.Uri.file(filePath);
                const fileBuffer = await vscode.workspace.fs.readFile(uri);
                formData.append('attachments', Buffer.from(fileBuffer), path.basename(filePath));
            }
            const response = await axios_1.default.post('http://localhost:5001/new_chat', formData, {
                headers: formData.getHeaders()
            });
            response.data.query = query;
            console.log("API success: ", response.status);
            this._view?.webview.postMessage({ command: 'renderPlanSpecs', data: response.data });
        }
        catch (error) {
            vscode.window.setStatusBarMessage(`Intelligence error: ${error.message}`, 4000);
        }
    }
    getHtmlContent(iconBase) {
        const cssUri = this._view?.webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'src', 'styles.css'));
        const jsUri = this._view?.webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'src', 'script.js'));
        return `
            <!DOCTYPE html>
			<html lang="en">

			<head>
				<meta charset="UTF-8">
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; connect-src http://localhost:5001; style-src ${this._view?.webview.cspSource}; script-src 'unsafe-inline' ${this._view?.webview.cspSource}; img-src ${this._view?.webview.cspSource} data:;">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<title>Tracer 2.0</title>
				<link rel="stylesheet" type="text/css" href="${cssUri}">
			</head>

			<body>
				<div class="container">
					<!-- Header Section -->
					<header>
						<div class="header-content">
							<span class="history-label">New Chat</span>
							<button class="icon-button" id="newChat">
								<svg class="w-5 h-5 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24">
									<path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14m-7 7V5"/>
								</svg>
							</button>
							<button class="icon-button" id="historyIcon" aria-label="Clock">
								<svg xmlns="http://www.w3.org/2000/svg" class="icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
									<circle cx="12" cy="12" r="10"/>
									<polyline points="12 6 12 12 16 14"/>
								</svg>
							</button>
						</div>
						<div class="divider"></div>
						<div id="historyView" class="history-view hidden"></div>
					</header>

					<!-- Main Content Section -->
					<main>
						<h1>What can I help you refactor today?</h1>
						<p class="subtitle">Build new, update existing, or fix bugs—always to your help.</p>

						<div class="input-container">
							<div class="textarea-wrapper">
								<textarea id="queryInput" placeholder="Query here (@mention to attach files)" rows="4"></textarea>
								<div id="attachmentContainer" class="attachment-container">
									<button class="fab" id="attachButton" aria-label="Add attachment">+</button>
									<input type="text" id="attachmentSearch" class="attachment-search hidden" placeholder="Search files or folders">
									<div class="attachments-wrapper">
										<div id="attachedFilesContainer" class="attached-files"></div>
									</div>
								</div>
								<div id="attachmentDropdown" class="dropdown hidden"></div>
							</div>
							<button class="submit-button" id="submitButton">Generate Plan</button>
						</div>
					</main>

					<!-- History view -->
					<div id="historyView" class="history-view hidden"></div>

					<!-- Planning output -->
					<div class="tab-container">
						<div class="tab head">
							<div class="tab active" data-tab="user-query">
								<svg class="check-icon" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
									<path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 3v4a1 1 0 0 1-1 1H5m4 6 2 2 4-4m4-8v16a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7.914a1 1 0 0 1 .293-.707l3.914-3.914A1 1 0 0 1 9.914 3H18a1 1 0 0 1 1 1Z" />
								</svg>
								<span class="tab-title">User Query</span>
								<svg id="querydown" class="expand-icon active" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
									<path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m19 9-7 7-7-7" />
								</svg>
							</div>
							<div class="tab-content active" id="user-query">
								<div class="query-text"></div>
							</div>
						</div>

						<div class="tab head">
							<div class="tab active" data-tab="plan-specs">
								<svg class="check-icon" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
									<path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h3a3 3 0 0 0 0-6h-.025a5.56 5.56 0 0 0 .025-.5A5.5 5.5 0 0 0 7.207 9.021C7.137 9.017 7.071 9 7 9a4 4 0 1 0 0 8h2.167M12 19v-9m0 0-2 2m2-2 2 2" />
								</svg>
								<span class="tab-title">Plan Specification</span>
								<svg id="plandown" class="expand-icon active" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
									<path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m19 9-7 7-7-7" />
								</svg>
							</div>
							<div class="tab-content active" id="plan-specs"></div>
						</div>

						<div class="tab head">
							<div class="tab active" data-tab="code">
								<svg class="check-icon" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
									<path fill-rule="evenodd" d="M4 5.78571C4 4.80909 4.78639 4 5.77778 4H18.2222C19.2136 4 20 4.80909 20 5.78571V15H4V5.78571ZM12 12c0-.5523.4477-1 1-1h2c.5523 0 1 .4477 1 1s-.4477 1-1 1h-2c-.5523 0-1-.4477-1-1ZM8.27586 6.31035c.38089-.39993 1.01387-.41537 1.4138-.03449l2.62504 2.5c.1981.18875.3103.45047.3103.72414 0 .27368-.1122.5354-.3103.7241l-2.62504 2.5c-.39993.3809-1.03291.3655-1.4138-.0344-.38088-.4-.36544-1.033.03449-1.4138L10.175 9.5 8.31035 7.72414c-.39993-.38089-.41537-1.01386-.03449-1.41379Z" clip-rule="evenodd" />
									<path d="M2 17v1c0 1.1046.89543 2 2 2h16c1.1046 0 2-.8954 2-2v-1H2Z" />
								</svg>
								<span class="tab-title">Code</span>
								<svg id="codedown" class="expand-icon" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
									<path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m19 9-7 7-7-7" />
								</svg>
							</div>
							<div class="tab-content" id="code"></div>
						</div>
					</div>

					<div class="progress-container">
						<div class="progress-header">
							<span class="progress-label">Scanning files...</span>
							<span class="progress-percentage">0%</span>
						</div>
						<div class="progress-bar">
							<div class="progress-fill"></div>
						</div>
					</div>
				</div>
				<script>
					window.myIconBase = "${iconBase}";
				</script>
				<script src="${jsUri}"></script>
			</body>
			</html>
        `;
    }
}
// This method is called when extension is deactivated
function deactivate() { }
//# sourceMappingURL=extension.js.map