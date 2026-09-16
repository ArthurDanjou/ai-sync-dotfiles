---
description: Import Zotero annotations into existing paper notes (between %% begin/end annotations %%) without overwriting analysis sections
---

⚠️ **Context check**: This command requires the workspace to be `~/Workspace/artnotes`. The Obsidian vault is `ArtNotes` at the workspace root (`./ArtNotes/`). If the workspace is different, inform the user and stop.

## Tools

Use the Obsidian MCP tools (configured as `obsidian` in opencode) to read/write notes. The vault root is `~/Workspace/artnotes`. All note paths are relative to the vault root, e.g. `ArtNotes/Thèse/Papers/{{citekey}}.md`.

Use the Zotero MCP tools to retrieve annotations.

## Steps

### 1. Verify workspace

Confirm the current workspace is `~/Workspace/artnotes` by checking that the Obsidian vault is accessible. Use the Obsidian MCP to verify that `ArtNotes/Thèse/Papers/` exists. If not, tell the user: "This command must be run from the Obsidian vault workspace (`~/Workspace/artnotes`)."

### 2. Get Zotero annotations

Use Zotero MCP tools to retrieve all annotations. For each annotated paper, get:
- The Better BibTeX citekey (from the parent item)
- All annotations (highlighted text, comments, colors, page numbers)

### 3. Find matching Obsidian notes

For each annotated paper, check if a note exists at `ArtNotes/Thèse/Papers/{{citekey}}.md` via Obsidian MCP.

For notes that don't exist yet, skip them (use `/paper-add` first).

### 4. Insert annotations

For each existing note:
1. Read the file via Obsidian MCP
2. Find the `%% begin annotations %%` / `%% end annotations %%` markers
3. Generate markdown annotations in this format:
   ```markdown
   > [!annotation]- Page X (color name)
   > Highlighted text
   > - **Note**: comment (if any)
   ```
4. Replace everything between the markers with the new annotations
5. If no annotations exist for a paper, leave `%% begin annotations %%` / `%% end annotations %%` empty

### 5. Report

Show a summary:
- Papers checked: N
- Papers with new annotations: M (list citekeys)
- Papers without annotations (skipped): K
- Papers not in Obsidian yet: L (suggest `/paper-add`)
