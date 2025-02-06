// The module 'vscode' referenced with the alias vscode contains the VS Code extensibility API
import * as vscode from 'vscode';
import * as path from 'path';
import axios from 'axios';


export async function getAllFiles(): Promise<{ path: string; name: string }[]> {
	// glob '**/*' matches all files in workspace | exclude pattern '**/xxxx/**'
	const files = await vscode.workspace.findFiles('**/*', '**/node_modules/**');
	return files.map(file => ({
		path: file.fsPath,
		name: path.basename(file.fsPath)
	}));
}


export function activate(context: vscode.ExtensionContext) {
	const provider = new TracerSidebarView(context.extensionUri, context);

	// Register the Webview Provider
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider("tracerView", provider)
	);

	// command to open sidebar
	context.subscriptions.push(
		vscode.commands.registerCommand('tracer.showTracer', () => {
			vscode.commands.executeCommand("workbench.view.tracerSidebar");
		})
	);

	// Command to trigger getAllFiles and show a message with the count of found files.
	context.subscriptions.push(
		vscode.commands.registerCommand('tracer.listAllFiles', async function (this: TracerSidebarView) {
			const files = await getAllFiles();
			vscode.window.showInformationMessage(`Found ${files.length} files`);
		}.bind(provider))
	);

	console.log('Congratulations, your extension "tracer" is now active!');
}


class TracerSidebarView implements vscode.WebviewViewProvider {
	private _view?: vscode.WebviewView;

	constructor(private readonly extensionUri: vscode.Uri, private readonly context: vscode.ExtensionContext) { }

	public resolveWebviewView(webviewView: vscode.WebviewView) {
		this._view = webviewView;

		// Allow scripts
		webviewView.webview.options = {
			enableScripts: true,
			localResourceRoots: [this.extensionUri]
		};

		const iconBaseUri = webviewView.webview.asWebviewUri(
			vscode.Uri.joinPath(this.extensionUri, 'resources', 'icons')
		);

		// Load HTML content
		webviewView.webview.html = this.getHtmlContent(iconBaseUri.toString());

		// Handle messages from Webview
		webviewView.webview.onDidReceiveMessage(async (message) => {
			switch (message.command) {
				case "submitQuery":
					// Process the query
					console.log(message.text);
					this.processQuery(message.text);

					// Update history
					const queryHistory = this.context.globalState.get<string[]>('queryHistory', []);
					queryHistory.unshift(message.text);
					await this.context.globalState.update('queryHistory', queryHistory);

					// Send updated history back to webview
					if (this._view) {
						this._view.webview.postMessage({
							command: 'updateHistory',
							history: queryHistory
						});
					}
					break;

				case "attachFile":
					vscode.window.showOpenDialog({ canSelectMany: false, filters: { 'All Files': ['*'] } }).then(fileUri => {
						if (fileUri) {
							vscode.window.showInformationMessage(`Attached file: ${fileUri[0].fsPath}`);
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
						vscode.window.showInformationMessage(`File attached: ${message.fileName}`);
					}
					break;
			}
		});
	}

	private async processQuery(query: string) {
		console.log("processQuery called with:", query);
		vscode.window.showInformationMessage(`Received query: ${query}`);
		try {
			console.log('Making backend call', query);
			const response = await axios.post('http://localhost:5001/new_chat', { userPrompt: query });
			vscode.window.showInformationMessage(`Received resp: ${response.status}`);

			const resultData = response.data;
			this._view?.webview.postMessage({ command: 'planResponse', data: resultData });

		} catch (error: any) {
			vscode.window.showErrorMessage(`Backend call failed: ${error.message}`);
		}
	}

	private getHtmlContent(iconBase: string): string {
		const cssUri = this._view?.webview.asWebviewUri(
			vscode.Uri.joinPath(this.extensionUri, 'src', 'styles.css')
		);
		const jsUri = this._view?.webview.asWebviewUri(
			vscode.Uri.joinPath(this.extensionUri, 'src', 'script.js')
		);

		return `
            <!DOCTYPE html>
			<html lang="en">

			<head>
				<meta charset="UTF-8">
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${this._view?.webview.cspSource}; script-src 'unsafe-inline' ${this._view?.webview.cspSource}; img-src ${this._view?.webview.cspSource} data:;">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<title>Tracer 2.0</title>
				<link rel="stylesheet" type="text/css" href="${cssUri}">
			</head>

			<body>
				<div class="container">
					<!-- Header Section -->
					<header>
						<div class="header-content">
							<span class="history-label">History</span>
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
									<div id="attachmentDropdown" class="dropdown hidden"></div>
								</div>
							</div>
							<button class="submit-button" id="submitButton">Generate Plan</button>
						</div>
					</main>

					<!-- Planning output -->
					<div class="tab-container" style="display: none;">
						<div class="tabs">
							<div class="tab active" data-tab="user-query">
								<span class="check-icon">✓</span>
								<span class="tab-title">User Query</span>
								<span class="expand-icon">></span>
							</div>
							<div class="tab" data-tab="plan-specs">
								<span class="check-icon">✓</span>
								<span class="tab-title">Plan Specification</span>
								<span class="expand-icon">></span>
							</div>
							<div class="tab" data-tab="code">
								<span class="check-icon">✓</span>
								<span class="tab-title">Code</span>
								<span class="expand-icon">></span>
							</div>
						</div>

						<div class="tab-content active" id="user-query">
							<div class="query-text"></div>
						</div>

						<div class="tab-content" id="plan-specs">
							<!-- Plan specs content -->
						</div>

						<div class="tab-content" id="code">
							<!-- Code content -->
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
export function deactivate() { }
