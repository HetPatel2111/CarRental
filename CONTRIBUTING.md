# Contributing Guide

Thanks for your interest in contributing.

## Setup

1. Fork and clone the repository.
2. Create your feature branch from `main`.
3. Install dependencies in both `client` and `server`.
4. Create `.env` files from the provided `.env.example` files.

## Development Workflow

1. Keep PRs focused and small.
2. Follow existing code style and naming conventions.
3. Run frontend checks before opening a PR:
   - `cd client`
   - `npm run lint`
   - `npm run build`
4. Include clear PR descriptions with:
   - What changed
   - Why it changed
   - Any screenshots for UI updates

## Commit Style

Use concise, present-tense messages.

Examples:
- `Improve responsive layout for owner dashboard`
- `Fix booking status update edge case`

## Pull Requests

- Link related issue(s) when available.
- Ensure CI passes.
- Request review only when ready to merge.
