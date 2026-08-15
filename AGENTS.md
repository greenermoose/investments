# Agent Guidelines & Repository Rules

## 1. No Emojis Policy
- **CRITICAL**: Never include emojis (pictographs, smileys, symbols, or colored glyphs) in any file in this repository.
- This applies to all file types including source code (`.js`, `.py`, `.html`, `.css`), configuration files (`.json`, `.yaml`), markdown documentation (`README.md`, `ROADMAP.md`, `CHANGELOG.md`, `context/**/*.md`), comments, and commit messages.
- Use clean, standard ASCII text and symbols only for headings, bullet points, summaries, and descriptions.

## 2. Markdown Formatting Standards
- Do not use standalone horizontal rule dividers (`---`) between sections in Markdown documents.
- Rely on structured header levels (`#`, `##`, `###`, `####`) and clean paragraph spacing for visual organization.
- Keep table syntax standard (e.g. `| :--- |`) and frontmatter delimiters only where strictly required by configuration parsers.

## 3. Directory & Audience Structure
- `context/`: Primary store for AI agent prompts, markdown thesis dossiers (`context/theses/`), schemas, and strategy rules.
- `scripts/`: Deterministic Python and Node.js CLI tools, caching local databases in `scripts/data/`.
- `http/`: Public human web interface with documentation in `http/docs/` and public metrics in `http/data/`.
- `private/`: User confidential data (brokerage snapshots in `private/snapshots/`, simple plain text/Markdown trading plans in `private/plans/`). Never commit files in `private/`.
- `scratch/`: Local git-ignored sandbox for temporary test scripts.
