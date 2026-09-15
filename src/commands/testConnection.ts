import * as vscode from 'vscode';
import { OllamaClient } from '../ollama/client';
import { getConfig } from '../config/settings';
import { refreshStatusBar } from '../ui/statusBar';

export async function testConnectionCommand(): Promise<void> {
  const cfg = getConfig();
  const client = new OllamaClient(cfg);

  await vscode.window.withProgress(
    { location: vscode.ProgressLocation.Notification, title: 'Testing connection to Ollama…' },
    async () => {
      const result = await client.testConnection();
      if (result.ok) {
        refreshStatusBar('idle');
        vscode.window.showInformationMessage(result.message);
      } else {
        refreshStatusBar('error');
        vscode.window.showErrorMessage(result.message);
      }
    }
  );
}
