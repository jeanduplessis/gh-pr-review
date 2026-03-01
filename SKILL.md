# gh-pr-review

## Description

A GitHub CLI extension for reading and responding to PR review comments. Provides structured JSON output designed for coding agent workflows.

## Installation

```bash
gh extension install jeanduplessis/gh-pr-review
```

## Commands

### View reviews

```bash
gh pr-review view [<pr-url>] [-R owner/repo] [--pr <number>]
    [--reviewer <login>]
    [--states <APPROVED|CHANGES_REQUESTED|COMMENTED|DISMISSED>]
    [--unresolved]
    [--not-outdated]
    [--tail <n>]
```

Returns a `ReviewReport` with reviews, inline comments, and thread replies.

### Reply to a thread

```bash
gh pr-review reply [<pr-url>] [-R owner/repo] [--pr <number>]
    --thread-id <PRRT_...>
    --body <text>
```

Posts a reply to a review thread. Returns `{ "comment_node_id": "PRRC_..." }`.

### List threads

```bash
gh pr-review threads [<pr-url>] [-R owner/repo] [--pr <number>]
    [--unresolved]
```

Lists review threads. Returns an array of `ThreadSummary` objects.

### Resolve a thread

```bash
gh pr-review resolve [<pr-url>] [-R owner/repo] [--pr <number>]
    --thread-id <PRRT_...>
```

Resolves a review thread. Returns `{ "thread_node_id": "PRRT_...", "is_resolved": true }`.

### Unresolve a thread

```bash
gh pr-review unresolve [<pr-url>] [-R owner/repo] [--pr <number>]
    --thread-id <PRRT_...>
```

Unresolves a review thread. Returns `{ "thread_node_id": "PRRT_...", "is_resolved": false }`.

## Workflows

### Reviewing and addressing PR feedback

1. **View all review comments**: `gh pr-review view --pr 42`
2. **Focus on unresolved feedback**: `gh pr-review view --pr 42 --unresolved --not-outdated`
3. **Filter by reviewer**: `gh pr-review view --pr 42 --reviewer octocat`
4. **List unresolved threads**: `gh pr-review threads --pr 42 --unresolved`
5. **Reply to feedback**: `gh pr-review reply --pr 42 --thread-id PRRT_... --body "Fixed in latest commit"`
6. **Resolve addressed threads**: `gh pr-review resolve --pr 42 --thread-id PRRT_...`

### Best practices

- Use `--unresolved --not-outdated` to focus on actionable feedback
- Use `--tail 3` to see only recent discussion in long threads
- After making code changes, reply to threads explaining what was done
- Resolve threads only after the feedback has been addressed
- Use `--states CHANGES_REQUESTED` to prioritize blocking reviews

## Output format

All commands output JSON to stdout. Errors are written to stderr as `{ "error": "message" }` with exit code 1.
