import * as vscode from 'vscode';

class Logger {
  private channel: vscode.OutputChannel;

  constructor() {
    this.channel = vscode.window.createOutputChannel('Ollama Codex');
  }

  info(msg: string): void {
    this.channel.appendLine(`[info] ${new Date().toISOString()} ${msg}`);
  }

  warn(msg: string): void {
    this.channel.appendLine(`[warn] ${new Date().toISOString()} ${msg}`);
  }

  error(msg: string, err?: unknown): void {
    this.channel.appendLine(`[error] ${new Date().toISOString()} ${msg}`);
    if (err instanceof Error) {
      this.channel.appendLine(err.stack ?? err.message);
    } else if (err !== undefined) {
      this.channel.appendLine(String(err));
    }
  }

  show(): void {
    this.channel.show(true);
  }

  dispose(): void {
    this.channel.dispose();
  }
}

export const logger = new Logger();
