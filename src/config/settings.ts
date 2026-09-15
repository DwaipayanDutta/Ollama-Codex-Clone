import * as vscode from 'vscode';
import { OllamaCodexConfig } from '../types/common';

const SECTION = 'ollamaCodex';

export function getConfig(): OllamaCodexConfig {
  const cfg = vscode.workspace.getConfiguration(SECTION);
  return {
    host: cfg.get<string>('host', 'http://localhost:11434').replace(/\/+$/, ''),
    model: cfg.get<string>('model', 'qwen2.5-coder:14b'),
    temperature: cfg.get<number>('temperature', 0.2),
    numCtx: cfg.get<number>('numCtx', 8192),
    agentMode: cfg.get<boolean>('agentMode', true),
    autoApproveEdits: cfg.get<boolean>('autoApproveEdits', false),
    maxToolIterations: cfg.get<number>('maxToolIterations', 12),
    excludeGlobs: cfg.get<string[]>('excludeGlobs', []),
    maxFileReadBytes: cfg.get<number>('maxFileReadBytes', 200000),
  };
}

export async function setModel(model: string): Promise<void> {
  const cfg = vscode.workspace.getConfiguration(SECTION);
  await cfg.update('model', model, vscode.ConfigurationTarget.Global);
}

export function onConfigChanged(listener: () => void): vscode.Disposable {
  return vscode.workspace.onDidChangeConfiguration((e) => {
    if (e.affectsConfiguration(SECTION)) {
      listener();
    }
  });
}
