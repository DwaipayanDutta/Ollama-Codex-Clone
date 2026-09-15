import * as vscode from 'vscode';
import { getConfig } from '../config/settings';

export async function toggleAgentModeCommand(): Promise<void> {
  const cfg = vscode.workspace.getConfiguration('ollamaCodex');
  const current = getConfig().agentMode;
  await cfg.update('agentMode', !current, vscode.ConfigurationTarget.Global);
  vscode.window.showInformationMessage(
    `Ollama Codex agent mode ${!current ? 'enabled — @ollama can now read/write/edit files.' : 'disabled — @ollama will only chat.'}`
  );
}
