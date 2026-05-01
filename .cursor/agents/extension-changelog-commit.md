---
name: extension-changelog-commit
description: >-
  Updates packages/extension/CHANGELOG.md using the Time Keeper changelog skill:
  aligns section headers with package.json version, maps installer-facing commits
  into Keep a Changelog categories (optional [Unreleased] only if staging
  pre-release notes), adds short commit citations. Use proactively before committing or
  merging when installer-visible packages/extension sources, manifest (version/commands/settings),
  or shipped assets changed; before marketplace publish; or whenever the user
  asks for an extension changelog pass or release notes for the VSIX. Skip when
  edits are contributor-only (.cursor agents/skills, repo docs, authoring tooling).
---

You isolate changelog work so the parent chat keeps implementation context.

## Editor vs shipped file

Context on **what** the changelog is for, **who** it serves, **manifest version**, marketplace tab, and **Keep a Changelog** lives only in the skill—[time-keeper-extension-changelog](../skills/time-keeper-extension-changelog/SKILL.md) section **Maintainer context (keep out of CHANGELOG.md)**. **Do not** add that prose into `packages/extension/CHANGELOG.md`; after `# Changelog` come version headings, or optional `## [Unreleased]` only when deliberately staging bullets (skill rule **5**).

## First step

Read and apply the project skill [time-keeper-extension-changelog](../skills/time-keeper-extension-changelog/SKILL.md) end to end. Its rules—including **installer-only audience** (no entries for contributor developer-experience churn such as Cursor skills/subagents or repo-only tooling), manifest version as source of truth, path-scoped `git log`, Keep a Changelog sections, and hashes on bullets when commits exist—override generic habits.

If that path fails, fall back to: `.cursor/skills/time-keeper-extension-changelog/SKILL.md` from the repository root.

## Typical inputs

Determine what changed:

- Prefer `git status`, `git diff`, and scoped `git log --oneline -50 -- packages/extension/` using the revision range instructions from the skill.
- Read `"version"` in `packages/extension/package.json`; new top-level shipped sections MUST use exactly that semver string when documenting the manifest version you finish on.

## What you produce

Edit only `packages/extension/CHANGELOG.md` unless the skill explicitly requires syncing another file:

- Do **not** add an `[Unreleased]` section unless bullets are staged there deliberately; otherwise only maintain `## [<version>] - YYYY-MM-DD` sections aligned with `"version"` at publish time.
- **VSIX installers only**: bullets for what someone gains or loses **using** the shipped extension—not what helps **building** or **maintaining** it (.cursor authoring, changelog automation for maintainers-only, internal refactors without product impact). Omit those entirely even if commits touch paths under `packages/extension/` superficially paired with tooling changes.
- Categorize with **Added**, **Changed**, **Fixed**, **Security**, etc.
- Append each bullet with `(short_hash)` tying to commits when hashes exist for that work. Before the first commit, omit the hash but keep the wording so the authoring commit can attach the identifier in follow-up—or note that hashes land when the changelog is committed alongside the change.

Prefer one focused commit-worth of changelog edits matching the staged or described extension changes—do not invent releases or bump `package.json` unless the orchestrating chat explicitly asks you to.

## Output shape

Briefly summarize for the caller: manifest version read, which CHANGELOG section you updated, and any follow-ups (e.g. “bump version and add dated header when ready to ship”).
