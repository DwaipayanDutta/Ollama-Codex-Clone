<div align="center">

<img src="https://cdn.simpleicons.org/ollama" alt="Ollama logo" width="96" />

# Ollama Codex Clone

### A local-first AI coding assistant for VS Code

<p>
  <img src="https://img.shields.io/badge/VS%20Code-Extension-007ACC?style=for-the-badge&logo=visualstudiocode&logoColor=white" alt="VS Code Extension" />
  <img src="https://img.shields.io/badge/Powered%20by-Ollama-000000?style=for-the-badge&logo=ollama&logoColor=white" alt="Powered by Ollama" />
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="MIT License" />
</p>

<p>
  <strong>Private by design.</strong> No cloud API · No API key · No subscription · No telemetry
</p>

</div>

<p align="center">
  <a href="#-overview">Overview</a> ·
  <a href="#-getting-started">Getting Started</a> ·
  <a href="#-configuration">Configuration</a> ·
  <a href="#-commands">Commands</a> ·
  <a href="#-architecture">Architecture</a>
</p>

> [!IMPORTANT]
> This extension runs entirely against your local [Ollama](https://ollama.com) server. Your source code and prompts stay on your machine unless your own Ollama setup sends them elsewhere.

## ✨ Overview

**Ollama Codex Clone** brings autonomous coding assistance directly into VS Code using local
LLMs served by Ollama. It plugs into VS Code's native Chat UI as a chat participant
(`@ollama`), giving you a familiar Copilot-style experience without a cloud dependency.

### What it can do

| | Capability |
|---|---|
| 💬 | Chat about your code in VS Code's built-in Chat view |
| 🔎 | Read files and search across your workspace for context |
| ✏️ | Propose and apply file edits, new files, and deletions |
| 🧠 | Explain, refactor, and fix code from the editor context menu |
| 🏗️ | Review an entire workspace and summarize its architecture |

All of this runs **fully locally with zero API dependency**.

## 🔐 Why local-first?

Modern AI coding tools are powerful, but they often require cloud accounts and provide limited
control over the model that runs your code. Ollama Codex Clone gives you:

- 🛡️ **Privacy by default** — your code stays on your machine
- 🔄 **Model freedom** — use any Ollama-compatible model and switch at any time
- 💸 **Zero API cost** — no cloud inference bill
- 🎛️ **Prompt and behavior control** — customize the extension to fit your workflow
- 💬 **Native editor UX** — use the familiar `@ollama` chat participant

## 🚀 Getting started

### 1. Install and start Ollama

Install [Ollama](https://ollama.com), then make sure its local server is running:

```bash
ollama serve
```

### 2. Pull a coding model

Choose a tool-calling-capable coding model:

```bash
ollama pull qwen2.5-coder:14b

# Smaller and faster option
ollama pull qwen2.5-coder:7b
```

### 3. Install the VS Code extension

In VS Code, open the **Extensions** view, search for **Ollama Codex Clone**, and select
**Install**.

Once packaged, you can also install it from the command line:

```bash
code --install-extension ollama-codex-clone-0.1.0.vsix
```

### 4. Start coding

Open the Chat view with `Ctrl/Cmd+Alt+I`, then try:

```text
@ollama build me a debounce utility with a unit test
```

You can also run **Ollama Codex: Open Chat** from the Command Palette.

## ⚙️ Configuration

Configure the extension through VS Code Settings:

| Setting | Default | Description |
|---|---:|---|
| `ollamaCodex.host` | `http://localhost:11434` | Base URL of your local Ollama server |
| `ollamaCodex.model` | `qwen2.5-coder:14b` | Model tag used for chat and agent tool-calling |
| `ollamaCodex.temperature` | `0.2` | Sampling temperature |
| `ollamaCodex.numCtx` | `8192` | Context window size requested from the model |
| `ollamaCodex.agentMode` | `true` | Allow file tools; disable for chat-only mode |
| `ollamaCodex.autoApproveEdits` | `false` | Skip confirmation for writes, edits, and deletes |
| `ollamaCodex.maxToolIterations` | `12` | Maximum tool round-trips per request |
| `ollamaCodex.excludeGlobs` | `node_modules`, `.git`, `dist`, `out`, lockfiles | Paths excluded from workspace search |

> 💡 **Tip:** Change the active model anytime with **Ollama Codex: Change Model**, also available
> from the status bar.

## 🧰 Commands

| Command | Description |
|---|---|
| `Ollama Codex: Open Chat` | Opens VS Code Chat pre-filled with `@ollama` |
| `Ollama Codex: Change Model` | Picks from locally installed Ollama models |
| `Ollama Codex: Test Connection` | Verifies the server and configured model are reachable |
| `Ollama Codex: Explain Selection` | Explains the selected code, or the whole file |
| `Ollama Codex: Refactor Selection` | Proposes or applies a refactor |
| `Ollama Codex: Fix Current File` | Reads diagnostics and proposes fixes |
| `Ollama Codex: Generate Code` | Generates code from a natural-language description |
| `Ollama Codex: Review Workspace` | Produces a read-only architecture and risk summary |
| `Ollama Codex: Toggle Agent Mode` | Switches between agentic and chat-only modes |

All commands are also available from the right-click context menu under **Ollama Codex**.

## 🏗️ Architecture

```text
┌──────────────────────┐
│    VS Code Extension │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────────────┐
│ Chat Participant (@ollama)   │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│ Agent Loop                   │
│ system prompt + tool-calling │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│ File Tools                   │
│ read · list · search · write │
│ edit · delete                │
└──────────┬───────────────────┘
           │ approval required
           ▼
┌──────────────────────────────┐
│ Ollama REST API              │
│ /api/chat · streaming        │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│ Local Model                  │
│ qwen2.5-coder · gemma2 · …   │
└──────────────────────────────┘
```

### Core modules

- **`src/ollama/client.ts`** — thin client over Ollama's `/api/chat` and `/api/tags`, with
  streaming and OpenAI-style `tools` support.
- **`src/agent/tools.ts`** — file-system tool implementations and JSON-schema specifications,
  sandboxed to the first workspace folder.
- **`src/agent/agentLoop.ts`** — drives the tool-calling loop: send messages → receive a reply or
  tool call → run the tool → feed the result back → repeat.
- **`src/chat/participant.ts`** — wires the agent loop into VS Code's native Chat API as the
  `@ollama` participant.

## 🛡️ Safety and privacy

- File writes, edits, and deletes ask for confirmation by default
  (`ollamaCodex.autoApproveEdits: false`).
- File tools are sandboxed to the first open workspace folder; paths outside it are rejected.
- Nothing is sent anywhere except your own Ollama server — no telemetry and no cloud calls.
- Only disable edit approvals if you trust the model and the prompts it receives.

## 📁 Project structure

```text
├── src/
│   ├── extension.ts            # activation, command + participant registration
│   ├── ollama/client.ts        # Ollama REST client (chat, streaming, tool calls)
│   ├── agent/tools.ts          # file tools + their tool-spec schemas
│   ├── agent/agentLoop.ts      # tool-calling conversation loop
│   ├── chat/participant.ts     # @ollama chat participant
│   ├── commands/               # command palette + context menu commands
│   ├── config/settings.ts      # typed settings accessor
│   └── ui/                     # status bar + output channel logging
├── test/tools.test.ts
├── package.json
├── tsconfig.json
├── esbuild.js
└── README.md
```

## 🗺️ Roadmap

- [ ] Streaming diffs and inline edit previews before applying changes
- [ ] Multi-root workspace support
- [ ] Optional shell-command tool — explicit opt-in, always confirmed
- [ ] Model auto-pull prompt when the configured model is not installed

## 🤝 Contributing

Issues and pull requests are welcome. Open one on the project's GitHub repository.

## 📄 License

This project is licensed under the **MIT License**.
