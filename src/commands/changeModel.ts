import * as vscode from 'vscode';
import { OllamaClient } from '../ollama/client';
import { getConfig, setModel } from '../config/settings';
import { refreshStatusBar } from '../ui/statusBar';

export async function changeModelCommand(): Promise<void> {
  const cfg = getConfig();
  const client = new OllamaClient(cfg);

  let models: string[] = [];
  try {
    models = await client.listModels();
  } catch (err) {
    vscode.window.showErrorMessage(
      `Could not list local Ollama models: ${(err as Error).message}. Enter a model tag manually instead.`
    );
  }

  const manualEntry = '$(edit) Enter a model tag manually…';
  const picked = await vscode.window.showQuickPick([...models, manualEntry], {
    title: 'Select Ollama model',
    placeHolder: `Current: ${cfg.model}`,
  });

  if (!picked) return;

  let model = picked;
  if (picked === manualEntry) {
    const entered = await vscode.window.showInputBox({
      prompt: 'Ollama model tag (e.g. qwen2.5-coder:14b)',
      value: cfg.model,
    });
    if (!entered) return;
    model = entered.trim();
  }

  await setModel(model);
  refreshStatusBar('idle');
  vscode.window.showInformationMessage(`Ollama Codex model set to "${model}".`);
}
