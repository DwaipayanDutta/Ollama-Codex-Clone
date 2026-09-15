import { OllamaChatMessage, OllamaChatResponse, OllamaToolSpec, OllamaCodexConfig } from '../types/common';
import { logger } from '../ui/logger';

export class OllamaConnectionError extends Error {}

export class OllamaClient {
  constructor(private cfg: OllamaCodexConfig) {}

  private url(path: string): string {
    return `${this.cfg.host}${path}`;
  }

  async testConnection(): Promise<{ ok: boolean; message: string }> {
    try {
      const res = await fetch(this.url('/api/tags'), { method: 'GET' });
      if (!res.ok) {
        return { ok: false, message: `Ollama responded with HTTP ${res.status}` };
      }
      const data = (await res.json()) as { models?: { name: string }[] };
      const names = (data.models ?? []).map((m) => m.name);
      const hasModel = names.some((n) => n === this.cfg.model || n.startsWith(this.cfg.model.split(':')[0]));
      if (!hasModel) {
        return {
          ok: true,
          message: `Connected to Ollama at ${this.cfg.host}, but model "${this.cfg.model}" was not found locally. Run: ollama pull ${this.cfg.model}`,
        };
      }
      return { ok: true, message: `Connected to Ollama at ${this.cfg.host}. Model "${this.cfg.model}" is available.` };
    } catch (err) {
      return {
        ok: false,
        message: `Could not reach Ollama at ${this.cfg.host}. Is "ollama serve" running? (${(err as Error).message})`,
      };
    }
  }

  async listModels(): Promise<string[]> {
    const res = await fetch(this.url('/api/tags'));
    if (!res.ok) throw new OllamaConnectionError(`HTTP ${res.status}`);
    const data = (await res.json()) as { models?: { name: string }[] };
    return (data.models ?? []).map((m) => m.name);
  }

  /**
   * Single non-streaming chat turn, optionally with tool definitions.
   * Ollama's /api/chat supports an OpenAI-style "tools" array and returns
   * message.tool_calls when the model decides to call one.
   */
  async chat(messages: OllamaChatMessage[], tools?: OllamaToolSpec[]): Promise<OllamaChatResponse> {
    const body: Record<string, unknown> = {
      model: this.cfg.model,
      messages,
      stream: false,
      options: {
        temperature: this.cfg.temperature,
        num_ctx: this.cfg.numCtx,
      },
    };
    if (tools && tools.length > 0) {
      body.tools = tools;
    }

    logger.info(`POST /api/chat model=${this.cfg.model} messages=${messages.length} tools=${tools?.length ?? 0}`);

    let res: Response;
    try {
      res = await fetch(this.url('/api/chat'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch (err) {
      throw new OllamaConnectionError(
        `Could not reach Ollama at ${this.cfg.host}. Is "ollama serve" running? (${(err as Error).message})`
      );
    }

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new OllamaConnectionError(`Ollama HTTP ${res.status}: ${text.slice(0, 500)}`);
    }

    return (await res.json()) as OllamaChatResponse;
  }

  /**
   * Streaming chat turn. Calls onToken for each content delta.
   * Returns the final assembled response (including tool_calls, if any).
   */
  async chatStream(
    messages: OllamaChatMessage[],
    onToken: (token: string) => void,
    tools?: OllamaToolSpec[]
  ): Promise<OllamaChatResponse> {
    const body: Record<string, unknown> = {
      model: this.cfg.model,
      messages,
      stream: true,
      options: {
        temperature: this.cfg.temperature,
        num_ctx: this.cfg.numCtx,
      },
    };
    if (tools && tools.length > 0) {
      body.tools = tools;
    }

    let res: Response;
    try {
      res = await fetch(this.url('/api/chat'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch (err) {
      throw new OllamaConnectionError(
        `Could not reach Ollama at ${this.cfg.host}. Is "ollama serve" running? (${(err as Error).message})`
      );
    }

    if (!res.ok || !res.body) {
      const text = await res.text().catch(() => '');
      throw new OllamaConnectionError(`Ollama HTTP ${res.status}: ${text.slice(0, 500)}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let finalMessage: OllamaChatResponse['message'] = { role: 'assistant', content: '' };
    let assembledContent = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        if (!line.trim()) continue;
        const chunk = JSON.parse(line) as OllamaChatResponse;
        if (chunk.message?.content) {
          assembledContent += chunk.message.content;
          onToken(chunk.message.content);
        }
        if (chunk.message?.tool_calls) {
          finalMessage.tool_calls = chunk.message.tool_calls;
        }
        if (chunk.done) {
          finalMessage.content = assembledContent;
          return { model: this.cfg.model, message: finalMessage, done: true };
        }
      }
    }

    finalMessage.content = assembledContent;
    return { model: this.cfg.model, message: finalMessage, done: true };
  }
}
