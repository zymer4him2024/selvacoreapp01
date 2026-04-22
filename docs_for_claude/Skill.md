# MCP Workflow — Skill

**Purpose:** Guide how to connect Claude Code to external tools via MCP and build automated workflows.
**When to use:** Setting up MCP servers, building cross-tool automations, or troubleshooting connections.

---

## What MCP Does for This Project

MCP turns Claude Code from a code-writing tool into a full operating system for your project:

**Without MCP:**
```
You -> tell Claude what to build -> Claude writes code -> You copy/deploy/test manually
```

**With MCP:**
```
You -> tell Claude what to do -> Claude writes code AND deploys AND creates PR
AND posts to Slack AND updates Notion — all in one conversation
```

---

## Setting Up MCP Servers

Add a server via Claude Code terminal:

```bash
# GitHub — for PRs, issues, code review
claude mcp add github --transport http https://github.mcp.server/url

# Notion — for product docs, roadmap
claude mcp add notion --transport http https://notion.mcp.server/url

# Slack — for team notifications
claude mcp add slack --transport http https://slack.mcp.server/url
```

Verify connections:

```bash
# Check which MCP servers are connected
/mcp
```

Quick-add from MCP collection:

```bash
# Browse available MCP servers
claude mcp add --transport http https://mcp.notion.com/mcp
```

---

## Workflow Patterns

### Pattern 1: Code -> Deploy -> Notify

When building a new feature:

1. Claude Code writes the feature (uses general-coding-agent skill)
2. Claude Code runs tests locally
3. Claude Code creates a GitHub PR via MCP
4. Claude Code posts to Slack: "New PR ready for review: [link]"
5. Claude Code updates Notion roadmap: feature status -> "In Review"

**How to trigger this:** Tell Claude Code:

> "Build [feature], create a PR, and let the team know on Slack"

### Pattern 2: Bug Report -> Fix -> Deploy

1. Bug comes in via Slack or GitHub issue
2. Claude Code reads the bug details via MCP
3. Claude Code investigates the codebase
4. Claude Code writes the fix
5. Claude Code creates a PR with the fix
6. Claude Code comments on the original issue: "Fix submitted in PR #XX"

### Pattern 3: Research -> Build -> Document

1. Claude Code searches for best practices (web search)
2. Claude Code writes the implementation
3. Claude Code updates Notion documentation via MCP
4. Claude Code creates a GitHub PR

---

## MCP Best Practices

### Do

- Connect MCP servers at the start of your session
- Use MCP for repetitive cross-tool tasks (deploy + notify + document)
- Let Claude Code chain multiple MCP actions in one conversation
- Verify MCP connections with `/mcp` before relying on them

### Don't

- Don't manually copy-paste between tools when MCP can do it
- Don't create separate conversations for each tool interaction
- Don't forget to check if the MCP action succeeded (Claude Code reports back)
- Don't store MCP credentials in your codebase — Claude Code manages them

---

## Agentic OS: Putting It All Together

Your full agentic workflow looks like this:

```
┌──────────────────────────────────────────┐
│           YOU (CEO / Product Lead)        │
│  "Add an image analyzer to the platform" │
└──────────────┬───────────────────────────┘
               │
┌──────────────▼───────────────────────────┐
│           CLAUDE CODE (Agent)            │
│                                          │
│  1. Reads CLAUDE.md (project context)    │
│  2. Loads ai-detection-engine Skill.md   │
│  3. Follows the "New Analyzer" template  │
│  4. Writes image-analyzer.ts             │
│  5. Updates router.ts                    │
│  6. Runs tests                           │
│  7. Creates GitHub PR        <- MCP      │
│  8. Posts to Slack           <- MCP      │
│  9. Updates Notion roadmap   <- MCP      │
│  10. Reports back to you                 │
└──────────────────────────────────────────┘
```

This is the Agentic OS pattern: `CLAUDE.md` is memory, `Skills` are capabilities, `MCP` is connectivity. You direct the agent with natural language, and it handles the execution across all your tools.

---

## Troubleshooting MCP

| Problem                    | Solution                                                        |
|----------------------------|-----------------------------------------------------------------|
| `/mcp` shows no servers    | Re-run the `claude mcp add` commands                            |
| MCP action times out       | Check your internet connection and server URL                   |
| Permission denied          | Re-authenticate with the service (GitHub, Notion, etc.)         |
| Wrong data returned        | Verify you're pointing to the correct workspace/repo            |
| Server not found           | Check the MCP server URL — some require specific paths          |

---

## Recommended MCP Setup Order

1. **GitHub** (first priority) — you'll use this every session for PRs
2. **Slack** (second) — instant team visibility on what Claude builds
3. **Notion** (third) — keeps your roadmap and docs in sync
4. **Firebase** (when available) — direct database operations

Start with GitHub MCP and add others as your workflow demands it.
