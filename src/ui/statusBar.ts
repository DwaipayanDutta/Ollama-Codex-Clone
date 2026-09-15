import * as vscode from 'vscode';
import { getConfig } from '../config/settings';

let item: vscode.StatusBarItem | undefined;

export function initStatusBar(context: vscode.ExtensionContext): void {
  item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  item.command = 'ollamaCodex.changeModel';
  refreshStatusBar();
  item.show();
  context.subscriptions.push(item);
}

export function refreshStatusBar(state: 'idle' | 'busy' | 'error' = 'idle'): void {
  if (!item) return;
  const { model } = getConfig();
  const icon = state === 'busy' ? '$(sync~spin)' : state === 'error' ? '$(error)' : '$(rocket)';
  item.text = `${icon} Ollama: ${model}`;
  item.tooltip = 'Ollama Codex — click to change model';
}
