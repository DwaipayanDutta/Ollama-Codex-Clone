import * as vscode from 'vscode';
import { registerChatParticipant } from './chat/participant';
import { initStatusBar } from './ui/statusBar';
import { logger } from './ui/logger';
import { onConfigChanged } from './config/settings';
import { refreshStatusBar } from './ui/statusBar';

import { testConnectionCommand } from './commands/testConnection';
import { changeModelCommand } from './commands/changeModel';
import { openChatCommand } from './commands/openChat';
import { toggleAgentModeCommand } from './commands/toggleAgentMode';
import {
  explainSelectionCommand,
  refactorSelectionCommand,
  fixCurrentFileCommand,
  generateCodeCommand,
  reviewWorkspaceCommand,
} from './commands/editorCommands';

export function activate(context: vscode.ExtensionContext): void {
  logger.info('Ollama Codex activating…');

  initStatusBar(context);
  registerChatParticipant(context);

  const commands: [string, (...args: unknown[]) => unknown][] = [
    ['ollamaCodex.openChat', openChatCommand],
    ['ollamaCodex.changeModel', changeModelCommand],
    ['ollamaCodex.testConnection', testConnectionCommand],
    ['ollamaCodex.explainSelection', explainSelectionCommand],
    ['ollamaCodex.refactorSelection', refactorSelectionCommand],
    ['ollamaCodex.fixCurrentFile', fixCurrentFileCommand],
    ['ollamaCodex.generateCode', generateCodeCommand],
    ['ollamaCodex.reviewWorkspace', reviewWorkspaceCommand],
    ['ollamaCodex.toggleAgentMode', toggleAgentModeCommand],
  ];

  for (const [id, handler] of commands) {
    context.subscriptions.push(vscode.commands.registerCommand(id, handler));
  }

  context.subscriptions.push(onConfigChanged(() => refreshStatusBar('idle')));

  logger.info('Ollama Codex activated.');
}

export function deactivate(): void {
  logger.dispose();
}
