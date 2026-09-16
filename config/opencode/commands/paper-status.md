---
description: Update a paper's reading status and date in the frontmatter without overwriting the note
---

⚠️ **Context check**: This command requires the workspace to be `~/Workspace/artnotes`. The Obsidian vault is `ArtNotes` at the workspace root (`./ArtNotes/`). If the workspace is different, inform the user and stop.

## Tools

Use the Obsidian MCP tools (configured as `obsidian` in opencode) to read/write notes. The vault root is `~/Workspace/artnotes`. All note paths are relative to the vault root, e.g. `ArtNotes/Thèse/Papers/{{citekey}}.md`.

## Steps

### 1. Verify workspace

Confirm the current workspace is `~/Workspace/artnotes` by checking that the Obsidian vault is accessible. Use the Obsidian MCP to verify that `ArtNotes/Thèse/Papers/` exists. If not, tell the user: "This command must be run from the Obsidian vault workspace (`~/Workspace/artnotes`)."

### 2. Prompt the user

Ask which paper to update. Accept either:
- A citekey (e.g. `Blanchard_2017_MachineLearningAdversaries`)
- A search term to find in `ArtNotes/Thèse/Papers/`

Then ask for the new status: `unread`, `reading`, or `read`.

### 3. Find the note

If a citekey was given, look for `ArtNotes/Thèse/Papers/{{citekey}}.md` via Obsidian MCP.

If a search term was given, list files in the directory and find matches. If multiple, show options and ask the user to pick one.

### 4. Update frontmatter

Read the file via Obsidian MCP. Update its frontmatter:
- `status: <new_status>`
- If status is `read`, add `dateread: <today's date>` in YYYY-MM-DD format
- If status is `reading` and no `dateread` exists, leave it empty
- Keep all other fields unchanged

### 5. Report

Show:
- File updated: `{{citekey}}.md`
- Status: `unread → reading` (or whatever the change was)
- Current dateread (if set)
