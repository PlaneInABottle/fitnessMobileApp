# Release Checklist

## Before building

- Confirm `app.json` version and store copy.
- Run `bun install --frozen-lockfile`.
- Run `bun run compile`, `bun run lint:check`, and `bun run test -- --runInBand`.
- Run `bun run deps:check` and `bunx expo-doctor`.
- Complete a workout on a physical device or simulator and verify history after relaunch.
- Verify light and dark themes, empty states, long exercise names, and numeric input.
- Enable GitHub Pages from the repository `docs/` directory and verify the privacy and support URLs.

## EAS setup

```bash
bunx eas-cli@20.5.1 login
bunx eas-cli@20.5.1 init
bunx eas-cli@20.5.1 build:version:set --platform all
```

No EAS environment variables are required. The app has no backend or API credentials.

## Candidate builds

```bash
bunx eas-cli@20.5.1 build --profile preview --platform android
bunx eas-cli@20.5.1 build --profile preview:simulator --platform ios
```

- Install both candidates and repeat the core workout flow.
- Confirm the production icon, splash screen, app name, and package identifiers.
- Check that uninstalling removes local workout data.

## Store release

```bash
bunx eas-cli@20.5.1 build --profile production --platform all
bunx eas-cli@20.5.1 submit --profile production --platform all
```

- Complete App Store privacy as "Data Not Collected."
- Complete Google Play Data safety as no data collected or shared.
- Declare that the app has no account creation.
- Add review notes explaining that all workout data is stored locally.
