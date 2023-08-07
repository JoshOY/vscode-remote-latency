// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

const UPDATE_INTERVAL_MS = 3000;

const BATCHING_LOOP = 10;

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  const outputChannel = vscode.window.createOutputChannel('remote-latency');

  const remoteEnvName = vscode.env.remoteName;
  outputChannel.appendLine(`Remote env name: ${remoteEnvName}`);

  if (!remoteEnvName) {
    // Not in remote
    return;
  }

  const statusBarItem: vscode.StatusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left
  );
  statusBarItem.text = 'Latency: 0ms';
  statusBarItem.show();

  const updateStatusBarItem = async () => {
    const latency = await getLatency(remoteEnvName);
    statusBarItem.text = `Latency: ${latency.toFixed(2)}ms`;
    setTimeout(updateStatusBarItem, UPDATE_INTERVAL_MS);
  };

  updateStatusBarItem();
}

async function getLatency(remoteEnvName: string): Promise<number> {
  switch (remoteEnvName) {
    case 'ssh-remote':
    case 'wsl':
    case 'wsl-remote':
    case 'containers-remote':
      return await getRemoteContainerLatency();
    default:
      return await getRemoteLatencyWithDefaultFS();
  }
}

async function getRemoteContainerLatency(): Promise<number> {
  if (vscode.workspace.workspaceFolders?.length) {
    const workspaceFolderUri = vscode.workspace.workspaceFolders[0].uri;
    const startTime = performance.now();
    for (let i = 0; i < BATCHING_LOOP; i++) {
      try {
        await vscode.workspace.fs.stat(workspaceFolderUri);
      } catch (e) {
        // Ignore
      }
    }
    const endTime = performance.now();
    return (endTime - startTime) / BATCHING_LOOP;
  }
  return 0;
}

async function getRemoteLatencyWithDefaultFS(): Promise<number> {
  const startTime = performance.now();
  for (let i = 0; i < BATCHING_LOOP; i++) {
    try {
      await vscode.workspace.fs.stat(vscode.Uri.parse('/dev/null'));
    } catch (e) {
      // Ignore
    }
  }
  const endTime = performance.now();
  return (endTime - startTime) / BATCHING_LOOP;
}

// This method is called when your extension is deactivated
export function deactivate() {}
