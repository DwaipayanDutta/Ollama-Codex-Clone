import * as vscode from 'vscode';
import { OllamaCodexConfig, OllamaToolSpec, ToolResult } from '../types/common';
import { logger } from '../ui/logger';

function workspaceRoot(): vscode.WorkspaceFolder {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders || folders.length === 0) {
    throw new Error('No workspace folder is open.');
  }
  return folders[0];
}

/** Resolve a model-supplied relative path safely inside the workspace root. */
function resolveSafe(relativePath: string): vscode.Uri {
  const root = workspaceRoot().uri;
  const cleaned = relativePath.replace(/^[/\\]+/, '');
  const uri = vscode.Uri.joinPath(root, cleaned);
  if (!uri.fsPath.startsWith(root.fsPath)) {
    throw new Error(`Refusing to access path outside the workspace: ${relativePath}`);
  }
  return uri;
}

async function confirmDestructive(cfg: OllamaCodexConfig, action: string, target: string): Promise<boolean> {
  if (cfg.autoApproveEdits) return true;
  const choice = await vscode.window.showWarningMessage(
    `Ollama Codex wants to ${action}: ${target}`,
    { modal: true },
    'Allow',
    'Deny'
  );
  return choice === 'Allow';
}

export const TOOL_SPECS: OllamaToolSpec[] = [
  {
    type: 'function',
    function: {
      name: 'read_file',
      description: 'Read the UTF-8 text content of a file in the workspace, given a path relative to the workspace root.',
      parameters: {
        type: 'object',
        properties: { path: { type: 'string', description: 'Workspace-relative file path' } },
        required: ['path'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_directory',
      description: 'List files and folders at a given workspace-relative path (non-recursive).',
      parameters: {
        type: 'object',
        properties: { path: { type: 'string', description: 'Workspace-relative directory path. Use "." for root.' } },
        required: ['path'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_workspace',
      description: 'Search for a text/regex pattern across workspace files and return matching file paths with line numbers.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Text or regex pattern to search for' },
          maxResults: { type: 'number', description: 'Maximum number of matches to return (default 50)' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'write_file',
      description: 'Create a new file or overwrite an existing file with the given content. Requires user confirmation unless auto-approve is enabled.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Workspace-relative file path' },
          content: { type: 'string', description: 'Full text content to write' },
        },
        required: ['path', 'content'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'edit_file',
      description: 'Replace an exact, unique substring in an existing file with new text. Prefer this over write_file for small changes.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Workspace-relative file path' },
          oldText: { type: 'string', description: 'Exact existing text to find (must appear exactly once)' },
          newText: { type: 'string', description: 'Replacement text' },
        },
        required: ['path', 'oldText', 'newText'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_file',
      description: 'Delete a file in the workspace. Requires user confirmation unless auto-approve is enabled.',
      parameters: {
        type: 'object',
        properties: { path: { type: 'string', description: 'Workspace-relative file path' } },
        required: ['path'],
      },
    },
  },
];

export async function runTool(
  name: string,
  args: Record<string, unknown>,
  cfg: OllamaCodexConfig
): Promise<ToolResult> {
  try {
    switch (name) {
      case 'read_file':
        return await readFile(args.path as string, cfg);
      case 'list_directory':
        return await listDirectory(args.path as string);
      case 'search_workspace':
        return await searchWorkspace(args.query as string, (args.maxResults as number) ?? 50, cfg);
      case 'write_file':
        return await writeFile(args.path as string, args.content as string, cfg);
      case 'edit_file':
        return await editFile(args.path as string, args.oldText as string, args.newText as string, cfg);
      case 'delete_file':
        return await deleteFile(args.path as string, cfg);
      default:
        return { ok: false, summary: `Unknown tool: ${name}` };
    }
  } catch (err) {
    logger.error(`Tool ${name} failed`, err);
    return { ok: false, summary: `Tool "${name}" failed: ${(err as Error).message}` };
  }
}

async function readFile(path: string, cfg: OllamaCodexConfig): Promise<ToolResult> {
  const uri = resolveSafe(path);
  const bytes = await vscode.workspace.fs.readFile(uri);
  const truncated = bytes.byteLength > cfg.maxFileReadBytes;
  const slice = truncated ? bytes.slice(0, cfg.maxFileReadBytes) : bytes;
  const text = Buffer.from(slice).toString('utf-8');
  return {
    ok: true,
    summary: `Read ${path} (${bytes.byteLength} bytes${truncated ? ', truncated' : ''})`,
    detail: text,
  };
}

async function listDirectory(path: string): Promise<ToolResult> {
  const uri = resolveSafe(path);
  const entries = await vscode.workspace.fs.readDirectory(uri);
  const lines = entries.map(([n, t]) => `${t === vscode.FileType.Directory ? 'dir ' : 'file'}  ${n}`);
  return { ok: true, summary: `Listed ${path} (${entries.length} entries)`, detail: lines.join('\n') };
}

async function searchWorkspace(query: string, maxResults: number, cfg: OllamaCodexConfig): Promise<ToolResult> {
  const exclude = `{${cfg.excludeGlobs.join(',')}}`;
  const files = await vscode.workspace.findFiles('**/*', exclude, 2000);
  let regex: RegExp;
  try {
    regex = new RegExp(query, 'g');
  } catch {
    regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
  }
  const matches: string[] = [];
  for (const file of files) {
    if (matches.length >= maxResults) break;
    let text: string;
    try {
      const bytes = await vscode.workspace.fs.readFile(file);
      text = Buffer.from(bytes).toString('utf-8');
    } catch {
      continue;
    }
    const lines = text.split('\n');
    for (let i = 0; i < lines.length && matches.length < maxResults; i++) {
      if (regex.test(lines[i])) {
        const rel = vscode.workspace.asRelativePath(file);
        matches.push(`${rel}:${i + 1}: ${lines[i].trim().slice(0, 200)}`);
      }
      regex.lastIndex = 0;
    }
  }
  return {
    ok: true,
    summary: `Found ${matches.length} match(es) for "${query}"`,
    detail: matches.join('\n') || '(no matches)',
  };
}

async function writeFile(path: string, content: string, cfg: OllamaCodexConfig): Promise<ToolResult> {
  const uri = resolveSafe(path);
  let existed = true;
  try {
    await vscode.workspace.fs.stat(uri);
  } catch {
    existed = false;
  }
  const approved = await confirmDestructive(cfg, existed ? 'overwrite file' : 'create file', path);
  if (!approved) return { ok: false, summary: `User denied ${existed ? 'overwrite' : 'creation'} of ${path}` };

  await vscode.workspace.fs.writeFile(uri, Buffer.from(content, 'utf-8'));
  const doc = await vscode.workspace.openTextDocument(uri);
  await vscode.window.showTextDocument(doc, { preview: false });
  return { ok: true, summary: `${existed ? 'Overwrote' : 'Created'} ${path} (${content.length} chars)` };
}

async function editFile(path: string, oldText: string, newText: string, cfg: OllamaCodexConfig): Promise<ToolResult> {
  const uri = resolveSafe(path);
  const bytes = await vscode.workspace.fs.readFile(uri);
  const text = Buffer.from(bytes).toString('utf-8');
  const occurrences = text.split(oldText).length - 1;
  if (occurrences === 0) {
    return { ok: false, summary: `oldText not found in ${path}. No changes made.` };
  }
  if (occurrences > 1) {
    return {
      ok: false,
      summary: `oldText appears ${occurrences} times in ${path}; it must be unique. No changes made.`,
    };
  }
  const approved = await confirmDestructive(cfg, 'edit file', path);
  if (!approved) return { ok: false, summary: `User denied edit of ${path}` };

  const updated = text.replace(oldText, newText);
  await vscode.workspace.fs.writeFile(uri, Buffer.from(updated, 'utf-8'));
  const doc = await vscode.workspace.openTextDocument(uri);
  await vscode.window.showTextDocument(doc, { preview: false });
  return { ok: true, summary: `Edited ${path}` };
}

async function deleteFile(path: string, cfg: OllamaCodexConfig): Promise<ToolResult> {
  const uri = resolveSafe(path);
  const approved = await confirmDestructive(cfg, 'delete file', path);
  if (!approved) return { ok: false, summary: `User denied deletion of ${path}` };
  await vscode.workspace.fs.delete(uri, { useTrash: true });
  return { ok: true, summary: `Deleted ${path}` };
}
