import { OllamaClient } from '../ollama/client';
import { runTool, TOOL_SPECS } from './tools';
import { OllamaChatMessage, OllamaCodexConfig } from '../types/common';
import { logger } from '../ui/logger';

const SYSTEM_PROMPT = `You are Ollama Codex, an agentic coding assistant running entirely on a local
Ollama model inside VS Code. You can call tools to read, search, write, edit, and delete files
in the user's workspace in order to complete their request.

Rules:
- Prefer edit_file for small, targeted changes; use write_file only for new files or full rewrites.
- Always read a file before editing it if you are not certain of its exact current content.
- Explain what you are about to do briefly, then call the appropriate tool(s).
- After tools run, summarize what changed in plain language.
- If a tool call is denied by the user, do not retry the same action; ask how to proceed instead.
- Never fabricate file contents you have not read or written yourself.
- Keep responses concise and focused on the user's request.`;

export interface AgentStreamHandlers {
  onText: (text: string) => void;
  onToolStart: (name: string, args: Record<string, unknown>) => void;
  onToolResult: (name: string, ok: boolean, summary: string) => void;
}

export async function runAgentTurn(
  client: OllamaClient,
  cfg: OllamaCodexConfig,
  history: OllamaChatMessage[],
  userMessage: string,
  handlers: AgentStreamHandlers
): Promise<void> {
  const messages: OllamaChatMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history,
    { role: 'user', content: userMessage },
  ];

  const tools = cfg.agentMode ? TOOL_SPECS : undefined;
  let iterations = 0;

  while (iterations < cfg.maxToolIterations) {
    iterations++;

    const response = await client.chatStream(messages, handlers.onText, tools);
    const { content, tool_calls } = response.message;

    messages.push({ role: 'assistant', content: content ?? '', tool_calls });

    if (!tool_calls || tool_calls.length === 0) {
      history.push(...messages.slice(-(messages.length - history.length)));
      return;
    }

    for (const call of tool_calls) {
      const { name, arguments: args } = call.function;
      handlers.onToolStart(name, args);
      const result = await runTool(name, args, cfg);
      handlers.onToolResult(name, result.ok, result.summary);
      logger.info(`Tool ${name} -> ok=${result.ok} ${result.summary}`);

      messages.push({
        role: 'tool',
        tool_name: name,
        content: result.detail ? `${result.summary}\n\n${result.detail}` : result.summary,
      });
    }
    // loop again so the model can react to tool results
  }

  handlers.onText(
    `\n\n_Stopped after ${cfg.maxToolIterations} tool iterations (ollamaCodex.maxToolIterations). Ask me to continue if more work is needed._`
  );
}
