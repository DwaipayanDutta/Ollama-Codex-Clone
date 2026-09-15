import * as vscode from 'vscode';

async function sendToChat(query: string): Promise<void> {
  try {
    await vscode.commands.executeCommand('workbench.action.chat.open', { query });
  } catch (err) {
    vscode.window.showErrorMessage(`Could not open chat: ${(err as Error).message}`);
  }
}

function getActiveSelectionOrFile(): { code: string; lang: string; path: string } | undefined {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showWarningMessage('Ollama Codex: open a file first.');
    return undefined;
  }
  const selection = editor.selection;
  const code = selection.isEmpty ? editor.document.getText() : editor.document.getText(selection);
  return {
    code,
    lang: editor.document.languageId,
    path: vscode.workspace.asRelativePath(editor.document.uri),
  };
}

export async function explainSelectionCommand(): Promise<void> {
  const ctx = getActiveSelectionOrFile();
  if (!ctx) return;
  await sendToChat(
    `@ollama Explain what this code from \`${ctx.path}\` does, step by step:\n\n\`\`\`${ctx.lang}\n${ctx.code}\n\`\`\``
  );
}

export async function refactorSelectionCommand(): Promise<void> {
  const ctx = getActiveSelectionOrFile();
  if (!ctx) return;
  await sendToChat(
    `@ollama Refactor this code from \`${ctx.path}\` for clarity and maintainability, preserving behavior. ` +
      `Use edit_file to apply the change directly if you're confident:\n\n\`\`\`${ctx.lang}\n${ctx.code}\n\`\`\``
  );
}

export async function fixCurrentFileCommand(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showWarningMessage('Ollama Codex: open a file first.');
    return;
  }
  const path = vscode.workspace.asRelativePath(editor.document.uri);
  const diagnostics = vscode.languages.getDiagnostics(editor.document.uri);
  const diagText = diagnostics
    .map((d) => `- [${vscode.DiagnosticSeverity[d.severity]}] line ${d.range.start.line + 1}: ${d.message}`)
    .join('\n');
  await sendToChat(
    `@ollama Read and fix the problems in \`${path}\`. ` +
      (diagText ? `Known diagnostics:\n${diagText}\n\n` : '') +
      `Use read_file first, then edit_file to apply fixes.`
  );
}

export async function generateCodeCommand(): Promise<void> {
  const description = await vscode.window.showInputBox({
    prompt: 'Describe the code you want Ollama Codex to generate',
    placeHolder: 'e.g. a debounce utility function with unit tests',
  });
  if (!description) return;
  const editor = vscode.window.activeTextEditor;
  const path = editor ? vscode.workspace.asRelativePath(editor.document.uri) : undefined;
  await sendToChat(
    `@ollama Generate the following${path ? ` for \`${path}\`` : ''}: ${description}. ` +
      `Use write_file or edit_file to place the result in the workspace.`
  );
}

export async function reviewWorkspaceCommand(): Promise<void> {
  await sendToChat(
    `@ollama Review this workspace: use list_directory and search_workspace to understand the project structure, ` +
      `then summarize the architecture and flag anything that looks broken, inconsistent, or risky. Don't modify any files.`
  );
}
