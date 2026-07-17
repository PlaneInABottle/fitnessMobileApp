# Fitness Tracker

Fitness Tracker is an offline workout log for iOS and Android. It supports quick sessions,
reusable routines, exercise notes, multiple set types, performance suggestions, personal records,
and a history dashboard. Workout data stays on the device and the app does not require an account.

## Requirements

- Node.js 24.18.0
- Bun 1.3.14
- Xcode for iOS builds or Android Studio for Android builds
- A development build; Expo Go cannot load the MMKV native module used by this app

## Development

```bash
bun install --frozen-lockfile
bun run start
```

In another terminal, build and launch the native app:

```bash
bun run ios
# or
bun run android
```

No environment variables or external services are required.

## Quality Gates

```bash
bun run verify
```

Before a release, include dependency advisories and Expo configuration checks:

```bash
bun run verify:release
```

With a development build open on a connected device, run the stable mobile smoke flow with:

```bash
bun run test:maestro
```

## Release Builds

After authenticating with EAS and linking the Expo project:

```bash
bunx eas-cli@21.0.1 build --profile preview --platform android
bunx eas-cli@21.0.1 build --profile preview:simulator --platform ios
bunx eas-cli@21.0.1 build --profile production --platform all
```

The iOS scripts use EAS cloud builds so they can be started from Linux. `build:ios:sim` creates a
development-client Simulator build, while `build:ios:preview` creates a standalone Simulator build
for browser-device services or automated tests. Android scripts continue to support local builds on
machines with the Android SDK.

See [docs/release-checklist.md](docs/release-checklist.md) for the complete release process and
[docs/store-listing.md](docs/store-listing.md) for store metadata.

## Data Model

MobX State Tree owns the exercise library, active workout, routines, history, and performance
memory. MMKV persists that root state locally. There is no authentication, analytics, advertising,
or remote backend.

## License

Licensed under the [MIT License](LICENSE).
