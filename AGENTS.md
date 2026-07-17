# Fitness Mobile App Agent Guide

These repository-specific instructions supplement the global agent instructions. Keep commands here durable and free of secrets, device IDs, ports other than the app's fixed development port, and session-specific process IDs.

## Stack and package manager

- This is an Expo development-client app using React Native, React Navigation, MobX State Tree, TypeScript, Jest, and Bun.
- Use Bun 1.3.14. Install dependencies with `bun install --frozen-lockfile`.
- Do not mix npm or Yarn lockfiles into this repository.

## Quality gates

- During implementation, run the narrowest relevant Jest file first: `bun run test -- --runInBand <test-file>`.
- Before handing off a code change, run `bun run verify`. It runs ESLint, TypeScript, dependency-cruiser, and all Jest tests serially.
- Before release-readiness work, run `bun run verify:release`. It adds `bun audit` and Expo Doctor.
- The stable device smoke suite is `bun run test:maestro`. It intentionally clears the app's local data and keychain, so run it only on a disposable development device state.

## Local Metro and Android device runtime

Manage Metro through PM2 so it survives context compaction and can be cleaned up reliably:

```bash
pm2 start bun --name fitness-mobile-metro -- run start -- --localhost
curl -fsS http://localhost:8081/status
adb reverse tcp:8081 tcp:8081
```

The readiness response must be `packager-status:running`. Clean up when the runtime is no longer needed:

```bash
pm2 delete fitness-mobile-metro
adb reverse --remove tcp:8081
```

## Maestro workflow

Use Maestro MCP for exploratory UI work. It is faster and fails closer to the faulty interaction than repeatedly executing a speculative end-to-end YAML script:

1. Call `list_devices`, then `inspect_view_hierarchy`.
2. Perform one bounded action with `tap_on`, `input_text`, `back`, or another single-step MCP tool.
3. Re-inspect the hierarchy immediately and capture a screenshot only when visual evidence adds value.
4. Once selectors and the path are stable, add or update a committed flow and run it with `run_flow_files` or `bun run test:maestro`.

Do not debug an uncertain path by rerunning the whole suite after every edit. Inline `run_flow` input may require a complete Maestro document with `appId`, `---`, and commands even when the tool description suggests a command fragment is accepted.

The Expo development-client bootstrap is implemented in `.maestro/flows/workout-smoke.yaml`. It uses the deterministic localhost deep link and waits for the app-only marker `Ready to train?`; the development shell's app title is not a sufficient readiness signal.

## Release safety

- Do not create EAS builds, submit store versions, deploy a site, or change store-console state unless the user explicitly requests that external action.
- `android/` and `ios/` are generated and gitignored; `app.json` is the durable source of truth for the app name, version, custom scheme, and application identifiers. If generated native directories already exist, check them for drift before local native work. `bun run prebuild:clean` regenerates them but is destructive to manual native edits, so inspect first. Expo Doctor does not prove existing generated values match.
- Treat saved workout and routine data on a connected phone as user state. Prefer MCP exploration without clearing state; reserve the smoke suite's destructive launch for disposable test state.
- Preserve unrelated worktree changes. This repository is often used with in-progress feature branches.
