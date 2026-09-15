import * as vscode from 'vscode';

export async function openChatCommand(): Promise<void> {
  try {
    await vscode.commands.executeCommand('workbench.action.chat.open', { query: '@ollama ' });
  } catch {
    vscode.window.showInformationMessage(
      'Open the Chat view (Ctrl/Cmd+Alt+I) and type "@ollama" to talk to Ollama Codex.'
    );
  }
}
