---
description: Sync Zotero papers into Obsidian — find papers in Zotero not yet in Obsidian, create literature notes with Better BibTeX citekeys, and update the MOC
---

⚠️ **Context check**: This command requires the workspace to be `~/Workspace/artnotes`. The Obsidian vault is `ArtNotes` at the workspace root (`./ArtNotes/`). If the workspace is different, inform the user and stop.

## Tools

Use the Obsidian MCP tools (configured as `obsidian` in opencode) to read/write notes. The vault root is `~/Workspace/artnotes`. All note paths are relative to the vault root, e.g. `ArtNotes/Thèse/Papers/{{citekey}}.md`.

Use the Zotero MCP tools to retrieve papers and metadata.

## Steps

### 1. Verify workspace

Confirm the current workspace is `~/Workspace/artnotes` by checking that the Obsidian vault is accessible. Use the Obsidian MCP to verify that `ArtNotes/Thèse/Papers/` exists. If not, tell the user: "This command must be run from the Obsidian vault workspace (`~/Workspace/artnotes`)."

### 2. Get all papers from Zotero

Use the Zotero MCP tools to retrieve all items:
- Call the Zotero tool to list all items (or items from the relevant collection)
- For each item, get: title, authors, year, **Better BibTeX citekey**, abstract, DOI, URL, itemType, publication info

**Better BibTeX citekey**: Zotero's Better BibTeX plugin generates citekeys automatically. Retrieve the citekey from the item metadata — it will be in a field like `citekey`, `citationKey`, or in the `extra` field as `Citation Key: <key>`. Do NOT generate citekeys manually. The Better BibTeX format is the single source of truth.

### 3. Get existing papers from Obsidian

Use the Obsidian MCP to list files in `ArtNotes/Thèse/Papers/` (excluding `Papers.md`).

For each existing file, extract the citekey from frontmatter (`citekey:` field) or filename to build a set of existing citekeys.

### 4. Find missing papers

Compare Zotero items (by Better BibTeX citekey) against existing Obsidian notes. Identify papers in Zotero that are NOT in Obsidian.

If all papers are already synced, inform the user and stop.

### 5. Create literature notes for missing papers

For each missing paper, create a note at `ArtNotes/Thèse/Papers/{{citekey}}.md` using the Better BibTeX citekey as the filename. Use the Obsidian MCP write tool.

Use this template structure:

```markdown
---
category: literaturenote
tags:
  - thèse
  - thèse/papers
aliases:
  - {{citekey}}
status: unread
dateread:
citekey: {{citekey}}
---

> [!Cite]
> {{authors}} ({{year}}). {{title}}. {{publicationInfo}}.

> [!Abstract]
> {{abstract}}

---

# {{title}} ({{year}})

> *Synthèse en une phrase de la contribution.*

**Lien :** {{url}}

---

## Analyse

### Problème résolu

*Quel problème ce papier adresse-t-il ?*

### Méthode

*Quel est le GAR / l'algorithme ? Quelles hypothèses sur $n, f, d$ ?*

### Résultat clé

*Borne de convergence, point de rupture, résultat empirique principal.*

### Limites

*Hypothèses irréalistes ? Régime non couvert ?*

---

## 🔗 Voir aussi

- [[Papers|Index des papiers]]
- [[Library|Librairie]]
```

### 6. Update the MOC

Read `ArtNotes/Thèse/Papers/Papers.md` via Obsidian MCP.

Add new entries to the appropriate section:
- If the paper is a fundamental/deep-analysis paper → add to "📖 Papiers fondamentaux" table
- Otherwise → add to "🔬 Synthèses de papiers" table
- Use the format: `| **Short description** | [[{{citekey}}]] — brief note |`

The "📊 Tous les papiers" section uses a dataview query so it auto-updates — no manual entry needed there.

### 7. Report

Show the user a summary:
- Total papers in Zotero: N
- Already in Obsidian: M
- Newly created: K (list them with their Better BibTeX citekeys)
- Remind them:
  - PDFs are in Zotero for annotations
  - Zotero Integration (Cmd+P → Import) can enrich notes with annotations later
  - Status workflow: `unread` → `reading` → `read`

## Important

- Never overwrite existing paper notes
- **Always use the Better BibTeX citekey** from Zotero — never generate one manually
- Create files one at a time
- If a paper has no abstract, note that in the abstract section
