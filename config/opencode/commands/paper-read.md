---
description: Read a paper from Zotero, extract key insights, and write a structured analysis into the Obsidian literature note
---

⚠️ **Context check**: This command requires the workspace to be `~/Workspace/artnotes`. The Obsidian vault is `ArtNotes` at the workspace root (`./ArtNotes/`). If the workspace is different, inform the user and stop.

## Steps

### 1. Verify workspace

Confirm the current workspace is the Obsidian vault by checking that `./ArtNotes/Thèse/Papers/` exists. If not, tell the user: "This command must be run from the Obsidian vault workspace (`~/Workspace/artnotes`)."

### 2. Identify the paper

Ask the user which paper to read. Accept:
- A Better BibTeX citekey (e.g. `Blanchard_2017_MachineLearningAdversaries`)
- A title or search term to find in Zotero

Use Zotero MCP tools to find the paper and get its metadata (title, authors, year, abstract, DOI, URL).

### 3. Check if the note exists

Check if `./ArtNotes/Thèse/Papers/{{citekey}}.md` exists.
- If yes: proceed to read and analyze
- If no: suggest running `/paper-add` first to create the note

### 4. Read the paper content

Use Zotero MCP tools to get the paper's full text:
- If the paper has a PDF attachment, extract text from it
- If no PDF text is available, use the abstract + arxiv/webfetch to get the paper content

### 5. Analyze the paper

Extract and structure the following:
- **Contribution en une phrase** — le résumé le plus concis possible
- **Problème résolu** — quel gap ce papier comble
- **Méthode / GAR** — l'algorithme, les hypothèses sur n, f, d
- **Résultats clés** — bornes de convergence, breakdown point, résultats empiriques
- **Limites** — hypothèses fortes, régimes non couverts, ablations manquantes
- **Implications pour la thèse** — impact sur la librairie, baselines à implémenter, concepts mobilisés

### 6. Update the Obsidian note

Read the existing note at `./ArtNotes/Thèse/Papers/{{citekey}}.md`.

Fill in the analysis sections with the extracted information:
- Replace the placeholder text in "Problème résolu", "Méthode", "Résultat clé", "Limites"
- Update the "Lien Thèse" callout with implications
- Update the one-line summary under the title
- Update status to `reading` and set `dateread` to today

Preserve:
- Frontmatter structure (only update `status` and `dateread`)
- The citation block and abstract
- Any existing annotations
- The "🔗 Voir aussi" section

### 7. Report

Show:
- Paper analyzed: `{{citekey}}`
- Sections filled: list them
- Status updated: `unread → reading`
- Suggest next steps: mark as `read` via `/paper-status` when done
