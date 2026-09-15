export interface OllamaCodexConfig {
  host: string;
  model: string;
  temperature: number;
  numCtx: number;
  agentMode: boolean;
  autoApproveEdits: boolean;
  maxToolIterations: number;
  excludeGlobs: string[];
  maxFileReadBytes: number;
}

export interface OllamaChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_calls?: OllamaToolCall[];
  tool_name?: string;
}

export interface OllamaToolCall {
  function: {
    name: string;
    arguments: Record<string, unknown>;
  };
}

export interface OllamaToolSpec {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, unknown>;
      required?: string[];
    };
  };
}

export interface OllamaChatResponse {
  model: string;
  message: {
    role: string;
    content: string;
    tool_calls?: OllamaToolCall[];
  };
  done: boolean;
}

export interface ToolResult {
  ok: boolean;
  summary: string;
  detail?: string;
}
