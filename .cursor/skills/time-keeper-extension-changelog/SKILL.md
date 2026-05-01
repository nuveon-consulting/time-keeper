---
name: time-keeper-extension-changelog
description: >-
  Updates packages/extension/CHANGELOG.md from git history, keeping section
  headers aligned with package.json "version" (manifest / marketplace). Entries
  are for VSIX installers only—not contributor/developer-experience changes
  (skills, agents, repo-only tooling). Use when cutting an extension release,
  bumping the extension version, publishing a VSIX, or when the user asks to
  refresh or write the extension changelog.
---

# Time Keeper extension changelog

## Maintainer context (keep out of `CHANGELOG.md`)

This skill governs `packages/extension/CHANGELOG.md` for the **Nuveon Time Keeper** VS Code / Cursor extension (built from `packages/extension`).

- **Audience:** Document what **people who install the VSIX** notice—commands, settings, timer/MCP/editor behavior, bundled UI. **Do not** list contributor-only work (Cursor project skills/subagents, `.cursor/` authoring helpers, repo contribution docs, CI that does not change the shipped package, internal refactors with no product effect). Full filter: rule **6**.
- **Version labels:** Each shipped `## [x.y.z] - date` matches `"version"` in [`packages/extension/package.json`](../../../packages/extension/package.json) at publish time. The markdown file is bundled in the VSIX and shown on the marketplace **Changelog** tab.
- **Shape:** Follow [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); version numbers follow the extension manifest (semver appropriate for this pre–1.0 line).
- **Never paste this block (or similar intro prose) into the changelog file.** The packaged file is only `# Changelog` plus release sections—rule **5**.

## Trigger

- Version bump or publish for `packages/extension`.
- User asks to update, backfill, or reconcile the extension changelog with commits.

## Subagent delegation

Before committing installer-visible packaging or runtime changes under `packages/extension/`, spawn the **`extension-changelog-commit`** Cursor subagent (project file [`.cursor/agents/extension-changelog-commit.md`](../../agents/extension-changelog-commit.md)) so changelog edits stay in an isolated Task while the parent chat retains implementation detail. That subagent is instructed to read this skill first; use it proactively near commit or VSIX publish when commits affect what users see or rely on—not for `.cursor`/contributor-only work.

## Rules

1. **Manifest version is the source of truth** for the **latest shipped** section title. Read `packages/extension/package.json` → `"version"`. The topmost `## [x.y.z] - YYYY-MM-DD` block for a finished release **must** use that exact `x.y.z` when you are documenting the release that goes with the current manifest (same commit or same PR as the version bump, unless the user says otherwise).

2. **Scope commits to the extension (and its package boundary)**:
   - Primary: `git log --oneline -50 -- packages/extension/`
   - Include repo-root changes only when they materially affect the packaged extension (rare); default is extension folder only.

3. **Attach commits to changelog lines.** For each notable **installer-facing** bullet under `Added` / `Changed` / `Fixed` / `Security` / etc., suffix with a short git reference so the note is attributable, e.g. `(147b6b9)` or `(147b6b9 feat(extension): ...)`. Prefer one commit per bullet when possible; squash related commits into one bullet and cite the primary commit—omit bullets that violate rule **6**.

4. **Dates:** Use ISO `YYYY-MM-DD` on the section heading. Prefer the **author date** (or committed date) of the commit that bumped `version` for that release; otherwise use the calendar day you are cutting the release.

5. **Keep a Changelog shape:** After the single `# Changelog` title, use version sections `## [x.y.z] - YYYY-MM-DD`—**no** introductory paragraphs in the shipped file (that guidance lives in this skill only). **`## [Unreleased]` is optional**: use it only when you deliberately stage bullets *before* a manifest bump ([Keep a Changelog](https://keepachangelog.com/en/1.1.0/) pattern). Otherwise skip it entirely and add the `## [<version>] - date` block when publishing—fewer placeholders, nothing to infer automatically.

6. **Extension installers only (audience):** Every bullet must matter to someone **using the Nuveon Time Keeper VSIX** in VS Code or Cursor—not maintainers authoring this repository. **Do not enter** changelog lines for contributor-only churn: Cursor/VS Code **project skills**, **custom subagents**, other `.cursor/` authoring helpers, changelog–release workflow that touches only developers, contributor docs (`AGENTS.md`, `agents.md`, etc.) that never ship inside the VSIX, CI or repo tooling that leaves the packaged extension unchanged, or refactors/tests with **no user-visible or packaged-runtime** behavior. Typical **includes**: manifest `contributes` (commands, settings, keybindings), shipped `src/` behavior, MCP/timer flows as experienced in the editor, bundled summary/webview assets, user-facing edits to packaged documentation.

7. **Do not duplicate the manifest:** The changelog is a readable digest—not `package.json` or exhaustive commit history. Skip noisy internal edits unless they change what installers see or rely on.

8. **Same change as bump:** Prefer updating `CHANGELOG.md` in the **same commit** as `package.json` `"version"` when cutting a release.

## Workflow

1. Read current `"version"` in `packages/extension/package.json`.

2. If filling a **new** release section, identify the commit range since the prior released version:
   - Find the previous `## [a.b.c]` in `CHANGELOG.md` and locate when `a.b.c` landed; or use `git log -p -- packages/extension/package.json` to find the last version bump.

3. List candidate commits in range (scoped path above). Map commits to **installer-facing** bullets (rule **6**) grouped by Added / Changed / Fixed / Security—skip commits whose impact is purely developer/repo ergonomics unless the user explicitly overrides.

4. Insert or adjust the matching `## [version] - date` section. Ensure there is exactly one canonical section per shipped manifest version (do not fork duplicate headers for the same version).

5. If the manifest version in `package.json` is **ahead** of the latest changelog section (e.g. bump without notes), add the matching `## [version] - date` section from commits since the previous section—you may use optional `[Unreleased]` first only if your workflow already uses that staging section.

## Output

- Updated `packages/extension/CHANGELOG.md` with manifest-aligned `## [x.y.z]` headers, ISO dates, Keep a Changelog subsections, parenthetical `(short-hash …)` ties to commits where applicable—**only entries that affect VSIX installers** per rule **6**.
