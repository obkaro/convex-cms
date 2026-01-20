# Claude Code Settings

Settings configured in `settings.json`.

## Hooks

| Hook              | Trigger             | Action                               |
| ----------------- | ------------------- | ------------------------------------ |
| Branch protection | Edit/Write          | Blocks edits on `main` branch        |
| Auto-format       | Edit `.ts/.tsx`     | Runs Prettier                        |
| Auto-deps         | Edit `package.json`     | Runs `npm install`                       |
| Convex codegen    | Edit `src/component/*`  | Runs Convex codegen (non-blocking)       |

## Local Overrides

Create `.claude/settings.local.json` (gitignored) for personal settings.
