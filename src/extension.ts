// The module 'vscode' referenced with the alias vscode contains the VS Code extensibility API
import * as vscode from 'vscode';
import * as path from 'path';


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
		vscode.commands.registerCommand('tracer.listAllFiles', async () => {
			const files = await getAllFiles();
			vscode.window.showInformationMessage(`Found ${files.length} files found`);
		})
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

		// Load HTML content
		webviewView.webview.html = this.getHtmlContent();

		// Handle messages from Webview
		webviewView.webview.onDidReceiveMessage(async (message) => {
			switch (message.command) {
				case "submitQuery":
					// Process the query
					vscode.window.showInformationMessage(`Processing query: ${message.text}`);
					this.processQuery(message.text);

					// Update history
					const queryHistory = this.context.globalState.get<string[]>('queryHistory', []);
					queryHistory.unshift(message.text); // Add new query at the beginning
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
					const allFiles = await getAllFiles();
					if (this._view) {
						this._view.webview.postMessage({
							command: 'updateOpenFiles',
							files: allFiles
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

	private processQuery(query: string) {
		// Placeholder function - this will later send the query to an AI model or another backend service
		vscode.window.showInformationMessage(`Received query: ${query}`);
	}

	private getHtmlContent(): string {
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
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<title>Traycer 2.0</title>
				<link rel="stylesheet" type="text/css" href="${cssUri}">
			</head>

			<body>
				<div class="container">
					<!-- Header Section -->
					<header>
						<div class="header-content">
							<span class="history-label">History</span>
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
				</div>
				<script src="${jsUri}"></script>
			</body>
			</html>
        `;
	}
}


// This method is called when extension is deactivated
export function deactivate() { }
