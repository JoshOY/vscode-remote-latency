// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

const UPDATE_INTERVAL_MS = 3000;

const BATCHING_LOOP = 10;

const CONFIGURAION_KEY_ALIGNMENT = 'remote-latency.alignRight';

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

  let statusBarItem: vscode.StatusBarItem = vscode.window.createStatusBarItem(getAlignmentFromConfiguration());

  vscode.workspace.onDidChangeConfiguration(event => {
    if (event.affectsConfiguration(CONFIGURAION_KEY_ALIGNMENT)) {
      const previousText = statusBarItem.text;
      statusBarItem.dispose();
      statusBarItem = vscode.window.createStatusBarItem(getAlignmentFromConfiguration());
      statusBarItem.text = previousText;
      statusBarItem.show();
    }
  });

  statusBarItem.text = 'Latency: -';
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
    case 'tunnel':
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

function getAlignmentFromConfiguration(): vscode.StatusBarAlignment {
  const shouldAlignRight = vscode.workspace.getConfiguration('remote-latency').get('alignRight');
  if (shouldAlignRight) {
    return vscode.StatusBarAlignment.Right;
  }
  return vscode.StatusBarAlignment.Left;
}

// This method is called when your extension is deactivated
export function deactivate() {}
