import * as vscode from 'vscode';
import { OllamaClient } from '../ollama/client';
import { getConfig } from '../config/settings';
import { runAgentTurn } from '../agent/agentLoop';
import { OllamaChatMessage } from '../types/common';
import { refreshStatusBar } from '../ui/statusBar';
import { logger } from '../ui/logger';

// Per-conversation-session history, keyed by ChatContext's history length isn't
// reliable across turns, so we keep our own lightweight session map.
const sessionHistory = new Map<string, OllamaChatMessage[]>();

export function registerChatParticipant(context: vscode.ExtensionContext): void {
  const handler: vscode.ChatRequestHandler = async (request, chatContext, stream, token) => {
    const cfg = getConfig();
    const client = new OllamaClient(cfg);

    const sessionId = (chatContext as unknown as { sessionId?: string }).sessionId ?? 'default';
    const history = sessionHistory.get(sessionId) ?? [];

    refreshStatusBar('busy');
    stream.progress(`Thinking with ${cfg.model} (local, via Ollama)…`);

    let cancelled = false;
    token.onCancellationRequested(() => {
      cancelled = true;
    });

    try {
      await runAgentTurn(client, cfg, history, request.prompt, {
        onText: (text) => {
          if (cancelled) return;
          stream.markdown(text);
        },
        onToolStart: (name, args) => {
          const argStr = Object.entries(args)
            .map(([k, v]) => `${k}=${typeof v === 'string' && v.length > 60 ? v.slice(0, 60) + '…' : v}`)
            .join(', ');
          stream.progress(`Running tool: ${name}(${argStr})`);
        },
        onToolResult: (name, ok, summary) => {
          stream.markdown(`\n\n> ${ok ? '✅' : '⚠️'} **${name}** — ${summary}\n\n`);
        },
      });
      sessionHistory.set(sessionId, history);
      refreshStatusBar('idle');
    } catch (err) {
      refreshStatusBar('error');
      logger.error('Chat handler error', err);
      stream.markdown(
        `\n\n⚠️ **Error talking to Ollama:** ${(err as Error).message}\n\nRun **Ollama Codex: Test Connection** from the command palette to diagnose.`
      );
    }

    return {};
  };

  const participant = vscode.chat.createChatParticipant('ollamaCodex.agent', handler);
  participant.iconPath = new vscode.ThemeIcon('rocket');
  context.subscriptions.push(participant);
}
