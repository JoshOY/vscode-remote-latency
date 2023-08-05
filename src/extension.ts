// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed

const STATUS_BAR_PRIORITY = 9999;

async function getLatency(remoteEnvName: string): Promise<number> {
  switch (remoteEnvName) {
    case 'ssh-remote':
    case 'wsl-remote':
    case 'containers-remote':
      return await getRemoteContainerLatency();
    default:
      return await getRemoteLatency();
  }
}

async function getRemoteContainerLatency(): Promise<number> {
  if (vscode.workspace.workspaceFolders?.length) {
    const workspaceFolderUri = vscode.workspace.workspaceFolders[0].uri;
    const startTime = performance.now();
    try {
      await vscode.workspace.fs.stat(workspaceFolderUri);
    } catch (e) {
      // Ignore
    }
    const endTime = performance.now();
    return endTime - startTime;
  }
  return 0;
}

async function getRemoteLatency(): Promise<number> {
  const startTime = performance.now();
  try {
    await vscode.workspace.fs.stat(vscode.Uri.parse('/dev/null'));
  } catch (e) {
    // Ignore
  }
  const endTime = performance.now();
  return endTime - startTime;
}


export function activate(context: vscode.ExtensionContext) {
  const remoteEnvName = vscode.env.remoteName;
  if (!remoteEnvName) {
    // Not in remote
    return;
  }

  const statusBarItem: vscode.StatusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    STATUS_BAR_PRIORITY
  );
  statusBarItem.text = 'Latency: 0ms';
  statusBarItem.show();

  const updateStatusBarItem = async () => {
    const latency = await getLatency(remoteEnvName);
    statusBarItem.text = `Latency: ${latency.toFixed(2)}ms`;
    setTimeout(updateStatusBarItem, 3000);
  }

  updateStatusBarItem();
}

// This method is called when your extension is deactivated
export function deactivate() {}